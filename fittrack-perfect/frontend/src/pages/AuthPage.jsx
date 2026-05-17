import React, { useState } from 'react'
import { useStore } from '../store.js'
import { apiLogin, apiRegister } from '../api.js'
import { DEMO_CREDENTIALS } from '../data.js'

function Wizard({ pending, onBack }) {
  const { setAuth } = useStore()
  const [step, setStep]   = useState(0)
  const [goal, setGoal]   = useState('strength')
  const [bw,   setBw]     = useState('')
  const [run,  setRun]    = useState(null)
  const [err,  setErr]    = useState('')
  const [busy, setBusy]   = useState(false)

  const GOALS = [
    ['strength',    '💪', 'Strength',    'Build maximum strength in the gym.'],
    ['hypertrophy', '📈', 'Hypertrophy', 'Build muscle size and volume over time.'],
    ['endurance',   '🏃', 'Endurance',   'Running fitness and aerobic capacity.'],
    ['weight_loss', '🔥', 'Weight Loss', 'Lose fat while maintaining muscle.'],
  ]

  const finish = async () => {
    if (run === null) { setErr('Please choose your programme type'); return }
    setBusy(true); setErr('')
    try {
      const d = await apiRegister({
        name: pending.name,
        email: pending.email,
        password: pending.pass,
        bodyweight: parseFloat(bw) || 70,
        goal,
        includeRunning: run,
      })
      setAuth(d.user, d.token)
    } catch (e) {
      setErr(e.message)
      setBusy(false)
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-panel auth-panel--narrow">
        <div className="auth-logo-row auth-logo-row--center">
          <div className="auth-logo-icon">⊕</div>
          <span className="auth-logo-label">FITTRACK</span>
        </div>
        <div className="setup-progress">
          {['Goal', 'Bodyweight', 'Programme'].map((_, i) => (
            <div key={i} className={`setup-dot${i === step ? ' active' : i < step ? ' done' : ''}`} />
          ))}
        </div>
        <div className="auth-card">
          {err && <div className="auth-error">{err}</div>}

          {step === 0 && (
            <div className="auth-step">
              <div className="setup-icon">🎯</div>
              <div className="setup-title">What's your goal?</div>
              <div className="setup-sub">This shapes your sessions, intensity, and progress tracking.</div>
              <div className="auth-choice-list">
                {GOALS.map(([g, ico, label, desc]) => (
                  <button key={g} type="button" className={`auth-choice${goal === g ? ' on' : ''}`} onClick={() => setGoal(g)}>
                    <span className="auth-choice-ico">{ico}</span>
                    <div>
                      <div className="auth-choice-title">{label}</div>
                      <div className="auth-choice-desc">{desc}</div>
                    </div>
                    {goal === g && <span className="auth-choice-check">✓</span>}
                  </button>
                ))}
              </div>
              <div className="auth-actions">
                <button type="button" className="btn btn-ghost full" onClick={onBack}>← Back</button>
                <button type="button" className="btn btn-primary full" onClick={() => setStep(1)}>Continue</button>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="auth-step">
              <div className="setup-icon">⚖️</div>
              <div className="setup-title">Your bodyweight</div>
              <div className="setup-sub">Used to estimate starting 1RMs for your programme.</div>
              <div className="input-wrap">
                <label className="input-label">Bodyweight (kg)</label>
                <input className="input input--center" type="number" placeholder="e.g. 75" value={bw}
                  onChange={e => setBw(e.target.value)} autoFocus />
              </div>
              <div className="auth-actions">
                <button type="button" className="btn btn-ghost full" onClick={() => setStep(0)}>← Back</button>
                <button type="button" className="btn btn-primary full" onClick={() => {
                  if (!bw || parseFloat(bw) < 30) { setErr('Enter a valid bodyweight (30kg+)'); return }
                  setErr(''); setStep(2)
                }}>Continue</button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="auth-step">
              <div className="setup-icon">📋</div>
              <div className="setup-title">Choose your programme</div>
              <div className="setup-sub">Strength-only or strength plus the full running block.</div>
              <div className="auth-choice-list">
                {[
                  [false, '🏋️', 'Strength Only', 'Mon / Wed / Fri — 3 gym sessions per week.'],
                  [true,  '🏋🏃', 'Strength + Running', 'Gym plus Zone 2, speed, and long runs.'],
                ].map(([val, ico, label, desc]) => (
                  <button key={String(val)} type="button" className={`auth-choice${run === val ? ' on' : ''}`} onClick={() => setRun(val)}>
                    <span className="auth-choice-ico">{ico}</span>
                    <div>
                      <div className="auth-choice-title">{label}</div>
                      <div className="auth-choice-desc">{desc}</div>
                    </div>
                    {run === val && <span className="auth-choice-check">✓</span>}
                  </button>
                ))}
              </div>
              <div className="auth-actions">
                <button type="button" className="btn btn-ghost full" onClick={() => setStep(1)}>← Back</button>
                <button type="button" className="btn btn-primary full" onClick={finish} disabled={busy}>
                  {busy ? 'Creating account…' : 'Finish setup'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function AuthPage() {
  const { setAuth } = useStore()
  const [mode,    setMode]    = useState('login')
  const [name,    setName]    = useState('')
  const [email,   setEmail]   = useState('')
  const [pass,    setPass]    = useState('')
  const [err,     setErr]     = useState('')
  const [busy,    setBusy]    = useState(false)
  const [pending, setPending] = useState(null)

  if (pending) return <Wizard pending={pending} onBack={() => setPending(null)} />

  const doLogin = async () => {
    if (!email.trim()) { setErr('Please enter your email'); return }
    setBusy(true); setErr('')
    try {
      const d = await apiLogin(email.trim().toLowerCase(), pass)
      setAuth(d.user, d.token)
    } catch (e) {
      setErr(e.message)
    } finally {
      setBusy(false)
    }
  }

  const doRegister = () => {
    if (!name.trim())  { setErr('Please enter your name'); return }
    if (!email.trim()) { setErr('Please enter your email'); return }
    if (!pass)         { setErr('Please create a password'); return }
    setErr('')
    setPending({ name: name.trim(), email: email.trim().toLowerCase(), pass })
  }

  return (
    <div className="auth-wrap">
      <div className="auth-layout">
        <section className="auth-hero" aria-hidden="false">
          <div className="auth-hero-glow" />
          <div className="auth-logo-row">
            <div className="auth-logo-icon">⊕</div>
            <span className="auth-logo-label">FITTRACK</span>
          </div>
          <h1 className="auth-hero-title">
            Train smarter.<br />
            <span className="grad">Track everything.</span>
          </h1>
          <p className="auth-hero-text">
            Personalised strength programming, live session tracking, and progress analytics — backed by your MySQL database.
          </p>
          <ul className="auth-hero-features">
            <li>3 weekly strength sessions with auto-calculated loads</li>
            <li>Live workout mode with set logging</li>
            <li>1RM history and weekly volume trends</li>
          </ul>
        </section>

        <section className="auth-panel">
          <div className="auth-card auth-card--elevated">
            <div className="auth-title">{mode === 'login' ? 'Sign in' : 'Create account'}</div>
            <div className="auth-sub">
              {mode === 'login'
                ? 'Enter your credentials to open your dashboard.'
                : 'Free account — takes about two minutes.'}
            </div>

            {err && <div className="auth-error">⚠ {err}</div>}

            {mode === 'register' && (
              <div className="input-wrap">
                <label className="input-label">Full name</label>
                <input className="input" value={name} onChange={e => { setName(e.target.value); setErr('') }}
                  placeholder="Alex Chen" autoFocus />
              </div>
            )}
            <div className="input-wrap">
              <label className="input-label">Email</label>
              <input className="input" type="email" value={email}
                onChange={e => { setEmail(e.target.value); setErr('') }}
                placeholder="you@example.com" autoFocus={mode === 'login'} />
            </div>
            <div className="input-wrap auth-pass-wrap">
              <label className="input-label">Password</label>
              <input className="input" type="password" value={pass}
                onChange={e => { setPass(e.target.value); setErr('') }}
                placeholder="••••••••"
                onKeyDown={e => e.key === 'Enter' && (mode === 'login' ? doLogin() : doRegister())} />
            </div>

            <button type="button" className="btn btn-primary full auth-submit" onClick={mode === 'login' ? doLogin : doRegister} disabled={busy}>
              {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Continue'}
            </button>

            <div className="auth-switch">
              {mode === 'login'
                ? <>No account? <span role="button" tabIndex={0} onClick={() => { setMode('register'); setErr('') }}>Create one</span></>
                : <>Have an account? <span role="button" tabIndex={0} onClick={() => { setMode('login'); setErr('') }}>Sign in</span></>}
            </div>
          </div>

          {mode === 'login' && (
            <details className="auth-demo">
              <summary>Demo accounts (course presentation)</summary>
              <div className="auth-demo-list">
                {DEMO_CREDENTIALS.map((u, i) => (
                  <button key={i} type="button" className="demo-btn" disabled={busy} onClick={async () => {
                    setBusy(true); setErr('')
                    try {
                      const d = await apiLogin(u.email, 'demo')
                      setAuth(d.user, d.token)
                    } catch (e) {
                      setErr(e.message || 'Demo login failed — is the backend running?')
                      setBusy(false)
                    }
                  }}>
                    <span className="demo-btn-name">{u.name}</span>
                    <span className="demo-btn-tag">{u.tag}</span>
                  </button>
                ))}
              </div>
              <p className="auth-demo-hint">Demo users accept any password when the API is online.</p>
            </details>
          )}
        </section>
      </div>
    </div>
  )
}
