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
  format: string
  group_name?: string | null
  stream_label?: string | null
  project_title?: string | null
}

export interface FixedPDSession {
  session_id: number
  project_title: string
  day_of_week: number
  start: string
  end: string
  occurrence_dates: string[]
  teacher_name: string | null
  room_name: string | null
  location_name: string
}

export interface ScheduleResponse {
  scheduled_classes: ScheduledClass[]
  fixed_pd_snapshot: FixedPDSession[]
}

export interface Page<T> {
  results: T[]
  next: string | null
}

export interface ImportedLesson {
  id: number
  group_name: string
  subject: string
  lesson_type: string
  day_of_week: number
  lesson_number?: number
  start: string | null
  end: string | null
  date_from: string | null
  date_to: string | null
  week_raw: string
  teacher_raw: string
  data: { rooms?: string[]; places?: { text: string }[] }
}

export interface ImportedScheduleResponse extends Page<ImportedLesson> {
  schedule_import: {
    id: number
    source_metadata: { date?: string }
    review_required: boolean
  } | null
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
  group?: string
  dateFrom?: string | null
  dateTo?: string | null
  occurrenceDates?: string[]
  lessonNumber?: number | null
  format?: string
  room?: string | null
  location?: string
  stream?: string | null
  project?: string | null
  source?: string
}

export type ScheduleTarget =
  | { kind: 'group'; id: number; name: string }
  | { kind: 'teacher'; id: number; name: string }

export type User =
  | { role: 'student'; id: number; name: string; group: string; studentId?: number }
  | { role: 'teacher'; id: number; name: string }
