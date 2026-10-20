export interface Semester {
  id: number
  name: string
  start_date: string
  weeks_count: number
}

export interface Group {
  id: number
  name: string
}

export interface Student {
  id: number
  group: number
  group_name: string
  full_name: string
}

export interface Teacher {
  id: number
  full_name: string
}

export interface ScheduledClass {
  id: number
  subject_name: string
  lesson_type: string
  teacher_name: string | null
  slot_day: number // 0 = пн … 5 = сб
  slot_lesson_number: number
  slot_start_time: string | null
  slot_end_time: string | null
  room_name: string | null
  location_name: string
}

export interface PEDirection {
  id: number
  code: string
  name: string
  icon: string
}

export interface PESlot {
  id: number
  direction: number
  day_of_week: number
  start_time: string
  end_time: string
  place: string
}

export interface PEEnrollment {
  id: number
  student: number
  slot: number
  slot_detail: PESlot
}

export interface Room {
  id: number
  name: string
  building_name: string | null
  location_name: string
  capacity: number
}

export interface FreeRoomsResponse {
  slot: { day_of_week: number; lesson_number: number } | null
  rooms: Room[]
  detail?: string
}

export type LessonType = 'lecture' | 'practice' | 'lab' | 'project' | 'pe' | 'other'

export interface Lesson {
  id: string
  title: string
  type: LessonType
  teacher: string
  place: string
  dayOfWeek: number // 0 = пн … 6 = вс
  start: string // HH:MM
  end: string
}

export type User =
  | { role: 'student'; id: number; name: string; group: string }
  | { role: 'teacher'; id: number; name: string }
