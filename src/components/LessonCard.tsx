import type { Lesson } from '../lib/types'
import { LESSON_TYPE_LABELS, typeColor } from '../lib/schedule'
import { X, MapPin, User as UserIcon } from 'lucide-react'

interface Props {
  lesson: Lesson
  onRemove?: () => void
  onOpen: () => void
  selected?: boolean
}

export default function LessonCard({ lesson, onRemove, onOpen, selected }: Props) {
  const accent = typeColor(lesson.type)
  const canRemove = lesson.type === 'pe' && onRemove

  return (
    <article className={`card lesson-card relative overflow-hidden h-full w-full shrink-0 flex flex-col ${selected ? 'ring-2 ring-accent ring-inset' : ''}`}>
      <button type="button" onClick={onOpen} aria-label={`Подробнее: ${lesson.title}`}
        aria-haspopup="dialog" aria-expanded={selected ?? false}
        className="absolute inset-0 z-10 cursor-pointer rounded-[inherit] focus-visible:outline-2 focus-visible:outline-accent focus-visible:-outline-offset-2" />
      <div className={`absolute inset-0 opacity-[0.06] pointer-events-none ${accent}`} />
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${accent}`} />
      <div className="relative flex items-center justify-between gap-1 min-w-0">
        <span className={`lesson-type truncate rounded px-1 text-white font-semibold ${accent}`} title={LESSON_TYPE_LABELS[lesson.type]}>
          {LESSON_TYPE_LABELS[lesson.type]}
        </span>
        {canRemove && (
          <button onClick={onRemove} className="relative z-20 shrink-0 rounded text-muted hover:text-red-600" title="Убрать из расписания" aria-label="Убрать из расписания">
            <X size={12} />
          </button>
        )}
      </div>
      <p className="lesson-title font-semibold" title={lesson.title}>{lesson.title}</p>
      <div className="lesson-details mt-auto text-muted min-w-0">
        <p className="flex items-center gap-1" title={lesson.teacher}>
          <UserIcon size={10} className="shrink-0" /><span className="truncate">{lesson.teacher}</span>
        </p>
        <p className="flex items-center gap-1" title={lesson.place}>
          <MapPin size={10} className="shrink-0" /><span className="truncate">{lesson.place}</span>
        </p>
      </div>
    </article>
  )
}
