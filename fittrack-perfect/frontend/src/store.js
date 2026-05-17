import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { setToken, apiMe } from './api.js'

const ls = {
  getItem:    k => { try { return JSON.parse(localStorage.getItem(k)) } catch { return null } },
  setItem:    (k,v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch {} },
  removeItem: k => { try { localStorage.removeItem(k) } catch {} },
}

const LEGACY_KEYS = ['fittrack-v7', 'fittrack-v6', 'fittrack-v5', 'fittrack-v4']

export function purgeLegacyAuth() {
  LEGACY_KEYS.forEach(k => localStorage.removeItem(k))
}

const emptyWorkout = () => ({
  active: false,
  sessionKey: null,
  templateId: null,
  elapsed: 0,
  paused: false,
  completedSets: {},
})

const clearSessionData = {
  activeTab: 'home',
  dashboard: null,
  progress: null,
  dbStats: null,
  exercises: [],
  workout: emptyWorkout(),
}

let toastId = 0

export const useStore = create(persist(
  (set, get) => ({
    user: null,
    token: null,
    authReady: false,
    authVersion: 0,

    toasts: [],
    toast: (message, type = 'success') => {
      const id = ++toastId
      set(s => ({ toasts: [...s.toasts, { id, message, type }] }))
      setTimeout(() => {
        set(s => ({ toasts: s.toasts.filter(t => t.id !== id) }))
      }, 3200)
    },
    dismissToast: id => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })),

    setAuth: (user, token) => {
      purgeLegacyAuth()
      setToken(token)
      set({
        user,
        token,
        authReady: true,
        authVersion: Date.now(),
        ...clearSessionData,
      })
    },

    logout: () => {
      purgeLegacyAuth()
      setToken(null)
      set({
        user: null,
        token: null,
        authReady: true,
        authVersion: Date.now(),
        toasts: [],
        ...clearSessionData,
      })
    },

    hydrateAuth: async () => {
      purgeLegacyAuth()
      const { token } = get()
      setToken(token || null)

      if (!token) {
        set({ user: null, token: null, authReady: true })
        return
      }

      try {
        const { user } = await apiMe()
        set({ user, token, authReady: true })
      } catch {
        setToken(null)
        set({ user: null, token: null, authReady: true, ...clearSessionData })
      }
    },

    dashboard: null,
    progress: null,
    dbStats: null,
    exercises: [],
    setDashboard: d => set({ dashboard: d }),
    setProgress:  p => set({ progress: p }),
    setDbStats:   d => set({ dbStats: d }),
    setExercises: e => set({ exercises: e }),

    apiOnline: false,
    loading: {},
    setApiOnline: v => set({ apiOnline: v }),
    setLoading: (k, v) => set(s => ({ loading: { ...s.loading, [k]: v } })),

    barWeight: 20,
    plates: { '25':true,'20':true,'15':true,'10':true,'5':true,'2.5':true,'1.25':true },
    setBarWeight: w => set({ barWeight: w }),
    setPlates:    p => set({ plates: p }),

    workout: emptyWorkout(),
    startWorkout: (key, tid) => set({
      workout: { ...emptyWorkout(), active: true, sessionKey: key, templateId: tid },
    }),
    endWorkout: () => set(s => ({
      workout: { ...s.workout, active: false },
      activeTab: 'progress',
    })),
    toggleSet: id => set(s => ({
      workout: {
        ...s.workout,
        completedSets: { ...s.workout.completedSets, [id]: !s.workout.completedSets[id] },
      },
    })),
    setPaused: v => set(s => ({ workout: { ...s.workout, paused: v } })),

    activeTab: 'home',
    setTab: t => set({ activeTab: t }),
  }),
  {
    name: 'fittrack-v9',
    storage: ls,
    partialize: s => ({ token: s.token, barWeight: s.barWeight, plates: s.plates }),
    onRehydrateStorage: () => (state, err) => {
      if (!err) state?.hydrateAuth?.()
    },
  }
))
