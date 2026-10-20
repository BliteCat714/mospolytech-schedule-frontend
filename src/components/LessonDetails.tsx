import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { format, parseISO } from 'date-fns'
import { ru } from 'date-fns/locale'
import { CalendarDays, Clock, MapPin, UserRound, Users, X } from 'lucide-react'
import type { Lesson } from '../lib/types'
import { LESSON_TYPE_LABELS, typeColor } from '../lib/schedule'

interface Props {
  lesson: Lesson
  date: Date
  semester?: string
  userGroup?: string
  onClose: () => void
}

const formats: Record<string, string> = { ONLINE: 'Онлайн', ONSITE: 'Очно', HYBRID: 'Смешанный' }
const displayDate = (date: string) => format(parseISO(date), 'd MMMM yyyy', { locale: ru })

export default function LessonDetails({ lesson, date, semester, userGroup, onClose }: Props) {
  const titleId = useId()
  const closeButton = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLElement>(null)

  useEffect(() => {
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null
    closeButton.current?.focus({ preventScroll: true })
    return () => { if (trigger?.isConnected) trigger.focus({ preventScroll: true }) }
  }, [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onClose() }
    }
    const onOutsideClick = (event: MouseEvent) => {
      const target = event.target
      if (target instanceof Element && !panel.current?.contains(target)
        && !target.closest('[aria-label^="Подробнее:"]')) onClose()
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('click', onOutsideClick)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('click', onOutsideClick)
    }
  }, [onClose])

  return createPortal(
    <aside ref={panel} role="dialog" aria-labelledby={titleId}
      className="lesson-details-panel fixed z-50 top-16 right-2 bottom-2 sm:right-4 sm:bottom-4 w-[400px] max-w-[calc(100vw-1rem)] flex flex-col rounded-2xl border border-border bg-surface shadow-2xl text-text">
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border shrink-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Подробности занятия</p>
        <button ref={closeButton} type="button" onClick={onClose} aria-label="Закрыть подробности занятия"
          className="p-2 rounded-lg text-muted hover:text-text hover:bg-surface-2 transition-colors focus-visible:outline-2 focus-visible:outline-accent">
          <X size={18} />
        </button>
      </div>
      <div className="overflow-y-auto min-h-0 p-5 space-y-6">
        <div>
          <span className={`inline-block rounded-md px-2 py-1 text-xs font-semibold text-white ${typeColor(lesson.type)}`}>
            {LESSON_TYPE_LABELS[lesson.type]}
          </span>
          <h2 id={titleId} className="text-xl font-bold leading-snug mt-3 break-words">{lesson.title}</h2>
        </div>
        <dl className="space-y-5 text-sm">
          <div>
            <dt className="flex items-center gap-2 text-xs text-muted mb-1"><CalendarDays size={14} />Дата</dt>
            <dd className="font-medium first-letter:uppercase">{format(date, 'EEEE, d MMMM yyyy', { locale: ru })}</dd>
          </div>
          <div>
            <dt className="flex items-center gap-2 text-xs text-muted mb-1"><Clock size={14} />Время{lesson.lessonNumber ? ` · ${lesson.lessonNumber} пара` : ''}</dt>
            <dd className="font-medium">{lesson.start && lesson.end ? `${lesson.start} — ${lesson.end}` : 'Не указано'}</dd>
          </div>
          <div>
            <dt className="flex items-center gap-2 text-xs text-muted mb-1"><UserRound size={14} />Преподаватель</dt>
            <dd className="whitespace-pre-line break-words">{lesson.teacher === '—' ? 'Не указан' : lesson.teacher}</dd>
          </div>
          <div>
            <dt className="flex items-center gap-2 text-xs text-muted mb-1"><MapPin size={14} />Место проведения</dt>
            <dd className="break-words">{lesson.place}</dd>
          </div>
          {lesson.format && <div><dt className="text-xs text-muted mb-1">Формат</dt><dd>{formats[lesson.format] ?? lesson.format}</dd></div>}
          {(lesson.group || userGroup) && <div>
            <dt className="flex items-center gap-2 text-xs text-muted mb-1"><Users size={14} />{lesson.group ? 'Группа' : 'Ваша группа'}</dt>
            <dd>{lesson.group || userGroup}</dd>
          </div>}
          {lesson.stream && <div><dt className="text-xs text-muted mb-1">Поток</dt><dd className="break-words">{lesson.stream}</dd></div>}
          {lesson.project && <div><dt className="text-xs text-muted mb-1">Проект</dt><dd>{lesson.project}</dd></div>}
          {semester && <div><dt className="text-xs text-muted mb-1">Семестр</dt><dd>{semester}</dd></div>}
          {(lesson.dateFrom || lesson.dateTo) && <div>
            <dt className="text-xs text-muted mb-1">Период проведения</dt>
            <dd>{lesson.dateFrom ? displayDate(lesson.dateFrom) : 'Начало не указано'} — {lesson.dateTo ? displayDate(lesson.dateTo) : 'Конец не указан'}</dd>
          </div>}
          {!!lesson.occurrenceDates?.length && <div>
            <dt className="text-xs text-muted mb-1">Даты занятий</dt>
            <dd className="space-y-1">{lesson.occurrenceDates.map((d) => <div key={d}>{displayDate(d)}</div>)}</dd>
          </div>}
          {lesson.source && <div className="pt-4 border-t border-border"><dt className="text-xs text-muted mb-1">Источник</dt><dd>{lesson.source}</dd></div>}
        </dl>
      </div>
    </aside>, document.body,
  )
}
