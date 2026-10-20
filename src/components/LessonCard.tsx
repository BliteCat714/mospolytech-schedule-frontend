import type { Lesson } from '../lib/types'
import { typeColor, slotNumber } from '../lib/schedule'
import { X, Clock, MapPin, User as UserIcon } from 'lucide-react'

interface Props {
  lesson: Lesson
  onRemove?: () => void
}

export default function LessonCard({ lesson, onRemove }: Props) {
  const n = slotNumber(lesson.start)
  const canRemove = lesson.type === 'pe' && onRemove
  const accent = typeColor(lesson.type)

  return (
    <div className="card relative overflow-hidden h-full flex flex-col p-3 min-h-[76px]">
      {/* мягкая подложка цвета типа */}
      <div
        className={`absolute inset-0 opacity-[0.06] pointer-events-none ${accent}`}
      />
      {/* цветная полоса слева */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${accent}`} />

      <div className="relative pl-2 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
            {n !== null && (
              <span
                className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md text-white ${accent}`}
              >
                {n} пара
              </span>
            )}
            <span className="inline-flex items-center gap-1 text-[11px] text-muted">
              <Clock size={11} />
              {lesson.start}–{lesson.end}
            </span>
          </div>

          {canRemove && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onRemove()
              }}
              className="p-1 -mt-1 -mr-1 rounded-md text-muted hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
              title="Убрать из расписания"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <p className="font-semibold text-sm leading-snug">{lesson.title}</p>

        <div className="mt-1.5 space-y-0.5 text-xs text-muted">
          <p className="inline-flex items-center gap-1">
            <UserIcon size={11} />
            {lesson.teacher}
          </p>
          <p className="inline-flex items-center gap-1">
            <MapPin size={11} />
            {lesson.place}
          </p>
        </div>

      </div>
    </div>
  )
}