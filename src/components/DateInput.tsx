import { useId } from 'react'
import { CalendarDays } from 'lucide-react'
import { displayCalendarDate, isCalendarDate, parseCalendarDate } from '../lib/calendarDate'

interface Props { label: string; value: string; onChange: (value: string) => void }
export default function DateInput({ label, value, onChange }: Props) {
  const id = useId()
  const invalid = value !== '' && !isCalendarDate(value)
  return <div className="text-sm">
    <label htmlFor={id}>{label}</label>
    <div className="flex items-center gap-2 mt-1.5">
      <input id={id} type="text" placeholder="дд/мм/гггг" maxLength={10}
        aria-describedby={`${id}-format`} aria-invalid={invalid || undefined}
        className="generation-input !mt-0" value={displayCalendarDate(value)}
        onChange={event => onChange(parseCalendarDate(event.target.value) ?? event.target.value)} />
      <div className="relative shrink-0 flex items-center justify-center w-11 h-11 rounded-xl border border-border text-accent focus-within:outline-2 focus-within:outline-accent">
        <CalendarDays size={18} aria-hidden="true" />
        <input type="date" aria-label={`${label}: выбрать в календаре`} value={isCalendarDate(value) ? value : ''}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={event => onChange(event.target.value)} />
      </div>
    </div>
    <p id={`${id}-format`} className="text-xs text-muted mt-1">дд/мм/гггг</p>
  </div>
}
