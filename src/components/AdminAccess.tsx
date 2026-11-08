import { createContext, useContext, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { api, clearAdminCredentials, errText, setAdminCredentials } from '../lib/api'

interface Access { authorized: boolean; version: number; login: (username: string, password: string) => Promise<void>; logout: () => void }
const Context = createContext<Access | null>(null)
export function AdminAccessProvider({ children }: { children: ReactNode }) {
  const [authorized, setAuthorized] = useState(false)
  const [version, setVersion] = useState(0)
  const epoch = useRef(0)
  const logout = () => { epoch.current++; clearAdminCredentials(); setAuthorized(false); setVersion(v => v + 1) }
  const login = async (username: string, password: string) => {
    const id = ++epoch.current
    setAdminCredentials(username, password)
    try {
      await api.get('schedule/dpo-memberships/', { page_size: 1 })
      if (id === epoch.current) { setAuthorized(true); setVersion(v => v + 1) }
    } catch (error) {
      if (id === epoch.current) { clearAdminCredentials(); setAuthorized(false) }
      throw error
    }
  }
  return <Context.Provider value={{ authorized, version, login, logout }}>{children}</Context.Provider>
}
export function useAdminAccess() {
  const value = useContext(Context)
  if (!value) throw new Error('AdminAccessProvider отсутствует')
  return value
}
export default function AdminAccess() {
  const { authorized, login, logout } = useAdminAccess()
  const [expanded, setExpanded] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (pending) return
    setPending(true); setError('')
    try { await login(username, password); setPassword(''); setExpanded(false) }
    catch (e) { setError(errText(e)) }
    finally { setPending(false) }
  }
  return <section className="card p-4 mb-5 text-sm" aria-label="Доступ к управлению">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p>{authorized ? 'Управление доступно' : 'Просмотр открыт. Для изменений войдите как администратор.'}</p>
      {authorized ? <button type="button" className="text-accent" onClick={logout}>Выйти из управления</button>
        : <button type="button" className="text-accent" onClick={() => setExpanded(!expanded)} aria-expanded={expanded}>Вход для управления</button>}
    </div>
    {expanded && !authorized && <form onSubmit={submit} className="mt-3 space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label>Логин<input className="generation-input" autoComplete="username" value={username} onChange={e => setUsername(e.target.value)} required disabled={pending} /></label>
        <label>Пароль<input className="generation-input" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required disabled={pending} /></label>
      </div>
      <p className="text-xs text-muted">Учётные данные хранятся только в памяти этой вкладки до выхода или обновления страницы.</p>
      {error && <p role="alert" className="text-red-500">{error}</p>}
      <button className="generation-primary" disabled={pending}>{pending ? 'Проверяем доступ…' : 'Войти'}</button>
    </form>}
  </section>
}
