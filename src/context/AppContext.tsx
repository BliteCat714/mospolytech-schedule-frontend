import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { api } from '../lib/api'
import type { Semester, User } from '../lib/types'
import { useAsync, type AsyncState } from '../lib/useAsync'

interface AppContextType {
  user: User | null
  login: (user: User) => void
  logout: () => void
  toggleTheme: () => void
  isDark: boolean
  semester: AsyncState<Semester | null>
}

const AppContext = createContext<AppContextType | null>(null)

function readStored<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => readStored<User>('user'))
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme')
    if (saved) return saved === 'dark'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
    localStorage.setItem('theme', isDark ? 'dark' : 'light')
  }, [isDark])

  // Актуальный семестр — последний созданный.
  const semester = useAsync<Semester | null>(async (signal) => {
    const list = await api.list<Semester>('semesters/', undefined, signal)
    return list.length ? list[list.length - 1] : null
  }, [])

  const login = (u: User) => {
    setUser(u)
    localStorage.setItem('user', JSON.stringify(u))
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('user')
  }

  return (
    <AppContext.Provider
      value={{ user, login, logout, toggleTheme: () => setIsDark((v) => !v), isDark, semester }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
