import React, { useEffect } from 'react'
import { useStore } from '../store.js'
import { getProgress } from '../api.js'
import { Sparkline, MiniBars, EmptyState } from '../components.jsx'

const SC = { low:'var(--good)',moderate:'var(--cy)',high:'var(--warn)',very_high:'var(--bad)' }
const SL = { low:'Low',moderate:'Moderate',high:'High',very_high:'Very High' }
const CORE = ['Deadlift','Bench Press','Front Squat','Overhead Press']

// Ring component for visual stats
let _rc = 0
function Ring({ size=100, value=0, stroke=8, label, sub, color='var(--cy)' }) {
  const idRef = React.useRef(`r${++_rc}`)
  const id = idRef.current
  const r = (size-stroke)/2, c = Math.PI*2*r, d = c*Math.max(0,Math.min(1,value))
  return (
    <div style={{position:'relative',display:'inline-flex',alignItems:'center',justifyContent:'center',width:size,height:size}}>
      <svg width={size} height={size} style={{transform:'rotate(-90deg)'}}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#00d4e8"/>
            <stop offset="100%" stopColor="#b060e8"/>
          </linearGradient>
        </defs>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,.07)" strokeWidth={stroke}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={`url(#${id})`} strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={`${d} ${c}`} style={{transition:'stroke-dasharray .8s ease'}}/>
      </svg>
      <div style={{position:'absolute',display:'flex',flexDirection:'column',alignItems:'center',gap:1}}>
        {label&&<span style={{fontFamily:'var(--mono)',fontSize:size*.2,fontWeight:700,color:'var(--t1)',letterSpacing:'-.04em',lineHeight:1}}>{label}</span>}
        {sub&&<span style={{fontFamily:'var(--mono)',fontSize:9,color:'var(--t3)',letterSpacing:'.1em',textTransform:'uppercase'}}>{sub}</span>}
      </div>
    </div>
  )
}

export default function ProgressPage() {
  const { user, progress, setProgress, setLoading, loading, setTab } = useStore()

  useEffect(() => {
    if (!user?.user_id) return
    setLoading('progress', true)
    getProgress(user.user_id).then(setProgress).catch(console.error).finally(()=>setLoading('progress',false))
  }, [user?.user_id])

  if (loading.progress) return (
    <div className="page" style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'60vh'}}>
      <div style={{textAlign:'center'}}><div className="db-pulse" style={{marginBottom:12}}/><div style={{fontFamily:'var(--mono)',fontSize:12,color:'var(--t3)'}}>Querying database views…</div></div>
    </div>
  )

  const weeklyLoad = progress?.weeklyLoad || []
  const runs       = progress?.runs       || []
  const pbs        = progress?.pbs        || []
  const sessionHist= progress?.sessionHistory || []

  // ORM history grouped by exercise (only core lifts with real entries)
  const ormByEx = {}
  ;(progress?.ormHistory||[]).forEach(o=>{
    if (!ormByEx[o.exercise_name]) ormByEx[o.exercise_name]=[]
    ormByEx[o.exercise_name].push(parseFloat(o.weight_kg))
  })
  const coreWithAnyData  = CORE.filter(n=>(ormByEx[n]||[]).length>0)
  const coreWithHistory  = CORE.filter(n=>(ormByEx[n]||[]).length>1)

  const loadData    = weeklyLoad.map(w=>w.total_load||0)
  const totalLoad   = loadData.reduce((a,b)=>a+b,0)
  const avgLoad     = loadData.length ? Math.round(totalLoad/loadData.length) : 0
  const peakLoad    = loadData.length ? Math.max(...loadData) : 0
  const hasRealData = sessionHist.length > 0 || loadData.length > 0 || Object.keys(ormByEx).length > 0 || pbs.length > 0

  // Volume by exercise from ExerciseSummaryView
  const volByEx = {}
  ;(progress?.volume||[]).forEach(v=>{
    if (!volByEx[v.exercise_name]) volByEx[v.exercise_name]=[]
    volByEx[v.exercise_name].push(v.total_volume_kg||0)
  })

  // Cost distribution
  const costBuckets = { low:0, moderate:0, high:0, very_high:0 }
  sessionHist.forEach(s=>{ if(s.cost_status) costBuckets[s.cost_status]=(costBuckets[s.cost_status]||0)+1 })
  const totalSess = sessionHist.length

  return (
    <div className="page">
      <h1 className="page-title">Stats</h1>
      <p className="page-sub">
        Your complete training analytics. Data pulled live from{' '}
        <strong style={{color:'var(--cy)'}}>ProgressTrackingView</strong>,{' '}
        <strong style={{color:'var(--cy)'}}>ExerciseSummaryView</strong>, and{' '}
        <strong style={{color:'var(--cy)'}}>WORKOUT_LOG</strong>.
      </p>

      {!hasRealData ? (
        <div>
          <div className="callout mb-16">
            <div style={{fontWeight:600,color:'var(--t1)',marginBottom:4}}>📋 No sessions logged yet</div>
            <div className="callout-text">Complete your first workout in Train to unlock your full analytics — load history, personal bests, volume charts, and progression tracking.</div>
          </div>
          <button className="btn btn-primary" onClick={()=>setTab('workout')}>Go to Train →</button>
        </div>
      ) : (
        <>
          {/* ── HERO STATS ROW ── */}
          {loadData.length > 0 && (
            <div className="g4 mb-20">
              <div className="stat-card">
                <span className="label">Sessions</span>
                <span className="value-big" style={{color:'var(--cy)'}}>{totalSess||sessionHist.length}</span>
                <span className="label" style={{marginTop:4,display:'block'}}>LOGGED</span>
              </div>
              <div className="stat-card">
                <span className="label">Total Load</span>
                <span className="value-big" style={{color:'var(--mg)'}}>{totalLoad>999?`${(totalLoad/1000).toFixed(1)}k`:totalLoad}</span>
                <span className="label" style={{marginTop:4,display:'block'}}>TSS TOTAL</span>
              </div>
              <div className="stat-card">
                <span className="label">Avg Load</span>
                <span className="value-big" style={{color:'var(--warn)'}}>{avgLoad}</span>
                <span className="label" style={{marginTop:4,display:'block'}}>PER SESSION</span>
              </div>
              <div className="stat-card">
                <span className="label">Peak Load</span>
                <span className="value-big" style={{color:'var(--bad)'}}>{peakLoad}</span>
                <span className="label" style={{marginTop:4,display:'block'}}>SINGLE SESSION</span>
              </div>
            </div>
          )}

          {/* ── LOAD CHART + COST RINGS ── */}
          {loadData.length > 0 && (
            <div className="g2 mb-20">
              <div className="card card-dark" style={{padding:20}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
                  <div>
                    <div className="section-title" style={{marginBottom:2}}>Weekly Training Load</div>
                    <div style={{fontFamily:'var(--mono)',fontSize:10,color:'var(--t3)'}}>SOURCE: WORKOUT_LOG · session_cost column</div>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <div style={{fontFamily:'var(--mono)',fontSize:28,fontWeight:700}} className="grad">{loadData[loadData.length-1]||0}</div>
                    <div style={{fontFamily:'var(--mono)',fontSize:10,color:'var(--t3)'}}>TSS THIS WEEK</div>
                  </div>
                </div>
                <MiniBars data={loadData} height={64} color="rgba(0,212,232,.75)"/>
                <div style={{display:'flex',justifyContent:'space-between',marginTop:8,fontFamily:'var(--mono)',fontSize:10,color:'var(--t3)'}}>
                  <span>OLDEST</span><span>LATEST</span>
                </div>
              </div>

              {/* Session cost distribution rings */}
              <div className="card" style={{padding:20}}>
                <div className="section-title mb-4">Session Intensity Distribution</div>
                <div style={{fontFamily:'var(--mono)',fontSize:10,color:'var(--t3)',marginBottom:16}}>
                  SOURCE: ProgressTrackingView · cost_status field
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
                  {[
                    ['low',       SC.low,  'Low'],
                    ['moderate',  SC.moderate, 'Moderate'],
                    ['high',      SC.warn, 'High'],
                    ['very_high', SC.bad,  'Very High'],
                  ].map(([key,color,label])=>{
                    const n   = costBuckets[key]||0
                    const val = totalSess>0 ? n/totalSess : 0
                    return (
                      <div key={key} style={{display:'flex',alignItems:'center',gap:10}}>
                        <Ring size={52} value={val} stroke={5} label={String(n)} sub="" color={color}/>
                        <div>
                          <div style={{fontSize:12,fontWeight:600,color:'var(--t1)'}}>{label}</div>
                          <div style={{fontFamily:'var(--mono)',fontSize:11,color:color}}>{Math.round(val*100)}%</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── ORM PROGRESSION CHARTS ── */}
          {coreWithAnyData.length > 0 && (
            <div className="mb-20">
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
                <div>
                  <div className="section-title" style={{marginBottom:2}}>1RM Progression</div>
                  <div style={{fontFamily:'var(--mono)',fontSize:10,color:'var(--t3)'}}>SOURCE: ONE_REP_MAX · latest entry per exercise</div>
                </div>
              </div>
              <div className="g2">
                {coreWithHistory.map(name=>{
                  const data   = ormByEx[name]
                  const latest = data[data.length-1]
                  const gain   = data.length>1 ? (latest-data[0]).toFixed(1) : 0
                  return (
                    <div key={name} className="card card-dark" style={{padding:18}}>
                      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
                        <div className="label">{name}</div>
                        {gain>0&&<span style={{fontFamily:'var(--mono)',fontSize:11,color:'var(--good)'}}>↑ {gain}kg</span>}
                      </div>
                      <div style={{display:'flex',alignItems:'baseline',gap:6,marginBottom:12}}>
                        <span className="mono grad" style={{fontSize:32,fontWeight:700,letterSpacing:'-.04em'}}>{latest}</span>
                        <span style={{fontFamily:'var(--mono)',fontSize:12,color:'var(--t2)'}}>kg</span>
                      </div>
                      {data.length > 1
                        ? <Sparkline data={data} height={52} color="var(--cy)"/>
                        : <div style={{fontSize:12,color:'var(--t3)',paddingTop:4}}>Log more sessions to see progression trend</div>
                      }
                      <div style={{display:'flex',justifyContent:'space-between',marginTop:6,fontFamily:'var(--mono)',fontSize:10,color:'var(--t3)'}}>
                        <span>START {data[0]}kg</span><span>NOW {latest}kg</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── PERSONAL BESTS ── */}
          {pbs.length > 0 && (
            <div className="mb-20">
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
                <div>
                  <div className="section-title" style={{marginBottom:2}}>Personal Bests</div>
                  <div style={{fontFamily:'var(--mono)',fontSize:10,color:'var(--t3)'}}>SOURCE: ProgressTrackingView (correlated subquery MAX)</div>
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                {pbs.filter(p=>parseFloat(p.best_kg)>0).map((pr,i)=>(
                  <div key={i} className="card" style={{padding:'14px 18px',display:'flex',alignItems:'center',gap:12}}>
                    <div style={{width:36,height:36,borderRadius:10,background:'var(--gd)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                      <span style={{fontSize:16}}>🏆</span>
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:14,fontWeight:600,color:'var(--t1)',marginBottom:2}}>{pr.exercise_name}</div>
                      <div style={{fontSize:11,color:'var(--t2)'}}>{pr.achieved_on}</div>
                    </div>
                    <div className="mono grad" style={{fontSize:22,fontWeight:700,flexShrink:0}}>{parseFloat(pr.best_kg).toFixed(1)}kg</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── VOLUME BY EXERCISE ── */}
          {Object.keys(volByEx).length > 0 && (
            <div className="mb-20">
              <div style={{marginBottom:12}}>
                <div className="section-title" style={{marginBottom:2}}>Weekly Volume by Exercise</div>
                <div style={{fontFamily:'var(--mono)',fontSize:10,color:'var(--t3)'}}>SOURCE: ExerciseSummaryView (SUM of sets×reps×weight per week)</div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                {Object.entries(volByEx).slice(0,6).map(([name,vols])=>(
                  <div key={name} className="card" style={{padding:14}}>
                    <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',marginBottom:8}}>
                      <div className="label" style={{fontSize:10}}>{name}</div>
                      <div style={{fontFamily:'var(--mono)',fontSize:14,fontWeight:600,color:'var(--mg)'}}>{vols[vols.length-1]?.toFixed(0)||0}<span style={{fontSize:10,color:'var(--t3)',marginLeft:3}}>kg</span></div>
                    </div>
                    <MiniBars data={vols} height={36} color="rgba(176,96,232,.75)"/>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── SESSION HISTORY ── */}
          {sessionHist.length > 0 && (
            <div className="mb-20">
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
                <div>
                  <div className="section-title" style={{marginBottom:2}}>Session History</div>
                  <div style={{fontFamily:'var(--mono)',fontSize:10,color:'var(--t3)'}}>SOURCE: WORKOUT_LOG · all completed sessions</div>
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                {sessionHist.slice(0,10).map((s,i)=>(
                  <div key={i} className="card" style={{padding:'12px 16px',display:'flex',alignItems:'center',gap:10}}>
                    <div style={{width:36,height:36,borderRadius:9,background:'var(--gd)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                      <span style={{fontFamily:'var(--mono)',fontSize:13,fontWeight:700,color:'#0a0d12'}}>{s.session_key}</span>
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:13,fontWeight:600,color:'var(--t1)'}}>Session {s.session_key}</div>
                      <div style={{fontSize:11,color:'var(--t2)',marginTop:1}}>{s.workout_date} · {s.total_sets} sets</div>
                    </div>
                    <div style={{textAlign:'right',flexShrink:0}}>
                      <div style={{fontFamily:'var(--mono)',fontSize:15,fontWeight:700}}>{s.session_cost}</div>
                      <div style={{fontFamily:'var(--mono)',fontSize:9,color:SC[s.cost_status]||'var(--t2)',fontWeight:600,marginTop:1}}>
                        {SL[s.cost_status]||''}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── RUNNING LOG ── */}
          {runs.length > 0 && (
            <div className="mb-8">
              <div style={{marginBottom:12}}>
                <div className="section-title" style={{marginBottom:2}}>Running Log</div>
                <div style={{fontFamily:'var(--mono)',fontSize:10,color:'var(--t3)'}}>SOURCE: RUNNING_LOG table</div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                {runs.map((run,i)=>(
                  <div key={i} className="card" style={{padding:'12px 16px',display:'flex',alignItems:'center',gap:10}}>
                    <div style={{width:36,height:36,borderRadius:9,background:run.session_type==='speed'?'var(--bad-dim)':run.session_type==='long_run'?'var(--mg-dim)':'var(--cy-dim)',border:`1px solid ${run.session_type==='speed'?'rgba(239,68,68,.3)':run.session_type==='long_run'?'rgba(176,96,232,.3)':'rgba(0,212,232,.3)'}`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                      <span style={{fontSize:18}}>{run.session_type==='speed'?'⚡':run.session_type==='long_run'?'↗':'🏃'}</span>
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:13,fontWeight:600,color:'var(--t1)',textTransform:'capitalize'}}>{run.session_type?.replace(/_/g,' ')}</div>
                      <div style={{fontSize:11,color:'var(--t2)',marginTop:1}}>{run.run_date} · Phase {run.running_phase}</div>
                    </div>
                    <div style={{textAlign:'right',flexShrink:0}}>
                      <div style={{fontFamily:'var(--mono)',fontSize:15,fontWeight:700}}>{run.distance_km}km</div>
                      <div style={{fontFamily:'var(--mono)',fontSize:10,color:'var(--t3)',marginTop:1}}>{parseFloat(run.avg_pace_min_per_km||0).toFixed(1)} /km</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
