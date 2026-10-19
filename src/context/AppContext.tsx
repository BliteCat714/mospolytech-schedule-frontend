import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { type User, users } from '../data/mock'

interface AppContextType {
  user: User | null
  login: (id: string) => void
  logout: () => void
  toggleTheme: () => void
  isDark: boolean
  updateUser: (patch: Partial<User>) => void
}

const AppContext = createContext<AppContextType | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme')
    if (saved) return saved === 'dark'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  // Применяем тему к <html>
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
    localStorage.setItem('theme', isDark ? 'dark' : 'light')
  }, [isDark])

  // Восстанавливаем сессию
  useEffect(() => {
    const savedId = localStorage.getItem('userId')
    if (savedId) {
      const u = users.find((x) => x.id === savedId)
      if (u) setUser({ ...u })
    }
  }, [])

  const login = (id: string) => {
    const u = users.find((x) => x.id === id)
    if (u) {
      setUser({ ...u })
      localStorage.setItem('userId', id)
    }
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('userId')
  }

  const updateUser = (patch: Partial<User>) => {
    if (!user) return
    const updated = { ...user, ...patch }
    setUser(updated)
  }

  return (
    <AppContext.Provider
      value={{
        user,
        login,
        logout,
        toggleTheme: () => setIsDark((v) => !v),
        isDark,
        updateUser,
      }}
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