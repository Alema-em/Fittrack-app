import React, { useEffect, useState } from 'react'
import { useStore } from '../store.js'
import { getDashboard } from '../api.js'
import { Sparkline, MiniBars, EmptyState } from '../components.jsx'
import { SCHEDULE_RUN, SCHEDULE_STRENGTH, weekTypeLabel } from '../data.js'

const STATUS_C = { low:'var(--good)', moderate:'var(--cy)', high:'var(--warn)', very_high:'var(--bad)' }
const STATUS_L = { low:'Low', moderate:'Moderate', high:'High', very_high:'Very High' }
const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

export default function HomePage() {
  const { user, dashboard, setDashboard, setLoading, loading, setTab, startWorkout } = useStore()
  const todayIdx = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1
  const [selectedDay, setSelectedDay] = useState(todayIdx)

  useEffect(() => {
    if (!user?.user_id) return
    setLoading('home', true)
    getDashboard(user.user_id).then(setDashboard).catch(console.error).finally(()=>setLoading('home',false))
  }, [user?.user_id])

  const plan        = dashboard?.plan
  const logs        = dashboard?.logs || []
  const orms        = dashboard?.orms || []
  const stats       = dashboard?.stats || {}
  const sessions    = dashboard?.sessions || []
  const firstName   = user?.name?.split(' ')[0] || 'Athlete'
  const wk          = plan?.strength_week || user?.strengthWeek || 1
  const wt          = plan?.computed_week_type || weekTypeLabel(wk)
  const schedule    = user?.includeRunning ? SCHEDULE_RUN : SCHEDULE_STRENGTH
  const deadliftOrm = orms.find(o=>o.exercise_name==='Deadlift')
  const hasData     = (stats.total_sessions||0) > 0
  const loadHist    = logs.slice().reverse().map(l=>l.session_cost||0)

  // Selected day
  const selDay       = schedule[selectedDay]
  const selKey       = selDay?.key
  const selExercises = sessions.filter(s=>s.session_key===selKey)
  const selTplId     = selExercises[0]?.template_id
  const isGym        = selDay?.type==='Gym'
  const isRun        = ['Run','Speed','Long'].includes(selDay?.type)

  if (loading.home) return (
    <div className="page" style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'60vh'}}>
      <div style={{textAlign:'center'}}>
        <div className="db-pulse" style={{marginBottom:12}}/>
        <div style={{fontFamily:'var(--mono)',fontSize:12,color:'var(--t3)'}}>Loading your data…</div>
      </div>
    </div>
  )

  return (
    <div className="page fade-up">
      {/* Greeting */}
      <div className="mb-24">
        <div style={{fontFamily:'var(--mono)',fontSize:11,color:'var(--t3)',letterSpacing:'.1em',marginBottom:8}}>
          {DAYS[todayIdx].toUpperCase()} · WEEK {wk} · {wt}
        </div>
        <h1 style={{fontSize:32,fontWeight:700,letterSpacing:'-.03em',color:'var(--t1)',marginBottom:6}}>
          Good morning, <span className="grad">{firstName}</span>.
        </h1>
        <p style={{fontSize:15,color:'var(--t2)',lineHeight:1.5}}>{schedule[todayIdx]?.desc||'Rest day'} today.</p>
      </div>

      {/* Two-column main layout */}
      <div className="g2 mb-24">
        {/* Session card */}
        <div className="card" style={{padding:0,overflow:'hidden'}}>
          {isGym && selExercises.length > 0 ? (
            <>
              <div style={{padding:'16px 20px 12px',borderBottom:'1px solid var(--border)'}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:4}}>
                  <div style={{fontFamily:'var(--mono)',fontSize:10,color:'var(--t3)',letterSpacing:'.12em',textTransform:'uppercase'}}>
                    {selectedDay===todayIdx?"Today's Session":`${selDay?.name}'s Session`}
                  </div>
                  <span style={{fontFamily:'var(--mono)',fontSize:10,color:'var(--cy)',background:'var(--cy-dim)',padding:'2px 8px',borderRadius:6}}>
                    Session {selKey}
                  </span>
                </div>
                <div style={{fontSize:18,fontWeight:700,color:'var(--t1)'}}>Week {wk} · {wt}</div>
              </div>
              <div style={{padding:'4px 20px 0'}}>
                {selExercises.slice(0,5).map((ex,i)=>(
                  <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'9px 0',borderBottom:'1px solid var(--border)'}}>
                    <span className={`tier tier-${ex.tier||3}`}>T{ex.tier||3}</span>
                    <div style={{flex:1}}>
                      <div style={{fontSize:14,fontWeight:600,color:'var(--t1)'}}>{ex.exercise_name}</div>
                      <div style={{fontSize:12,color:'var(--t2)',marginTop:1}}>{ex.sets}×{ex.reps}{ex.rest_duration?` · ${ex.rest_duration}`:''}</div>
                    </div>
                    <div style={{fontFamily:'var(--mono)',fontSize:14,fontWeight:700,color:ex.target_weight_kg>0?'var(--cy)':'var(--t3)'}}>
                      {ex.target_weight_kg>0?`${ex.target_weight_kg}kg`:ex.is_bodyweight?'BW':'—'}
                    </div>
                  </div>
                ))}
                {selExercises.length>5&&<div style={{padding:'8px 0',fontFamily:'var(--mono)',fontSize:11,color:'var(--t3)'}}>+{selExercises.length-5} more exercises</div>}
              </div>
              <div style={{padding:'14px 20px'}}>
                <button className="btn btn-primary full" style={{fontSize:15}} onClick={()=>startWorkout(selKey,selTplId)}>
                  ▶ Start Session {selKey}
                </button>
              </div>
            </>
          ) : isRun ? (
            <div style={{padding:28,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:220,textAlign:'center'}}>
              <div style={{fontSize:40,marginBottom:12}}>{selDay?.emoji}</div>
              <div style={{fontSize:17,fontWeight:600,color:'var(--t1)',marginBottom:6}}>{selDay?.desc}</div>
              <div style={{fontSize:13,color:'var(--t2)',lineHeight:1.6,marginBottom:16}}>See the Run tab for your full programme details.</div>
              <button className="btn btn-primary" onClick={()=>setTab('running')}>Open Run Programme →</button>
            </div>
          ) : (
            <div style={{padding:28,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:220,textAlign:'center'}}>
              <div style={{fontSize:44,marginBottom:12}}>😴</div>
              <div style={{fontSize:17,fontWeight:600,color:'var(--t1)',marginBottom:6}}>
                {selectedDay===todayIdx?'Rest Day':`${selDay?.name} — ${selDay?.desc}`}
              </div>
              <div style={{fontSize:13,color:'var(--t2)',lineHeight:1.6}}>Recovery is when adaptation happens. Enjoy it.</div>
            </div>
          )}
        </div>

        {/* Right column stats + ORM */}
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          <div className="g2" style={{gap:10}}>
            {[
              ['Week', wk, 'CURRENT', 'var(--t1)'],
              ['Sessions', hasData?stats.total_sessions:'—', 'TOTAL', hasData?'var(--cy)':'var(--t3)'],
              ['Volume', hasData&&stats.total_kg_lifted>0?`${(stats.total_kg_lifted/1000).toFixed(1)}k`:'—', 'KG', hasData?'var(--mg)':'var(--t3)'],
              ['Weeks', hasData?stats.active_weeks||0:'—', 'ACTIVE', hasData?'var(--good)':'var(--t3)'],
            ].map(([l,v,u,c])=>(
              <div key={l} className="stat-card">
                <span className="label">{l}</span>
                <span className="value-big" style={{color:c}}>{v}</span>
                <span className="label" style={{marginTop:4,display:'block'}}>{u}</span>
              </div>
            ))}
          </div>
          {deadliftOrm ? (
            <div className="card card-dark" style={{padding:18,flex:1}}>
              <div className="label mb-8">Deadlift 1RM</div>
              <div style={{display:'flex',alignItems:'baseline',gap:8,marginBottom:12}}>
                <span className="mono grad" style={{fontSize:36,fontWeight:700,letterSpacing:'-.05em'}}>{deadliftOrm.weight_kg}</span>
                <span style={{fontFamily:'var(--mono)',fontSize:12,color:'var(--t2)'}}>kg</span>
              </div>
              <Sparkline data={[deadliftOrm.weight_kg*.62,deadliftOrm.weight_kg*.7,deadliftOrm.weight_kg*.78,deadliftOrm.weight_kg*.86,deadliftOrm.weight_kg*.92,deadliftOrm.weight_kg]} height={50} color="var(--cy)"/>
            </div>
          ) : (
            <div className="card" style={{padding:18,flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',textAlign:'center'}}>
              <div style={{fontSize:13,color:'var(--t3)',marginBottom:10}}>No 1RM data yet</div>
              <button className="btn btn-ghost sm" onClick={()=>setTab('settings')}>Add in Settings →</button>
            </div>
          )}
        </div>
      </div>

      {/* Clickable weekly schedule - full width */}
      <div className="mb-24">
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
          <div className="section-title">Weekly Schedule</div>
          <div style={{fontSize:12,color:'var(--t3)'}}>{user?.includeRunning?'Strength + Running':'Strength Only'} · tap to preview a day</div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:8}}>
          {schedule.map((day,i)=>{
            const isTod = i===todayIdx
            const isSel = i===selectedDay
            const isSpd = day.type==='Speed'
            return (
              <button key={i} onClick={()=>setSelectedDay(i)} style={{
                padding:'14px 6px',borderRadius:14,border:'2px solid',
                borderColor:isSel?(isSpd?'var(--bad)':'var(--cy)'):isTod?'rgba(255,255,255,.2)':'var(--border)',
                background:isSel?(isSpd?'var(--bad-dim)':'var(--cy-dim)'):'var(--surf)',
                cursor:'pointer',transition:'all .18s',textAlign:'center',
              }}>
                <div style={{fontFamily:'var(--mono)',fontSize:11,fontWeight:700,marginBottom:6,
                  color:isSel?(isSpd?'var(--bad)':'var(--cy)'):isTod?'var(--t1)':'var(--t3)'}}>
                  {day.name}
                </div>
                <div style={{fontSize:20,marginBottom:4}}>{day.emoji}</div>
                <div style={{fontFamily:'var(--mono)',fontSize:9,color:isSel?(isSpd?'var(--bad)':'var(--cy)'):'var(--t3)',letterSpacing:'.04em'}}>
                  {day.type==='Gym'?`Ses.${day.key}`:day.type}
                </div>
                {isTod&&!isSel&&<div style={{width:4,height:4,borderRadius:'50%',background:'var(--cy)',margin:'4px auto 0'}}/>}
              </button>
            )
          })}
        </div>
      </div>

      {/* Load history */}
      {loadHist.length>0&&(
        <div className="g2 mb-20">
          <div className="card">
            <div className="label mb-10">Session Load History</div>
            <MiniBars data={loadHist} height={56} color="rgba(0,212,232,.75)"/>
            <div style={{display:'flex',justifyContent:'space-between',marginTop:8,fontFamily:'var(--mono)',fontSize:10,color:'var(--t3)'}}>
              <span>OLDEST</span><span>MOST RECENT</span>
            </div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            {logs.slice(0,4).map((log,i)=>(
              <div key={i} className="card" style={{padding:'13px 14px',display:'flex',alignItems:'center',gap:10}}>
                <div style={{width:36,height:36,borderRadius:9,background:'var(--gd)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  <span style={{fontFamily:'var(--mono)',fontSize:13,fontWeight:700,color:'#0a0d12'}}>{log.session_key}</span>
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:12,fontWeight:600,color:'var(--t1)'}}>Session {log.session_key}</div>
                  <div style={{fontSize:11,color:'var(--t2)',marginTop:1}}>{log.workout_date}</div>
                </div>
                <div style={{textAlign:'right',flexShrink:0}}>
                  <div style={{fontFamily:'var(--mono)',fontSize:15,fontWeight:700}}>{log.session_cost}</div>
                  <div style={{fontFamily:'var(--mono)',fontSize:9,color:STATUS_C[log.cost_status]||'var(--t2)',fontWeight:600,marginTop:1}}>
                    {STATUS_L[log.cost_status]||''}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!hasData&&sessions.length>0&&(
        <div className="callout mt-4">
          <div style={{fontWeight:600,color:'var(--t1)',marginBottom:4}}>🎉 You're all set!</div>
          <div className="callout-text">Your training plan is ready. Select a gym day above and hit Start to log your first workout.</div>
        </div>
      )}
    </div>
  )
}
