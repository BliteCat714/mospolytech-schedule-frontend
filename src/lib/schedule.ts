import type { Lesson, LessonType, PEEnrollment, ScheduledClass } from './types'

export const SLOT_TIMES: { n: number; start: string; end: string }[] = [
  { n: 1, start: '09:00', end: '10:30' },
  { n: 2, start: '10:40', end: '12:10' },
  { n: 3, start: '12:20', end: '13:50' },
  { n: 4, start: '14:30', end: '16:00' },
  { n: 5, start: '16:10', end: '17:40' },
  { n: 6, start: '17:50', end: '19:20' },
  { n: 7, start: '19:30', end: '21:00' },
]

export const DAY_NAMES = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

export function slotNumber(start: string): number | null {
  const found = SLOT_TIMES.find((s) => s.start === start)
  return found ? found.n : null
}

/** День недели в формате бэкенда: 0 = пн … 6 = вс. */
export function weekdayIndex(date: Date): number {
  return (date.getDay() + 6) % 7
}

export const hhmm = (t: string | null | undefined): string => (t ?? '').slice(0, 5)

const TYPE_MAP: Record<string, LessonType> = {
  LECTURE: 'lecture',
  PRACTICE: 'practice',
  LAB: 'lab',
  PD: 'project',
  PE: 'pe',
}

export function classToLesson(c: ScheduledClass): Lesson {
  const slot = SLOT_TIMES.find((s) => s.n === c.slot_lesson_number)
  const start = hhmm(c.slot_start_time) || slot?.start || ''
  const end = hhmm(c.slot_end_time) || slot?.end || ''
  const room = c.room_name ? `${c.location_name ? `${c.location_name}, ` : ''}каб. ${c.room_name}` : 'Онлайн'
  return {
    id: `c-${c.id}`,
    title: c.subject_name,
    type: TYPE_MAP[c.lesson_type] ?? 'other',
    teacher: c.teacher_name ?? '—',
    place: room,
    dayOfWeek: c.slot_day,
    start,
    end,
  }
}

export function enrollmentToLesson(e: PEEnrollment): Lesson {
  const s = e.slot_detail
  return {
    id: `pe-${e.id}`,
    title: 'Физическая культура',
    type: 'pe',
    teacher: 'Кафедра физвоспитания',
    place: s.place,
    dayOfWeek: s.day_of_week,
    start: hhmm(s.start_time),
    end: hhmm(s.end_time),
  }
}

export function lessonsForDay(all: Lesson[], date: Date): Lesson[] {
  const day = weekdayIndex(date)
  return all.filter((l) => l.dayOfWeek === day)
}

export function typeColor(type: string): string {
  switch (type) {
    case 'lecture': return 'bg-lecture'
    case 'practice': return 'bg-practice'
    case 'lab': return 'bg-lab'
    case 'project': return 'bg-project'
    case 'pe': return 'bg-pe'
    default: return 'bg-muted'
  }
}
