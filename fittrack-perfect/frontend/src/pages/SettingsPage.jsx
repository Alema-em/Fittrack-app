import React, { useEffect, useState } from 'react'
import { useStore } from '../store.js'
import { health, getOrms, updateOrm, advanceWeek } from '../api.js'

export default function SettingsPage() {
  const { user, apiOnline, setApiOnline, barWeight, plates, setBarWeight, setPlates } = useStore()
  const [orms,   setOrms]   = useState([])
  const [saving, setSaving] = useState(null)
  const [busy,   setBusy]   = useState(false)
  const PLATES = ['25','20','15','10','5','2.5','1.25']

  useEffect(() => {
    health().then(()=>setApiOnline(true)).catch(()=>setApiOnline(false))
    if (user?.user_id) getOrms(user.user_id).then(setOrms).catch(console.error)
  }, [user?.user_id])

  const handleOrm = async (exerciseId, cur, delta) => {
    const newKg = Math.max(0, Math.round((cur+delta)*2)/2)
    setSaving(exerciseId)
    try {
      await updateOrm(user.user_id, { exerciseId, weightKg: newKg })
      const updated = await getOrms(user.user_id)
      setOrms(updated)
    } catch(e){ alert(e.message) }
    finally{ setSaving(null) }
  }

  const handleAdvance = async () => {
    if (!window.confirm(`Advance to Week ${(user?.strengthWeek||1)+1}?\n\nThis calls the AdvanceWeek() stored procedure. 1RMs increase by +2.5kg every 4th week.`)) return
    setBusy(true)
    try {
      const r = await advanceWeek({ userId: user.user_id })
      alert(`✓ Advanced to Week ${r.plan.strength_week} — ${r.plan.computed_week_type}`)
    } catch(e){ alert(e.message) }
    finally{ setBusy(false) }
  }

  return (
    <div className="page">
      <h1 className="page-title">Settings</h1>
      <p className="page-sub">Configure your 1-Rep Maxes, equipment, and training week. Updates write directly to MySQL.</p>

      {/* DB connection */}
      <div className="mb-20">
        <div className="section-title mb-10">Database Connection</div>
        <div className="card" style={{ padding:16, borderColor:apiOnline?'rgba(34,197,94,.3)':'rgba(239,68,68,.3)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:10, height:10, borderRadius:'50%', flexShrink:0,
              background:apiOnline?'var(--good)':'var(--bad)',
              boxShadow:`0 0 10px ${apiOnline?'var(--good)':'var(--bad)'}` }}/>
            <div>
              <div style={{ fontSize:15, fontWeight:600, color:'var(--t1)' }}>
                {apiOnline ? 'Connected to MySQL' : 'Backend offline'}
              </div>
              <div style={{ fontSize:12, color:'var(--t2)', marginTop:2 }}>
                {apiOnline ? 'localhost:3001 → fittrack database' : 'Run: cd backend && node server.js'}
              </div>
            </div>
          </div>
          {!apiOnline && (
            <div style={{ marginTop:12, padding:'10px 14px', background:'var(--bad-dim)', border:'1px solid rgba(239,68,68,.2)', borderRadius:'var(--r)', fontSize:13, color:'var(--t2)', lineHeight:1.7 }}>
              <strong style={{ color:'var(--bad)' }}>Backend is not reachable.</strong> Open a terminal, navigate to the <code>backend/</code> folder, and run <code>node server.js</code>
            </div>
          )}
        </div>
      </div>

      {/* 1RM editor */}
      <div className="mb-24">
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
          <div className="section-title">1-Rep Maxes</div>
          <span style={{ fontFamily:'var(--mono)', fontSize:10, color:apiOnline?'var(--good)':'var(--t3)' }}>
            {apiOnline ? '→ INSERT INTO ONE_REP_MAX' : 'offline'}
          </span>
        </div>
        <div className="callout mb-12">
          <div className="callout-text">
            <strong style={{ color:'var(--t1)' }}>How it works:</strong> Each update inserts a new row into <code>ONE_REP_MAX</code> with today's date — preserving your full history. The dashboard query then selects the latest entry per exercise using a correlated subquery on <code>recorded_on</code>.
          </div>
        </div>
        <div className="card">
          {orms.length > 0 ? orms.map(orm=>(
            <div key={orm.exercise_id} style={{ padding:'14px 0', borderBottom:'1px solid var(--border)' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div>
                  <div style={{ fontSize:15, fontWeight:600, color:'var(--t1)' }}>{orm.exercise_name}</div>
                  <div style={{ fontSize:12, color:'var(--t3)', marginTop:2 }}>
                    T{orm.tier} · Last updated {orm.recorded_on}
                  </div>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  {saving===orm.exercise_id && <span style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--cy)' }}>saving…</span>}
                  <div className="stepper">
                    <button className="step-btn" onClick={()=>handleOrm(orm.exercise_id,orm.weight_kg,-2.5)} disabled={!apiOnline}>−</button>
                    <span className="step-val">{orm.weight_kg}</span>
                    <button className="step-btn" onClick={()=>handleOrm(orm.exercise_id,orm.weight_kg,+2.5)} disabled={!apiOnline}>+</button>
                    <span style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--t3)', width:20 }}>kg</span>
                  </div>
                </div>
              </div>
            </div>
          )) : (
            <div style={{ padding:'20px', textAlign:'center', color:'var(--t3)', fontSize:13 }}>
              {apiOnline ? '1RMs are generated automatically on registration.' : 'Connect backend to see your 1RMs.'}
            </div>
          )}
        </div>
      </div>

      {/* Equipment */}
      <div className="mb-24">
        <div className="section-title mb-12">Equipment</div>
        <div className="card">
          <div style={{ padding:'14px 0', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div>
              <div style={{ fontSize:15, fontWeight:600, color:'var(--t1)' }}>Bar Weight</div>
              <div style={{ fontSize:12, color:'var(--t3)', marginTop:2 }}>Standard Olympic = 20kg · Trap bar = 25–30kg</div>
            </div>
            <div className="stepper">
              <button className="step-btn" onClick={()=>setBarWeight(Math.max(10,barWeight-5))}>−</button>
              <span className="step-val">{barWeight}</span>
              <button className="step-btn" onClick={()=>setBarWeight(barWeight+5)}>+</button>
              <span style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--t3)', width:20 }}>kg</span>
            </div>
          </div>
          <div style={{ paddingTop:14 }}>
            <div style={{ fontSize:15, fontWeight:600, color:'var(--t1)', marginBottom:3 }}>Available Plates</div>
            <div style={{ fontSize:12, color:'var(--t3)', marginBottom:10 }}>Toggle what you have access to. Used by the plate calculator in Train.</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:7 }}>
              {PLATES.map(p=>{
                const on = !!plates[p]
                return <button key={p} onClick={()=>setPlates({...plates,[p]:!on})} style={{
                  padding:'7px 14px', borderRadius:9, border:'1px solid',
                  borderColor:on?'rgba(0,212,232,.4)':'var(--border)',
                  background:on?'var(--cy-dim)':'transparent',
                  color:on?'var(--cy)':'var(--t3)',
                  fontFamily:'var(--mono)', fontSize:12, cursor:'pointer', transition:'all .15s',
                }}>{p}kg</button>
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Advance week */}
      <div className="mb-24">
        <div className="section-title mb-12">Training Progression</div>
        <div className="callout mb-12">
          <div className="callout-text">
            Calls the <code>AdvanceWeek()</code> stored procedure — increments <code>strength_week</code>, updates <code>week_type</code> via <code>GetWeekType()</code>, and clones templates with adjusted percentages for the new week type.
          </div>
        </div>
        <div className="card" style={{ padding:16 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
            <div>
              <div style={{ fontSize:15, fontWeight:600, color:'var(--t1)' }}>Strength Week</div>
              <div style={{ fontSize:12, color:'var(--t3)', marginTop:2 }}>Stored in WORKOUT_PLAN.strength_week</div>
            </div>
            <span className="mono grad" style={{ fontSize:32, fontWeight:700 }}>{user?.strengthWeek||1}</span>
          </div>
          <button className="btn btn-primary full" onClick={handleAdvance} disabled={!apiOnline||busy}>
            {busy ? 'Calling AdvanceWeek()…' : `Advance to Week ${(user?.strengthWeek||1)+1} →`}
          </button>
        </div>
      </div>
    </div>
  )
}
