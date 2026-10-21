import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { api } from '../lib/api'
import { userStorageKey } from '../lib/dataSource'
import { profileTarget, targetKey } from '../lib/directory'
import type { PairTime, ScheduleTarget, User } from '../lib/types'
import { useAsync, type AsyncState } from '../lib/useAsync'

interface AppContextType {
  user: User | null
  login: (user: User) => void
  logout: () => void
  viewedSchedule: ScheduleTarget | null
  viewSchedule: (target: ScheduleTarget) => void
  favorites: ScheduleTarget[]
  toggleFavorite: (target: ScheduleTarget) => void
  toggleTheme: () => void
  isDark: boolean
  pairTimes: AsyncState<PairTime[]>
}
const AppContext = createContext<AppContextType | null>(null)
const favoritesKey = `${userStorageKey}:favorites`
const viewedKey = `${userStorageKey}:viewed`
function readStored(key: string): unknown {
  try { return JSON.parse(localStorage.getItem(key) ?? 'null') } catch { return null }
}
function save(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* In-memory state still works. */ }
}
function isTarget(value: unknown): value is ScheduleTarget {
  if (!value || typeof value !== 'object') return false
  const t = value as Partial<ScheduleTarget>
  return (t.kind === 'group' || t.kind === 'teacher') && Number.isInteger(t.id) && Number(t.id) > 0 && typeof t.name === 'string'
}
function readUser(): User | null {
  const value = readStored(userStorageKey) as Partial<User> | null
  if (!value || typeof value.name !== 'string' || !Number.isInteger(value.id) || Number(value.id) <= 0) return null
  if (value.role === 'teacher') return value as User
  if (value.role === 'student' && typeof value.group === 'string') return value as User
  return null
}
export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(readUser)
  const [viewedSchedule, setViewedSchedule] = useState<ScheduleTarget | null>(() => {
    const profile = readUser()
    if (!profile) return null
    const target = readStored(viewedKey)
    return isTarget(target) ? target : profileTarget(profile)
  })
  const [favorites, setFavorites] = useState<ScheduleTarget[]>(() => {
    const saved = readStored(favoritesKey)
    return Array.isArray(saved) ? [...new Map(saved.filter(isTarget).map((t) => [targetKey(t), t])).values()] : []
  })
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme')
    return saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches
  })
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
    localStorage.setItem('theme', isDark ? 'dark' : 'light')
  }, [isDark])
  const pairTimes = useAsync<PairTime[]>((signal) => api.get<PairTime[]>('rasp/pair-times/', undefined, signal), [])
  const viewSchedule = (target: ScheduleTarget) => { setViewedSchedule(target); save(viewedKey, target) }
  const login = (profile: User) => {
    setUser(profile); save(userStorageKey, profile); viewSchedule(profileTarget(profile))
  }
  const logout = () => {
    setUser(null); setViewedSchedule(null); save(userStorageKey, null); save(viewedKey, null)
  }
  const toggleFavorite = (target: ScheduleTarget) => {
    setFavorites((previous) => {
      const exists = previous.some((item) => targetKey(item) === targetKey(target))
      const next = exists ? previous.filter((item) => targetKey(item) !== targetKey(target)) : [...previous, target]
      save(favoritesKey, next)
      return next
    })
  }
  return <AppContext.Provider value={{ user, login, logout, viewedSchedule, viewSchedule, favorites, toggleFavorite,
    toggleTheme: () => setIsDark((v) => !v), isDark, pairTimes }}>{children}</AppContext.Provider>
}
export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
