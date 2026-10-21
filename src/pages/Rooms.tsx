import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { Search, Users, UserRound } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { api } from '../lib/api'
import type { RoomsStatusResponse } from '../lib/types'
import { matchesSearch } from '../lib/directory'
import { weekdayNumber } from '../lib/schedule'
import { useAsync } from '../lib/useAsync'
import { Empty, ErrorBox, Loading } from '../components/Status'

type StatusFilter = 'all' | 'free' | 'busy'

const PAGE = 120
const inputCls =
  'px-3 py-2 rounded-xl bg-surface border border-border text-sm outline-none focus:border-accent'
const FILTERS: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'Все' },
  { id: 'free', label: 'Свободные' },
  { id: 'busy', label: 'Занятые' },
]

export default function Rooms() {
  const { pairTimes } = useApp()
  const [query, setQuery] = useState('')
  const [date, setDate] = useState(() => format(new Date(), 'yyyy-MM-dd'))
  const [pair, setPair] = useState(1)
  const [filter, setFilter] = useState<StatusFilter>('all')
  const [location, setLocation] = useState('')
  const [limit, setLimit] = useState(PAGE)

  const weekday = weekdayNumber(new Date(`${date}T12:00:00`))
  const data = useAsync<RoomsStatusResponse>(
    (signal) => api.get<RoomsStatusResponse>('rasp/rooms/status/', { weekday, pair, date }, signal),
    [weekday, pair, date],
  )

  const rooms = data.data?.rooms ?? []
  const counts = useMemo(() => {
    const inLocation = rooms.filter((r) => !location || r.location === location)
    const busy = inLocation.filter((r) => r.busy).length
    return { all: inLocation.length, busy, free: inLocation.length - busy }
  }, [rooms, location])

  const filtered = useMemo(() => rooms.filter((r) => {
    if (location && r.location !== location) return false
    if (filter === 'free' && r.busy) return false
    if (filter === 'busy' && !r.busy) return false
    if (!query.trim()) return true
    // поиск по аудитории, корпусу, а у занятых — ещё по группе, преподавателю и предмету
    const text = [r.name, r.location, ...r.lessons.flatMap((l) => [l.subject, ...l.groups, ...l.teachers])].join(' ')
    return matchesSearch(text, query)
  }), [rooms, location, filter, query])

  const reset = () => setLimit(PAGE)

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-xl font-bold mb-1">Кабинеты</h1>
      <p className="text-muted text-sm mb-5">Какие аудитории заняты и какие свободны в выбранную дату и пару</p>

      <div className="flex flex-wrap gap-2 mb-3">
        <input type="date" value={date} onChange={(e) => { if (e.target.value) { setDate(e.target.value); reset() } }} className={inputCls} aria-label="Дата" />
        <select value={pair} onChange={(e) => { setPair(+e.target.value); reset() }} className={inputCls} aria-label="Пара">
          {(pairTimes.data ?? []).map((t) => (
            <option key={t.pair} value={t.pair}>{t.pair} пара · {t.start}–{t.end}</option>
          ))}
        </select>
        <select value={location} onChange={(e) => { setLocation(e.target.value); reset() }} className={inputCls} aria-label="Корпус">
          <option value="">Все корпуса</option>
          {(data.data?.locations ?? []).map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="flex bg-surface rounded-xl border border-border p-1" role="group" aria-label="Статус">
          {FILTERS.map((f) => (
            <button key={f.id} onClick={() => { setFilter(f.id); reset() }} aria-pressed={filter === f.id}
              className={`h-8 px-3 text-sm rounded-lg transition ${filter === f.id ? 'bg-accent text-white' : 'text-muted hover:text-text'}`}>
              {f.label} <span className="opacity-70">{counts[f.id]}</span>
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-56">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input value={query} onChange={(e) => { setQuery(e.target.value); reset() }}
            placeholder="Аудитория, группа, преподаватель…"
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-surface border border-border text-sm outline-none focus:border-accent transition" />
        </div>
      </div>

      {(pairTimes.loading || data.loading) && <Loading />}
      {pairTimes.error && <ErrorBox message={pairTimes.error} onRetry={pairTimes.reload} />}
      {data.error && <ErrorBox message={data.error} onRetry={data.reload} />}
      {!data.loading && !data.error && filtered.length === 0 && <Empty text="Ничего не найдено" />}

      {!data.loading && (
        <div className="grid sm:grid-cols-2 gap-2">
          {filtered.slice(0, limit).map((r) => (
            <div key={r.id} className={`p-4 rounded-xl border bg-surface ${r.busy ? 'border-red-300/60 dark:border-red-800/60' : 'border-border'}`}>
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-sm truncate" title={r.name}>{r.name}</p>
                <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full ${r.busy
                  ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                  : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'}`}>
                  {r.busy ? 'Занят' : 'Свободен'}
                </span>
              </div>
              <p className="text-xs text-muted mt-1">{r.location || '—'}</p>
              {r.lessons.map((l, i) => (
                <div key={i} className="mt-2 pt-2 border-t border-border text-xs space-y-1">
                  <p className="font-medium text-text">{l.subject}{l.type ? <span className="text-muted font-normal"> · {l.type}</span> : null}</p>
                  {l.groups.length > 0 && <p className="flex gap-1.5 text-muted"><Users size={12} className="mt-0.5 shrink-0" /><span>{l.groups.join(', ')}</span></p>}
                  {l.teachers.length > 0 && <p className="flex gap-1.5 text-muted"><UserRound size={12} className="mt-0.5 shrink-0" /><span>{l.teachers.join(', ')}</span></p>}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
      {!data.loading && filtered.length > limit && (
        <button onClick={() => setLimit((n) => n + PAGE)} className="mt-4 w-full h-10 rounded-xl border border-border bg-surface text-sm hover:border-accent hover:text-accent transition">
          Показать ещё ({filtered.length - limit})
        </button>
      )}
    </div>
  )
}
