import { useState } from 'react'
import { rooms, lessons } from '../data/mock'
import { Search } from 'lucide-react'

export default function Rooms() {
  const [query, setQuery] = useState('')

  const filtered = rooms.filter(
    (r) =>
      r.room.toLowerCase().includes(query.toLowerCase()) ||
      r.building.toLowerCase().includes(query.toLowerCase())
  )

  const busyRooms = new Set(lessons.map((l) => l.room))

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-xl font-bold mb-1">Свободные кабинеты</h1>
      <p className="text-muted text-sm mb-6">Демо: кабинеты, которых нет в мок-расписании</p>

      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск по корпусу или номеру..."
          className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-surface border border-border text-sm outline-none focus:border-accent transition"
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-2">
        {filtered.map((r) => {
          const busy = busyRooms.has(r.room)
          return (
            <div
              key={r.room}
              className={`p-4 rounded-xl border ${
                busy ? 'border-border bg-surface opacity-60' : 'border-border bg-surface'
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="font-semibold text-sm">{r.room}</p>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full ${
                    busy
                      ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                      : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  }`}
                >
                  {busy ? 'Занят' : 'Свободен'}
                </span>
              </div>
              <p className="text-xs text-muted mt-1">{r.building} · до {r.capacity} чел.</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}