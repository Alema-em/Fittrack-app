import React, { useEffect, useState } from 'react'
import { useStore } from '../store.js'
import { getDbStats } from '../api.js'

export default function DatabasePage() {
  const { user, dbStats, setDbStats } = useStore()
  const [section,   setSection]   = useState('live')
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')

  const refresh = () => {
    if (!user?.user_id) return
    setLoading(true); setError('')
    getDbStats(user.user_id)
      .then(setDbStats)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { refresh() }, [user?.user_id])

  const SECTIONS = [
    { id:'live',     label:'Live Stats'   },
    { id:'erd',      label:'ERD'          },
    { id:'schema',   label:'Schema'       },
    { id:'queries',  label:'Queries'      },
    { id:'procs',    label:'Procedures'   },
    { id:'triggers', label:'Triggers'     },
  ]

  const Code = ({ children, color='#7dd3fc' }) => (
    <div style={{ background:'var(--surf2)', border:'1px solid var(--border)', borderRadius:'var(--r)',
      padding:'16px 18px', fontFamily:'var(--mono)', fontSize:11.5, color, lineHeight:1.9,
      overflowX:'auto', whiteSpace:'pre', marginTop:8, marginBottom:20 }}>
      {children}
    </div>
  )

  return (
    <div className="page">
      <h1 className="page-title">Database Design</h1>
      <p className="page-sub">
        Backed by MySQL (3NF). The Live Stats tab shows real query results from your running database instance.
        All other tabs document the full schema, queries, stored procedures, and triggers.
      </p>

      <div style={{ marginBottom:24, overflowX:'auto' }}>
        <div className="tab-row" style={{ width:'fit-content', minWidth:'100%' }}>
          {SECTIONS.map(s=>(
            <button key={s.id} className={`tab-btn ${s.id===section?'on':'off'}`} onClick={()=>setSection(s.id)}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── LIVE STATS ───────────────────────────────────────── */}
      {section==='live' && (
        <div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
            <div className="section-title">Live Query Results</div>
            <button className="btn btn-ghost sm" onClick={refresh} disabled={loading}>
              {loading ? 'Querying…' : '↻ Refresh'}
            </button>
          </div>

          {error && (
            <div className="callout-bad callout mb-16">
              <div style={{ fontWeight:600, color:'var(--bad)', marginBottom:4 }}>Database error</div>
              <div className="callout-text">{error}</div>
              <div style={{ marginTop:8, fontSize:12, color:'var(--t3)' }}>Is the backend running? Run: <code style={{ color:'var(--cy)' }}>cd backend && node server.js</code></div>
            </div>
          )}

          {dbStats && (
            <>
              {/* Row counts */}
              <div className="section-title mb-10">Table Row Counts</div>
              <div style={{ background:'var(--surf2)', borderRadius:10, padding:12, marginBottom:20 }}>
                <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--t3)', letterSpacing:'.1em', marginBottom:10 }}>
                  SELECT COUNT(*) FROM each table
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
                  {Object.entries(dbStats.counts||{}).map(([table, count])=>(
                    <div key={table} style={{ background:'var(--surf)', borderRadius:9, padding:'10px 12px', border:'1px solid var(--border)' }}>
                      <div style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--t3)', marginBottom:4 }}>{table}</div>
                      <div style={{ fontFamily:'var(--mono)', fontSize:20, fontWeight:700, color:'var(--cy)' }}>{count}</div>
                      <div style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--t3)', marginTop:2 }}>rows</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Session cost distribution */}
              {dbStats.costDist?.length > 0 && (
                <div className="mb-20">
                  <div className="section-title mb-6">Session Cost Distribution</div>
                  <div style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--t3)', marginBottom:10 }}>
                    SELECT cost_status, COUNT(*), AVG(session_cost) FROM WORKOUT_LOG GROUP BY cost_status
                  </div>
                  <div className="card" style={{ padding:4 }}>
                    {dbStats.costDist.map((row,i)=>(
                      <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 16px', borderBottom: i<dbStats.costDist.length-1?'1px solid var(--border)':'none' }}>
                        <div style={{ width:72, fontFamily:'var(--mono)', fontSize:11, fontWeight:600,
                          color:row.cost_status==='very_high'?'var(--bad)':row.cost_status==='high'?'var(--warn)':row.cost_status==='moderate'?'var(--cy)':'var(--good)' }}>
                          {row.cost_status?.replace('_',' ').toUpperCase()}
                        </div>
                        <div style={{ flex:1, height:8, background:'var(--border)', borderRadius:4, overflow:'hidden' }}>
                          <div style={{ height:'100%', width:`${(row.count/10)*100}%`, background:'var(--gd)', borderRadius:4 }}/>
                        </div>
                        <div style={{ fontFamily:'var(--mono)', fontSize:12, color:'var(--t1)', minWidth:32, textAlign:'right' }}>{row.count}</div>
                        <div style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--t3)', minWidth:64, textAlign:'right' }}>avg {Math.round(row.avg_cost)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Q3 result: above average users */}
              <div className="mb-20">
                <div className="section-title mb-6">Q3 Result — Users Above Average Monthly Workouts</div>
                <div style={{ background:'var(--surf2)', borderRadius:9, padding:'10px 14px', fontFamily:'var(--mono)', fontSize:11, color:'var(--t3)', marginBottom:10, lineHeight:1.8 }}>
                  {`SELECT u.name, COUNT(wl.log_id) workouts_this_month\nFROM USER u JOIN WORKOUT_LOG wl ON u.user_id=wl.user_id\nWHERE MONTH=CURRENT_MONTH\nGROUP BY u.user_id\nHAVING COUNT > (SELECT AVG(c) FROM (...) t)`}
                </div>
                {dbStats.aboveAvg?.length > 0 ? (
                  <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                    {dbStats.aboveAvg.map((row,i)=>(
                      <div key={i} className="card" style={{ padding:'10px 16px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                        <span style={{ fontSize:14, fontWeight:600 }}>{row.name}</span>
                        <span style={{ fontFamily:'var(--mono)', fontSize:14, color:'var(--cy)' }}>{row.workouts_this_month} sessions</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize:13, color:'var(--t3)' }}>No results yet this month.</div>
                )}
              </div>

              {/* Top lifters */}
              {dbStats.topLifts?.length > 0 && (
                <div className="mb-20">
                  <div className="section-title mb-6">Top 1RMs per T1 Exercise</div>
                  <div style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--t3)', marginBottom:10 }}>
                    SELECT exercise_name, user_name, MAX(weight_kg) GROUP BY exercise_id, user_id
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                    {dbStats.topLifts.map((row,i)=>(
                      <div key={i} className="card" style={{ padding:'10px 16px', display:'flex', alignItems:'center', gap:12 }}>
                        <span className="tier tier-1">T1</span>
                        <span style={{ fontSize:13, color:'var(--t2)', flex:1 }}>{row.exercise_name}</span>
                        <span style={{ fontSize:14, fontWeight:600 }}>{row.user_name}</span>
                        <span style={{ fontFamily:'var(--mono)', fontSize:14, color:'var(--cy)' }}>{row.max_orm}kg</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* User's ORM progress (Q1) */}
              {dbStats.ormProgress?.length > 0 && (
                <div className="mb-8">
                  <div className="section-title mb-6">Q1 — Your Starting vs Max Weight (Correlated Subquery)</div>
                  <div style={{ background:'var(--surf2)', borderRadius:9, padding:'10px 14px', fontFamily:'var(--mono)', fontSize:11, color:'var(--t3)', marginBottom:10, lineHeight:1.8 }}>
                    {`(SELECT weight_kg FROM ONE_REP_MAX WHERE user_id=? AND exercise_id=e.exercise_id\n ORDER BY recorded_on ASC LIMIT 1) AS starting_kg`}
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                    {dbStats.ormProgress.filter(r=>r.starting_kg||r.max_logged_kg).map((row,i)=>(
                      <div key={i} className="card" style={{ padding:'10px 16px', display:'flex', alignItems:'center', gap:12 }}>
                        <span style={{ fontSize:14, fontWeight:600, flex:1 }}>{row.exercise_name}</span>
                        <span style={{ fontFamily:'var(--mono)', fontSize:12, color:'var(--t3)' }}>Start: {row.starting_kg||'—'}kg</span>
                        <span style={{ fontFamily:'var(--mono)', fontSize:14, color:'var(--good)', fontWeight:600 }}>Max: {row.max_logged_kg||'—'}kg</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── ERD ──────────────────────────────────────────────── */}
      {section==='erd' && (
        <div>
          <div className="section-title mb-12">Entity-Relationship Diagram</div>
          <div className="callout mb-16">
            <div className="callout-text">
              <strong style={{ color:'var(--t1)' }}>Problem Statement:</strong> FitTrack solves the problem of athletes having no structured, data-driven way to track strength and running progress simultaneously. The system auto-generates periodised sessions using percentage-based loading from Prilepin's chart, tracks fatigue as TSS, and runs a 4-phase sub-19 5K programme.
            </div>
          </div>
          <div className="card card-dark" style={{ padding:20 }}>
            <div style={{ fontWeight:700, color:'var(--t1)', marginBottom:12, fontSize:14 }}>Entities &amp; Relationships</div>
            {[
              ['USER',             '1','──has──','N','WORKOUT_LOG',      'One user logs many workout sessions'],
              ['USER',             '1','──has──','1','WORKOUT_PLAN',     'One active plan per user at a time'],
              ['WORKOUT_PLAN',     '1','──has──','N','SESSION_TEMPLATE', 'A plan has 3 templates (A, B, C)'],
              ['SESSION_TEMPLATE', 'N','──has──','N','EXERCISE',         'Templates have many exercises (via SESSION_EXERCISE)'],
              ['WORKOUT_LOG',      '1','──has──','N','SET_LOG',          'Each session log has many individual set records (weak entity)'],
              ['USER',             '1','──has──','N','ONE_REP_MAX',      'A user tracks 1RM history over time'],
              ['USER',             '1','──has──','N','RUNNING_LOG',      'One user logs many running sessions'],
            ].map(([e1,c1,rel,c2,e2,desc],i)=>(
              <div key={i} style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 0', borderBottom:'1px solid var(--border)', flexWrap:'wrap' }}>
                <span style={{ color:'var(--cy)', fontWeight:700, minWidth:150, fontFamily:'var(--mono)', fontSize:12 }}>{e1}</span>
                <span style={{ color:'var(--t3)', fontFamily:'var(--mono)', fontSize:12, minWidth:16 }}>{c1}</span>
                <span style={{ color:'var(--t2)', fontFamily:'var(--mono)', fontSize:12 }}>{rel}</span>
                <span style={{ color:'var(--t3)', fontFamily:'var(--mono)', fontSize:12, minWidth:16 }}>{c2}</span>
                <span style={{ color:'var(--mg)', fontWeight:700, minWidth:170, fontFamily:'var(--mono)', fontSize:12 }}>{e2}</span>
                <span style={{ color:'var(--t3)', fontSize:12 }}>{desc}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop:16, padding:14, background:'var(--surf2)', borderRadius:10, fontSize:13, color:'var(--t2)', lineHeight:1.8 }}>
            <strong style={{ color:'var(--t1)' }}>Normalisation:</strong> All tables are in 3NF.
            SET_LOG is a weak entity (identified by log_id + set_number).
            SESSION_EXERCISE is a junction table resolving the M:N relationship between SESSION_TEMPLATE and EXERCISE.
            ONE_REP_MAX stores historical entries — not updated in place — to preserve full progression history.
          </div>
        </div>
      )}

      {/* ── SCHEMA ───────────────────────────────────────────── */}
      {section==='schema' && (
        <div>
          <div className="section-title mb-16">Relational Schema — Normalised to 3NF</div>
          <div style={{ marginBottom:16, padding:14, background:'var(--surf2)', borderRadius:10, fontFamily:'var(--mono)', fontSize:11, color:'var(--t3)', lineHeight:1.8 }}>
            9 tables · 3 views · 6 indexes · 2 functions · 3 procedures · 2 triggers · 2 DB users (app_user, admin_user)
          </div>
          {[
            { name:'USER', pk:'user_id', cols:[['user_id','INT','PK'],['name','VARCHAR(100)','NOT NULL'],['email','VARCHAR(150)','UNIQUE NOT NULL'],['password_hash','VARCHAR(255)','SHA2 hashed'],['bodyweight_kg','FLOAT','CHECK > 0'],['dob','DATE',''],['fitness_goal','VARCHAR(50)','ENUM check'],['created_at','TIMESTAMP','DEFAULT NOW']] },
            { name:'EXERCISE', pk:'exercise_id', cols:[['exercise_id','INT','PK'],['exercise_name','VARCHAR(100)','NOT NULL'],['tier','INT','1/2/3 check'],['movement_pattern','VARCHAR(50)',''],['is_bodyweight','BOOLEAN','DEFAULT FALSE'],['default_percentage','FLOAT','0–1'],['default_sets / default_reps','INT','CHECK > 0'],['is_custom','BOOLEAN','DEFAULT FALSE'],['created_by','INT','FK → USER, SET NULL']] },
            { name:'ONE_REP_MAX', pk:'orm_id', cols:[['orm_id','INT','PK'],['user_id','INT','FK → USER CASCADE'],['exercise_id','INT','FK → EXERCISE CASCADE'],['weight_kg','FLOAT','CHECK > 0'],['recorded_on','DATE','DEFAULT CURRENT_DATE']] },
            { name:'WORKOUT_PLAN', pk:'plan_id', cols:[['plan_id','INT','PK'],['user_id','INT','FK → USER CASCADE'],['strength_week','INT','DEFAULT 1'],['running_phase / running_week','INT','1–4 check'],['week_type','VARCHAR(20)','Accumulation/Intensification/Deload'],['is_active','BOOLEAN','TRUE']] },
            { name:'SESSION_TEMPLATE', pk:'template_id', cols:[['template_id','INT','PK'],['plan_id','INT','FK → WORKOUT_PLAN CASCADE'],['session_key','VARCHAR(10)','A, B, C, W{n}A etc.'],['day_of_week','VARCHAR(10)',''],['session_type','VARCHAR(20)','strength/running/rest'],['scope','VARCHAR(20)','permanent/this_week']] },
            { name:'SESSION_EXERCISE (junction)', pk:'session_ex_id', cols:[['session_ex_id','INT','PK'],['template_id','INT','FK → SESSION_TEMPLATE'],['exercise_id','INT','FK → EXERCISE'],['sets','INT','CHECK > 0'],['reps','VARCHAR(20)','e.g. 5 or 6'],['percentage_1rm','FLOAT','0–1'],['rpe_target / rest_duration','VARCHAR',''],['display_order','INT','DEFAULT 1']] },
            { name:'WORKOUT_LOG', pk:'log_id', cols:[['log_id','INT','PK'],['user_id','INT','FK → USER CASCADE'],['template_id','INT','FK → SESSION_TEMPLATE CASCADE'],['workout_date','DATE','DEFAULT CURRENT_DATE'],['session_cost','INT','TSS score'],['cost_status','VARCHAR(20)','low/moderate/high/very_high'],['notes','TEXT','']] },
            { name:'SET_LOG (weak entity)', pk:'set_log_id', cols:[['set_log_id','INT','PK'],['log_id','INT','FK → WORKOUT_LOG CASCADE'],['exercise_id','INT','FK → EXERCISE CASCADE'],['set_number','INT','CHECK > 0'],['reps_done','INT','CHECK ≥ 0'],['weight_used_kg','FLOAT','CHECK ≥ 0'],['rpe_actual','FLOAT','1–10'],['completed','BOOLEAN','DEFAULT TRUE']] },
            { name:'RUNNING_LOG', pk:'run_log_id', cols:[['run_log_id','INT','PK'],['user_id','INT','FK → USER CASCADE'],['run_date','DATE','DEFAULT CURRENT_DATE'],['session_type','VARCHAR(30)','zone2/speed/long_run/recovery'],['running_phase / running_week','INT','1–4'],['distance_km','FLOAT','CHECK > 0'],['duration_seconds','INT',''],['avg_pace_min_per_km','FLOAT',''],['notes','TEXT','']] },
          ].map(tbl=>(
            <div key={tbl.name} className="schema-section">
              <div className="schema-table-name">{tbl.name}</div>
              <div className="card" style={{ padding:0, overflow:'hidden', overflowX:'auto' }}>
                <table className="schema-table">
                  <thead><tr><th>Column</th><th>Type</th><th>Constraint / Notes</th></tr></thead>
                  <tbody>{tbl.cols.map(([col,type,note])=>(
                    <tr key={col}>
                      <td style={{ fontFamily:'var(--mono)', fontWeight:600 }}>{col}</td>
                      <td className="type-tag">{type}</td>
                      <td style={{ color:'var(--t2)', fontSize:12 }}>{note}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
          ))}

          <div className="section-title mb-10" style={{ marginTop:8 }}>Indexes</div>
          <div className="card" style={{ padding:14, fontFamily:'var(--mono)', fontSize:12, color:'var(--t2)', lineHeight:2 }}>
            {['idx_workout_log_user     ON WORKOUT_LOG(user_id)',
              'idx_workout_log_date     ON WORKOUT_LOG(workout_date)',
              'idx_set_log_log          ON SET_LOG(log_id)',
              'idx_set_log_exercise     ON SET_LOG(exercise_id)',
              'idx_orm_user_exercise    ON ONE_REP_MAX(user_id, exercise_id)',
              'idx_workout_plan_user    ON WORKOUT_PLAN(user_id, is_active)',
            ].map((idx,i)=><div key={i} style={{ color: i%2===0?'var(--cy)':'var(--t1)' }}>CREATE INDEX {idx}</div>)}
          </div>
        </div>
      )}

      {/* ── QUERIES ──────────────────────────────────────────── */}
      {section==='queries' && (
        <div>
          <div className="section-title mb-16">SQL Queries</div>
          {[
            { title:'Q1 — Correlated Subquery: Starting vs Max Weight per Exercise', desc:'For each exercise a user has tracked, compares their starting 1RM to the maximum weight ever logged in a real set. Uses two correlated subqueries and EXISTS.',
              sql:`SET @demo_user_id = 1;
SELECT e.exercise_id, e.exercise_name,
  (SELECT orm_start.weight_kg FROM ONE_REP_MAX orm_start
   WHERE orm_start.user_id = @demo_user_id
     AND orm_start.exercise_id = e.exercise_id
   ORDER BY orm_start.recorded_on ASC, orm_start.orm_id ASC
   LIMIT 1) AS starting_weight_kg,
  (SELECT MAX(sl.weight_used_kg)
   FROM SET_LOG sl JOIN WORKOUT_LOG wl ON sl.log_id = wl.log_id
   WHERE wl.user_id = @demo_user_id
     AND sl.exercise_id = e.exercise_id) AS max_logged_weight_kg
FROM EXERCISE e
WHERE EXISTS (
  SELECT 1 FROM ONE_REP_MAX orm
  WHERE orm.user_id = @demo_user_id
    AND orm.exercise_id = e.exercise_id
)
ORDER BY e.exercise_name;` },
            { title:'Q2 — Correlated: Exercises Where Actual > Planned Weight', desc:'Finds sets where the athlete lifted more than their prescribed percentage. Uses a correlated subquery inside WHERE to compute the planned weight dynamically.',
              sql:`SELECT DISTINCT e.exercise_name, wl.workout_date,
  sl.weight_used_kg AS actual_kg,
  ROUND(se.percentage_1rm * (
    SELECT MAX(orm.weight_kg) FROM ONE_REP_MAX orm
    WHERE orm.user_id = wl.user_id
      AND orm.exercise_id = sl.exercise_id
  ), 1) AS planned_kg
FROM WORKOUT_LOG wl
JOIN SET_LOG sl ON wl.log_id = sl.log_id
JOIN SESSION_EXERCISE se
  ON wl.template_id = se.template_id
  AND sl.exercise_id = se.exercise_id
JOIN EXERCISE e ON sl.exercise_id = e.exercise_id
WHERE wl.user_id = 1
  AND YEARWEEK(wl.workout_date,1) = YEARWEEK(CURRENT_DATE,1)
  AND se.percentage_1rm IS NOT NULL
  AND sl.weight_used_kg > se.percentage_1rm * (
    SELECT MAX(orm.weight_kg) FROM ONE_REP_MAX orm
    WHERE orm.user_id = wl.user_id
      AND orm.exercise_id = sl.exercise_id
  )
ORDER BY wl.workout_date, e.exercise_name;` },
            { title:'Q3 — Nested Subquery: Users Above Average Monthly Workouts', desc:'Uses a nested subquery inside HAVING to find the platform average, then filters users who exceed it. The inner subquery aggregates all users, the outer filters the result.',
              sql:`SELECT u.user_id, u.name,
  COUNT(wl.log_id) AS workouts_this_month
FROM USER u
JOIN WORKOUT_LOG wl ON u.user_id = wl.user_id
WHERE YEAR(wl.workout_date)  = YEAR(CURRENT_DATE)
  AND MONTH(wl.workout_date) = MONTH(CURRENT_DATE)
GROUP BY u.user_id, u.name
HAVING COUNT(wl.log_id) > (
  SELECT AVG(user_workout_count)
  FROM (
    SELECT COUNT(wl2.log_id) AS user_workout_count
    FROM USER u2
    LEFT JOIN WORKOUT_LOG wl2
      ON u2.user_id = wl2.user_id
      AND YEAR(wl2.workout_date)  = YEAR(CURRENT_DATE)
      AND MONTH(wl2.workout_date) = MONTH(CURRENT_DATE)
    GROUP BY u2.user_id
  ) AS monthly_counts
)
ORDER BY workouts_this_month DESC;` },
          ].map((q,i)=>(
            <div key={i}>
              <div style={{ fontSize:15, fontWeight:600, color:'var(--t1)', marginBottom:4 }}>{q.title}</div>
              <div style={{ fontSize:13, color:'var(--t2)', marginBottom:6, lineHeight:1.6 }}>{q.desc}</div>
              <Code>{q.sql}</Code>
            </div>
          ))}
        </div>
      )}

      {/* ── PROCEDURES ───────────────────────────────────────── */}
      {section==='procs' && (
        <div>
          <div className="section-title mb-16">Stored Procedures &amp; Functions</div>
          {[
            { title:'FUNCTION GetWeekType(p_strength_week)', desc:'Deterministic function — maps any week number to its cycle label using MOD(week-1,4)+1.',
              sql:`CREATE FUNCTION GetWeekType(p_strength_week INT)
RETURNS VARCHAR(20) DETERMINISTIC
BEGIN
  DECLARE v_cycle_week INT;
  SET v_cycle_week = MOD(p_strength_week - 1, 4) + 1;
  RETURN CASE
    WHEN v_cycle_week IN (1,2) THEN 'Accumulation'
    WHEN v_cycle_week = 3      THEN 'Intensification'
    ELSE                            'Deload'
  END;
END;`, color:'#86efac' },
            { title:'FUNCTION CalculateExerciseCost(exercise_id, sets, reps, pct)', desc:'Returns Training Stress Score for one exercise. Reads the tier from EXERCISE table, applies multiplier (T1=1.5, T2=1.2, T3=1.0), multiplies by volume and intensity.',
              sql:`CREATE FUNCTION CalculateExerciseCost(
  p_exercise_id INT, p_sets INT,
  p_reps INT, p_percentage FLOAT
) RETURNS INT READS SQL DATA
BEGIN
  DECLARE v_tier INT DEFAULT 3;
  DECLARE v_tier_multiplier FLOAT DEFAULT 1.0;
  SELECT COALESCE(tier,3) INTO v_tier
  FROM EXERCISE WHERE exercise_id = p_exercise_id;
  SET v_tier_multiplier = CASE v_tier
    WHEN 1 THEN 1.50 WHEN 2 THEN 1.20 ELSE 1.00 END;
  RETURN ROUND(
    COALESCE(p_sets,0) * COALESCE(p_reps,0)
    * COALESCE(p_percentage,0.50) * 10 * v_tier_multiplier
  );
END;`, color:'#86efac' },
            { title:'PROCEDURE RegisterUser(name, email, password, bodyweight, goal)', desc:'Creates user with SHA2-hashed password, auto-creates workout plan, auto-generates starter 1RMs from bodyweight, and creates the 3 session templates (A, B, C).',
              sql:`CREATE PROCEDURE RegisterUser(
  IN p_name VARCHAR(100),  IN p_email VARCHAR(150),
  IN p_password VARCHAR(255), IN p_bodyweight FLOAT,
  IN p_goal VARCHAR(50)
)
BEGIN
  DECLARE v_user_id INT; DECLARE v_plan_id INT;
  INSERT INTO USER (name,email,password_hash,bodyweight_kg,fitness_goal)
  VALUES (p_name, p_email, SHA2(p_password,256), p_bodyweight, p_goal);
  SET v_user_id = LAST_INSERT_ID();

  INSERT INTO WORKOUT_PLAN (user_id,strength_week,week_type,is_active)
  VALUES (v_user_id, 1, GetWeekType(1), TRUE);
  SET v_plan_id = LAST_INSERT_ID();

  -- Auto-generate 1RMs from bodyweight
  INSERT INTO ONE_REP_MAX (user_id,exercise_id,weight_kg,recorded_on)
  SELECT v_user_id, exercise_id,
    ROUND(p_bodyweight *
      CASE tier WHEN 1 THEN 0.90 WHEN 2 THEN 0.65 ELSE 0.40 END, 1),
    CURRENT_DATE
  FROM EXERCISE WHERE is_bodyweight = FALSE;

  INSERT INTO SESSION_TEMPLATE (plan_id,session_key,day_of_week,session_type,scope)
  VALUES (v_plan_id,'A','Monday','strength','permanent'),
         (v_plan_id,'B','Wednesday','strength','permanent'),
         (v_plan_id,'C','Friday','strength','permanent');
END;`, color:'#7dd3fc' },
            { title:'PROCEDURE LogWorkout(user_id, template_id, date)', desc:'Calculates session TSS using CalculateExerciseCost for each exercise, inserts WORKOUT_LOG row, then auto-generates SET_LOG entries using a recursive CTE to enumerate set numbers.',
              sql:`CREATE PROCEDURE LogWorkout(
  IN p_user_id INT, IN p_template_id INT, IN p_workout_date DATE
)
BEGIN
  DECLARE v_log_id INT; DECLARE v_cost INT DEFAULT 0;
  SELECT COALESCE(SUM(
    CalculateExerciseCost(se.exercise_id, se.sets,
      CAST(se.reps AS UNSIGNED), se.percentage_1rm)
  ),0) INTO v_cost FROM SESSION_EXERCISE se
  WHERE se.template_id = p_template_id;

  INSERT INTO WORKOUT_LOG (user_id,template_id,workout_date,session_cost,cost_status)
  VALUES (p_user_id, p_template_id, COALESCE(p_workout_date,CURRENT_DATE),
    v_cost, CASE WHEN v_cost<200 THEN 'low' WHEN v_cost<300 THEN 'moderate'
                 WHEN v_cost<400 THEN 'high' ELSE 'very_high' END);
  SET v_log_id = LAST_INSERT_ID();

  -- Use recursive CTE to generate set numbers
  WITH RECURSIVE set_numbers(n) AS (
    SELECT 1 UNION ALL SELECT n+1 FROM set_numbers WHERE n < 20
  )
  INSERT INTO SET_LOG (log_id,exercise_id,set_number,reps_done,weight_used_kg,rpe_actual)
  SELECT v_log_id, se.exercise_id, set_numbers.n,
    CAST(se.reps AS UNSIGNED),
    ROUND(COALESCE(se.percentage_1rm,0) *
      COALESCE((SELECT MAX(orm.weight_kg) FROM ONE_REP_MAX orm
                WHERE orm.user_id=p_user_id AND orm.exercise_id=se.exercise_id),0), 1),
    CAST(COALESCE(se.rpe_target,'7') AS DECIMAL(3,1))
  FROM SESSION_EXERCISE se
  JOIN set_numbers ON set_numbers.n <= se.sets
  WHERE se.template_id = p_template_id;
END;`, color:'#7dd3fc' },
            { title:'PROCEDURE AdvanceWeek(user_id)', desc:'Increments strength_week, updates week_type via GetWeekType(), then copies permanent session templates into this_week-scoped templates with adjusted percentage_1rm (+5% for Intensification, ×0.75 for Deload).',
              sql:`CREATE PROCEDURE AdvanceWeek(IN p_user_id INT)
BEGIN
  -- Increment week and update type
  UPDATE WORKOUT_PLAN
  SET strength_week = strength_week + 1,
      week_type = GetWeekType(strength_week + 1)
  WHERE user_id = p_user_id AND is_active = TRUE;

  -- Clone permanent templates as this_week scope with adjusted %
  INSERT INTO SESSION_EXERCISE (template_id,exercise_id,sets,reps,percentage_1rm,...)
  SELECT new_st.template_id, old_se.exercise_id,
    CASE WHEN v_week_type='Deload' THEN GREATEST(old_se.sets-1,1) ELSE old_se.sets END,
    old_se.reps,
    CASE
      WHEN old_se.percentage_1rm IS NULL          THEN NULL
      WHEN v_week_type = 'Intensification'        THEN LEAST(percentage_1rm+0.05, 0.90)
      WHEN v_week_type = 'Deload'                 THEN ROUND(percentage_1rm*0.75, 2)
      ELSE percentage_1rm END
  FROM ... WHERE NOT EXISTS (duplicate check);
END;`, color:'#7dd3fc' },
          ].map((p,i)=>(
            <div key={i}>
              <div style={{ fontSize:15, fontWeight:600, color:'var(--t1)', marginBottom:4 }}>{p.title}</div>
              <div style={{ fontSize:13, color:'var(--t2)', marginBottom:6, lineHeight:1.6 }}>{p.desc}</div>
              <Code color={p.color}>{p.sql}</Code>
            </div>
          ))}
        </div>
      )}

      {/* ── TRIGGERS ─────────────────────────────────────────── */}
      {section==='triggers' && (
        <div>
          <div className="section-title mb-16">Triggers</div>
          {[
            { title:'TRIGGER trg_after_insert_set_log_new_1rm', when:'AFTER INSERT on SET_LOG', desc:'Fires after every set is logged. Gets the user_id from the parent WORKOUT_LOG, checks the current max 1RM for that exercise, and inserts a new ONE_REP_MAX record if the new weight is higher. Keeps 1RM history automatic.',
              sql:`CREATE TRIGGER trg_after_insert_set_log_new_1rm
AFTER INSERT ON SET_LOG FOR EACH ROW
BEGIN
  DECLARE v_user_id     INT;
  DECLARE v_current_max FLOAT DEFAULT 0;

  SELECT wl.user_id INTO v_user_id
  FROM WORKOUT_LOG wl WHERE wl.log_id = NEW.log_id;

  SELECT COALESCE(MAX(orm.weight_kg), 0) INTO v_current_max
  FROM ONE_REP_MAX orm
  WHERE orm.user_id = v_user_id
    AND orm.exercise_id = NEW.exercise_id;

  IF NEW.weight_used_kg > v_current_max THEN
    INSERT INTO ONE_REP_MAX (user_id, exercise_id, weight_kg, recorded_on)
    VALUES (v_user_id, NEW.exercise_id, NEW.weight_used_kg, CURRENT_DATE);
  END IF;
END;` },
            { title:'TRIGGER trg_after_insert_workout_log_advance_week', when:'AFTER INSERT on WORKOUT_LOG', desc:'After a workout is logged, counts distinct strength sessions completed this calendar week. If the count matches the number of planned sessions, automatically calls AdvanceWeek(). Handles both permanent and this_week scoped templates.',
              sql:`CREATE TRIGGER trg_after_insert_workout_log_advance_week
AFTER INSERT ON WORKOUT_LOG FOR EACH ROW
BEGIN
  DECLARE v_plan_id           INT;
  DECLARE v_planned_sessions  INT DEFAULT 0;
  DECLARE v_completed_sessions INT DEFAULT 0;

  SELECT st.plan_id INTO v_plan_id
  FROM SESSION_TEMPLATE st WHERE st.template_id = NEW.template_id;

  SELECT COUNT(*) INTO v_planned_sessions
  FROM SESSION_TEMPLATE st
  WHERE st.plan_id = v_plan_id AND st.session_type = 'strength'
    AND st.scope = 'permanent';

  SELECT COUNT(DISTINCT wl.template_id) INTO v_completed_sessions
  FROM WORKOUT_LOG wl
  JOIN SESSION_TEMPLATE st ON wl.template_id = st.template_id
  WHERE wl.user_id = NEW.user_id AND st.plan_id = v_plan_id
    AND st.session_type = 'strength'
    AND YEARWEEK(wl.workout_date, 1) = YEARWEEK(NEW.workout_date, 1);

  IF v_planned_sessions > 0
    AND v_completed_sessions >= v_planned_sessions THEN
    CALL AdvanceWeek(NEW.user_id);
  END IF;
END;` },
          ].map((t,i)=>(
            <div key={i}>
              <div style={{ fontSize:15, fontWeight:600, color:'var(--t1)', marginBottom:2 }}>{t.title}</div>
              <div style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--mg)', marginBottom:6, letterSpacing:'.06em' }}>{t.when}</div>
              <div style={{ fontSize:13, color:'var(--t2)', marginBottom:6, lineHeight:1.6 }}>{t.desc}</div>
              <Code color="#f9a8d4">{t.sql}</Code>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
