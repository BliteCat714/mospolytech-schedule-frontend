import { format } from 'date-fns'
import type { Lesson, LessonType, PairTime, PDEnrollment, PEEnrollment, RaspLesson } from './types'

export const DAY_NAMES = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

export const LESSON_TYPE_LABELS: Record<LessonType, string> = {
  lecture: 'Лекция',
  practice: 'Практика',
  lab: 'Лабораторная',
  project: 'Проектная деятельность',
  pe: 'Физкультура',
  other: 'Занятие',
}

/** День недели в формате rasp: 1 = пн … 7 = вс. */
export function weekdayNumber(date: Date): number {
  return ((date.getDay() + 6) % 7) + 1
}

export const hhmm = (t: string | null | undefined): string => (t ?? '').slice(0, 5)

export function pairNumber(start: string, times: PairTime[]): number | null {
  return times.find((t) => t.start === start)?.pair ?? null
}

const TYPE_MAP: Record<string, LessonType> = {
  'Лекция': 'lecture',
  'Практика': 'practice',
  'Лаб. работа': 'lab',
}

export function raspToLesson(l: RaspLesson): Lesson {
  const isProject = l.location === 'ПД'
  const room = l.rooms[0]
  const place = l.rooms.length
    ? l.rooms.map((r) => r.name).join(', ') + (l.location && !isProject ? ` · ${l.location}` : '')
    : l.location || 'Место не указано'
  const teachers = l.teachers.filter((t) => !t.is_vacancy).map((t) => t.name)
  return {
    id: `r-${l.id}`,
    title: l.subject,
    type: isProject ? 'project' : (TYPE_MAP[l.type] ?? 'other'),
    teacher: teachers.join('\n') || '—',
    place,
    link: l.e_link ?? room?.url ?? null,
    group: l.group,
    location: l.location,
    lessonNumber: l.pair,
    dayOfWeek: l.weekday - 1,
    start: hhmm(l.start),
    end: hhmm(l.end),
    dateFrom: l.date_from,
    dateTo: l.date_to,
  }
}

export function enrollmentToLesson(e: PEEnrollment, times: PairTime[]): Lesson {
  const s = e.slot_detail
  const start = hhmm(s.start_time)
  return {
    id: `pe-${e.id}`,
    title: 'Физическая культура',
    type: 'pe',
    teacher: 'Кафедра физвоспитания',
    place: s.place,
    dayOfWeek: s.day_of_week,
    start,
    end: hhmm(s.end_time),
    lessonNumber: pairNumber(start, times),
  }
}

export function pdEnrollmentToLessons(e: PDEnrollment): Lesson[] {
  const p = e.project
  return p.slots.map((slot, i) => ({
    id: `pd-${e.id}-${i}`,
    title: p.title,
    type: 'project' as const,
    teacher: p.teacher || '—',
    place: slot.room || 'Место не указано',
    project: p.title,
    group: undefined,
    dayOfWeek: slot.day_of_week,
    start: slot.start,
    end: slot.end,
    lessonNumber: slot.pair,
  }))
}

/** Занятия выбранного дня: совпадает день недели и дата попадает в период действия. */
export function lessonsForDay(all: Lesson[], date: Date): Lesson[] {
  const day = weekdayNumber(date) - 1
  const key = format(date, 'yyyy-MM-dd')
  return all.filter((l) => l.dayOfWeek === day
    && (!l.dateFrom || key >= l.dateFrom)
    && (!l.dateTo || key <= l.dateTo))
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

/** Идентификатор браузера: входа в системе нет, по нему хранятся записи на физкультуру. */
export function clientId(): string {
  try {
    let id = localStorage.getItem('clientId')
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem('clientId', id)
    }
    return id
  } catch {
    return 'anonymous-session'
  }
}
