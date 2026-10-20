import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GraduationCap, BookOpen, Search } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { api } from '../lib/api'
import type { Student, Teacher } from '../lib/types'
import { useAsync } from '../lib/useAsync'
import { Empty, ErrorBox, Loading } from '../components/Status'

export default function Login() {
  const { login } = useApp()
  const navigate = useNavigate()
  const [tab, setTab] = useState<'student' | 'teacher'>('student')
  const [query, setQuery] = useState('')

  const people = useAsync(
    async (signal) =>
      tab === 'student'
        ? api.list<Student>('students/', undefined, signal)
        : api.list<Teacher>('teachers/', undefined, signal),
    [tab],
  )

  const q = query.trim().toLowerCase()
  const items = (people.data ?? []).filter((p) => {
    const group = 'group_name' in p ? p.group_name : ''
    return `${p.full_name} ${group}`.toLowerCase().includes(q)
  })

  const pick = (p: Student | Teacher) => {
    if ('group_name' in p) {
      login({ role: 'student', id: p.id, name: p.full_name, group: p.group_name })
    } else {
      login({ role: 'teacher', id: p.id, name: p.full_name })
    }
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-text mb-1">Вход в расписание</h1>
        <p className="text-muted text-sm mb-4">Выберите, чьё расписание показать</p>

        <div className="flex bg-surface rounded-xl border border-border p-1 mb-3">
          {(['student', 'teacher'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 h-8 text-sm rounded-lg transition ${
                tab === t ? 'bg-accent text-white' : 'text-muted hover:text-text'
              }`}
            >
              {t === 'student' ? 'Студент' : 'Преподаватель'}
            </button>
          ))}
        </div>

        <div className="relative mb-3">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск по имени или группе..."
            className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-surface border border-border text-sm outline-none focus:border-accent transition"
          />
        </div>

        {people.loading && <Loading />}
        {people.error && <ErrorBox message={people.error} onRetry={people.reload} />}
        {!people.loading && !people.error && items.length === 0 && <Empty text="Никого не найдено" />}

        <div className="space-y-2 max-h-[60vh] overflow-auto">
          {!people.loading &&
            items.slice(0, 100).map((p) => (
              <button
                key={p.id}
                onClick={() => pick(p)}
                className="w-full flex items-center gap-3 p-3 bg-surface border border-border rounded-xl hover:border-accent transition text-left"
              >
                <div className="w-10 h-10 rounded-full bg-accent-soft flex items-center justify-center text-accent shrink-0">
                  {tab === 'student' ? <GraduationCap size={20} /> : <BookOpen size={20} />}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-text truncate">{p.full_name}</p>
                  <p className="text-xs text-muted">
                    {'group_name' in p ? `Студент · ${p.group_name}` : 'Преподаватель'}
                  </p>
                </div>
              </button>
            ))}
        </div>
      </div>
    </div>
  )
}
