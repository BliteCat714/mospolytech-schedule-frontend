import { isCalendarDate } from './calendarDate.ts'

/** Local UI fixtures. No student records or schedules are written to the backend. */
export const demoStudents = [
  { id: 1, name: 'Анна · демо', group: '241-3210', busy: [1, 2, 9] },
  { id: 2, name: 'Иван · демо', group: '241-3210', busy: [1, 3, 10] },
  { id: 3, name: 'Мария · демо', group: '251-3210', busy: [2, 9, 17] },
  { id: 4, name: 'Алексей · демо', group: '251-3210', busy: [3, 10, 18] },
  { id: 5, name: 'Дарья · демо', group: '241-3220', busy: [1, 17, 25] },
  { id: 6, name: 'Михаил · демо', group: '241-3220', busy: [2, 18, 26] },
]
export const demoTeachers = [
  { id: 1, name: 'Преподаватель А · демо', busy: [1, 9, 17, 25, 33] },
  { id: 2, name: 'Преподаватель Б · демо', busy: [2, 10, 18, 26, 34] },
]
export interface DemoGroup { id: number; name: string; students: number[] }
export interface DemoDiscipline { id: number; title: string; teacher: number; hours: number }
export interface DemoProgram { name: string; start: string; end: string; groups: DemoGroup[]; disciplines: DemoDiscipline[] }
export interface DemoLesson { date: string; pair: number; group: string; title: string; teacher: string }
const parseDate = (value: string) => new Date(`${value}T12:00:00Z`)
export function validateDemoProgram(program: DemoProgram, step: number): string | null {
  if (!program.name.trim()) return 'Укажите название программы.'
  const start = parseDate(program.start), end = parseDate(program.end)
  if (!isCalendarDate(program.start) || !isCalendarDate(program.end) || end < start) return 'Укажите корректный период программы.'
  if (+end - +start > 366 * 86400000) return 'Для демо выберите период не больше года.'
  if (step >= 1) {
    if (!program.groups.length || program.groups.some(group => !group.name.trim() || !group.students.length)) return 'Для каждой группы укажите название и выберите хотя бы одного слушателя.'
    if (program.groups.some(group => group.students.some(id => !demoStudents.some(student => student.id === id)))) return 'Выберите слушателей из каталога.'
  }
  if (step >= 2 && (!program.disciplines.length || program.disciplines.some(item => !item.title.trim() || !demoTeachers.some(teacher => teacher.id === item.teacher) || !Number.isInteger(item.hours) || item.hours < 2 || item.hours > 1000 || item.hours % 2 !== 0))) return 'Добавьте дисциплины, преподавателей и чётное число академических часов от 2 до 1000.'
  return null
}
export const dpoDemoApi = {
  async catalog() { return { students: demoStudents, teachers: demoTeachers } },
  async plan(program: DemoProgram): Promise<{ lessons: DemoLesson[]; missing: number }> {
    const problem = validateDemoProgram(program, 3)
    if (problem) throw new Error(problem)
    const lessons: DemoLesson[] = []
    const studentSlots = new Set<string>(), teacherSlots = new Set<string>(), groupSlots = new Set<string>()
    const groupDayLoad = new Map<string, number>()
    const start = +parseDate(program.start), end = +parseDate(program.end)
    let missing = 0
    for (const group of program.groups) for (const discipline of program.disciplines) {
      const count = discipline.hours / 2
      const teacher = demoTeachers.find(item => item.id === discipline.teacher)!
      const candidates: { iso: string; stamp: number; pair: number }[] = []
      for (let stamp = start; stamp <= end; stamp += 86400000) {
        const date = new Date(stamp), day = date.getUTCDay()
        if (day === 0) continue
        const iso = date.toISOString().slice(0, 10)
        for (let pair = 1; pair <= 6; pair++) {
          const slot = (day - 1) * 8 + pair
          if (teacher.busy.includes(slot) || group.students.some(id => demoStudents.find(student => student.id === id)!.busy.includes(slot))) continue
          candidates.push({ iso, stamp, pair })
        }
      }
      for (let index = 0; index < count; index++) {
        // Spread target dates across the full period. Prefer days with less DPO
        // workload; the mock still has no proof of optimality or infeasibility.
        const target = count === 1 ? (start + end) / 2 : start + (end - start) * index / (count - 1)
        const available = candidates.filter(item => {
          const key = `${item.iso}:${item.pair}`
          return !teacherSlots.has(`${teacher.id}:${key}`) && !groupSlots.has(`${group.id}:${key}`)
            && !group.students.some(id => studentSlots.has(`${id}:${key}`))
        })
        available.sort((a, b) => (groupDayLoad.get(`${group.id}:${a.iso}`) ?? 0) - (groupDayLoad.get(`${group.id}:${b.iso}`) ?? 0)
          || Math.abs(a.stamp - target) - Math.abs(b.stamp - target) || a.stamp - b.stamp || a.pair - b.pair)
        const chosen = available[0]
        if (!chosen) { missing += count - index; break }
        const key = `${chosen.iso}:${chosen.pair}`, dayKey = `${group.id}:${chosen.iso}`
        lessons.push({ date: chosen.iso, pair: chosen.pair, group: group.name, title: discipline.title, teacher: teacher.name })
        teacherSlots.add(`${teacher.id}:${key}`); groupSlots.add(`${group.id}:${key}`)
        group.students.forEach(id => studentSlots.add(`${id}:${key}`))
        groupDayLoad.set(dayKey, (groupDayLoad.get(dayKey) ?? 0) + 1)
      }
    }
    return { lessons: lessons.sort((a, b) => a.date.localeCompare(b.date) || a.pair - b.pair), missing }
  },
}
