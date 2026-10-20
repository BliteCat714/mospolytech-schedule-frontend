import { useState } from 'react'
import { Search } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { api } from '../lib/api'
import type { FreeRoomsResponse } from '../lib/types'
import { DAY_NAMES, SLOT_TIMES, weekdayIndex } from '../lib/schedule'
import { useAsync } from '../lib/useAsync'
import { Empty, ErrorBox, Loading } from '../components/Status'

const selectCls =
  'px-3 py-2 rounded-xl bg-surface border border-border text-sm outline-none focus:border-accent'

export default function Rooms() {
  const { semester } = useApp()
  const [query, setQuery] = useState('')
  const [day, setDay] = useState(() => Math.min(weekdayIndex(new Date()), 5))
  const [lesson, setLesson] = useState(1)
  const semesterId = semester.data?.id

  const rooms = useAsync<FreeRoomsResponse | null>(
    async (signal) => {
      if (semesterId === undefined) return null
      return api.get<FreeRoomsResponse>(
        'schedule/free-rooms/',
        { semester: semesterId, day_of_week: day, lesson_number: lesson },
        signal,
      )
    },
    [semesterId, day, lesson],
  )

  const q = query.toLowerCase()
  const filtered = (rooms.data?.rooms ?? []).filter((r) =>
    `${r.name} ${r.building_name ?? ''} ${r.location_name}`.toLowerCase().includes(q),
  )

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-xl font-bold mb-1">Свободные кабинеты</h1>
      <p className="text-muted text-sm mb-6">Аудитории, не занятые по расписанию в выбранную пару</p>

      <div className="flex flex-wrap gap-2 mb-3">
        <select value={day} onChange={(e) => setDay(+e.target.value)} className={selectCls}>
          {DAY_NAMES.slice(0, 6).map((n, i) => (
            <option key={n} value={i}>{n}</option>
          ))}
        </select>
        <select value={lesson} onChange={(e) => setLesson(+e.target.value)} className={selectCls}>
          {SLOT_TIMES.map((s) => (
            <option key={s.n} value={s.n}>{s.n} пара · {s.start}–{s.end}</option>
          ))}
        </select>
      </div>

      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск по корпусу или номеру..."
          className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-surface border border-border text-sm outline-none focus:border-accent transition"
        />
      </div>

      {(semester.loading || rooms.loading) && <Loading />}
      {semester.error && <ErrorBox message={semester.error} onRetry={semester.reload} />}
      {rooms.error && <ErrorBox message={rooms.error} onRetry={rooms.reload} />}
      {!semester.loading && !semester.data && !semester.error && <Empty text="Семестр не найден" />}
      {rooms.data?.detail && <Empty text={rooms.data.detail} />}
      {!rooms.loading && rooms.data && !rooms.data.detail && filtered.length === 0 && (
        <Empty text="Свободных кабинетов нет" />
      )}

      {!rooms.loading && (
        <div className="grid sm:grid-cols-2 gap-2">
          {filtered.map((r) => (
            <div key={r.id} className="p-4 rounded-xl border border-border bg-surface">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-sm">{r.name}</p>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  Свободен
                </span>
              </div>
              <p className="text-xs text-muted mt-1">
                {r.building_name ?? '—'}
                {r.location_name ? ` · ${r.location_name}` : ''} · до {r.capacity} чел.
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
