import React, { useState } from 'react'
import { useStore } from '../store.js'
import { logRun } from '../api.js'
import { RUNNING_PHASES, IRON_RULES, getTuesdayRun, getSaturdayRun } from '../data.js'

const DAYS = [
  { name:'Mon', emoji:'🏋', type:'Gym',   desc:'Session A — lower body heavy' },
  { name:'Tue', emoji:'🏃', type:'Zone2', desc:'Zone 2 easy run' },
  { name:'Wed', emoji:'🏋', type:'Gym',   desc:'Session B — upper body' },
  { name:'Thu', emoji:'⚡', type:'Speed', desc:'Speed session' },
  { name:'Fri', emoji:'🏋', type:'Gym',   desc:'Session C — full body' },
  { name:'Sat', emoji:'↗',  type:'Long',  desc:'Long run' },
  { name:'Sun', emoji:'😴', type:'Rest',  desc:'Full rest' },
]

function InfoRow({ label, value, accent }) {
  return (
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',padding:'9px 0',borderBottom:'1px solid var(--border)'}}>
      <span style={{fontSize:13,color:'var(--t2)'}}>{label}</span>
      <span style={{fontFamily:'var(--mono)',fontSize:13,color:accent||'var(--t1)',fontWeight:500,textAlign:'right',maxWidth:'60%',lineHeight:1.4}}>{value}</span>
    </div>
  )
}

export default function RunningPage() {
  const { user } = useStore()
  const plan = useStore(s=>s.dashboard?.plan)
  const runPhase = plan?.running_phase || user?.runningPhase || 1
  const runWeek  = plan?.running_week  || user?.runningWeek  || 1

  const todayIdx = new Date().getDay()===0 ? 6 : new Date().getDay()-1
  const [selDay, setSelDay]     = useState(todayIdx)
  const [showRules, setRules]   = useState(false)
  const [logForm, setLogForm]   = useState(false)
  const [logData, setLogData]   = useState({ type:'zone2', distance:'', duration:'', pace:'' })
  const [saving, setSaving]     = useState(false)
  const [saved,  setSaved]      = useState(false)

  const phase   = RUNNING_PHASES[runPhase] || RUNNING_PHASES[1]
  const wkData  = phase.weeks[runWeek] || phase.weeks[1]
  const tuesday = getTuesdayRun(runPhase)
  const saturday= getSaturdayRun(runPhase, runWeek)

  const handleLog = async () => {
    setSaving(true)
    try {
      await logRun({ userId:user.user_id, sessionType:logData.type, runningPhase:runPhase, runningWeek:runWeek, distanceKm:parseFloat(logData.distance)||null, durationSeconds:logData.duration?(parseInt(logData.duration)*60):null, avgPace:parseFloat(logData.pace)||null })
      setSaved(true); setLogForm(false)
      setTimeout(()=>setSaved(false), 3000)
    } catch(e) { alert(e.message) }
    finally { setSaving(false) }
  }

  const renderDay = () => {
    const day = DAYS[selDay]
    if (day.type === 'Gym') return (
      <div className="card">
        <div style={{fontSize:18,fontWeight:700,color:'var(--t1)',marginBottom:8}}>Gym Day</div>
        <div style={{fontSize:14,color:'var(--t2)',lineHeight:1.7,marginBottom:12}}>Today is a strength session. You may add a short Zone 2 run (20–25 min easy) before the gym session, but keep it conversational — full sentences only.</div>
        <div style={{padding:'10px 14px',background:'var(--cy-dim)',border:'1px solid rgba(0,212,232,.2)',borderRadius:'var(--r)',fontFamily:'var(--mono)',fontSize:11,color:'var(--cy)'}}>
          Navigate to Train → to start your strength session
        </div>
      </div>
    )
    if (day.type === 'Zone2') return (
      <div className="card">
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
          <div style={{fontSize:18,fontWeight:700,color:'var(--t1)'}}>Zone 2 Run</div>
          <span style={{fontFamily:'var(--mono)',fontSize:11,color:'var(--good)',background:'var(--good-dim)',padding:'3px 9px',borderRadius:7}}>EASY</span>
        </div>
        <div style={{fontSize:13,color:'var(--t2)',lineHeight:1.7,marginBottom:14}}>Building aerobic base. This should feel almost too easy — you should be able to hold a full conversation throughout.</div>
        <InfoRow label="Duration"    value={tuesday.duration}/>
        <InfoRow label="Pace"        value={tuesday.pace}/>
        <InfoRow label="Heart Rate"  value={tuesday.hr}/>
        {tuesday.strides && (
          <div className="callout mt-14">
            <div style={{fontWeight:600,color:'var(--t1)',marginBottom:4}}>After the run — Strides</div>
            <div className="callout-text">{tuesday.stridesDetail}</div>
          </div>
        )}
      </div>
    )
    if (day.type === 'Speed') return (
      <div>
        <button onClick={()=>setRules(r=>!r)} style={{width:'100%',padding:'12px 16px',marginBottom:12,background:'var(--warn-dim)',border:'1px solid rgba(245,158,11,.3)',borderRadius:'var(--r)',cursor:'pointer',display:'flex',alignItems:'center',gap:10,textAlign:'left'}}>
          <span style={{fontSize:16}}>⚠️</span>
          <span style={{fontWeight:600,color:'var(--t1)',flex:1}}>Iron Rules — read before every speed session</span>
          <span style={{color:'var(--t3)'}}>{showRules?'▲':'▼'}</span>
        </button>
        {showRules&&(
          <div className="card card-dark mb-12">
            {IRON_RULES.map(r=>(
              <div key={r.n} style={{display:'flex',gap:12,padding:'10px 0',borderBottom:'1px solid var(--border)'}}>
                <div style={{width:24,height:24,borderRadius:7,background:'var(--gd)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  <span style={{fontFamily:'var(--mono)',fontSize:10,fontWeight:700,color:'#0a0d12'}}>{r.n}</span>
                </div>
                <div>
                  <div style={{fontSize:13,fontWeight:600,color:'var(--t1)',marginBottom:2}}>{r.title}</div>
                  <div style={{fontSize:12,color:'var(--t2)',lineHeight:1.6}}>{r.text}</div>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="card">
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
            <div style={{fontSize:18,fontWeight:700,color:'var(--t1)'}}>Speed Session</div>
            <span style={{fontFamily:'var(--mono)',fontSize:11,color:'var(--bad)',background:'var(--bad-dim)',padding:'3px 9px',borderRadius:7}}>PHASE {runPhase} · WK {runWeek}</span>
          </div>
          <div style={{marginBottom:12}}>
            <div style={{fontFamily:'var(--mono)',fontSize:10,color:'var(--t3)',letterSpacing:'.1em',marginBottom:6}}>WARM-UP</div>
            <div style={{fontSize:13,color:'var(--t2)',lineHeight:1.7}}>{phase.warmUp}</div>
          </div>
          <div style={{background:'var(--bad-dim)',border:'1px solid rgba(239,68,68,.25)',borderRadius:'var(--r)',padding:'14px 16px',marginBottom:12}}>
            <div style={{fontFamily:'var(--mono)',fontSize:10,color:'var(--bad)',letterSpacing:'.1em',marginBottom:10}}>MAIN SET</div>
            <InfoRow label="Reps"      value={wkData.mainSet}   accent="var(--t1)"/>
            <InfoRow label="Pace"      value={wkData.pace}      accent="var(--bad)"/>
            <InfoRow label="Recovery"  value={wkData.recovery}/>
            <div style={{marginTop:10,padding:'10px 12px',background:'var(--warn-dim)',borderRadius:8,border:'1px solid rgba(245,158,11,.3)'}}>
              <div style={{fontFamily:'var(--mono)',fontSize:10,color:'var(--warn)',letterSpacing:'.08em',marginBottom:3}}>HARD CEILING</div>
              <div style={{fontSize:13,color:'var(--t1)',fontWeight:600}}>{wkData.ceiling}</div>
            </div>
          </div>
          <div style={{marginBottom:14}}>
            <div style={{fontFamily:'var(--mono)',fontSize:10,color:'var(--t3)',letterSpacing:'.1em',marginBottom:6}}>COOL-DOWN</div>
            <div style={{fontSize:13,color:'var(--t2)',lineHeight:1.7}}>{phase.coolDown}</div>
          </div>
          <div className="callout">
            <div style={{fontWeight:600,color:'var(--t1)',marginBottom:4}}>How it should feel</div>
            <div className="callout-text">{wkData.ceiling} {phase.coolDown}</div>
          </div>
        </div>
      </div>
    )
    if (day.type === 'Long') return (
      <div className="card">
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
          <div style={{fontSize:18,fontWeight:700,color:'var(--t1)'}}>{saturday.type}</div>
          <span style={{fontFamily:'var(--mono)',fontSize:11,color:saturday.alt?'var(--warn)':'var(--good)',background:saturday.alt?'var(--warn-dim)':'var(--good-dim)',padding:'3px 9px',borderRadius:7}}>
            {saturday.alt?'ALTERNATION':'EASY'}
          </span>
        </div>
        <InfoRow label="Duration" value={saturday.duration}/>
        <InfoRow label="Pace"     value={saturday.pace}/>
        {saturday.alt&&saturday.altDetail&&(
          <div className="callout-warn callout mt-12">
            <div style={{fontWeight:600,color:'var(--t1)',marginBottom:4}}>10K Effort Segments</div>
            <div className="callout-text">{saturday.altDetail}</div>
          </div>
        )}
        <div className="callout mt-12"><div className="callout-text">{saturday.note}</div></div>
      </div>
    )
    return (
      <div className="card" style={{textAlign:'center',padding:32}}>
        <div style={{fontSize:44,marginBottom:12}}>😴</div>
        <div style={{fontSize:17,fontWeight:600,marginBottom:6}}>Full Rest</div>
        <div style={{fontSize:14,color:'var(--t2)',lineHeight:1.7}}>No physical training. Sleep is where adaptation happens.</div>
      </div>
    )
  }

  return (
    <div className="page">
      <h1 className="page-title">Run</h1>
      <p className="page-sub">Your 4-phase running programme targeting sub-19 5K. Three sessions per week — Tuesday, Thursday, Saturday.</p>

      {/* Phase + week info */}
      <div className="g2 mb-20">
        <div className="card card-dark" style={{padding:18}}>
          <div className="label mb-8">Current Phase</div>
          <div style={{fontSize:20,fontWeight:700,color:'var(--t1)',marginBottom:4}}>Phase {runPhase}: {phase.name}</div>
          <div style={{fontSize:13,color:'var(--t2)',marginBottom:14}}>{phase.subtitle}</div>
          <div style={{display:'flex',gap:6}}>
            {[1,2,3,4].map(p=>(
              <div key={p} style={{flex:1,height:6,borderRadius:3,background:p<=runPhase?'var(--cy)':'rgba(255,255,255,.1)',transition:'background .3s'}}/>
            ))}
          </div>
          <div style={{display:'flex',justifyContent:'space-between',marginTop:5,fontFamily:'var(--mono)',fontSize:10,color:'var(--t3)'}}>
            <span>PHASE 1</span><span>PHASE {runPhase} OF 4</span>
          </div>
        </div>
        <div className="card" style={{padding:18}}>
          <div className="label mb-8">This Week — Week {runWeek} of 4</div>
          <div style={{fontFamily:'var(--mono)',fontSize:14,color:'var(--cy)',marginBottom:8}}>{wkData.mainSet}</div>
          <div style={{fontSize:13,color:'var(--t2)',lineHeight:1.7,marginBottom:10}}>{wkData.pace}</div>
          <div style={{display:'flex',gap:6}}>
            {[1,2,3,4].map(w=>(
              <div key={w} style={{flex:1,height:6,borderRadius:3,background:w<=runWeek?'var(--mg)':'rgba(255,255,255,.1)',transition:'background .3s'}}/>
            ))}
          </div>
          <div style={{fontFamily:'var(--mono)',fontSize:10,color:'var(--t3)',marginTop:5}}>WEEK {runWeek} OF 4 IN THIS PHASE</div>
        </div>
      </div>

      {/* Day selector */}
      <div className="mb-16">
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
          <div className="section-title">Weekly Schedule</div>
          <div style={{fontSize:12,color:'var(--t3)'}}>tap a day</div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:8}}>
          {DAYS.map((d,i)=>{
            const isTod = i===todayIdx
            const isSel = i===selDay
            const isSpd = d.type==='Speed'
            return (
              <button key={i} onClick={()=>setSelDay(i)} style={{
                padding:'12px 6px',borderRadius:12,border:'2px solid',
                borderColor:isSel?(isSpd?'var(--bad)':'var(--cy)'):isTod?'rgba(255,255,255,.2)':'var(--border)',
                background:isSel?(isSpd?'var(--bad-dim)':'var(--cy-dim)'):'var(--surf)',
                cursor:'pointer',transition:'all .18s',textAlign:'center',
              }}>
                <div style={{fontFamily:'var(--mono)',fontSize:11,fontWeight:700,marginBottom:5,color:isSel?(isSpd?'var(--bad)':'var(--cy)'):isTod?'var(--t1)':'var(--t3)'}}>{d.name}</div>
                <div style={{fontSize:18,marginBottom:4}}>{d.emoji}</div>
                <div style={{fontFamily:'var(--mono)',fontSize:9,color:isSel?(isSpd?'var(--bad)':'var(--cy)'):'var(--t3)'}}>{d.type}</div>
                {isTod&&!isSel&&<div style={{width:4,height:4,borderRadius:'50%',background:'var(--cy)',margin:'3px auto 0'}}/>}
              </button>
            )
          })}
        </div>
      </div>

      {/* Day content */}
      <div className="mb-20">
        {renderDay()}
      </div>

      {/* Log a run */}
      {['Zone2','Speed','Long'].includes(DAYS[selDay]?.type) && (
        <div style={{marginBottom:20}}>
          {saved&&<div style={{padding:'10px 16px',background:'var(--good-dim)',border:'1px solid rgba(34,197,94,.3)',borderRadius:'var(--r)',marginBottom:10,fontFamily:'var(--mono)',fontSize:12,color:'var(--good)'}}>✓ Run logged successfully!</div>}
          {!logForm ? (
            <button className="btn btn-primary full" onClick={()=>setLogForm(true)}>+ Log This Run</button>
          ) : (
            <div className="card" style={{padding:18}}>
              <div style={{fontSize:14,fontWeight:600,color:'var(--t1)',marginBottom:14}}>Log Your Run</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginBottom:14}}>
                <div className="input-wrap" style={{marginBottom:0}}>
                  <label className="input-label">Distance (km)</label>
                  <input className="input" type="number" step="0.1" placeholder="5.0" value={logData.distance} onChange={e=>setLogData(x=>({...x,distance:e.target.value}))}/>
                </div>
                <div className="input-wrap" style={{marginBottom:0}}>
                  <label className="input-label">Duration (min)</label>
                  <input className="input" type="number" placeholder="25" value={logData.duration} onChange={e=>setLogData(x=>({...x,duration:e.target.value}))}/>
                </div>
                <div className="input-wrap" style={{marginBottom:0}}>
                  <label className="input-label">Avg Pace (min/km)</label>
                  <input className="input" type="number" step="0.1" placeholder="4.5" value={logData.pace} onChange={e=>setLogData(x=>({...x,pace:e.target.value}))}/>
                </div>
              </div>
              <div style={{display:'flex',gap:8}}>
                <button className="btn btn-ghost full" onClick={()=>setLogForm(false)}>Cancel</button>
                <button className="btn btn-primary full" onClick={handleLog} disabled={saving}>{saving?'Saving…':'Log Run'}</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
