import { format } from 'date-fns'
import type { Lesson, LessonType, PairTime, PDEnrollment, PEEnrollment, RaspLesson } from './types'

export const DAY_NAMES = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

export function currentTimePosition(slots: readonly { start: string; end: string }[], now: Date) {
  const minutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5))
  const current = now.getHours() * 60 + now.getMinutes()
  const index = slots.findLastIndex((slot) => minutes(slot.start) <= current)
  if (index < 0) return

  const slot = slots[index]
  const start = minutes(slot.start)
  const next = slots[index + 1]
  const nextStart = next ? minutes(next.start) : Infinity
  const end = Math.min(slot.end ? minutes(slot.end) : nextStart, nextStart)
  if (end <= start || !Number.isFinite(end)) return
  if (current <= end) return { index, rowFraction: (current - start) / (end - start), gapFraction: 0 }
  if (next) return { index, rowFraction: 1, gapFraction: (current - end) / (nextStart - end) }
}

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

function httpLink(value?: string | null): string | undefined {
  const link = value?.trim()
  if (!link) return
  try {
    const url = new URL(link)
    if (url.protocol === 'https:' || url.protocol === 'http:') return link
  } catch {
    // The source sometimes contains only a label.
  }
}

export function raspToLesson(l: RaspLesson): Lesson {
  const isProject = l.location === 'ПД'
  const webinar = /webinar|вебинар|онлайн|online/i
  const webinarRoom = l.rooms.find((room) => webinar.test(room.name) && httpLink(room.url))
  const link = httpLink(l.e_link) ?? httpLink(webinarRoom?.url)
    ?? l.rooms.map((room) => httpLink(room.url)).find(Boolean) ?? null
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
    rooms: l.rooms.filter((r) => !r.url).map((r) => ({ name: r.name, location: r.location || l.location })),
    link,
    webinar: webinar.test(l.location) || l.rooms.some((room) => webinar.test(room.name)),
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
    rooms: [{ name: s.place }],
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
    rooms: slot.room ? [{ name: slot.room }] : undefined,
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
