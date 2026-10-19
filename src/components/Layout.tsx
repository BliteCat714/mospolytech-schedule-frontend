import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Calendar, Dumbbell, DoorOpen, LogOut, Moon, Sun, User } from 'lucide-react'
import { useApp } from '../context/AppContext'

export default function Layout() {
  const { user, logout, toggleTheme, isDark } = useApp()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen app-bg text-text flex">
      {/* Sidebar */}
      <aside className="w-60 border-r border-border bg-surface/70 backdrop-blur-md flex flex-col p-4 gap-1">
        <div className="px-3 py-3 mb-2 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-accent text-white flex items-center justify-center font-bold shadow-sm">
            Р
          </div>
          <div>
            <h1 className="font-bold leading-tight">Расписание</h1>
            <p className="text-muted text-[11px]">Университет</p>
          </div>
        </div>

        {[
          { to: '/', icon: Calendar, label: 'Расписание' },
          { to: '/pe', icon: Dumbbell, label: 'Физкультура' },
          { to: '/rooms', icon: DoorOpen, label: 'Кабинеты' },
        ].map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition ${isActive
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
                <Icon size={18} />
                {label}
              </>
            )}
          </NavLink>
        ))}

        <div className="mt-auto pt-4 border-t border-border">
          <div className="flex items-center gap-3 px-2 py-2 text-sm rounded-xl">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-accent to-project text-white flex items-center justify-center">
              <User size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate font-medium">{user?.name}</p>
              <p className="text-muted text-xs truncate">
                {user?.role === 'student' ? user.group : 'Преподаватель'}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              logout()
              navigate('/login')
            }}
            className="mt-1 flex items-center gap-3 px-3 py-2 text-sm text-muted hover:text-text w-full rounded-xl hover:bg-surface-2 transition"
          >
            <LogOut size={16} /> Выйти
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-border bg-surface/60 backdrop-blur-md flex items-center justify-end px-6 gap-3 sticky top-0 z-30">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl border border-border bg-surface hover:bg-surface-2 text-muted transition"
            title="Переключить тему"
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </header>
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}