import { useState } from 'react'
import {
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth,
  isSameDay,
  format,
} from 'date-fns'
import { ru } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface Props {
  selected: Date
  onSelect: (d: Date) => void
  onClose: () => void
}

export default function DatePicker({ selected, onSelect, onClose }: Props) {
  const [month, setMonth] = useState(startOfMonth(selected))

  const monthStart = startOfMonth(month)
  const monthEnd = endOfMonth(month)
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })

  const days: Date[] = []
  let d = gridStart
  while (d <= gridEnd) {
    days.push(d)
    d = addDays(d, 1)
  }

  const today = new Date()

  return (
    <>
      {/* клик вне — закрыть */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      <div className="absolute z-50 mt-2 bg-surface border border-border rounded-xl shadow-lg p-3 w-72">
        {/* Шапка месяца */}
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() => setMonth(subMonths(month, 1))}
            className="p-1.5 rounded-lg hover:bg-surface-2 text-muted"
          >
            <ChevronLeft size={16} />
          </button>
          <p className="text-sm font-semibold capitalize">
            {format(month, 'LLLL yyyy', { locale: ru })}
          </p>
          <button
            onClick={() => setMonth(addMonths(month, 1))}
            className="p-1.5 rounded-lg hover:bg-surface-2 text-muted"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Дни недели */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((w) => (
            <div key={w} className="text-center text-[10px] text-muted py-1">
              {w}
            </div>
          ))}
        </div>

        {/* Сетка дней */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((day) => {
            const inMonth = isSameMonth(day, month)
            const isSelected = isSameDay(day, selected)
            const isToday = isSameDay(day, today)

            return (
              <button
                key={day.toISOString()}
                onClick={() => {
                  onSelect(day)
                  onClose()
                }}
                className={`
                  h-8 rounded-lg text-xs transition
                  ${!inMonth ? 'text-muted/40' : 'text-text hover:bg-surface-2'}
                  ${isToday && !isSelected ? 'ring-1 ring-accent/40' : ''}
                  ${isSelected ? 'bg-accent text-white font-semibold' : ''}
                `}
              >
                {format(day, 'd')}
              </button>
            )
          })}
        </div>

        {/* Быстрый переход */}
        <div className="flex gap-1 mt-3 pt-3 border-t border-border">
          <button
            onClick={() => {
              onSelect(today)
              onClose()
            }}
            className="flex-1 text-xs py-1.5 rounded-lg bg-surface-2 text-muted hover:text-accent transition"
          >
            Сегодня
          </button>
        </div>
      </div>
    </>
  )
}