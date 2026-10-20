import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, BookOpen, GraduationCap, Search } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { isMockMode } from '../lib/dataSource'
import { matchesSearch, useDirectory } from '../lib/directory'
import type { ScheduleTarget } from '../lib/types'
import { Empty, ErrorBox, Loading } from '../components/Status'

export default function Login() {
  const { login } = useApp()
  const navigate = useNavigate()
  const [role, setRole] = useState<'student' | 'teacher' | null>(null)
  const [query, setQuery] = useState('')
  const directory = useDirectory()
  const items = (directory.data ?? []).filter((t) => t.kind === (role === 'student' ? 'group' : 'teacher') && matchesSearch(t.name, query))
  const pick = (target: ScheduleTarget) => {
    login(target.kind === 'group'
      ? { role: 'student', id: target.id, name: target.name, group: target.name }
      : { role: 'teacher', id: target.id, name: target.name })
    navigate('/', { replace: true })
  }
  return (
    <div className="min-h-dvh bg-bg text-text flex items-center justify-center p-5">
      <div className="w-full max-w-md">
        {role && <button onClick={() => { setRole(null); setQuery('') }} className="flex items-center gap-2 text-sm text-muted hover:text-accent mb-6"><ArrowLeft size={16} />Назад</button>}
        <h1 className="text-2xl font-bold mb-2">{role === null ? 'Ваше расписание' : role === 'student' ? 'В какой вы группе?' : 'Найдите себя'}</h1>
        <p className="text-muted text-sm mb-6">{role === null ? 'Выберите, как вы будете пользоваться расписанием' : role === 'student' ? 'Введите номер группы и выберите её в списке' : 'Введите имя и фамилию преподавателя'}</p>
        {role === null ? <div className="space-y-3">
          {[{ role: 'student' as const, label: 'Я студент', icon: GraduationCap }, { role: 'teacher' as const, label: 'Я преподаватель', icon: BookOpen }].map(({ role: r, label, icon: Icon }) => (
            <button key={r} onClick={() => setRole(r)} className="w-full p-5 flex items-center gap-4 rounded-2xl border border-border bg-surface hover:border-accent hover:bg-accent-soft transition text-left">
              <Icon size={26} className="text-accent" /><span className="font-semibold">{label}</span>
            </button>
          ))}
        </div> : <>
          <div className="relative mb-4">
            <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input key={role} autoFocus value={query} onChange={(e) => setQuery(e.target.value)} aria-label={role === 'student' ? 'Номер группы' : 'Имя и фамилия'}
              placeholder={role === 'student' ? 'Номер группы' : 'Имя и фамилия'}
              className="w-full pl-10 pr-3 py-3 rounded-xl bg-surface border border-border outline-none focus:border-accent text-sm" />
          </div>
          {directory.loading && <Loading />}
          {directory.error && <ErrorBox message={directory.error} onRetry={directory.reload} />}
          {!directory.loading && !directory.error && !items.length && <Empty text={role === 'student' ? 'Группа не найдена' : 'Преподаватель не найден'} />}
          <div className="space-y-2 max-h-[45dvh] overflow-y-auto">
            {!directory.loading && !directory.error && items.map((t) => <button key={`${t.kind}-${t.id}`} onClick={() => pick(t)} className="w-full text-left rounded-xl border border-border bg-surface p-3 hover:border-accent hover:bg-accent-soft transition">
              <p className="text-sm font-medium">{t.name}</p><p className="text-xs text-muted mt-1">{t.kind === 'group' ? 'Расписание группы' : 'Преподаватель'}</p>
            </button>)}
          </div>
        </>}
        {isMockMode && <p className="text-xs text-muted mt-6">Тестовый режим · профиль сохраняется в этом браузере</p>}
      </div>
    </div>
  )
}
