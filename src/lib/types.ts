export interface PairTime {
  pair: number
  start: string
  end: string
}

export interface RaspGroup {
  id: number
  title: string
  course: number | null
}

export interface RaspTeacher {
  id: number
  name: string
  is_vacancy: boolean
}

export interface RaspLesson {
  id: number
  subject: string
  type: string
  weekday: number // 1 = пн … 7 = вс
  pair: number
  start: string | null
  end: string | null
  date_from: string | null
  date_to: string | null
  location: string
  e_link: string | null
  group?: string
  teachers: RaspTeacher[]
  rooms: { name: string; location: string; url: string | null }[]
}

export interface LessonsResponse {
  lessons: RaspLesson[]
}

export interface RoomOccupancy {
  subject: string
  type: string
  teachers: string[]
  groups: string[]
}

export interface RoomStatus {
  id: number
  name: string
  location: string
  busy: boolean
  lessons: RoomOccupancy[]
}

export interface RoomsStatusResponse {
  locations: string[]
  rooms: RoomStatus[]
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
  owner: string
  slot: number
  slot_detail: PESlot
}

export interface PDSlot {
  day_of_week: number
  start: string
  end: string
  pair: number | null
  room: string
}

export interface PDProject {
  id: number
  number: number
  direction: string
  title: string
  teacher: string
  contact: string
  note: string
  slots: PDSlot[]
}

export interface PDDirection {
  name: string
  count: number
}

export interface PDEnrollment {
  id: number
  owner: string
  group_title: string
  project: PDProject
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
  group?: string
  dateFrom?: string | null
  dateTo?: string | null
  link?: string | null
  lessonNumber?: number | null
  format?: string
  room?: string | null
  location?: string
  stream?: string | null
  project?: string | null
}

export type ScheduleTarget =
  | { kind: 'group'; id: number; name: string }
  | { kind: 'teacher'; id: number; name: string }

export type User =
  | { role: 'student'; id: number; name: string; group: string }
  | { role: 'teacher'; id: number; name: string }
