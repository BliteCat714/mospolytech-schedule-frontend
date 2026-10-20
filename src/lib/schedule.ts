import { format } from 'date-fns'
import type { FixedPDSession, ImportedLesson, Lesson, LessonType, PEEnrollment, ScheduledClass } from './types'

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

export const LESSON_TYPE_LABELS: Record<LessonType, string> = {
  lecture: 'Лекция',
  practice: 'Практика',
  lab: 'Лабораторная',
  project: 'Проектная деятельность',
  pe: 'Физкультура',
  other: 'Занятие',
}

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
  const room = c.room_name ? `${c.location_name ? `${c.location_name}, ` : ''}каб. ${c.room_name}` : c.format === 'ONLINE' ? 'Онлайн' : 'Место не указано'
  return {
    id: `c-${c.id}`,
    title: c.subject_name,
    type: TYPE_MAP[c.lesson_type] ?? 'other',
    teacher: c.teacher_name ?? '—',
    place: room,
    group: c.group_name ?? undefined,
    stream: c.stream_label?.startsWith('<') ? null : c.stream_label,
    project: c.project_title,
    format: c.format,
    room: c.room_name,
    location: c.location_name,
    lessonNumber: c.slot_lesson_number,
    source: 'Сформированное расписание',
    dayOfWeek: c.slot_day,
    start,
    end,
  }
}

export function importedToLesson(rule: ImportedLesson): Lesson {
  const type = rule.lesson_type.toLowerCase()
  return {
    id: `imported-${rule.id}`,
    title: rule.subject,
    type: type.includes('лек') ? 'lecture' : type.includes('лаб') ? 'lab' : type.includes('пр') ? 'practice' : 'other',
    teacher: rule.teacher_raw || '—',
    place: rule.data.places?.map((p) => p.text).filter(Boolean).join(', ') || rule.data.rooms?.join(', ') || 'Место не указано',
    group: rule.group_name,
    lessonNumber: rule.lesson_number ?? slotNumber(hhmm(rule.start)),
    source: 'Импортированное расписание',
    dayOfWeek: rule.day_of_week - 1,
    start: hhmm(rule.start),
    end: hhmm(rule.end),
    dateFrom: rule.date_from,
    dateTo: rule.date_to,
  }
}

export function fixedPDToLesson(session: FixedPDSession): Lesson {
  return {
    id: `pd-${session.session_id}`,
    title: session.project_title,
    type: 'project',
    teacher: session.teacher_name || '—',
    place: [session.location_name, session.room_name].filter(Boolean).join(', ') || 'Место не указано',
    dayOfWeek: session.day_of_week,
    start: hhmm(session.start),
    end: hhmm(session.end),
    occurrenceDates: session.occurrence_dates,
    project: session.project_title,
    room: session.room_name,
    location: session.location_name,
    lessonNumber: slotNumber(hhmm(session.start)),
    source: 'Фиксированная проектная деятельность',
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
    lessonNumber: slotNumber(hhmm(s.start_time)),
    source: 'Запись на физкультуру',
  }
}

export function lessonsForDay(all: Lesson[], date: Date): Lesson[] {
  const day = weekdayIndex(date)
  const key = format(date, 'yyyy-MM-dd')
  return all.filter((l) => l.dayOfWeek === day
    && (!l.dateFrom || key >= l.dateFrom)
    && (!l.dateTo || key <= l.dateTo)
    && (!l.occurrenceDates || l.occurrenceDates.includes(key)))
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
