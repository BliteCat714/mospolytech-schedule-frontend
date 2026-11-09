import type { Lesson, PairTime, ScheduleTarget } from './types'

// Temporary frontend-only fixture. No records are created in the university database.
export const demoTarget: ScheduleTarget = { kind: 'group', id: 2147483647, name: 'ДЕМО · Проверка расписания' }
export const isCheckerDemo = (target: ScheduleTarget | null) => target?.kind === 'group' && target.id === demoTarget.id && target.name === demoTarget.name
export const demoTimes: PairTime[] = [
  { pair: 1, start: '09:00', end: '10:30' },
  { pair: 2, start: '10:40', end: '12:10' },
  { pair: 3, start: '12:20', end: '13:50' },
  { pair: 4, start: '14:30', end: '16:00' },
  { pair: 5, start: '16:10', end: '17:40' },
]
function lesson(id: string, dayOfWeek: number, pair: number, title: string, location = 'Корпус А'): Lesson {
  const time = demoTimes[pair - 1]
  return { id: `demo-${id}`, title, dayOfWeek, start: time.start, end: time.end, lessonNumber: pair,
    type: 'lecture', teacher: 'Демонстрационный преподаватель', place: `101 · ${location}`, location, group: demoTarget.name }
}
export const demoLessons: Lesson[] = [
  lesson('overlap-1', 0, 1, 'Математика'), lesson('overlap-2', 0, 1, 'Физика'),
  lesson('gap-1', 1, 1, 'Программирование'), lesson('gap-2', 1, 3, 'Алгоритмы'),
  lesson('single', 2, 2, 'Английский язык'),
  ...demoTimes.map((t) => lesson(`load-${t.pair}`, 3, t.pair, `Учебная дисциплина ${t.pair}`)),
  lesson('building-1', 4, 1, 'История'), lesson('building-2', 4, 2, 'Экономика', 'Корпус Б'),
]
export const demoBaseline: Lesson[] = [
  ...demoLessons.filter((l) => l.id !== 'demo-gap-2').map((l) => l.id === 'demo-single'
    ? { ...l, start: demoTimes[0].start, end: demoTimes[0].end, lessonNumber: 1 } : l),
  lesson('removed', 5, 2, 'Отменённая консультация'),
]
