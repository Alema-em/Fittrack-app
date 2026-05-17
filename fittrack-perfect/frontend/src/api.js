let _token = null
export const setToken = t => { _token = t }
export const getToken = () => _token

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'
const B = API_URL.replace(/\/$/, '')
const H = () => ({ 'Content-Type': 'application/json', ...(_token ? { Authorization: `Bearer ${_token}` } : {}) })
const go = async r => {
  const contentType = r.headers.get('content-type') || ''
  const d = contentType.includes('application/json') ? await r.json() : null
  if (!r.ok) throw new Error(d?.error || `HTTP ${r.status}`)
  return d
}

export const health       = ()        => fetch(`${B}/health`).then(go)
export const apiMe        = ()        => fetch(`${B}/auth/me`, { headers: H() }).then(go)
export const apiLogin     = (e,p)     => fetch(`${B}/auth/login`,    { method:'POST', headers:H(), body:JSON.stringify({ email:e, password:p }) }).then(go)
export const apiRegister  = b         => fetch(`${B}/auth/register`, { method:'POST', headers:H(), body:JSON.stringify(b) }).then(go)
export const getDashboard = uid       => fetch(`${B}/dashboard/${uid}`, { headers:H() }).then(go)
export const getProgress  = uid       => fetch(`${B}/progress/${uid}`,  { headers:H() }).then(go)
export const getExercises = ()        => fetch(`${B}/exercises`, { headers:H() }).then(go)
export const createExercise = b       => fetch(`${B}/exercises`, { method:'POST',   headers:H(), body:JSON.stringify(b) }).then(go)
export const deleteExercise = id      => fetch(`${B}/exercises/${id}`, { method:'DELETE', headers:H() }).then(go)
export const createSession  = b       => fetch(`${B}/plans/sessions`, { method:'POST', headers:H(), body:JSON.stringify(b) }).then(go)
export const addToSession   = (tid,b) => fetch(`${B}/sessions/${tid}/exercises`, { method:'POST', headers:H(), body:JSON.stringify(b) }).then(go)
export const removeFromSession = id   => fetch(`${B}/sessions/exercises/${id}`, { method:'DELETE', headers:H() }).then(go)
export const getOrms       = uid      => fetch(`${B}/orms/${uid}`, { headers:H() }).then(go)
export const updateOrm     = (uid,b)  => fetch(`${B}/orms/${uid}`, { method:'PUT',    headers:H(), body:JSON.stringify(b) }).then(go)
export const logWorkout    = b        => fetch(`${B}/workout/log`,     { method:'POST',   headers:H(), body:JSON.stringify(b) }).then(go)
export const advanceWeek   = b        => fetch(`${B}/workout/advance`, { method:'POST',   headers:H(), body:JSON.stringify(b) }).then(go)
export const logRun        = b        => fetch(`${B}/running/log`,     { method:'POST',   headers:H(), body:JSON.stringify(b) }).then(go)
export const getDbStats    = uid      => fetch(`${B}/dbstats?userId=${uid}`, { headers:H() }).then(go)
