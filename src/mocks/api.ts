import snapshot from './backend.json'
import { ApiError } from '../lib/api'
import type { FreeRoomsResponse, ImportedScheduleResponse, PEDirection, PEEnrollment, PESlot, Room, ScheduleResponse, Semester, Student, Teacher } from '../lib/types'

interface Fixtures {
  semesters: Semester[]
  students: Student[]
  studentSchedules: Record<string, ScheduleResponse>
  teachers: Teacher[]
  teacherSchedules: Record<string, ImportedScheduleResponse>
  rooms: Room[]
  roomSlots: Record<string, { slot: FreeRoomsResponse['slot']; room_ids: number[] }>
  directions: PEDirection[]
  peSlots: PESlot[]
}

const fixtures = snapshot as unknown as Fixtures
const enrollmentKey = 'mock:pe-enrollments:v1'
type Query = Record<string, string | number | undefined | null>

function readEnrollments(): PEEnrollment[] {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(enrollmentKey) ?? '[]')
    if (!Array.isArray(saved)) return []
    return saved.filter((e): e is PEEnrollment => e && typeof e.id === 'number'
      && fixtures.students.some((s) => s.id === e.student)
      && fixtures.peSlots.some((s) => s.id === e.slot))
      .map((e) => ({ ...e, slot_detail: fixtures.peSlots.find((s) => s.id === e.slot)! }))
  } catch {
    return []
  }
}

function page<T>(items: T[], query: Query) {
  const number = Math.max(1, Number(query.page) || 1)
  const size = Math.min(1000, Math.max(1, Number(query.page_size) || 100))
  return {
    count: items.length,
    next: number * size < items.length ? `?page=${number + 1}` : null,
    previous: number > 1 ? `?page=${number - 1}` : null,
    results: items.slice((number - 1) * size, number * size),
  }
}

export async function mockRequest<T>(method: string, path: string,
  { query = {}, body }: { query?: Query; body?: unknown } = {}): Promise<T> {
  const route = path.replace(/^\//, '').replace(/\/?$/, '/')
  let result: unknown
  if (method === 'GET') {
    const group = route.match(/^schedule\/groups\/(\d+)\/$/)
    const student = route.match(/^schedule\/students\/(\d+)\/$/)
    const teacher = route.match(/^imported\/teachers\/(\d+)\/schedule\/$/)
    if (route === 'semesters/') result = page(fixtures.semesters, query)
    else if (route === 'groups/') result = page([...new Map(fixtures.students.map((s) => [s.group, { id: s.group, name: s.group_name }])).values()], query)
    else if (route === 'students/') result = page(fixtures.students, query)
    else if (route === 'imported/teachers/') result = page(fixtures.teachers, query)
    else if (group) {
      const members = fixtures.students.filter((s) => s.group === Number(group[1]))
      if (members.length) {
        const schedules = members.map((s) => fixtures.studentSchedules[String(s.id)])
        // A group profile includes shared classes, not individual project/PE assignments.
        const classes = [...new Map(schedules.flatMap((s) => s.scheduled_classes)
          .filter((c) => c.lesson_type !== 'PD' && c.lesson_type !== 'PE').map((c) => [c.id, c])).values()]
        result = { ...schedules[0], scheduled_classes: classes, fixed_pd_snapshot: [] }
      }
    }
    else if (student) result = fixtures.studentSchedules[student[1]]
    else if (teacher) {
      const schedule = fixtures.teacherSchedules[teacher[1]]
      if (schedule) result = { ...schedule, ...page(schedule.results, query) }
    } else if (route === 'pe/directions/') result = page(fixtures.directions, query)
    else if (route === 'pe/slots/') result = page(fixtures.peSlots.filter((s) =>
      query.direction == null || s.direction === Number(query.direction)), query)
    else if (route === 'pe/enrollments/') result = page(readEnrollments().filter((e) =>
      query.student == null || e.student === Number(query.student)), query)
    else if (route === 'schedule/free-rooms/') {
      const slot = fixtures.roomSlots[`${query.day_of_week}-${query.lesson_number}`]
      if (slot) result = { slot: slot.slot, rooms: fixtures.rooms.filter((r) => slot.room_ids.includes(r.id)) }
    }
  } else if (method === 'POST' && route === 'pe/enrollments/') {
    const input = body as { student?: number; slot?: number } | null
    const slot = fixtures.peSlots.find((s) => s.id === input?.slot)
    const student = fixtures.students.find((s) => s.id === input?.student)
    if (!slot || !student) throw new ApiError('Студент или слот не найден.', 400)
    const enrollments = readEnrollments()
    if (enrollments.some((e) => e.student === student.id && e.slot_detail.day_of_week === slot.day_of_week)) {
      throw new ApiError('В этот день уже выбрана физкультура: не более одной в день.', 400)
    }
    const classes = fixtures.studentSchedules[String(student.id)].scheduled_classes
    const conflict = classes.find((c) => c.slot_day === slot.day_of_week
      && c.slot_start_time && c.slot_end_time
      && slot.start_time < c.slot_end_time && c.slot_start_time < slot.end_time)
    if (conflict) throw new ApiError(`Конфликт с парой «${conflict.subject_name}».`, 400)
    result = { id: Math.max(0, ...enrollments.map((e) => e.id)) + 1,
      student: student.id, slot: slot.id, slot_detail: slot } satisfies PEEnrollment
    localStorage.setItem(enrollmentKey, JSON.stringify([...enrollments, result]))
  } else if (method === 'DELETE' && /^pe\/enrollments\/\d+\/$/.test(route)) {
    const id = Number(route.split('/')[2])
    const enrollments = readEnrollments()
    if (!enrollments.some((e) => e.id === id)) throw new ApiError('Запись не найдена.', 404)
    localStorage.setItem(enrollmentKey, JSON.stringify(enrollments.filter((e) => e.id !== id)))
    return undefined as T
  }
  if (result === undefined) throw new ApiError(`Нет тестовых данных для ${method} ${route}`, 404)
  return structuredClone(result) as T
}
