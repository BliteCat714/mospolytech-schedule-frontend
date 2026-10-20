import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, ChevronUp, GraduationCap, Search, Star, X } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { matchesSearch, profileTarget, targetKey, useDirectory } from '../lib/directory'
import type { ScheduleTarget } from '../lib/types'
import { ErrorBox, Loading } from './Status'

export default function Favorites() {
  const { user, favorites, viewSchedule, toggleFavorite, viewedSchedule } = useApp()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const container = useRef<HTMLDivElement>(null)
  const directory = useDirectory()
  const navigate = useNavigate()
  useEffect(() => {
    if (!open) return
    const outside = (e: PointerEvent) => { if (e.target instanceof Node && !container.current?.contains(e.target)) setOpen(false) }
    const escape = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', escape)
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape) }
  }, [open])
  const pick = (target: ScheduleTarget) => { viewSchedule(target); setOpen(false); setQuery(''); navigate('/') }
  const searching = !!query.trim()
  const items = searching ? (directory.data ?? []).filter((t) => matchesSearch(t.name, query)) : favorites
  return <div ref={container} className="relative shrink-0 mb-2">
    <button onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-haspopup="dialog" aria-label="Избранные" title="Избранные"
      className={`w-full flex items-center justify-center lg:justify-start gap-3 rounded-xl px-3 py-2.5 text-sm transition ${open ? 'bg-accent-soft text-accent' : 'text-muted hover:bg-surface-2 hover:text-text'}`}>
      <Star size={18} className="shrink-0" /><span className="hidden lg:inline">Избранные</span><ChevronUp size={14} className={`hidden lg:block ml-auto transition-transform ${open ? 'rotate-180' : ''}`} />
    </button>
    {open && <div role="dialog" aria-label="Избранные расписания" className="absolute bottom-full left-0 mb-2 z-50 w-80 max-w-[calc(100vw-2rem)] max-h-[min(32rem,calc(100dvh-12rem))] flex flex-col rounded-2xl border border-border bg-surface shadow-xl p-3">
      <div className="flex items-center justify-between mb-3"><h2 className="font-semibold text-sm">Избранные</h2><button onClick={() => setOpen(false)} aria-label="Закрыть избранные" className="p-1 rounded-lg text-muted hover:bg-surface-2"><X size={16} /></button></div>
      <div className="relative mb-3"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Группа или преподаватель" aria-label="Группа или преподаватель"
          className="w-full pl-9 pr-3 py-2 rounded-lg bg-bg border border-border outline-none focus:border-accent text-sm" />
      </div>
      <div className="overflow-y-auto min-h-0 space-y-1">
        {!searching && user && <button onClick={() => pick(profileTarget(user))} className="w-full text-left p-2.5 rounded-lg hover:bg-accent-soft text-accent text-sm font-medium">Моё расписание<span className="block text-xs text-muted mt-0.5">{user.name}</span></button>}
        <p className="text-[10px] uppercase tracking-wide text-muted px-2 pt-1 pb-2">{searching ? 'Результаты поиска' : 'Сохранённые расписания'}</p>
        {searching && directory.loading && <Loading />}
        {searching && directory.error && <ErrorBox message={directory.error} onRetry={directory.reload} />}
        {!items.length && (!searching || (!directory.loading && !directory.error)) && <p className="text-xs text-muted p-2">{searching ? 'Ничего не найдено' : 'Пока пусто. Найдите группу или преподавателя, откройте расписание и добавьте его в избранное.'}</p>}
        {items.map((target) => {
          const active = viewedSchedule && targetKey(viewedSchedule) === targetKey(target)
          const Icon = target.kind === 'group' ? GraduationCap : BookOpen
          return <div key={targetKey(target)} className={`flex items-center rounded-lg ${active ? 'bg-accent-soft' : 'hover:bg-surface-2'}`}>
            <button onClick={() => pick(target)} className="flex-1 min-w-0 flex gap-2.5 items-center p-2.5 text-left">
              <Icon size={17} className="shrink-0 text-muted" /><span className="min-w-0"><span className="block text-sm break-words">{target.name}</span><span className="block text-xs text-muted">{target.kind === 'group' ? 'Группа' : 'Преподаватель'}</span></span>
            </button>
            {!searching && <button onClick={() => toggleFavorite(target)} aria-label={`Удалить из избранного: ${target.name}`} className="p-2 text-muted hover:text-accent"><X size={14} /></button>}
          </div>
        })}
      </div>
    </div>}
  </div>
}
