import type { GeneratedLesson, GeneratedSchedule, GenerationSlot } from './generation'

export interface CalendarRow { number: number; start: string; end: string }
export interface CalendarPoint { rows: number; gaps: number }
export interface CalendarPlacement {
  lesson: GeneratedLesson
  start: CalendarPoint
  end: CalendarPoint
  lane: number
  lanes: number
  outside: boolean
}

const minutes = (value: string) => {
  const [hour, minute] = value.split(':').map(Number)
  return hour * 60 + minute
}

/** The saved pattern defines the axis; saved lesson values override it for history. */
export function generatedCalendarRows(schedule: GeneratedSchedule, slots: GenerationSlot[]): CalendarRow[] {
  const rows = new Map<number, CalendarRow>()
  for (const slot of slots) {
    if (slot.start_time && slot.end_time && !rows.has(slot.lesson_number)) {
      rows.set(slot.lesson_number, { number: slot.lesson_number,
        start: slot.start_time.slice(0, 5), end: slot.end_time.slice(0, 5) })
    }
  }
  for (const lesson of schedule.scheduled_classes) {
    if (lesson.slot_start_time && lesson.slot_end_time) {
      rows.set(lesson.slot_lesson_number, { number: lesson.slot_lesson_number,
        start: lesson.slot_start_time.slice(0, 5), end: lesson.slot_end_time.slice(0, 5) })
    }
  }
  return [...rows.values()].sort((a, b) => a.number - b.number)
}

/** Map a literal time into existing pair rows and their breaks, without extra rows. */
export function calendarPoint(value: string, rows: CalendarRow[]): CalendarPoint {
  const at = minutes(value)
  for (let index = 0; index < rows.length; index++) {
    const start = minutes(rows[index].start), end = minutes(rows[index].end)
    if (at <= start) return { rows: index, gaps: index }
    if (at <= end) return { rows: index + (at - start) / (end - start), gaps: index }
    const next = rows[index + 1]
    if (next && at < minutes(next.start)) {
      return { rows: index + 1, gaps: index + (at - end) / (minutes(next.start) - end) }
    }
  }
  return { rows: rows.length, gaps: Math.max(0, rows.length - 1) }
}

export function calendarPosition(point: CalendarPoint, rowCount: number): string {
  const fraction = point.rows / rowCount
  return `calc(${fraction * 100}% + ${(point.gaps - fraction * (rowCount - 1)) * 4}px)`
}

/** Each lesson is emitted once. Simultaneous projects use separate column lanes. */
export function placeGeneratedLessons(lessons: GeneratedLesson[], rows: CalendarRow[]) {
  const placements: CalendarPlacement[] = [], outside: GeneratedLesson[] = []
  if (!rows.length) return { placements, outside: lessons }
  const first = minutes(rows[0].start), last = minutes(rows[rows.length - 1].end)
  for (let day = 0; day < 7; day++) {
    const items = lessons.filter((lesson) => lesson.dayOfWeek === day)
      .sort((a, b) => minutes(a.start) - minutes(b.start) || minutes(a.end) - minutes(b.end) || a.id.localeCompare(b.id))
    let component: CalendarPlacement[] = [], laneEnds: number[] = [], componentEnd = -1
    const finish = () => { component.forEach((item) => { item.lanes = laneEnds.length }); component = []; laneEnds = [] }
    for (const lesson of items) {
      const start = minutes(lesson.start), end = minutes(lesson.end)
      if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || end <= first || start >= last) {
        outside.push(lesson)
        continue
      }
      if (start >= componentEnd) finish()
      let lane = laneEnds.findIndex((until) => until <= start)
      if (lane < 0) lane = laneEnds.length
      laneEnds[lane] = end
      const item = { lesson, start: calendarPoint(lesson.start, rows), end: calendarPoint(lesson.end, rows),
        lane, lanes: 1, outside: start < first || end > last }
      component.push(item)
      placements.push(item)
      componentEnd = Math.max(componentEnd, end)
    }
    finish()
  }
  return { placements, outside }
}
