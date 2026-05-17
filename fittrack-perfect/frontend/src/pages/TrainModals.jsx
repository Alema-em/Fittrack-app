import React, { useState, useEffect } from 'react'
import { Modal } from '../components.jsx'

const DEFAULT_SESSION_INFO = {
  A: 'Monday',
  B: 'Wednesday',
  C: 'Friday',
}

export function AddExerciseModal({
  open,
  onClose,
  sessionKeys,
  sessionInfo,
  systemExs,
  myExs,
  defaultSession,
  busy,
  onSubmit,
}) {
  const [targetSession, setTargetSession] = useState(defaultSession || 'A')
  const [exerciseId, setExerciseId]       = useState('')
  const [sets, setSets]                   = useState('3')
  const [reps, setReps]                   = useState('10')
  const [pct, setPct]                     = useState('')
  const [rest, setRest]                   = useState('2 min')

  useEffect(() => {
    if (open) {
      setTargetSession(defaultSession || sessionKeys[0] || 'A')
      setExerciseId('')
      setSets('3')
      setReps('10')
      setPct('')
      setRest('2 min')
    }
  }, [open, defaultSession, sessionKeys])

  const info = { ...DEFAULT_SESSION_INFO, ...sessionInfo }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add to session"
      subtitle="Pick a session day and exercise from your library."
      wide
    >
      <div className="train-form-grid">
        <div className="input-wrap">
          <label className="input-label">Session</label>
          <select className="input" value={targetSession} onChange={e => setTargetSession(e.target.value)}>
            {sessionKeys.map(k => (
              <option key={k} value={k}>
                Session {k}{info[k] ? ` — ${info[k]}` : ''}
              </option>
            ))}
          </select>
        </div>
        <div className="input-wrap">
          <label className="input-label">Exercise</label>
          <select className="input" value={exerciseId} onChange={e => setExerciseId(e.target.value)}>
            <option value="">Select exercise…</option>
            {systemExs.length > 0 && (
              <optgroup label="System library">
                {systemExs.map(e => (
                  <option key={e.exercise_id} value={e.exercise_id}>
                    T{e.tier} — {e.exercise_name}
                  </option>
                ))}
              </optgroup>
            )}
            {myExs.length > 0 && (
              <optgroup label="Your custom exercises">
                {myExs.map(e => (
                  <option key={e.exercise_id} value={e.exercise_id}>{e.exercise_name}</option>
                ))}
              </optgroup>
            )}
          </select>
        </div>
        <div className="input-wrap">
          <label className="input-label">Sets</label>
          <input className="input" type="number" min="1" max="12" value={sets} onChange={e => setSets(e.target.value)} />
        </div>
        <div className="input-wrap">
          <label className="input-label">Reps</label>
          <input className="input" placeholder="8 or 6-8" value={reps} onChange={e => setReps(e.target.value)} />
        </div>
        <div className="input-wrap">
          <label className="input-label">% of 1RM (optional)</label>
          <input className="input" type="number" step="0.05" placeholder="0.70" value={pct} onChange={e => setPct(e.target.value)} />
        </div>
        <div className="input-wrap">
          <label className="input-label">Rest</label>
          <input className="input" placeholder="2 min" value={rest} onChange={e => setRest(e.target.value)} />
        </div>
      </div>
      <div className="modal-actions">
        <button type="button" className="btn btn-ghost full" onClick={onClose}>Cancel</button>
        <button
          type="button"
          className="btn btn-primary full"
          disabled={busy || !exerciseId}
          onClick={() => onSubmit({
            targetSession,
            exerciseId: parseInt(exerciseId, 10),
            sets: parseInt(sets, 10) || 3,
            reps,
            percentageRm: parseFloat(pct) || null,
            restDuration: rest,
          })}
        >
          {busy ? 'Adding…' : 'Add to session'}
        </button>
      </div>
    </Modal>
  )
}

export function CreateSessionModal({ open, onClose, busy, onSubmit }) {
  const [sessionKey, setSessionKey] = useState('')
  const [dayOfWeek, setDayOfWeek]   = useState('')

  useEffect(() => {
    if (open) { setSessionKey(''); setDayOfWeek('') }
  }, [open])

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create session day"
      subtitle="Add an extra training day to your plan (e.g. D for Thursday accessories)."
    >
      <div className="input-wrap">
        <label className="input-label">Session key</label>
        <input
          className="input"
          placeholder="e.g. D or PUSH"
          value={sessionKey}
          maxLength={10}
          onChange={e => setSessionKey(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''))}
        />
        <p className="input-hint">1–10 characters. A, B, C are created at signup.</p>
      </div>
      <div className="input-wrap">
        <label className="input-label">Day label (optional)</label>
        <input className="input" placeholder="e.g. Thursday" value={dayOfWeek} onChange={e => setDayOfWeek(e.target.value)} />
      </div>
      <div className="modal-actions">
        <button type="button" className="btn btn-ghost full" onClick={onClose}>Cancel</button>
        <button
          type="button"
          className="btn btn-primary full"
          disabled={busy || sessionKey.length < 1}
          onClick={() => onSubmit({ sessionKey, dayOfWeek: dayOfWeek || 'Unscheduled' })}
        >
          {busy ? 'Creating…' : 'Create session'}
        </button>
      </div>
    </Modal>
  )
}

