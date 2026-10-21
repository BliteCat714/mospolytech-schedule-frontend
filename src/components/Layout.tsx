import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Briefcase, Calendar, Dumbbell, DoorOpen, LogOut, Moon, Sun, User } from 'lucide-react'
import { useApp } from '../context/AppContext'
import Favorites from './Favorites'
import { profileTarget } from '../lib/directory'

export default function Layout() {
  const { user, logout, toggleTheme, isDark, viewSchedule } = useApp()
  const navigate = useNavigate()

  return (
    <div className="h-dvh overflow-hidden app-bg text-text flex">
      {/* Sidebar */}
      <aside className="relative z-40 w-16 lg:w-60 shrink-0 min-h-0 border-r border-border bg-surface/70 backdrop-blur-md flex flex-col p-2 lg:p-4 gap-1">
        <div className="px-1 lg:px-3 py-3 mb-2 flex items-center justify-center lg:justify-start gap-3 shrink-0">
          <div className="w-9 h-9 shrink-0 rounded-xl bg-accent text-white flex items-center justify-center font-bold shadow-sm">
            Р
          </div>
          <div className="hidden lg:block">
            <h1 className="font-bold leading-tight">Расписание</h1>
            <p className="text-muted text-[11px]">Университет</p>
          </div>
        </div>

        <nav aria-label="Основная навигация" className="flex-1 min-h-0 overflow-y-auto space-y-1">
        {[
          { to: '/', icon: Calendar, label: 'Расписание' },
          ...(user?.role === 'student' ? [
            { to: '/pd', icon: Briefcase, label: 'Проектная деятельность' },
            { to: '/pe', icon: Dumbbell, label: 'Физкультура' },
          ] : []),
          { to: '/rooms', icon: DoorOpen, label: 'Кабинеты' },
        ].map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            title={label}
            aria-label={label}
            className={({ isActive }) =>
              `relative flex items-center justify-center lg:justify-start gap-3 px-3 py-2.5 rounded-xl text-sm transition ${isActive
                ? 'bg-accent-soft text-accent font-medium'
                : 'text-muted hover:bg-surface-2 hover:text-text'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-accent" />
                )}
                <Icon size={18} className="shrink-0" />
                <span className="hidden lg:inline">{label}</span>
              </>
            )}
          </NavLink>
        ))}
        </nav>

        <Favorites />
        <div className="shrink-0 pt-2 lg:pt-4 border-t border-border">
          <button type="button" onClick={() => { if (user) viewSchedule(profileTarget(user)); navigate('/') }} aria-label="Мой профиль" className="w-full hover:bg-surface-2 transition flex items-center justify-center lg:justify-start gap-3 lg:px-2 py-2 text-sm rounded-xl" title={user?.name}>
            <div className="w-9 h-9 shrink-0 rounded-full bg-gradient-to-br from-accent to-project text-white flex items-center justify-center">
              <User size={16} />
            </div>
            <div className="hidden lg:block flex-1 min-w-0">
              <p className="truncate font-medium">{user?.name}</p>
              <p className="text-muted text-xs truncate">
                {user?.role === 'student' ? 'Студент · моя группа' : 'Преподаватель'}
              </p>
            </div>
          </button>
          <button
            title="Сменить профиль"
            aria-label="Сменить профиль"
            onClick={() => {
              logout()
              navigate('/login')
            }}
            className="mt-1 flex items-center justify-center lg:justify-start gap-3 px-3 py-2 text-sm text-muted hover:text-text w-full rounded-xl hover:bg-surface-2 transition"
          >
            <LogOut size={16} className="shrink-0" /> <span className="hidden lg:inline">Сменить профиль</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <header className="min-h-14 shrink-0 border-b border-border bg-surface/60 backdrop-blur-md flex items-center justify-end px-3 lg:px-6 gap-3 z-30">
          <button
            onClick={toggleTheme}
            className="shrink-0 p-2 rounded-xl border border-border bg-surface hover:bg-surface-2 text-muted transition"
            title="Переключить тему"
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </header>
        <main className="flex-1 min-h-0 min-w-0 p-3 lg:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
