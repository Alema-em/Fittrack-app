require('dotenv').config()
const express = require('express')
const cors    = require('cors')
const mysql   = require('mysql2/promise')
const crypto  = require('crypto')
const jwt     = require('jsonwebtoken')

const app = express()
app.use(cors())
app.use(express.json())

const requiredEnv = name => {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

const requiredPort = name => {
  const port = Number(requiredEnv(name))
  if (!Number.isInteger(port) || port <= 0) throw new Error(`Invalid environment variable: ${name}`)
  return port
}

// ── Database pool ─────────────────────────────────────────────
const pool = mysql.createPool({
  host:             requiredEnv('DB_HOST'),
  port:             requiredPort('DB_PORT'),
  user:             requiredEnv('DB_USER'),
  password:         requiredEnv('DB_PASS'),
  database:         requiredEnv('DB_NAME'),
  waitForConnections: true,
  connectionLimit:  10,
  decimalNumbers:   true, // returns FLOAT as JS number, not string
})

const JWT_SECRET  = process.env.JWT_SECRET || 'fittrack_jwt_secret_2025'
const DEMO_EMAILS = new Set(['meher@email.com','siya@email.com','akshay@email.com',
                              'yash@email.com','alema@email.com','kushi@email.com','richa@email.com'])

// Helper: round to nearest 0.5
const r05 = v => v == null ? null : Math.round(v * 2) / 2

// ── Auth middleware ───────────────────────────────────────────
const auth = (req, res, next) => {
  const h = req.headers.authorization
  if (!h?.startsWith('Bearer ')) return res.status(401).json({ error: 'No token' })
  try { req.user = jwt.verify(h.slice(7), JWT_SECRET); next() }
  catch { res.status(401).json({ error: 'Invalid or expired session' }) }
}

const assertSelf = (req, res, userId) => {
  if (parseInt(userId, 10) !== req.user.userId)
    return res.status(403).json({ error: 'Forbidden' })
}

async function loadUserProfile(userId) {
  const [[row]] = await pool.execute(
    `SELECT u.user_id, u.name, u.email, u.bodyweight_kg, u.fitness_goal,
            wp.plan_id, wp.strength_week, wp.running_phase, wp.running_week, wp.week_type,
            (SELECT COUNT(*) FROM SESSION_TEMPLATE st
             WHERE st.plan_id = wp.plan_id AND st.session_type = 'running') AS running_count
     FROM USER u
     LEFT JOIN WORKOUT_PLAN wp ON u.user_id = wp.user_id AND wp.is_active = TRUE
     WHERE u.user_id = ?`,
    [userId]
  )
  if (!row) return null
  return {
    user_id:        row.user_id,
    name:           row.name,
    email:          row.email,
    bodyweight:     row.bodyweight_kg,
    goal:           row.fitness_goal,
    strengthWeek:   row.strength_week  || 1,
    runningPhase:   row.running_phase  || 1,
    runningWeek:    row.running_week   || 1,
    weekType:       row.week_type      || 'Accumulation',
    includeRunning: (Number(row.running_count) || 0) > 0,
    isDemoUser:     DEMO_EMAILS.has(row.email),
  }
}

const DASHBOARD_SESSIONS_SQL = `
  SELECT st.template_id, st.session_key, st.day_of_week, st.session_type,
         e.exercise_id, e.exercise_name, e.tier, e.is_bodyweight, e.primary_muscles, e.movement_pattern,
         se.session_ex_id, se.sets, se.reps, se.percentage_1rm, se.rpe_target, se.rest_duration, se.display_order,
         CASE WHEN e.is_bodyweight THEN NULL
              WHEN se.percentage_1rm IS NULL THEN NULL
              ELSE ROUND(se.percentage_1rm * COALESCE(orm_l.weight_kg, 0) / 2.5, 0) * 2.5
         END AS target_weight_kg
  FROM WORKOUT_PLAN wp
  JOIN SESSION_TEMPLATE st ON wp.plan_id = st.plan_id
  JOIN SESSION_EXERCISE se ON st.template_id = se.template_id
  JOIN EXERCISE e ON se.exercise_id = e.exercise_id
  LEFT JOIN (
    SELECT user_id, exercise_id, ROUND(weight_kg, 1) AS weight_kg
    FROM ONE_REP_MAX o1
    WHERE recorded_on = (SELECT MAX(o2.recorded_on) FROM ONE_REP_MAX o2
                          WHERE o2.user_id = o1.user_id AND o2.exercise_id = o1.exercise_id)
  ) orm_l ON wp.user_id = orm_l.user_id AND e.exercise_id = orm_l.exercise_id
  WHERE wp.user_id = ? AND wp.is_active = TRUE
    AND st.scope = 'permanent' AND st.session_type = 'strength'
  ORDER BY st.session_key, se.display_order`

// ── Default exercises per session ─────────────────────────────
// exercise_ids match the INSERT INTO EXERCISE order in fitness-project.sql
// 1=Deadlift 2=BenchPress 3=FrontSquat 4=OHP 5=PullUp 6=BarbellRow
// 7=RomanianDL 8=InclineBench 9=BulgarianSS 10=Dips 11=FacePull
const DEFAULT_EXERCISES = {
  A: [
    { id:1, sets:4, reps:'5',  pct:0.82, rpe:'8',   rest:'3 min',  order:1 },
    { id:2, sets:4, reps:'6',  pct:0.78, rpe:'8',   rest:'2 min',  order:2 },
    { id:5, sets:3, reps:'8',  pct:null, rpe:'7',   rest:'90 sec', order:3 },
    { id:11,sets:3, reps:'15', pct:0.40, rpe:'6',   rest:'60 sec', order:4 },
  ],
  B: [
    { id:3, sets:4, reps:'5',  pct:0.78, rpe:'8',   rest:'3 min',  order:1 },
    { id:4, sets:4, reps:'6',  pct:0.72, rpe:'8',   rest:'2 min',  order:2 },
    { id:7, sets:3, reps:'10', pct:0.65, rpe:'7',   rest:'2 min',  order:3 },
    { id:9, sets:3, reps:'10', pct:0.50, rpe:'7',   rest:'2 min',  order:4 },
  ],
  C: [
    { id:1, sets:3, reps:'3',  pct:0.88, rpe:'9',   rest:'4 min',  order:1 },
    { id:6, sets:4, reps:'8',  pct:0.65, rpe:'7',   rest:'2 min',  order:2 },
    { id:8, sets:3, reps:'8',  pct:0.70, rpe:'7',   rest:'90 sec', order:3 },
    { id:10,sets:3, reps:'10', pct:null, rpe:'7',   rest:'90 sec', order:4 },
  ],
}

// ═══════════════════════════════════════════════════════════════
// HEALTH
// ═══════════════════════════════════════════════════════════════
app.get('/health', async (req, res) => {
  try { await pool.execute('SELECT 1'); res.json({ ok: true }) }
  catch (e) { res.status(500).json({ ok: false, error: e.message }) }
})

// ═══════════════════════════════════════════════════════════════
// AUTH — SESSION
// ═══════════════════════════════════════════════════════════════
app.get('/auth/me', auth, async (req, res) => {
  try {
    const user = await loadUserProfile(req.user.userId)
    if (!user) return res.status(401).json({ error: 'Account not found' })
    res.json({ user })
  } catch (e) {
    console.error('Auth/me:', e.message)
    res.status(500).json({ error: e.message })
  }
})

// ═══════════════════════════════════════════════════════════════
// AUTH — REGISTER
// ═══════════════════════════════════════════════════════════════
app.post('/auth/register', async (req, res) => {
  const { name, email, password, bodyweight, goal, includeRunning } = req.body
  if (!name?.trim() || !email?.trim() || !password)
    return res.status(400).json({ error: 'Name, email and password are required' })

  try {
    const [[dup]] = await pool.execute('SELECT user_id FROM USER WHERE email = ?', [email.trim()])
    if (dup) return res.status(409).json({ error: 'An account with this email already exists' })

    // RegisterUser procedure: creates user, plan, session templates A/B/C, and starter 1RMs from bodyweight
    await pool.execute('CALL RegisterUser(?,?,?,?,?)',
      [name.trim(), email.trim().toLowerCase(), password, parseFloat(bodyweight)||70, goal||'strength'])

    const [[user]] = await pool.execute(
      'SELECT user_id, name, email, bodyweight_kg, fitness_goal FROM USER WHERE email = ?',
      [email.trim().toLowerCase()]
    )

    // Get the newly created plan
    const [[plan]] = await pool.execute(
      'SELECT plan_id FROM WORKOUT_PLAN WHERE user_id = ? AND is_active = TRUE', [user.user_id]
    )

    if (plan) {
      // Get template IDs for A, B, C
      const [templates] = await pool.execute(
        `SELECT template_id, session_key
         FROM SESSION_TEMPLATE WHERE plan_id = ? AND scope = 'permanent'`,
        [plan.plan_id]
      )

      // Insert default exercises for each session
      for (const tpl of templates) {
        const exList = DEFAULT_EXERCISES[tpl.session_key]
        if (!exList) continue
        for (const ex of exList) {
          await pool.execute(
            `INSERT INTO SESSION_EXERCISE
               (template_id,exercise_id,sets,reps,percentage_1rm,rpe_target,rest_duration,display_order)
             VALUES (?,?,?,?,?,?,?,?)`,
            [tpl.template_id, ex.id, ex.sets, ex.reps, ex.pct||null, ex.rpe, ex.rest, ex.order]
          )
        }
      }

      // Add running session templates if user chose running
      if (includeRunning) {
        await pool.execute(
          `INSERT INTO SESSION_TEMPLATE (plan_id,session_key,day_of_week,session_type,scope)
           VALUES (?,'Run_Tue','Tuesday','running','permanent'),
                  (?,'Run_Thu','Thursday','running','permanent'),
                  (?,'Run_Sat','Saturday','running','permanent')`,
          [plan.plan_id, plan.plan_id, plan.plan_id]
        )
      }
    }

    const token = jwt.sign({ userId: user.user_id, email: user.email }, JWT_SECRET, { expiresIn: '30d' })
    const profile = await loadUserProfile(user.user_id)
    res.json({
      token,
      user: {
        ...profile,
        strengthWeek:  1,
        runningPhase:  1,
        runningWeek:   1,
        weekType:      'Accumulation',
        includeRunning: !!includeRunning,
        isDemoUser:    false,
      }
    })
  } catch (e) {
    console.error('Register:', e.message)
    res.status(500).json({ error: e.message })
  }
})

// ═══════════════════════════════════════════════════════════════
// AUTH — LOGIN
// ═══════════════════════════════════════════════════════════════
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body
  if (!email?.trim()) return res.status(400).json({ error: 'Email is required' })

  try {
    const [[user]] = await pool.execute(
      `SELECT u.user_id, u.name, u.email, u.password_hash, u.bodyweight_kg, u.fitness_goal,
              wp.plan_id, wp.strength_week, wp.running_phase, wp.running_week, wp.week_type,
              (SELECT COUNT(*) FROM SESSION_TEMPLATE st
               WHERE st.plan_id = wp.plan_id AND st.session_type = 'running') AS running_count
       FROM USER u
       LEFT JOIN WORKOUT_PLAN wp ON u.user_id = wp.user_id AND wp.is_active = TRUE
       WHERE u.email = ?`, [email.trim().toLowerCase()]
    )
    if (!user) return res.status(401).json({ error: 'No account found with this email' })

    // Demo users have literal hash strings — allow any password
    const isDemo = user.password_hash?.startsWith('hashed_pw_')
    const sha2   = crypto.createHash('sha256').update(password||'').digest('hex')
    if (!isDemo && user.password_hash !== sha2)
      return res.status(401).json({ error: 'Incorrect password' })

    const token = jwt.sign({ userId: user.user_id, email: user.email }, JWT_SECRET, { expiresIn: '30d' })
    const profile = await loadUserProfile(user.user_id)
    res.json({ token, user: profile })
  } catch (e) {
    console.error('Login:', e.message)
    res.status(500).json({ error: e.message })
  }
})

// ═══════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════
app.get('/dashboard/:userId', auth, async (req, res) => {
  const uid = parseInt(req.params.userId)
  if (assertSelf(req, res, uid)) return
  try {
    const [sessions] = await pool.execute(DASHBOARD_SESSIONS_SQL, [uid])

    // Core 1RMs (latest only, rounded)
    const [orms] = await pool.execute(
      `SELECT e.exercise_id, e.exercise_name, e.tier,
              ROUND(o.weight_kg, 1) AS weight_kg, o.recorded_on
       FROM ONE_REP_MAX o JOIN EXERCISE e ON o.exercise_id = e.exercise_id
       WHERE o.user_id = ?
         AND e.exercise_name IN ('Deadlift','Bench Press','Front Squat','Overhead Press')
         AND o.recorded_on = (
           SELECT MAX(o2.recorded_on) FROM ONE_REP_MAX o2
           WHERE o2.user_id = o.user_id AND o2.exercise_id = o.exercise_id
         )
       ORDER BY e.tier, e.exercise_name`, [uid]
    )

    // Recent session logs
    const [logs] = await pool.execute(
      `SELECT wl.log_id, wl.workout_date, wl.session_cost, wl.cost_status,
              st.session_key, COUNT(sl.set_log_id) AS sets_done
       FROM WORKOUT_LOG wl
       JOIN SESSION_TEMPLATE st ON wl.template_id = st.template_id
       LEFT JOIN SET_LOG sl ON wl.log_id = sl.log_id
       WHERE wl.user_id = ?
       GROUP BY wl.log_id, wl.workout_date, wl.session_cost, wl.cost_status, st.session_key
       ORDER BY wl.workout_date DESC LIMIT 8`, [uid]
    )

    // Plan info
    const [[plan]] = await pool.execute(
      `SELECT wp.*, GetWeekType(wp.strength_week) AS computed_week_type
       FROM WORKOUT_PLAN wp WHERE wp.user_id = ? AND wp.is_active = TRUE
       ORDER BY wp.created_at DESC LIMIT 1`, [uid]
    )

    // Aggregate stats
    const [[stats]] = await pool.execute(
      `SELECT COUNT(DISTINCT wl.log_id) AS total_sessions,
              COALESCE(SUM(wl.session_cost), 0) AS total_load,
              COALESCE(SUM(sl.reps_done * sl.weight_used_kg), 0) AS total_kg_lifted,
              COUNT(DISTINCT WEEK(wl.workout_date)) AS active_weeks
       FROM WORKOUT_LOG wl
       LEFT JOIN SET_LOG sl ON wl.log_id = sl.log_id
       WHERE wl.user_id = ?`, [uid]
    )

    // Auto-repair: if plan exists but sessions are empty, insert default exercises
    if (plan && sessions.length === 0) {
      const [templates] = await pool.execute(
        `SELECT template_id, session_key FROM SESSION_TEMPLATE
         WHERE plan_id = ? AND scope = 'permanent' AND session_type = 'strength'
         ORDER BY session_key`,
        [plan.plan_id]
      )
      for (const tpl of templates) {
        const [existing] = await pool.execute(
          'SELECT COUNT(*) AS n FROM SESSION_EXERCISE WHERE template_id = ?',
          [tpl.template_id]
        )
        if (existing[0].n > 0) continue // already has exercises
        const exList = DEFAULT_EXERCISES[tpl.session_key]
        if (!exList) continue
        for (const ex of exList) {
          try {
            await pool.execute(
              `INSERT IGNORE INTO SESSION_EXERCISE
                 (template_id,exercise_id,sets,reps,percentage_1rm,rpe_target,rest_duration,display_order)
               VALUES (?,?,?,?,?,?,?,?)`,
              [tpl.template_id, ex.id, ex.sets, ex.reps, ex.pct||null, ex.rpe, ex.rest, ex.order]
            )
          } catch(ignored) {}
        }
      }
      const [sessionsFixed] = await pool.execute(DASHBOARD_SESSIONS_SQL, [uid])
      return res.json({ sessions: sessionsFixed, orms, logs, plan: plan || null, stats })
    }
    res.json({ sessions, orms, logs, plan: plan || null, stats })
  } catch (e) {
    console.error('Dashboard:', e.message)
    res.status(500).json({ error: e.message })
  }
})

// ═══════════════════════════════════════════════════════════════
// PROGRESS
// ═══════════════════════════════════════════════════════════════
app.get('/progress/:userId', auth, async (req, res) => {
  const uid = parseInt(req.params.userId)
  if (assertSelf(req, res, uid)) return
  try {
    // Personal bests from ProgressTrackingView (correlated subquery view)
    const [pbs] = await pool.execute(
      `SELECT exercise_name, MAX(weight_used_kg) AS best_kg, MAX(workout_date) AS achieved_on
       FROM ProgressTrackingView WHERE user_id = ?
       GROUP BY exercise_name
       ORDER BY best_kg DESC`, [uid]
    )

    // Weekly volume from ExerciseSummaryView
    const [volume] = await pool.execute(
      `SELECT * FROM ExerciseSummaryView WHERE user_id = ?
       ORDER BY year DESC, week_number DESC, exercise_name LIMIT 40`, [uid]
    )

    // ORM history for core lifts (rounded)
    const [ormHistory] = await pool.execute(
      `SELECT e.exercise_name, ROUND(o.weight_kg, 1) AS weight_kg, o.recorded_on
       FROM ONE_REP_MAX o JOIN EXERCISE e ON o.exercise_id = e.exercise_id
       WHERE o.user_id = ?
         AND e.exercise_name IN ('Deadlift','Bench Press','Front Squat','Overhead Press')
       ORDER BY e.exercise_name, o.recorded_on ASC`, [uid]
    )

    // Weekly load trend
    const [weeklyLoad] = await pool.execute(
      `SELECT YEAR(workout_date) AS yr, WEEK(workout_date, 1) AS wk,
              SUM(session_cost) AS total_load, COUNT(*) AS sessions
       FROM WORKOUT_LOG WHERE user_id = ?
         AND workout_date >= DATE_SUB(CURRENT_DATE, INTERVAL 84 DAY)
       GROUP BY yr, wk ORDER BY yr ASC, wk ASC`, [uid]
    )

    // Running logs
    const [runs] = await pool.execute(
      'SELECT * FROM RUNNING_LOG WHERE user_id = ? ORDER BY run_date DESC LIMIT 20', [uid]
    )

    // Session history (distinct dates)
    const [sessionHistory] = await pool.execute(
      `SELECT wl.workout_date, st.session_key, wl.session_cost, wl.cost_status,
              COUNT(sl.set_log_id) AS total_sets
       FROM WORKOUT_LOG wl
       JOIN SESSION_TEMPLATE st ON wl.template_id = st.template_id
       LEFT JOIN SET_LOG sl ON wl.log_id = sl.log_id
       WHERE wl.user_id = ?
       GROUP BY wl.log_id, wl.workout_date, st.session_key, wl.session_cost, wl.cost_status
       ORDER BY wl.workout_date DESC LIMIT 20`, [uid]
    )

    res.json({ pbs, volume, ormHistory, weeklyLoad, runs, sessionHistory })
  } catch (e) {
    console.error('Progress:', e.message)
    res.status(500).json({ error: e.message })
  }
})

// ═══════════════════════════════════════════════════════════════
// EXERCISES
// ═══════════════════════════════════════════════════════════════
// Get all exercises (system + user's own custom)
app.get('/exercises', auth, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT * FROM EXERCISE
       WHERE is_custom = FALSE OR created_by = ?
       ORDER BY is_custom ASC, tier ASC, exercise_name ASC`,
      [req.user.userId]
    )
    res.json(rows)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Add custom exercise
app.post('/exercises', auth, async (req, res) => {
  const { name, tier, movementPattern, isBodyweight, defaultPercentage, primaryMuscles } = req.body
  if (!name?.trim()) return res.status(400).json({ error: 'Exercise name is required' })
  try {
    const [r] = await pool.execute(
      `INSERT INTO EXERCISE
         (exercise_name,tier,movement_pattern,is_bodyweight,default_percentage,
          default_sets,default_reps,primary_muscles,is_custom,created_by)
       VALUES (?,?,?,?,?,3,10,?,TRUE,?)`,
      [name.trim(), parseInt(tier)||3, movementPattern||'other',
       isBodyweight ? 1 : 0, parseFloat(defaultPercentage)||null,
       primaryMuscles||'', req.user.userId]
    )
    res.json({ exercise_id: r.insertId, exercise_name: name.trim() })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Delete user's own custom exercise
app.delete('/exercises/:id', auth, async (req, res) => {
  try {
    const [r] = await pool.execute(
      'DELETE FROM EXERCISE WHERE exercise_id = ? AND created_by = ? AND is_custom = TRUE',
      [req.params.id, req.user.userId]
    )
    if (r.affectedRows === 0)
      return res.status(403).json({ error: 'Exercise not found or not yours to delete' })
    res.json({ success: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Create a new strength session template (A/B/C are created at registration)
app.post('/plans/sessions', auth, async (req, res) => {
  const { sessionKey, dayOfWeek } = req.body
  const key = String(sessionKey || '').trim().toUpperCase()
  if (!key || key.length > 10)
    return res.status(400).json({ error: 'Session key is required (max 10 characters)' })
  if (!/^[A-Z][A-Z0-9_]{0,9}$/.test(key))
    return res.status(400).json({ error: 'Use a letter followed by letters, numbers, or underscores' })

  try {
    const [[plan]] = await pool.execute(
      'SELECT plan_id FROM WORKOUT_PLAN WHERE user_id = ? AND is_active = TRUE',
      [req.user.userId]
    )
    if (!plan) return res.status(404).json({ error: 'No active workout plan found' })

    const [[dup]] = await pool.execute(
      'SELECT template_id FROM SESSION_TEMPLATE WHERE plan_id = ? AND session_key = ?',
      [plan.plan_id, key]
    )
    if (dup) return res.status(409).json({ error: `Session "${key}" already exists on your plan` })

    const [r] = await pool.execute(
      `INSERT INTO SESSION_TEMPLATE (plan_id, session_key, day_of_week, session_type, scope)
       VALUES (?, ?, ?, 'strength', 'permanent')`,
      [plan.plan_id, key, (dayOfWeek || 'Unscheduled').trim().slice(0, 10)]
    )
    res.json({ templateId: r.insertId, sessionKey: key, dayOfWeek: dayOfWeek || 'Unscheduled' })
  } catch (e) {
    console.error('Create session:', e.message)
    res.status(500).json({ error: e.message })
  }
})

// Add exercise to a specific session template
app.post('/sessions/:templateId/exercises', auth, async (req, res) => {
  const { exerciseId, sets, reps, percentageRm, rpeTarget, restDuration } = req.body
  const templateId = parseInt(req.params.templateId)
  try {
    // Verify this template belongs to the user
    const [[tpl]] = await pool.execute(
      `SELECT st.template_id FROM SESSION_TEMPLATE st
       JOIN WORKOUT_PLAN wp ON st.plan_id = wp.plan_id
       WHERE st.template_id = ? AND wp.user_id = ?`, [templateId, req.user.userId]
    )
    if (!tpl) return res.status(403).json({ error: 'Template not found or not yours' })

    const [[maxOrder]] = await pool.execute(
      'SELECT COALESCE(MAX(display_order), 0) AS max_o FROM SESSION_EXERCISE WHERE template_id = ?',
      [templateId]
    )
    await pool.execute(
      `INSERT INTO SESSION_EXERCISE
         (template_id,exercise_id,sets,reps,percentage_1rm,rpe_target,rest_duration,display_order)
       VALUES (?,?,?,?,?,?,?,?)`,
      [templateId, exerciseId, parseInt(sets)||3, String(reps||10),
       parseFloat(percentageRm)||null, rpeTarget||'7', restDuration||'2 min',
       maxOrder.max_o + 1]
    )
    res.json({ success: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Remove exercise from a session
app.delete('/sessions/exercises/:sessionExId', auth, async (req, res) => {
  try {
    // Verify ownership through chain: SESSION_EXERCISE → SESSION_TEMPLATE → WORKOUT_PLAN → USER
    const [[row]] = await pool.execute(
      `SELECT se.session_ex_id FROM SESSION_EXERCISE se
       JOIN SESSION_TEMPLATE st ON se.template_id = st.template_id
       JOIN WORKOUT_PLAN wp ON st.plan_id = wp.plan_id
       WHERE se.session_ex_id = ? AND wp.user_id = ?`,
      [req.params.sessionExId, req.user.userId]
    )
    if (!row) return res.status(403).json({ error: 'Not found or not yours' })
    await pool.execute('DELETE FROM SESSION_EXERCISE WHERE session_ex_id = ?', [req.params.sessionExId])
    res.json({ success: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ═══════════════════════════════════════════════════════════════
// ORMS
// ═══════════════════════════════════════════════════════════════
app.get('/orms/:userId', auth, async (req, res) => {
  if (assertSelf(req, res, req.params.userId)) return
  try {
    const [rows] = await pool.execute(
      `SELECT e.exercise_id, e.exercise_name, e.tier,
              ROUND(o.weight_kg, 1) AS weight_kg, o.recorded_on
       FROM ONE_REP_MAX o JOIN EXERCISE e ON o.exercise_id = e.exercise_id
       WHERE o.user_id = ?
         AND e.exercise_name IN ('Deadlift','Bench Press','Front Squat','Overhead Press')
         AND o.recorded_on = (
           SELECT MAX(o2.recorded_on) FROM ONE_REP_MAX o2
           WHERE o2.user_id = o.user_id AND o2.exercise_id = o.exercise_id
         )
       ORDER BY e.tier, e.exercise_name`, [req.params.userId]
    )
    res.json(rows)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.put('/orms/:userId', auth, async (req, res) => {
  if (assertSelf(req, res, req.params.userId)) return
  const { exerciseId, weightKg } = req.body
  if (!exerciseId || !weightKg) return res.status(400).json({ error: 'exerciseId and weightKg required' })
  try {
    await pool.execute(
      'INSERT INTO ONE_REP_MAX (user_id,exercise_id,weight_kg,recorded_on) VALUES (?,?,?,CURRENT_DATE)',
      [req.params.userId, exerciseId, parseFloat(weightKg)]
    )
    res.json({ success: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ═══════════════════════════════════════════════════════════════
// WORKOUT LOGGING
// ═══════════════════════════════════════════════════════════════
app.post('/workout/log', auth, async (req, res) => {
  const { userId, templateId } = req.body
  if (!userId || !templateId) return res.status(400).json({ error: 'userId and templateId required' })
  try {
    await pool.execute('CALL LogWorkout(?,?,?)', [userId, templateId, null])
    const [[log]] = await pool.execute(
      `SELECT wl.*, st.session_key FROM WORKOUT_LOG wl
       JOIN SESSION_TEMPLATE st ON wl.template_id = st.template_id
       WHERE wl.user_id = ? ORDER BY wl.log_id DESC LIMIT 1`, [userId]
    )
    res.json({ success: true, log })
  } catch (e) {
    console.error('LogWorkout:', e.message)
    res.status(500).json({ error: e.message })
  }
})

app.post('/workout/advance', auth, async (req, res) => {
  const { userId } = req.body
  try {
    await pool.execute('CALL AdvanceWeek(?)', [userId])
    const [[plan]] = await pool.execute(
      `SELECT wp.*, GetWeekType(wp.strength_week) AS computed_week_type
       FROM WORKOUT_PLAN wp WHERE user_id = ? AND is_active = TRUE
       ORDER BY created_at DESC LIMIT 1`, [userId]
    )
    res.json({ success: true, plan })
  } catch (e) {
    console.error('AdvanceWeek:', e.message)
    res.status(500).json({ error: e.message })
  }
})

// ═══════════════════════════════════════════════════════════════
// RUNNING LOG
// ═══════════════════════════════════════════════════════════════
app.post('/running/log', auth, async (req, res) => {
  const { userId, sessionType, runningPhase, runningWeek, distanceKm, durationSeconds, avgPace, notes } = req.body
  try {
    await pool.execute(
      `INSERT INTO RUNNING_LOG
         (user_id,run_date,session_type,running_phase,running_week,
          distance_km,duration_seconds,avg_pace_min_per_km,notes)
       VALUES (?,CURRENT_DATE,?,?,?,?,?,?,?)`,
      [userId, sessionType, runningPhase||1, runningWeek||1,
       distanceKm||null, durationSeconds||null, avgPace||null, notes||null]
    )
    res.json({ success: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ═══════════════════════════════════════════════════════════════
// DATABASE STATS (live query results — demo users only on frontend)
// ═══════════════════════════════════════════════════════════════
app.get('/dbstats', auth, async (req, res) => {
  const uid = parseInt(req.query.userId) || req.user.userId
  try {
    // Table row counts
    const tables = ['USER','EXERCISE','WORKOUT_PLAN','SESSION_TEMPLATE',
                    'SESSION_EXERCISE','WORKOUT_LOG','SET_LOG','RUNNING_LOG','ONE_REP_MAX']
    const counts = {}
    for (const t of tables) {
      const [[r]] = await pool.execute(`SELECT COUNT(*) AS n FROM ${t}`)
      counts[t] = r.n
    }

    // Q3: users above average monthly workouts
    const [aboveAvg] = await pool.execute(`
      SELECT u.name, COUNT(wl.log_id) AS workouts_this_month
      FROM USER u JOIN WORKOUT_LOG wl ON u.user_id = wl.user_id
      WHERE YEAR(wl.workout_date) = YEAR(CURRENT_DATE)
        AND MONTH(wl.workout_date) = MONTH(CURRENT_DATE)
      GROUP BY u.user_id, u.name
      HAVING COUNT(wl.log_id) > (
        SELECT AVG(c) FROM (
          SELECT COUNT(wl2.log_id) AS c
          FROM USER u2 LEFT JOIN WORKOUT_LOG wl2
            ON u2.user_id = wl2.user_id
               AND YEAR(wl2.workout_date) = YEAR(CURRENT_DATE)
               AND MONTH(wl2.workout_date) = MONTH(CURRENT_DATE)
          GROUP BY u2.user_id
        ) t
      )
      ORDER BY workouts_this_month DESC`)

    // Top ORMs per core lift
    const [topLifts] = await pool.execute(`
      SELECT e.exercise_name, u.name AS user_name,
             ROUND(MAX(o.weight_kg),1) AS max_orm
      FROM ONE_REP_MAX o
      JOIN USER u ON o.user_id = u.user_id
      JOIN EXERCISE e ON o.exercise_id = e.exercise_id
      WHERE e.exercise_name IN ('Deadlift','Bench Press','Front Squat','Overhead Press')
      GROUP BY e.exercise_id, e.exercise_name, o.user_id, u.name
      ORDER BY e.exercise_name, max_orm DESC LIMIT 12`)

    // Cost distribution
    const [costDist] = await pool.execute(`
      SELECT cost_status, COUNT(*) AS cnt, ROUND(AVG(session_cost)) AS avg_cost
      FROM WORKOUT_LOG WHERE cost_status IS NOT NULL
      GROUP BY cost_status ORDER BY avg_cost ASC`)

    // Q1: user's starting vs max weight (correlated)
    const [ormProgress] = await pool.execute(`
      SELECT e.exercise_name,
        (SELECT ROUND(o1.weight_kg,1) FROM ONE_REP_MAX o1
         WHERE o1.user_id = ? AND o1.exercise_id = e.exercise_id
         ORDER BY o1.recorded_on ASC, o1.orm_id ASC LIMIT 1) AS starting_kg,
        (SELECT ROUND(MAX(sl.weight_used_kg),1)
         FROM SET_LOG sl JOIN WORKOUT_LOG wl ON sl.log_id = wl.log_id
         WHERE wl.user_id = ? AND sl.exercise_id = e.exercise_id) AS max_logged_kg
      FROM EXERCISE e
      WHERE e.exercise_name IN ('Deadlift','Bench Press','Front Squat','Overhead Press')
        AND EXISTS (SELECT 1 FROM ONE_REP_MAX o WHERE o.user_id = ? AND o.exercise_id = e.exercise_id)
      ORDER BY e.exercise_name`, [uid, uid, uid])

    res.json({ counts, aboveAvg, topLifts, costDist, ormProgress })
  } catch (e) {
    console.error('DBstats:', e.message)
    res.status(500).json({ error: e.message })
  }
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => console.log(`✅ FitTrack API listening on port ${PORT}`))
