import React, { useCallback, useEffect, useState } from 'react'
import { useStore } from '../store.js'
import { getDashboard, getExercises, createExercise, deleteExercise, addToSession, removeFromSession, createSession } from '../api.js'
import { calcPlates, TIER_INFO, IRON_RULES, getStrengthSessionKeys } from '../data.js'
import { PageLoader, EmptyState, Tier } from '../components.jsx'
import { AddExerciseModal, CreateSessionModal } from './TrainModals.jsx'

const SESSION_INFO = {
  A: { day: 'Monday',    desc: 'Lower body heavy — deadlift focus' },
  B: { day: 'Wednesday', desc: 'Upper body — bench and overhead press' },
  C: { day: 'Friday',    desc: 'Full body volume — moderate intensity' },
}

export default function WorkoutPage() {
  const {
    user, dashboard, setDashboard, exercises, setExercises,
    barWeight, plates, startWorkout, loading, setLoading, apiOnline, toast,
  } = useStore()

  const [tab, setTab]           = useState('A')
  const [expanded, setExpanded] = useState(null)
  const [plateSel, setPlateSel] = useState(null)
  const [addModalOpen, setAddModalOpen]     = useState(false)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [checked, setChecked]   = useState({})
  const [busy, setBusy]       = useState(false)
  const [error, setError]     = useState(null)

  const [newEx, setNewEx] = useState({ name: '', tier: '3', pct: '', muscles: '', pattern: 'other', bw: false })

  const sessions     = dashboard?.sessions || []
  const sessionKeys  = getStrengthSessionKeys(sessions)
  const activeKey    = sessionKeys.includes(tab) ? tab : (sessionKeys[0] || 'A')
  const tabExercises = sessions.filter(s => s.session_key === activeKey)
  const templateId   = tabExercises[0]?.template_id
  const wk           = dashboard?.plan?.strength_week || user?.strengthWeek || 1
  const wt           = dashboard?.plan?.computed_week_type || user?.weekType || 'Accumulation'

  const getTemplateId = key => sessions.find(s => s.session_key === key)?.template_id
  const systemExs = exercises.filter(e => !e.is_custom)
  const myExs     = exercises.filter(e => e.is_custom)
  const allExsForSelect = [...systemExs, ...myExs]

  const reload = useCallback(async () => {
    if (!user?.user_id) return
    setLoading('workout', true)
    setError(null)
    try {
      const [d, e] = await Promise.all([getDashboard(user.user_id), getExercises()])
      setDashboard(d)
      setExercises(e)
    } catch (e) {
      console.error(e)
      setError(e.message || 'Could not load training data')
    } finally {
      setLoading('workout', false)
    }
  }, [user?.user_id, setDashboard, setExercises, setLoading])

  useEffect(() => { reload() }, [reload])

  useEffect(() => {
    if (sessionKeys.length && !sessionKeys.includes(tab)) setTab(sessionKeys[0])
  }, [sessionKeys.join(','), tab])

  const handleCreate = async () => {
    if (!newEx.name.trim()) return
    setBusy(true)
    try {
      await createExercise({
        name: newEx.name.trim(),
        tier: parseInt(newEx.tier) || 3,
        movementPattern: newEx.pattern,
        isBodyweight: newEx.bw,
        defaultPercentage: parseFloat(newEx.pct) || null,
        primaryMuscles: newEx.muscles,
      })
      const createdName = newEx.name.trim()
      await reload()
      setShowCreate(false)
      setNewEx({ name: '', tier: '3', pct: '', muscles: '', pattern: 'other', bw: false })
      toast(`Created "${createdName}"`, 'success')
    } catch (e) {
      setError(e.message)
      toast(e.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const handleDeleteEx = async id => {
    if (!window.confirm('Delete this custom exercise permanently?')) return
    try {
      await deleteExercise(id)
      await reload()
    } catch (e) {
      setError(e.message)
    }
  }

  const handleAddToSession = async ({ targetSession, exerciseId, sets, reps, percentageRm, restDuration }) => {
    const tid = getTemplateId(targetSession)
    if (!tid) {
      toast(`Session ${targetSession} is not ready — try refreshing`, 'error')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await addToSession(tid, { exerciseId, sets, reps, percentageRm, restDuration })
      await reload()
      setTab(targetSession)
      setAddModalOpen(false)
      toast(`Exercise added to session ${targetSession}`, 'success')
    } catch (e) {
      setError(e.message)
      toast(e.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const handleCreateSession = async ({ sessionKey, dayOfWeek }) => {
    setBusy(true)
    setError(null)
    try {
      await createSession({ sessionKey, dayOfWeek })
      await reload()
      setTab(sessionKey)
      setCreateModalOpen(false)
      toast(`Session ${sessionKey} created — add exercises when ready`, 'success')
    } catch (e) {
      setError(e.message)
      toast(e.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const handleRemoveFromSession = async id => {
    if (!window.confirm('Remove this exercise from the session?')) return
    try {
      await removeFromSession(id)
      await reload()
      toast('Exercise removed from session', 'success')
    } catch (e) {
      setError(e.message)
      toast(e.message, 'error')
    }
  }

  if (loading.workout && !dashboard) {
    return <PageLoader label="Loading your sessions…" fullScreen />
  }

  return (
    <div className="page fade-up train-page">
      <header className="train-header">
        <div>
          <h1 className="page-title">Train</h1>
          <p className="page-sub">
            Three weekly strength sessions — review exercises, adjust your plan, then start a live session.
          </p>
        </div>
        <button type="button" className="btn btn-ghost train-refresh" onClick={reload} disabled={loading.workout}>
          {loading.workout ? 'Refreshing…' : '↻ Refresh'}
        </button>
      </header>

      {!apiOnline && (
        <div className="train-banner train-banner--warn">
          Backend offline — connect the API on port 3001 to load and save sessions.
        </div>
      )}

      {error && (
        <div className="train-banner train-banner--error" role="alert">
          <span>{error}</span>
          <button type="button" className="train-banner-dismiss" onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {sessionKeys.length === 0 ? (
        <EmptyState
          icon="🏋"
          title={apiOnline ? 'No sessions yet' : 'Cannot load sessions'}
          sub={apiOnline
            ? 'Your plan may still be setting up. Refresh, or sign out and register again if this persists.'
            : 'Start the backend server, then tap Refresh.'}
          action="Try again"
          onAction={reload}
        />
      ) : (
        <>
          <div className="train-tabs" role="tablist" style={{ gridTemplateColumns: `repeat(${sessionKeys.length}, 1fr)` }}>
            {sessionKeys.map(k => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={k === activeKey}
                className={`train-tab${k === activeKey ? ' active' : ''}`}
                onClick={() => { setTab(k); setExpanded(null); setPlateSel(null) }}
              >
                <span className="train-tab-key">Session {k}</span>
                <span className="train-tab-day">{SESSION_INFO[k]?.day || k}</span>
              </button>
            ))}
          </div>

          <p className="train-meta">
            {SESSION_INFO[activeKey]?.desc} · Week {wk} · {wt}
          </p>

          <div className="train-hero-card">
            <div>
              <div className="train-hero-title">Session {activeKey}</div>
              <div className="train-hero-sub">
                {tabExercises.length} exercise{tabExercises.length !== 1 ? 's' : ''}
                {tabExercises.some(e => e.target_weight_kg > 0)
                  ? ' · target weights ready'
                  : ' · set 1RMs in Settings for target weights'}
              </div>
            </div>
            <button
              type="button"
              className="btn btn-primary train-start-btn"
              disabled={!templateId || tabExercises.length === 0}
              onClick={() => startWorkout(activeKey, templateId)}
            >
              ▶ Start session
            </button>
          </div>

          <div className="train-section-head">
            <h2 className="section-title">Exercises</h2>
          </div>
          <div className="train-action-bar">
            <button type="button" className="btn btn-primary" onClick={() => setAddModalOpen(true)}>
              + Add to session
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setCreateModalOpen(true)}>
              New session day
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setShowCreate(true)}>
              Create exercise
            </button>
          </div>

          <AddExerciseModal
            open={addModalOpen}
            onClose={() => setAddModalOpen(false)}
            sessionKeys={sessionKeys}
            sessionInfo={Object.fromEntries(sessionKeys.map(k => [k, SESSION_INFO[k]?.day]))}
            systemExs={systemExs}
            myExs={myExs}
            defaultSession={activeKey}
            busy={busy}
            onSubmit={handleAddToSession}
          />
          <CreateSessionModal
            open={createModalOpen}
            onClose={() => setCreateModalOpen(false)}
            busy={busy}
            onSubmit={handleCreateSession}
          />


          <div className="train-ex-list">
            {tabExercises.length === 0 ? (
              <div className="train-empty-inline">
                No exercises in session {activeKey} yet. Add one above or refresh if you just registered.
              </div>
            ) : (
              tabExercises.map((ex, i) => {
                const isOpen = expanded === i
                const tw = ex.target_weight_kg
                const hasW = tw && tw > 0
                const pr = hasW ? calcPlates(tw, barWeight, plates) : null

                return (
                  <article key={ex.session_ex_id || i} className={`train-ex-card${isOpen ? ' open' : ''}`}>
                    <div className="train-ex-head">
                      <Tier n={ex.tier || 3} />
                      <div className="train-ex-info">
                        <h3 className="train-ex-name">{ex.exercise_name}</h3>
                        <p className="train-ex-prescription">
                          <strong>{ex.sets}</strong> × <strong>{ex.reps}</strong>
                          {ex.rest_duration && <span> · Rest {ex.rest_duration}</span>}
                          {ex.rpe_target && <span> · RPE {ex.rpe_target}</span>}
                        </p>
                      </div>
                      <div className="train-ex-weight">
                        <span className="train-ex-kg">{hasW ? `${tw} kg` : ex.is_bodyweight ? 'BW' : '—'}</span>
                        {ex.percentage_1rm != null && (
                          <span className="train-ex-pct">{Math.round(ex.percentage_1rm * 100)}% 1RM</span>
                        )}
                      </div>
                      <div className="train-ex-actions">
                        <button type="button" className="train-icon-btn" onClick={() => setExpanded(isOpen ? null : i)}
                          aria-expanded={isOpen}>
                          {isOpen ? '▲' : '▼'}
                        </button>
                        <button type="button" className="train-icon-btn train-icon-btn--danger"
                          title="Remove from session" onClick={() => handleRemoveFromSession(ex.session_ex_id)}>
                          ✕
                        </button>
                      </div>
                    </div>

                    {isOpen && (
                      <div className="train-ex-detail">
                        <div className="train-ex-meta-grid">
                          {[
                            ['Movement', ex.movement_pattern || '—'],
                            ['Muscles', (ex.primary_muscles || '—').replace(/_/g, ' ')],
                            ['Category', TIER_INFO[ex.tier]?.name || 'Accessory'],
                          ].map(([l, v]) => (
                            <div key={l} className="train-meta-cell">
                              <span className="train-meta-label">{l}</span>
                              <span>{v}</span>
                            </div>
                          ))}
                        </div>

                        {hasW && (
                          <div className="train-plates">
                            <button type="button" className="btn btn-ghost btn-sm"
                              onClick={() => setPlateSel(plateSel === i ? null : i)}>
                              {plateSel === i ? 'Hide plates' : 'Plate calculator'}
                            </button>
                            {plateSel === i && pr && (
                              <div className="train-plates-body">
                                <div className="train-plates-row">
                                  {pr.perSide.length === 0
                                    ? <span>Bar only ({barWeight} kg)</span>
                                    : pr.perSide.map((p, j) => (
                                      <span key={j} className="plate-badge">{p.weight}kg × {p.count}</span>
                                    ))}
                                </div>
                                {pr.warning && <p className="train-plates-warn">⚠ {pr.warning}</p>}
                                <p className="train-plates-total">Total: <strong>{pr.actual} kg</strong></p>
                              </div>
                            )}
                          </div>
                        )}

                        <div className="set-row">
                          {Array.from({ length: ex.sets }, (_, si) => {
                            const id = `prev_${activeKey}_${ex.session_ex_id}_${si}`
                            const done = !!checked[id]
                            return (
                              <button key={si} type="button" className={`set-btn${done ? ' done' : ''}`}
                                onClick={() => setChecked(c => ({ ...c, [id]: !c[id] }))}>
                                {done ? '✓' : si + 1}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </article>
                )
              })
            )}
          </div>

          <button type="button" className="btn btn-primary full train-bottom-start"
            disabled={!templateId || tabExercises.length === 0}
            onClick={() => startWorkout(activeKey, templateId)}>
            ▶ Start session {activeKey} — week {wk}
          </button>
        </>
      )}

      <section className="train-library">
        <div className="train-section-head">
          <div>
            <h2 className="section-title">Exercise library</h2>
            <p className="train-library-sub">Create custom movements, then add them to any session.</p>
          </div>
          <button type="button" className="btn btn-ghost btn-sm"
            onClick={() => { setShowCreate(a => !a); setShowAddSes(false) }}>
            {showCreate ? 'Cancel' : '+ Create exercise'}
          </button>
        </div>

        {showCreate && (
          <div className="train-form-card train-form-card--purple">
            <h3 className="train-form-title">New custom exercise</h3>
            <div className="train-form-grid">
              <div className="input-wrap train-form-span2">
                <label className="input-label">Name *</label>
                <input className="input" placeholder="Cable fly, Nordic curl…" value={newEx.name}
                  onChange={e => setNewEx(x => ({ ...x, name: e.target.value }))} autoFocus />
              </div>
              <div className="input-wrap">
                <label className="input-label">Tier</label>
                <select className="input" value={newEx.tier} onChange={e => setNewEx(x => ({ ...x, tier: e.target.value }))}>
                  <option value="1">T1 — Heavy compound</option>
                  <option value="2">T2 — Compound</option>
                  <option value="3">T3 — Accessory</option>
                </select>
              </div>
              <div className="input-wrap">
                <label className="input-label">% 1RM</label>
                <input className="input" type="number" step="0.05" value={newEx.pct}
                  onChange={e => setNewEx(x => ({ ...x, pct: e.target.value }))} />
              </div>
              <div className="input-wrap">
                <label className="input-label">Pattern</label>
                <select className="input" value={newEx.pattern} onChange={e => setNewEx(x => ({ ...x, pattern: e.target.value }))}>
                  {['push', 'pull', 'squat', 'hinge', 'lunge', 'core', 'other'].map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div className="input-wrap">
                <label className="input-label">Muscles</label>
                <input className="input" placeholder="chest, triceps" value={newEx.muscles}
                  onChange={e => setNewEx(x => ({ ...x, muscles: e.target.value }))} />
              </div>
              <label className="train-bw-check">
                <input type="checkbox" checked={newEx.bw}
                  onChange={e => setNewEx(x => ({ ...x, bw: e.target.checked }))} />
                Bodyweight exercise
              </label>
            </div>
            <button type="button" className="btn btn-primary full" onClick={handleCreate}
              disabled={busy || !newEx.name.trim()}>
              {busy ? 'Saving…' : 'Create exercise'}
            </button>
          </div>
        )}

        {myExs.length > 0 ? (
          <ul className="train-custom-list">
            {myExs.map(ex => (
              <li key={ex.exercise_id} className="train-custom-item">
                <Tier n={ex.tier || 3} />
                <div>
                  <div className="train-custom-name">{ex.exercise_name}</div>
                  <div className="train-custom-meta">{ex.movement_pattern || 'other'}</div>
                </div>
                <span className="pill pill-mg">Custom</span>
                <button type="button" className="train-icon-btn train-icon-btn--danger"
                  onClick={() => handleDeleteEx(ex.exercise_id)} title="Delete">✕</button>
              </li>
            ))}
          </ul>
        ) : !showCreate && (
          <p className="train-empty-inline">No custom exercises yet.</p>
        )}
      </section>

      {user?.includeRunning && (
        <details className="train-rules">
          <summary>Iron rules (running programme)</summary>
          <ul>
            {IRON_RULES.map(r => (
              <li key={r.n}>
                <strong>{r.title}</strong> — {r.text}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}
