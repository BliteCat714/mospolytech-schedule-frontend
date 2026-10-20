import { useMemo, useState } from 'react'
import { Check, X } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { api, errText } from '../lib/api'
import type { PEDirection, PEEnrollment, PESlot } from '../lib/types'
import { DAY_NAMES, hhmm, slotNumber } from '../lib/schedule'
import { useAsync } from '../lib/useAsync'
import { Empty, ErrorBox, Loading } from '../components/Status'

export default function PE() {
  const { user } = useApp()
  const studentId = user?.role === 'student' ? user.id : undefined
  const [selectedDir, setSelectedDir] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const directions = useAsync((signal) => api.list<PEDirection>('pe/directions/', undefined, signal), [])
  const slots = useAsync(
    async (signal) =>
      selectedDir === null ? [] : api.list<PESlot>('pe/slots/', { direction: selectedDir }, signal),
    [selectedDir],
  )
  const mine = useAsync(
    async (signal) =>
      studentId === undefined ? [] : api.list<PEEnrollment>('pe/enrollments/', { student: studentId }, signal),
    [studentId],
  )

  const enrollmentBySlot = useMemo(
    () => new Map((mine.data ?? []).map((e) => [e.slot, e])),
    [mine.data],
  )
  const busyDays = useMemo(
    () => new Set((mine.data ?? []).map((e) => e.slot_detail.day_of_week)),
    [mine.data],
  )

  const slotsByDay = useMemo(() => {
    const map: Record<number, PESlot[]> = {}
    for (const s of slots.data ?? []) (map[s.day_of_week] ??= []).push(s)
    return map
  }, [slots.data])

  const toggle = async (slot: PESlot) => {
    if (studentId === undefined || busy) return
    setError(null)
    setBusy(true)
    try {
      const existing = enrollmentBySlot.get(slot.id)
      if (existing) await api.delete(`pe/enrollments/${existing.id}/`)
      else await api.post('pe/enrollments/', { student: studentId, slot: slot.id })
      mine.reload()
    } catch (e) {
      setError(errText(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="w-full max-w-[1400px] mx-auto">
      <p className="text-[11px] uppercase tracking-wider text-muted mb-1">Раздел</p>
      <h1 className="text-2xl font-bold leading-tight mb-1">Физкультура</h1>
      <p className="text-muted text-sm mb-6">
        Выберите направление и удобные пары (не более одной в день, без конфликтов с основным расписанием)
      </p>

      {directions.loading && <Loading />}
      {directions.error && <ErrorBox message={directions.error} onRetry={directions.reload} />}
      {!directions.loading && !directions.error && (directions.data ?? []).length === 0 && (
        <Empty text="Направления физкультуры пока не добавлены" />
      )}

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 mb-8">
        {(directions.data ?? []).map((d) => (
          <button
            key={d.id}
            onClick={() => setSelectedDir(d.id)}
            className={`p-3 rounded-xl border text-sm transition flex flex-col items-center gap-1 ${
              selectedDir === d.id
                ? 'border-accent bg-gradient-to-br from-accent-soft to-transparent text-accent font-medium shadow-sm'
                : 'border-border bg-surface hover:border-accent hover:bg-surface-2'
            }`}
          >
            <span className="text-xl">{d.icon}</span>
            {d.name}
          </button>
        ))}
      </div>

      {error && <div className="mb-4"><ErrorBox message={error} /></div>}
      {mine.error && <div className="mb-4"><ErrorBox message={mine.error} onRetry={mine.reload} /></div>}
      {selectedDir !== null && slots.loading && <Loading />}
      {slots.error && <ErrorBox message={slots.error} onRetry={slots.reload} />}
      {selectedDir !== null && !slots.loading && !slots.error && (slots.data ?? []).length === 0 && (
        <Empty text="Для этого направления нет слотов" />
      )}

      {selectedDir !== null && (
        <div className="space-y-6">
          {[0, 1, 2, 3, 4, 5].map((day) => {
            const list = slotsByDay[day] ?? []
            if (list.length === 0) return null
            return (
              <div key={day}>
                <h2 className="font-semibold mb-2">{DAY_NAMES[day]}</h2>
                <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                  {list.map((s) => {
                    const active = enrollmentBySlot.has(s.id)
                    const blocked = !active && busyDays.has(s.day_of_week)
                    const n = slotNumber(hhmm(s.start_time))
                    return (
                      <button
                        key={s.id}
                        onClick={() => toggle(s)}
                        disabled={blocked || busy}
                        className={`text-left p-3 rounded-xl border transition ${
                          active
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
                              {hhmm(s.start_time)}–{hhmm(s.end_time)}
                            </p>
                            <p className="text-xs text-muted truncate">{s.place}</p>
                          </div>
                          <span
                            className={`shrink-0 p-1.5 rounded-lg ${
                              active ? 'bg-accent text-white' : 'bg-surface-2 text-muted'
                            }`}
                          >
                            {active ? <X size={14} /> : <Check size={14} />}
                          </span>
                        </div>
                        {blocked && (
                          <p className="text-[10px] text-red-600 dark:text-red-400 mt-2">
                            Уже есть физкультура в этот день
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
