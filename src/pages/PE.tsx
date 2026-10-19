import { useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import { lessons, peDirections, peSlots } from '../data/mock'
import { peSlotConflicts, slotNumber } from '../lib/schedule'
import { Check, X, AlertTriangle } from 'lucide-react'

const DAY_NAMES = ['', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

export default function PE() {
  const { user, updateUser } = useApp()
  const [selectedDir, setSelectedDir] = useState<string | null>(
    user?.peDirection ?? null,
  )
  const [error, setError] = useState<string | null>(null)

  const mySlots = user?.peSlots ?? []

  // Пары пользователя из мока (для проверки конфликтов)
  const userLessons = useMemo(() => {
    if (!user) return []
    return lessons.filter(
      (l) =>
        (user.group && l.groupIds.includes(user.group)) ||
        (user.projectGroupId && l.groupIds.includes(user.projectGroupId)),
    )
  }, [user])

  const slots = peSlots.filter((s) => s.direction === selectedDir)

  // Группируем по дню
  const slotsByDay = useMemo(() => {
    const map: Record<number, typeof slots> = {}
    for (const s of slots) {
      ; (map[s.dayOfWeek] ??= []).push(s)
    }
    for (const day of Object.keys(map)) {
      map[+day].sort((a, b) => a.start.localeCompare(b.start))
    }
    return map
  }, [slots])

  const toggleSlot = (slotId: string) => {
    if (!user) return
    setError(null)

    const slot = peSlots.find((s) => s.id === slotId)
    if (!slot) return

    // Отмена выбора
    if (mySlots.includes(slotId)) {
      updateUser({ peSlots: mySlots.filter((id) => id !== slotId) })
      return
    }

    // Проверка 1: не более одной пары физкультуры в день
    const sameDayPE = peSlots.some(
      (s) => s.dayOfWeek === slot.dayOfWeek && mySlots.includes(s.id),
    )
    if (sameDayPE) {
      setError(
        `В ${DAY_NAMES[slot.dayOfWeek]} у вас уже выбрана физкультура. ` +
        `Можно не более одной пары в день.`,
      )
      return
    }

    // Проверка 2: конфликт с обычной парой
    const conflict = peSlotConflicts(slot, userLessons)
    if (conflict) {
      setError(
        `Конфликт с парой «${conflict.title}» в ${DAY_NAMES[slot.dayOfWeek]} ` +
        `${conflict.start}–${conflict.end}. Выберите другое время.`,
      )
      return
    }

    updateUser({ peSlots: [...mySlots, slotId] })
  }

  return (
    <div className="w-full max-w-[1400px] mx-auto">
      <p className="text-[11px] uppercase tracking-wider text-muted mb-1">
        Раздел
      </p>
      <h1 className="text-2xl font-bold leading-tight mb-1">Физкультура</h1>
      <p className="text-muted text-sm mb-6">
        Выберите направление и удобные пары (не более одной в день, без
        конфликтов с основным расписанием)
      </p>

      {/* Направления */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 mb-8">
        {peDirections.map((d) => (
          <button
            key={d.id}
            onClick={() => {
              setSelectedDir(d.id)
              updateUser({ peDirection: d.id })
            }}
            className={`p-3 rounded-xl border text-sm transition flex flex-col items-center gap-1 ${selectedDir === d.id
                ? 'border-accent bg-gradient-to-br from-accent-soft to-transparent text-accent font-medium shadow-sm'
                : 'border-border bg-surface hover:border-accent hover:bg-surface-2'
              }`}
          >
            <span className="text-xl">{d.icon}</span>
            {d.name}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 p-3 rounded-xl border border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300 text-sm">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Слоты по дням */}
      {selectedDir && (
        <div className="space-y-6">
          {[1, 2, 3, 4, 5, 6].map((day) => {
            const list = slotsByDay[day] ?? []
            if (list.length === 0) return null
            return (
              <div key={day}>
                <h2 className="font-semibold mb-2">{DAY_NAMES[day]}</h2>
                <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                  {list.map((s) => {
                    const active = mySlots.includes(s.id)
                    const n = slotNumber(s.start)
                    const conflict = !active ? peSlotConflicts(s, userLessons) : null
                    const sameDayPE = peSlots.some(
                      (x) =>
                        x.dayOfWeek === s.dayOfWeek && mySlots.includes(x.id),
                    )
                    const blocked = !active && (conflict !== null || sameDayPE)

                    return (
                      <button
                        key={s.id}
                        onClick={() => toggleSlot(s.id)}
                        disabled={blocked}
                        className={`text-left p-3 rounded-xl border transition ${active
                            ? 'border-accent bg-gradient-to-br from-accent-soft to-transparent'
                            : blocked
                              ? 'border-border bg-surface opacity-50 cursor-not-allowed'
                              : 'border-border bg-surface hover:border-accent hover:bg-surface-2'
                          }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium">
                              {n ? `${n} пара · ` : ''}
                              {s.start}–{s.end}
                            </p>
                            <p className="text-xs text-muted truncate">
                              {s.building}, {s.room}
                            </p>
                          </div>
                          <span
                            className={`shrink-0 p-1.5 rounded-lg ${active
                                ? 'bg-accent text-white'
                                : 'bg-surface-2 text-muted'
                              }`}
                          >
                            {active ? <X size={14} /> : <Check size={14} />}
                          </span>
                        </div>
                        {blocked && (
                          <p className="text-[10px] text-red-600 dark:text-red-400 mt-2">
                            {sameDayPE
                              ? 'Уже есть физкультура в этот день'
                              : conflict
                                ? `Конфликт: ${conflict.title}`
                                : ''}
                          </p>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}