import { isWithinInterval, parseISO } from 'date-fns'
import { type Lesson, type Period, type User, type PEslot, peSlots } from '../data/mock'

export const SLOT_TIMES: { n: number; start: string; end: string }[] = [
  { n: 1, start: '09:00', end: '10:30' },
  { n: 2, start: '10:40', end: '12:10' },
  { n: 3, start: '12:20', end: '13:50' },
  { n: 4, start: '14:30', end: '16:00' },
  { n: 5, start: '16:10', end: '17:40' },
  { n: 6, start: '17:50', end: '19:20' },
  { n: 7, start: '19:30', end: '21:00' },
]

export function slotNumber(start: string): number | null {
  const found = SLOT_TIMES.find((s) => s.start === start)
  return found ? found.n : null
}

export function isLessonActive(lesson: Lesson, date: Date): boolean {
  const iso = date.toISOString().slice(0, 10)
  return lesson.periods.some((p: Period) =>
    isWithinInterval(parseISO(iso), {
      start: parseISO(p.from),
      end: parseISO(p.to),
    }),
  )
}

export function getLessonsForUser(
  allLessons: Lesson[],
  userGroup: string | undefined,
  projectGroupId: string | undefined,
  date: Date,
): Lesson[] {
  return allLessons.filter((l) => {
    const isPersonal = l.type === 'pe'
    const belongs =
      isPersonal ||
      (userGroup && l.groupIds.includes(userGroup)) ||
      (projectGroupId && l.groupIds.includes(projectGroupId))
    if (!belongs) return false
    if (l.dayOfWeek !== date.getDay() && !(date.getDay() === 0 && l.dayOfWeek === 7)) {
      return false
    }
    return isLessonActive(l, date)
  })
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

// -------- Физкультура --------

const PE_PERIOD: Period = { from: '2026-09-01', to: '2026-12-30' }

export function peSlotToLesson(slot: PEslot): Lesson {
  const dir = slot.direction
  return {
    id: `pe-${slot.id}`,
    title: `Физическая культура (${dirLabel(dir)})`,
    type: 'pe',
    teacher: 'Кафедра физвоспитания',
    building: slot.building,
    room: slot.room,
    dayOfWeek: slot.dayOfWeek,
    start: slot.start,
    end: slot.end,
    periods: [PE_PERIOD],
    groupIds: [],
  }
}

export function getPElessonsForUser(user: User | null): Lesson[] {
  if (!user || !user.peSlots || user.peSlots.length === 0) return []
  return user.peSlots
    .map((id) => peSlots.find((s) => s.id === id))
    .filter((s): s is PEslot => Boolean(s))
    .map(peSlotToLesson)
}

/**
 * Проверка конфликта: пересекается ли выбранный PE-слот
 * с уже существующей парой пользователя (по дню и времени).
 */
export function peSlotConflicts(
  slot: PEslot,
  userLessons: Lesson[],
): Lesson | null {
  const SLOT_TOLERANCE_MIN = 1 // минута, для сравнения «равное время»
  const toMin = (t: string) => {
    const [h, m] = t.split(':').map(Number)
    return h * 60 + m
  }
  const aStart = toMin(slot.start)
  const aEnd = toMin(slot.end)

  for (const l of userLessons) {
    if (l.dayOfWeek !== slot.dayOfWeek) continue
    if (l.type === 'pe') continue
    const bStart = toMin(l.start)
    const bEnd = toMin(l.end)
    if (aStart < bEnd && bStart < aEnd) {
      // пересечение интервалов
      return l
    }
  }
  return null
}

export function dirLabel(id: string): string {
  const map: Record<string, string> = {
    aerobics: 'аэробика',
    volleyball: 'волейбол',
    basketball: 'баскетбол',
    football: 'футбол',
    swimming: 'плавание',
    athletics: 'лёгкая атлетика',
    chess: 'шахматы',
    tabletennis: 'настольный теннис',
    yoga: 'йога',
  }
  return map[id] ?? id
}