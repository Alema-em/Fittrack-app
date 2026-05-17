import React from 'react'
import { useStore } from './store.js'

let _rc = 0, _sc = 0

export const Ring = ({ size=100, value=0.65, stroke=8, label, sub }) => {
  const idRef = React.useRef(`r${++_rc}`)
  const id = idRef.current
  const r = (size - stroke) / 2
  const c = Math.PI * 2 * r
  const d = c * Math.max(0, Math.min(1, value))
  return (
    <div className="ring-wrap" style={{ width:size, height:size }}>
      <svg width={size} height={size} style={{ transform:'rotate(-90deg)' }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#00d4e8"/>
            <stop offset="100%" stopColor="#b060e8"/>
          </linearGradient>
        </defs>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#ffffff0a" strokeWidth={stroke}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={`url(#${id})`} strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={`${d} ${c}`}
          style={{ transition:'stroke-dasharray .8s ease' }}/>
      </svg>
      <div className="ring-center">
        {label && <span className="mono" style={{ fontSize:size*.22, fontWeight:700, color:'var(--t1)', letterSpacing:'-.04em' }}>{label}</span>}
        {sub   && <span style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--t3)', letterSpacing:'.1em', textTransform:'uppercase' }}>{sub}</span>}
      </div>
    </div>
  )
}

export const Sparkline = ({ data, height=80, color='var(--cy)' }) => {
  const idRef = React.useRef(`s${++_sc}`)
  const id = idRef.current
  const W = 400
  if (!data || data.length < 2) return <div style={{ height }}/>
  const mn = Math.min(...data), mx = Math.max(...data), rng = mx - mn || 1
  const pts = data.map((v,i) => [
    (i / (data.length-1)) * W,
    height - ((v-mn)/rng) * (height-10) - 5
  ])
  const path  = pts.map(([x,y],i) => `${i===0?'M':'L'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')
  const area  = `${path} L${W} ${height} L0 ${height} Z`
  const [lx,ly] = pts[pts.length-1]
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none" style={{ display:'block' }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity=".3"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      {[.25,.5,.75].map(g => <line key={g} x1={0} x2={W} y1={height*g} y2={height*g} stroke="#ffffff05" strokeWidth={1}/>)}
      <path d={area} fill={`url(#${id})`}/>
      <path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx={lx} cy={ly} r={4} fill={color} stroke="#0a0d12" strokeWidth={2}/>
    </svg>
  )
}

export const MiniBars = ({ data, height=44, color='var(--mg)' }) => {
  if (!data || !data.length) return <div style={{ height }}/>
  const W = 240, mx = Math.max(...data)||1, bw = (W - data.length*2) / data.length
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none" style={{ display:'block' }}>
      {data.map((v,i) => {
        const bh = Math.max(3, (v/mx)*(height-4))
        return <rect key={i} x={i*(bw+2)} y={height-bh} width={bw} height={bh} rx={2} fill={color}/>
      })}
    </svg>
  )
}

export const ProgressBar = ({ value, style }) => (
  <div className="pbar" style={style}>
    <div className="pbar-fill" style={{ width:`${Math.max(0,Math.min(1,value))*100}%` }}/>
  </div>
)

export const Pill = ({ children, v='dim' }) => <span className={`pill pill-${v}`}>{children}</span>
export const Tier = ({ n }) => <span className={`tier tier-${n}`}>T{n}</span>
export const Dot  = ({ bad }) => <span className={`dot ${bad?'dot-bad':'dot-good'}`}/>

export const PageLoader = ({ label = 'Loading…', fullScreen = false }) => (
  <div className={`page-loader${fullScreen ? ' page-loader--full' : ''}`}>
    <div className="page-loader-ring" aria-hidden="true" />
    <div className="page-loader-label">{label}</div>
  </div>
)

export const EmptyState = ({ icon, title, sub, action, onAction }) => (
  <div className="empty">
    <div className="empty-icon">{icon||'📭'}</div>
    <div className="empty-title">{title}</div>
    {sub && <div className="empty-sub" style={{ marginTop:6 }}>{sub}</div>}
    {action && <button type="button" className="btn btn-primary" style={{ marginTop:20 }} onClick={onAction}>{action}</button>}
  </div>
)

export function ToastStack() {
  const toasts = useStore(s => s.toasts)
  const dismissToast = useStore(s => s.dismissToast)
  if (!toasts.length) return null
  return (
    <div className="toast-stack" aria-live="polite">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast--${t.type}`} role="status">
          <span className="toast-msg">{t.message}</span>
          <button type="button" className="toast-close" onClick={() => dismissToast(t.id)} aria-label="Dismiss">✕</button>
        </div>
      ))}
    </div>
  )
}

export function Modal({ open, title, subtitle, onClose, children, wide }) {
  if (!open) return null
  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        className={`modal${wide ? ' modal--wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-head">
          <div>
            <h2 id="modal-title" className="modal-title">{title}</h2>
            {subtitle && <p className="modal-sub">{subtitle}</p>}
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  )
}

