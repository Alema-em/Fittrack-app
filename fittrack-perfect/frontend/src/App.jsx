import React, { useEffect } from 'react'
import { useStore } from './store.js'
import { health } from './api.js'
import { PageLoader, ToastStack } from './components.jsx'
import AuthPage      from './pages/AuthPage.jsx'
import HomePage      from './pages/HomePage.jsx'
import WorkoutPage   from './pages/WorkoutPage.jsx'
import LivePage      from './pages/LivePage.jsx'
import ProgressPage  from './pages/ProgressPage.jsx'
import RunningPage   from './pages/RunningPage.jsx'
import DatabasePage  from './pages/DatabasePage.jsx'
import SettingsPage  from './pages/SettingsPage.jsx'

function Sidebar({ user, apiOnline }) {
  const { activeTab, setTab } = useStore()
  const init    = user?.name?.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase() || 'FT'
  const goalMap = { strength:'Strength', hypertrophy:'Hypertrophy', endurance:'Endurance', weight_loss:'Weight Loss' }
  const showRun = !!user?.includeRunning
  const isDemo  = !!user?.isDemoUser

  const Nav = ({ id, icon, label, dot }) => (
    <button className={`sb-btn${activeTab===id?' active':''}`} onClick={()=>setTab(id)}>
      <span className="sb-icon">{icon}</span>
      {label}
      {dot && <span className="sb-dot" style={{ background: dot, boxShadow:`0 0 6px ${dot}` }}/>}
    </button>
  )

  const handleLogout = () => {
    if (window.confirm('Sign out of FitTrack?')) useStore.getState().logout()
  }

  return (
    <aside className="sidebar">
      <div className="sb-logo">
        <div className="sb-logo-icon">⊕</div>
        <span className="sb-logo-text">FITTRACK</span>
      </div>
      <div style={{ flex:1 }}>
        <div className="sb-section">
          <div className="sb-section-label">Training</div>
          <Nav id="home"     icon="🏠" label="Home"/>
          <Nav id="workout"  icon="🏋" label="Train"/>
          <Nav id="progress" icon="📈" label="Stats"/>
          {showRun && <Nav id="running" icon="🏃" label="Run"/>}
        </div>
        <div className="sb-section">
          <div className="sb-section-label">Account</div>
          <Nav id="settings" icon="⚙" label="Settings"/>
          {isDemo && <Nav id="database" icon="🗄" label="Database" dot={apiOnline?'var(--good)':'var(--bad)'}/>}
        </div>
      </div>
      <div className="sb-footer">
        <div className="sb-user" onClick={()=>setTab('settings')}>
          <div className="sb-avatar">{init}</div>
          <div>
            <div className="sb-user-name">{user?.name?.split(' ')[0]}</div>
            <div className="sb-user-goal">{goalMap[user?.goal]||'Strength'}</div>
          </div>
        </div>
        <button type="button" className="sb-logout" onClick={handleLogout}>Sign out</button>
      </div>
    </aside>
  )
}

function MobileNav({ user }) {
  const { activeTab, setTab, workout } = useStore()
  if (workout.active) return null
  const tabs = [
    { id:'home',    icon:'🏠', label:'Home'  },
    { id:'workout', icon:'🏋', label:'Train' },
    { id:'progress',icon:'📈', label:'Stats' },
    ...(user?.includeRunning ? [{ id:'running', icon:'🏃', label:'Run' }] : []),
    { id:'settings',icon:'⚙',  label:'More'  },
  ]
  return (
    <nav className="mob-nav">
      <div className="mob-nav-row">
        {tabs.map(t=>(
          <button key={t.id} type="button" className={`mob-btn${activeTab===t.id?' active':''}`} onClick={()=>setTab(t.id)}>
            <span className="mico">{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}

function Screen({ user }) {
  const { activeTab, workout } = useStore()
  if (workout.active) return <LivePage/>
  if (activeTab==='running'  && !user?.includeRunning) return <HomePage/>
  if (activeTab==='database' && !user?.isDemoUser)     return <HomePage/>
  switch(activeTab) {
    case 'home':     return <HomePage/>
    case 'workout':  return <WorkoutPage/>
    case 'progress': return <ProgressPage/>
    case 'running':  return <RunningPage/>
    case 'database': return <DatabasePage/>
    case 'settings': return <SettingsPage/>
    default:         return <HomePage/>
  }
}

export default function App() {
  const user         = useStore(s => s.user)
  const authReady    = useStore(s => s.authReady)
  const authVersion  = useStore(s => s.authVersion)
  const apiOnline    = useStore(s => s.apiOnline)
  const setApiOnline = useStore(s => s.setApiOnline)
  const inLive       = useStore(s => s.workout.active)

  useEffect(() => {
    const runHydrate = () => useStore.getState().hydrateAuth()
    if (useStore.persist.hasHydrated()) runHydrate()
    else return useStore.persist.onFinishHydration(runHydrate)
  }, [])

  useEffect(() => {
    health().then(() => setApiOnline(true)).catch(() => setApiOnline(false))
  }, [setApiOnline])

  if (!authReady) {
    return (
      <>
        <PageLoader label="Starting FitTrack…" fullScreen />
        <ToastStack />
      </>
    )
  }

  if (!user) {
    return (
      <>
        <AuthPage key={authVersion} />
        <ToastStack />
      </>
    )
  }

  return (
    <>
      <div className={`app${inLive ? ' app--live' : ''}`} key={authVersion}>
        {!inLive && <Sidebar user={user} apiOnline={apiOnline} />}
        <main className="main">
          <Screen user={user} key={user.email} />
        </main>
        <MobileNav user={user} />
      </div>
      <ToastStack />
    </>
  )
}
