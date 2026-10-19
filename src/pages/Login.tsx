import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { users } from '../data/mock'
import { GraduationCap, BookOpen } from 'lucide-react'

export default function Login() {
  const { login } = useApp()
  const navigate = useNavigate()

  const handleLogin = (id: string) => {
    login(id)
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-text mb-1">Вход в расписание</h1>
        <p className="text-muted text-sm mb-6">Демо-режим: выберите пользователя</p>

        <div className="space-y-3">
          {users
            .filter((u) => u.role === 'student')
            .map((u) => (
              <button
                key={u.id}
                onClick={() => handleLogin(u.id)}
                className="w-full flex items-center gap-3 p-4 bg-surface border border-border rounded-xl hover:border-accent transition text-left"
              >
                <div className="w-10 h-10 rounded-full bg-accent-soft flex items-center justify-center text-accent shrink-0">
                  <GraduationCap size={20} />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-text truncate">{u.name}</p>
                  <p className="text-xs text-muted">Студент · {u.group}</p>
                </div>
              </button>
            ))}

          {users
            .filter((u) => u.role === 'teacher')
            .map((u) => (
              <button
                key={u.id}
                onClick={() => handleLogin(u.id)}
                className="w-full flex items-center gap-3 p-4 bg-surface border border-border rounded-xl hover:border-accent transition text-left"
              >
                <div className="w-10 h-10 rounded-full bg-accent-soft flex items-center justify-center text-accent shrink-0">
                  <BookOpen size={20} />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-text truncate">{u.name}</p>
                  <p className="text-xs text-muted">Преподаватель</p>
                </div>
              </button>
            ))}
        </div>
      </div>
    </div>
  )
}