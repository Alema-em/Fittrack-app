// ── Running phases ────────────────────────────────────────────
export const RUNNING_PHASES = {
  1:{ name:'Short Repeats', subtitle:'Tissue Adaptation & Mechanical Efficiency',
      weeks:{
        1:{mainSet:'5 × 200m',pace:'3:50/km (46s/200m)',recovery:'90s walk',ceiling:'5 reps. No more.'},
        2:{mainSet:'6 × 200m',pace:'3:50/km',recovery:'90s walk',ceiling:'6 reps. No more.'},
        3:{mainSet:'7 × 200m',pace:'3:47/km',recovery:'90s walk',ceiling:'7 reps.'},
        4:{mainSet:'6 × 200m',pace:'3:47/km',recovery:'75s walk',ceiling:'Pullback week. Density up slightly.'},
      }, warmUp:'10 min easy jog + 4×100m strides', coolDown:'10 min easy jog', satAlt:false },
  2:{ name:'Extended Repeats + Speed Gap', subtitle:'Lactate Threshold & Speed',
      weeks:{
        1:{mainSet:'4×400m @ 5K pace',pace:'3:50/km',recovery:'2 min easy',ceiling:'4 reps max.'},
        2:{mainSet:'4×400m + 1×400m @3K',pace:'5K:3:50 · 3K:3:38',recovery:'2 min',ceiling:'5 reps, 1 fast.'},
        3:{mainSet:'4×400m + 2×400m @3K',pace:'5K:3:47 · 3K:3:38',recovery:'2 min',ceiling:'6 reps.'},
        4:{mainSet:'5×400m + 2×400m @3K',pace:'5K:3:47 · 3K:3:35',recovery:'2 min',ceiling:'7 reps.'},
      }, warmUp:'10 min easy jog + 4×100m strides', coolDown:'10 min easy', satAlt:true, satAltDetail:'3×(3 min @10K/3 min easy). 15 min warm-up.' },
  3:{ name:'Mixed Repeats + Gear Changes', subtitle:'Race-Specific Endurance',
      weeks:{
        1:{mainSet:'2×400@5K + 1×800@5K + 1×400@3K',pace:'5K:3:47 · 3K:3:38',recovery:'2/3 min',ceiling:'First gear change.'},
        2:{mainSet:'400@5K + 800@5K + 400@3K + 800@5K + 400@3K',pace:'5K:3:47 · 3K:3:35',recovery:'2/3 min',ceiling:'Two gear changes.'},
        3:{mainSet:'400@3K + 800@5K + 400@3K + 800@5K + 400@5K',pace:'5K:3:47 · 3K:3:35',recovery:'2/3 min',ceiling:'Fast start.'},
        4:{mainSet:'400@3K + 2×800@5K + 400@3K + 400@5K',pace:'5K:3:47 · 3K:3:35',recovery:'2/3 min',ceiling:'Confidence session.'},
      }, warmUp:'10 min easy + 4×100m strides', coolDown:'10 min easy', satAlt:true, satAltDetail:'4×(3 min @10K/3 min easy). 55–65 min.' },
  4:{ name:'Race Preparation', subtitle:'Sharpening & Confidence',
      weeks:{
        1:{mainSet:'3×1000m @ 5K pace',pace:'3:47/km',recovery:'3 min easy',ceiling:'3 reps only.'},
        2:{mainSet:'2×1000m @5K + 1×600m @3K',pace:'5K:3:47 · 3K:3:35',recovery:'3 min',ceiling:'Sharp 600m finish.'},
        3:{mainSet:'2×1200m @ 5K pace',pace:'3:47/km',recovery:'3 min',ceiling:'Race simulation.'},
        4:{mainSet:'4×400m relaxed',pace:'4:00/km',recovery:'2 min walk',ceiling:'Shakeout only.'},
      }, warmUp:'10 min easy + 4×100m strides', coolDown:'10 min easy', satAlt:false },
}

export const getTuesdayRun = phase => ({
  duration:'20–25 min', pace:'Conversational — full sentences only',
  hr:'Below 75% max HR', strides: phase >= 2,
  stridesDetail:'4–6×20s smooth accelerations after run. Full walk-back recovery.',
})

export const getSaturdayRun = (phase, week) => {
  const p = RUNNING_PHASES[phase]
  const isAlt = p?.satAlt && week % 2 === 1
  if (phase === 4) return { type:'Easy Long Run', duration:week===4?'30 min':'45–55 min', pace:'Easy conversational', alt:false, note:week===4?'Race week — easy jog only.':'No surges.' }
  if (isAlt) return { type:'Alternation Long Run', duration:phase===3?'55–65 min':'50–60 min', pace:'Easy with 10K effort segments', alt:true, altDetail:p.satAltDetail, note:'Controlled effort, not racing.' }
  return { type:'Easy Long Run', duration:phase===1?'50–60 min':'50–70 min', pace:'Conversational throughout', alt:false, note:'No progression. No surges. Pure volume.' }
}

// ── Iron Rules ────────────────────────────────────────────────
export const IRON_RULES = [
  { n:1, title:'Pace is a ceiling, not a floor',           text:'Running 3:40 when prescribed 3:50 is a failure. Hitting the exact pace is the skill.' },
  { n:2, title:'Finish feeling you could do 3 more',       text:'Every session ends with you feeling strong. If you\'re destroyed, you went too hard.' },
  { n:3, title:'HR cap — never exceed 90% max',            text:'If you hit 90%, slow down. You\'re building speed systems, not testing them.' },
  { n:4, title:'Never add extra reps',                     text:'The hard ceiling is absolute. Even if you feel incredible. Especially then.' },
  { n:5, title:'One speed session — Thursday only',        text:'No sneaking a tempo on Saturday. Easy means easy.' },
  { n:6, title:'Post-session energy check',                text:'Two hours after: can you function normally? Yes = good session. No = went too hard.' },
]

// ── Weekly schedule ───────────────────────────────────────────
export const SCHEDULE_RUN = [
  { name:'Mon', emoji:'🏋', type:'Gym',   key:'A',     desc:'Session A — Lower body heavy' },
  { name:'Tue', emoji:'🏃', type:'Run',   key:'zone2', desc:'Zone 2 easy run' },
  { name:'Wed', emoji:'🏋', type:'Gym',   key:'B',     desc:'Session B — Upper body' },
  { name:'Thu', emoji:'⚡', type:'Speed', key:'speed', desc:'Speed session' },
  { name:'Fri', emoji:'🏋', type:'Gym',   key:'C',     desc:'Session C — Full body' },
  { name:'Sat', emoji:'↗',  type:'Long',  key:'long',  desc:'Long run' },
  { name:'Sun', emoji:'—',  type:'Rest',  key:'rest',  desc:'Full rest' },
]
export const SCHEDULE_STRENGTH = [
  { name:'Mon', emoji:'🏋', type:'Gym',  key:'A',    desc:'Session A — Lower body heavy' },
  { name:'Tue', emoji:'😴', type:'Rest', key:'rest', desc:'Rest / Light activity' },
  { name:'Wed', emoji:'🏋', type:'Gym',  key:'B',    desc:'Session B — Upper body' },
  { name:'Thu', emoji:'😴', type:'Rest', key:'rest', desc:'Rest / Light activity' },
  { name:'Fri', emoji:'🏋', type:'Gym',  key:'C',    desc:'Session C — Full body' },
  { name:'Sat', emoji:'😴', type:'Rest', key:'rest', desc:'Rest' },
  { name:'Sun', emoji:'—',  type:'Rest', key:'rest', desc:'Full rest' },
]

// ── Plate calculator ──────────────────────────────────────────
export const calcPlates = (target, bar, plates) => {
  if (target <= bar) return { perSide:[], actual:bar, warning:target<bar?`Lighter than bar (${bar}kg)`:null }
  const half   = (target - bar) / 2
  const sizes  = Object.keys(plates).filter(p=>plates[p]).map(parseFloat).sort((a,b)=>b-a)
  const used   = []; let rem = half
  for (const p of sizes) {
    let c = 0
    while (rem >= p - 0.001) { c++; rem = Math.round((rem-p)*1000)/1000 }
    if (c) used.push({ weight:p, count:c })
  }
  const actual = bar + 2*(half-rem)
  return { perSide:used, actual:Math.round(actual*100)/100, warning:rem>0.01?`Closest achievable: ${Math.round(actual*100)/100}kg`:null }
}

// ── Helpers ───────────────────────────────────────────────────
export const weekTypeLabel = w => {
  const c = ((w-1)%4)+1
  return ['MODERATE','HARD','MODERATE+','DELOAD'][c-1] || 'MODERATE'
}
export const TIER_INFO = {
  1:{ label:'T1', name:'Heavy Compound' },
  2:{ label:'T2', name:'Compound' },
  3:{ label:'T3', name:'Accessory' },
}
/** Strength session keys (A/B/C) from dashboard session rows */
export function getStrengthSessionKeys(sessions = []) {
  return [...new Set(
    sessions
      .filter(s => {
        if (s.session_type === 'strength') return true
        if (s.session_type === 'running' || s.session_key?.startsWith('Run')) return false
        return s.session_type == null && s.session_key && !s.session_key.startsWith('Run')
      })
      .map(s => s.session_key)
  )].sort()
}

export const DEMO_CREDENTIALS = [
  { name:'Meher Bhatti',     email:'meher@email.com',  tag:'Strength · Week 5' },
  { name:'Akshay Aiyer',     email:'akshay@email.com', tag:'Strength · Week 8' },
  { name:'Siya Attarde',     email:'siya@email.com',   tag:'Hypertrophy · Week 3' },
  { name:'Yash Saraiya',     email:'yash@email.com',   tag:'Endurance · Week 1' },
  { name:'Alema Emran',      email:'alema@email.com',  tag:'Weight Loss · Week 2' },
]
