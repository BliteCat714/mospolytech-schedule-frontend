import { useEffect, useState } from 'react'
import { addDays, addMonths, eachWeekOfInterval, endOfMonth, format, isSameWeek, startOfMonth, startOfWeek } from 'date-fns'
import { ru } from 'date-fns/locale'
import { Check, ChevronLeft, ChevronRight } from 'lucide-react'

interface Props {
  selected: Date
  onSelect: (week: Date) => void
  onClose: () => void
}

export default function WeekPicker({ selected, onSelect, onClose }: Props) {
  const [month, setMonth] = useState(() => startOfMonth(selected))
  const weeks = eachWeekOfInterval({ start: startOfMonth(month), end: endOfMonth(month) }, { weekStartsOn: 1 })

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  const select = (week: Date) => {
    onSelect(startOfWeek(week, { weekStartsOn: 1 }))
    onClose()
  }

  return (
    <>
      <button type="button" className="fixed inset-0 z-40 cursor-default" onClick={onClose} aria-label="Закрыть выбор недели" tabIndex={-1} />
      <div role="dialog" aria-label="Выбор недели" className="absolute right-0 top-full z-50 mt-2 w-72 max-w-[calc(100vw-2rem)] bg-surface border border-border rounded-xl shadow-lg p-3">
        <div className="flex items-center justify-between mb-3">
          <button type="button" onClick={() => setMonth(addMonths(month, -1))} aria-label="Предыдущий месяц" className="p-1.5 rounded-lg hover:bg-surface-2 text-muted">
            <ChevronLeft size={16} />
          </button>
          <p className="text-sm font-semibold capitalize">{format(month, 'LLLL yyyy', { locale: ru })}</p>
          <button type="button" onClick={() => setMonth(addMonths(month, 1))} aria-label="Следующий месяц" className="p-1.5 rounded-lg hover:bg-surface-2 text-muted">
            <ChevronRight size={16} />
          </button>
        </div>
        <p className="text-xs text-muted mb-2">Выберите неделю · понедельник — воскресенье</p>
        <div className="space-y-1">
          {weeks.map((week) => {
            const active = isSameWeek(week, selected, { weekStartsOn: 1 })
            return (
              <button type="button" key={format(week, 'yyyy-MM-dd')} onClick={() => select(week)} aria-pressed={active}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition ${active ? 'bg-accent-soft text-accent font-semibold' : 'hover:bg-surface-2 text-text'}`}>
                <span>{format(week, 'd MMM', { locale: ru })} — {format(addDays(week, 6), 'd MMM yyyy', { locale: ru })}</span>
                {active && <Check size={16} className="shrink-0" />}
              </button>
            )
          })}
        </div>
        <div className="mt-3 pt-2 border-t border-border">
          <button type="button" onClick={() => select(new Date())} className="w-full rounded-lg px-3 py-2 text-xs text-accent font-medium hover:bg-accent-soft focus-visible:bg-accent-soft transition-colors">
            Текущая неделя
          </button>
        </div>
      </div>
    </>
  )
}
