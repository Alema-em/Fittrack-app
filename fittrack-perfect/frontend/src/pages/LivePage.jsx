import React, { useEffect, useRef, useState } from 'react'
import { useStore } from '../store.js'
import { logWorkout, getDashboard } from '../api.js'

const pad  = n => String(n).padStart(2, '0')
const fmt  = s => `${pad(Math.floor(s / 60))}:${pad(s % 60)}`
const fmtL = s => `${pad(Math.floor(s / 60))}m ${pad(s % 60)}s`

export default function LivePage() {
  const workout       = useStore(s => s.workout)
  const user          = useStore(s => s.user)
  const dashboard     = useStore(s => s.dashboard)
  const setDashboard  = useStore(s => s.setDashboard)
  const toggleSet     = useStore(s => s.toggleSet)
  const setPaused     = useStore(s => s.setPaused)
  const endWorkout    = useStore(s => s.endWorkout)
  const toast         = useStore(s => s.toast)

  const { sessionKey, templateId, paused, completedSets } = workout
  const [elapsed, setElapsed] = useState(0)
  const [ending, setEnding]   = useState(false)
  const timerRef = useRef(null)

  useEffect(() => {
    if (!user?.user_id || dashboard?.sessions?.length) return
    getDashboard(user.user_id).then(setDashboard).catch(() => {})
  }, [user?.user_id, dashboard?.sessions?.length, setDashboard])

  useEffect(() => {
    clearInterval(timerRef.current)
    if (!paused) timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000)
    return () => clearInterval(timerRef.current)
  }, [paused])

  if (!sessionKey) return null

  const exercises = (dashboard?.sessions || []).filter(s => s.session_key === sessionKey)
  const total     = exercises.reduce((a, ex) => a + (ex.sets || 0), 0)
  const done      = Object.values(completedSets).filter(Boolean).length
  const pct       = total > 0 ? done / total : 0

  const handleEnd = async () => {
    if (!window.confirm(`Finish session ${sessionKey}?\n\n${done}/${total} sets marked · ${fmtL(elapsed)}`)) return
    setEnding(true)
    try {
      if (templateId && user?.user_id) {
        await logWorkout({ userId: user.user_id, templateId })
        const d = await getDashboard(user.user_id)
        setDashboard(d)
        toast('Workout saved to your log', 'success')
      }
    } catch (e) {
      toast(e.message || 'Could not save workout', 'error')
    } finally {
      setEnding(false)
      endWorkout()
    }
  }

  return (
    <div className="live-page">
      <div className="live-glow" aria-hidden="true" />

      <div className="live-inner">
        <header className="live-top">
          <div className="live-badge">
            <span className="live-dot" />
            Live · Session {sessionKey}
          </div>
          <button type="button" className="btn btn-ghost btn-sm live-end-top" onClick={handleEnd} disabled={ending}>
            {ending ? 'Saving…' : 'Finish'}
          </button>
        </header>

        <section className="live-timer-block">
          <p className="live-label">Elapsed</p>
          <p className="live-timer">{fmt(elapsed)}</p>
          <div className="live-stats">
            <div>
              <span className="live-stat-val">{done}/{total}</span>
              <span className="live-stat-lbl">Sets</span>
            </div>
            <div>
              <span className="live-stat-val">{Math.round(pct * 100)}%</span>
              <span className="live-stat-lbl">Done</span>
            </div>
            <div>
              <span className={`live-stat-val${paused ? ' live-stat-val--warn' : ''}`}>{paused ? 'Paused' : 'Active'}</span>
              <span className="live-stat-lbl">Timer</span>
            </div>
          </div>
          <div className="live-progress">
            <div className="live-progress-fill" style={{ width: `${pct * 100}%` }} />
          </div>
          <p className="live-hint">
            {pct === 0 && 'Tap set numbers below as you complete each one'}
            {pct > 0 && pct < 1 && `${total - done} sets remaining`}
            {pct === 1 && 'All sets complete — great work!'}
          </p>
        </section>

        {exercises.length === 0 ? (
          <div className="live-empty">
            No exercises loaded for this session. Finish and check the Train tab, or refresh your plan.
          </div>
        ) : (
          <ul className="live-ex-list">
            {exercises.map((ex, i) => {
              const exDone = Array.from({ length: ex.sets }, (_, si) =>
                completedSets[`${sessionKey}_${i}_${si}`]
              ).filter(Boolean).length
              const allDone = exDone === ex.sets
              const tw = ex.target_weight_kg

              return (
                <li key={ex.session_ex_id || i} className={`live-ex${allDone ? ' live-ex--done' : ''}`}>
                  <div className="live-ex-row">
                    <span className={`tier tier-${ex.tier || 3}`}>T{ex.tier || 3}</span>
                    <div className="live-ex-meta">
                      <h3>{ex.exercise_name}</h3>
                      <p>{ex.sets}×{ex.reps}{ex.rest_duration ? ` · ${ex.rest_duration} rest` : ''}</p>
                    </div>
                    <span className="live-ex-load">
                      {tw > 0 ? `${tw} kg` : ex.is_bodyweight ? 'BW' : '—'}
                    </span>
                  </div>
                  <div className="set-row live-sets">
                    {Array.from({ length: ex.sets }, (_, si) => {
                      const id = `${sessionKey}_${i}_${si}`
                      const isDone = !!completedSets[id]
                      return (
                        <button
                          key={si}
                          type="button"
                          className={`set-btn${isDone ? ' done' : ''}`}
                          onClick={() => toggleSet(id)}
                        >
                          {isDone ? '✓' : si + 1}
                        </button>
                      )
                    })}
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        <footer className="live-controls">
          <button
            type="button"
            className="live-ctrl live-ctrl--pause"
            onClick={() => setPaused(!paused)}
            aria-pressed={paused}
          >
            <span className="live-ctrl-icon">{paused ? '▶' : '⏸'}</span>
            <span>{paused ? 'Resume' : 'Pause'}</span>
          </button>
          <button
            type="button"
            className="live-ctrl live-ctrl--finish"
            onClick={handleEnd}
            disabled={ending}
          >
            <span className="live-ctrl-icon">■</span>
            <span>{ending ? 'Saving…' : 'Finish workout'}</span>
          </button>
        </footer>
      </div>
    </div>
  )
}


