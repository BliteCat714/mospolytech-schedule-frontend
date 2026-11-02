import { Fragment, useEffect, useId, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
import { createPortal } from 'react-dom'
import { GripVertical } from 'lucide-react'
import type { GeneratedLesson, GeneratedSchedule, GenerationSlot } from '../lib/generation'
import { generatedLessons } from '../lib/generation'
import { generationDragThreshold, generationDropTarget } from '../lib/generationDrag'
import type { GenerationDrop, GenerationDropTarget } from '../lib/generationDrag'
import { calendarPosition, generatedCalendarRows, placeGeneratedLessons } from '../lib/generatedCalendar'
import { DAY_NAMES } from '../lib/schedule'
import LessonCard from './LessonCard'
import LessonDetails from './LessonDetails'

interface Props {
  schedule: GeneratedSchedule
  slots: GenerationSlot[]
  groupName?: string
  onEditClass?: (classId: number) => void
  onDropClass?: (proposal: GenerationDrop) => void
}
interface PointerDrag {
  pointerId: number; pointerType: string; classId: number; slotId: number
  startX: number; startY: number; active: boolean; handle: HTMLButtonElement
}
const weekdays = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье']

function pointerTarget(x: number, y: number, calendar: HTMLElement | null): GenerationDropTarget | null {
  if (!calendar) return null
  const elements = document.elementsFromPoint(x, y)
  for (const element of elements) {
    const card = element.closest<HTMLElement>('[data-generation-card]')
    if (!card || !calendar.contains(card)) continue
    return { fixed: card.dataset.generationFixed === 'true', classId: Number(card.dataset.generationClassId) || undefined,
      slotId: Number(card.dataset.generationSlotId) || undefined }
  }
  for (const element of elements) {
    const cell = element.closest<HTMLElement>('[data-generation-slot-id]')
    if (cell && calendar.contains(cell)) return { slotId: Number(cell.dataset.generationSlotId) || undefined }
  }
  return null
}

export default function GeneratedCalendar({ schedule, slots, groupName, onEditClass, onDropClass }: Props) {
  const [selected, setSelected] = useState<GeneratedLesson | null>(null)
  const [dragVisual, setDragVisual] = useState<{ classId: number; x: number; y: number; target: GenerationDrop | null } | null>(null)
  const [dragStatus, setDragStatus] = useState('')
  const drag = useRef<PointerDrag | null>(null)
  const suppressClick = useRef(false)
  const viewport = useRef<HTMLDivElement>(null)
  const instructionsId = useId()
  const lessons = useMemo(() => generatedLessons(schedule), [schedule])
  const rows = useMemo(() => generatedCalendarRows(schedule, slots), [schedule, slots])
  const layout = useMemo(() => placeGeneratedLessons(lessons, rows), [lessons, rows])
  const ordinary = useMemo(() => new Map(schedule.scheduled_classes.map((item) => [`generated-${item.run}-${item.id}`, item])), [schedule.scheduled_classes])
  const slotByPosition = useMemo(() => new Map(slots.map((slot) => [`${slot.day_of_week}-${slot.lesson_number}`, slot])), [slots])
  const style = { '--slot-count': rows.length, height: `${32 + rows.length * 84}px` } as CSSProperties
  const dragging = !!dragVisual
  const placementIdentity = `${schedule.run?.id}:${schedule.scheduled_classes.map((item) => `${item.id}:${item.slot}`).join(',')}`

  const stopDrag = (message?: string) => {
    const session = drag.current
    drag.current = null
    setDragVisual(null)
    if (message) setDragStatus(message)
    if (session?.handle.hasPointerCapture(session.pointerId)) session.handle.releasePointerCapture(session.pointerId)
    if (session?.active) { suppressClick.current = true; window.setTimeout(() => { suppressClick.current = false }, 0) }
  }
  useEffect(() => {
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && drag.current) { event.preventDefault(); stopDrag('Перетаскивание отменено.') }
    }
    document.addEventListener('keydown', onEscape)
    return () => {
      document.removeEventListener('keydown', onEscape)
      const session = drag.current
      drag.current = null
      if (session?.handle.hasPointerCapture(session.pointerId)) session.handle.releasePointerCapture(session.pointerId)
    }
  }, [])
  useEffect(() => { stopDrag() }, [placementIdentity])
  useEffect(() => {
    if (!dragging) return
    const cursor = document.body.style.cursor, select = document.body.style.userSelect
    document.body.style.cursor = 'grabbing'; document.body.style.userSelect = 'none'
    return () => { document.body.style.cursor = cursor; document.body.style.userSelect = select }
  }, [dragging])

  const startDrag = (event: ReactPointerEvent<HTMLButtonElement>, classId: number, slotId: number) => {
    if (!onDropClass || event.button !== 0 || !event.isPrimary) return
    drag.current = { pointerId: event.pointerId, pointerType: event.pointerType, classId, slotId,
      startX: event.clientX, startY: event.clientY, active: false, handle: event.currentTarget }
    event.currentTarget.focus({ preventScroll: true })
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  const moveDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const session = drag.current
    if (!session || event.pointerId !== session.pointerId) return
    if (!session.active && !generationDragThreshold(event.clientX - session.startX, event.clientY - session.startY, session.pointerType)) return
    session.active = true; event.preventDefault(); setSelected(null)
    const rawTarget = pointerTarget(event.clientX, event.clientY, viewport.current)
    const target = generationDropTarget(session.classId, session.slotId, rawTarget)
    setDragVisual({ classId: session.classId, x: event.clientX, y: event.clientY, target })
    const targetSlot = slots.find((slot) => slot.id === target?.slotId)
    setDragStatus(rawTarget?.fixed ? 'ПД закреплена. Выберите другую пару или свободный слот.' : targetSlot
      ? `${target?.swapClassId ? 'Обмен двух пар' : 'Перенос'}: ${weekdays[targetSlot.day_of_week]}, ${targetSlot.lesson_number} пара. После отпускания откроется серверная проверка.`
      : 'Перетащите на свободный слот или другую обычную пару. Escape — отменить.')
    const bounds = viewport.current?.getBoundingClientRect()
    if (bounds && viewport.current) {
      if (event.clientX > bounds.right - 40) viewport.current.scrollLeft += 18
      else if (event.clientX < bounds.left + 40) viewport.current.scrollLeft -= 18
    }
    if (event.clientY > window.innerHeight - 55) window.scrollBy(0, 18)
    else if (event.clientY < 85) window.scrollBy(0, -18)
  }
  const endDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const session = drag.current
    if (!session || event.pointerId !== session.pointerId) return
    const target = session.active ? generationDropTarget(session.classId, session.slotId, pointerTarget(event.clientX, event.clientY, viewport.current)) : null
    stopDrag(session.active ? target ? 'Открыта предварительная проверка. Применение и сохранение выполняются отдельно.' : 'Перенос отменён: выберите другое занятие или слот сетки.' : undefined)
    if (target) onDropClass?.(target)
  }
  const ghostClass = schedule.scheduled_classes.find((item) => item.id === dragVisual?.classId)

  return <>
    {onDropClass && <p id={instructionsId} className="text-xs text-muted flex items-center gap-1.5"><GripVertical size={14} className="shrink-0" />Тяните за ручку в углу пары: на свободное время — перенос, на другую пару — обмен. С клавиатуры нажмите ручку и используйте редактор.</p>}
    <p className="sr-only" role="status" aria-live="polite">{dragStatus}</p>
    <div ref={viewport} className="schedule-viewport overflow-auto" aria-label="Недельное расписание сохраненного запуска">
      <div className="schedule-grid schedule-week generated-week" style={style}>
        <div className="schedule-axis-heading" style={{ gridRow: 1, gridColumn: 1 }}>Пара</div>
        {DAY_NAMES.map((day, index) => <div key={day} className="day-head flex items-center justify-center text-xs font-semibold"
          style={{ gridRow: 1, gridColumn: index + 2 }}>{day}</div>)}
        {rows.map((row, index) => <Fragment key={row.number}>
          <div className="schedule-axis" style={{ gridRow: index + 2, gridColumn: 1 }} title={`${row.start}–${row.end}`}>
            <span className="schedule-axis-number">{row.number}</span>
            <span className="schedule-axis-time">{row.start}<br />–<br />{row.end}</span>
          </div>
          {DAY_NAMES.map((day, dayIndex) => {
            const slot = slotByPosition.get(`${dayIndex}-${row.number}`)
            return <div key={day} data-generation-slot-id={slot?.id} className={`schedule-cell rounded-xl ${slot && dragVisual?.target?.slotId === slot.id ? 'ring-2 ring-accent ring-inset bg-accent-soft' : ''}`}
              style={{ gridRow: index + 2, gridColumn: dayIndex + 2 }}><div className="empty-slot h-full" /></div>
          })}
        </Fragment>)}
        {DAY_NAMES.map((day, dayIndex) => <div key={day} className="relative min-w-0 pointer-events-none"
          style={{ gridColumn: dayIndex + 2, gridRow: `2 / ${rows.length + 2}` }}>
          {layout.placements.filter((item) => item.lesson.dayOfWeek === dayIndex).map((item) => {
            const height = { rows: item.end.rows - item.start.rows, gaps: item.end.gaps - item.start.gaps }
            const caption = `${item.lesson.start}–${item.lesson.end}${item.lesson.isFixed ? ` · ${item.lesson.participantIds.length} чел.` : ''}${item.outside ? ' · часть вне сетки' : ''}`
            const record = ordinary.get(item.lesson.id)
            const isSource = record && dragVisual?.classId === record.id
            const isTarget = record && dragVisual?.target?.swapClassId === record.id
            return <div key={item.lesson.id} data-generation-card="true" data-generation-fixed={item.lesson.isFixed ? 'true' : undefined}
              data-generation-class-id={record?.id} data-generation-slot-id={record?.slot}
              className={`absolute pointer-events-auto rounded-xl ${isSource ? 'opacity-40' : ''} ${isTarget ? 'ring-2 ring-accent ring-offset-2' : ''}`}
              style={{ top: calendarPosition(item.start, rows.length), height: calendarPosition(height, rows.length),
                left: `calc(${item.lane / item.lanes * 100}% + ${item.lane ? 2 : 0}px)`,
                width: `calc(${100 / item.lanes}% - ${item.lanes > 1 ? 2 : 0}px)` }}>
              <LessonCard lesson={item.lesson} annotation={caption} selected={selected?.id === item.lesson.id}
                onOpen={() => { if (!drag.current?.active && !suppressClick.current) setSelected(item.lesson) }} />
              {onDropClass && record?.slot && <button type="button" className="absolute z-20 top-0.5 right-0.5 rounded-md p-1 bg-surface/90 text-muted hover:text-accent focus-visible:outline-2 focus-visible:outline-accent cursor-grab active:cursor-grabbing"
                style={{ touchAction: 'none' }} aria-label={`Перетащить или изменить: ${item.lesson.title}`} aria-describedby={instructionsId}
                title="Перетащить пару; нажать — открыть редактор" onPointerDown={(event) => startDrag(event, record.id, record.slot!)}
                onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={(event) => { if (drag.current?.pointerId === event.pointerId) stopDrag('Перетаскивание отменено.') }}
                onLostPointerCapture={(event) => { if (drag.current?.pointerId === event.pointerId) stopDrag('Перетаскивание отменено.') }}
                onClick={() => { if (!suppressClick.current) { if (onEditClass) onEditClass(record.id); else setSelected(item.lesson) } }}><GripVertical size={14} /></button>}
            </div>
          })}
        </div>)}
      </div>
    </div>
    {dragVisual && createPortal(<div className="fixed z-[100] pointer-events-none max-w-64 rounded-xl border border-accent bg-surface px-3 py-2 shadow-xl text-xs"
      style={{ left: Math.max(8, Math.min(dragVisual.x + 16, window.innerWidth - 260)), top: Math.max(8, Math.min(dragVisual.y + 16, window.innerHeight - 90)) }}>
      <p className="font-semibold truncate">{ghostClass?.subject_name}</p><p className="text-accent mt-1">{dragVisual.target ? dragVisual.target.swapClassId ? 'Отпустите для проверки обмена' : 'Отпустите для проверки переноса' : 'Выберите слот или обычную пару'}</p>
    </div>, document.body)}
    {layout.outside.length > 0 && <div className="text-sm rounded-xl border border-border p-3">
      <p className="text-muted">Занятия вне временной сетки или без указанного времени:</p>
      {layout.outside.map((lesson) => <button key={lesson.id} onClick={() => setSelected(lesson)} className="block text-accent text-left mt-1">
        {DAY_NAMES[lesson.dayOfWeek]} · {lesson.start || '—'}–{lesson.end || '—'} · {lesson.title}
      </button>)}
    </div>}
    {selected && <LessonDetails lesson={selected} weekdayLabel={weekdays[selected.dayOfWeek]}
      userGroup={selected.isFixed ? undefined : groupName} onClose={() => setSelected(null)}>
      {!selected.isFixed && onEditClass && <div><button type="button" className="generation-primary w-full" onClick={() => {
        const item = schedule.scheduled_classes.find((entry) => `generated-${entry.run}-${entry.id}` === selected.id)
        if (item) { onEditClass(item.id); setSelected(null) }
      }}>Перенести или обменять</button></div>}
      {selected.isFixed && <>
        <div><dt className="text-xs text-muted mb-1">Участники этой проекции</dt>
          <dd>{selected.participantIds.length} участников (id: {selected.participantIds.join(', ') || 'не указаны'}). Не вся учебная группа.</dd></div>
        <div><dt className="text-xs text-muted mb-1">Буфер перемещения</dt><dd>{selected.travelBuffer} мин.</dd></div>
      </>}
    </LessonDetails>}
  </>
}
