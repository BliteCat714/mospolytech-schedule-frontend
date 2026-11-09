import type { Lesson, LessonType } from './types'
import type { GenerationSettings } from './generationSettings'

export interface GenerationSlot {
  id: number
  day_of_week: number
  lesson_number: number
  start_time: string | null
  end_time: string | null
}
export interface GenerationSemester {
  id: number
  name: string
  display_name?: string
  is_archived?: boolean
  notice: string
  groups: { id: number; name: string; student_count: number }[]
  modules: { id: number; number: number; start_date: string; end_date: string; teaching_weeks: number }[]
  patterns: {
    id: number; name: string; slots: GenerationSlot[]
    bell_schedule?: { code: string; scope: string; source_url: string; verified_on: string; study_forms: string[] }
  }[]
  teachers: { id: number; name: string }[]
}
export interface GenerationOptions {
  semesters: GenerationSemester[]
  authentication_required: boolean
  default_semester_id?: number | null
  resource_profiles?: ResourceProfile[]
}

export interface SnapshotRoom {
  id: number; name: string; building_id?: number | null; building_name?: string; location_name?: string
  effective_capacity?: number | null; capacity_source?: string; capacity_origin?: string
  capacity_assumption?: number | null; confirmed_capacity?: number | null
}
export interface ResourceProfile {
  id: string; name: string; notice: string; semester_id: number; group_id: number; rooms: SnapshotRoom[]
}
export interface PlanningInputSnapshot {
  group_id?: number; slots?: GenerationSlot[]; rooms?: SnapshotRoom[]; group_name?: string
}
export interface ValidationFinding {
  code?: string; rule?: string; mode?: string; message?: string; text?: string; reason?: string
  actual?: unknown; limit?: unknown; class_ids?: number[]; student_ids?: number[]
}
export interface ValidationReport {
  valid?: boolean; blocking?: ValidationFinding[]; warnings?: ValidationFinding[]; incomplete?: ValidationFinding[]
  metrics?: Record<string, unknown>
}
export interface ManualVariant {
  id: number; name: string; created_at: string; source_run_id: number; parent_variant_id: number | null; validation?: ValidationReport
}
export interface PlacementChange { class_id: number; slot_id?: number; room_id?: number | null }
export interface ManualSchedule extends GeneratedSchedule {
  variant: ManualVariant | null
  validation: ValidationReport
  placements: { class_id: number; event_id: number; slot_id: number; room_id: number | null }[]
  settings_snapshot?: GenerationSettings
  input_snapshot?: PlanningInputSnapshot
}

export function preferredGenerationSemester(options: GenerationOptions | null, selectedId: number) {
  return options?.semesters.find((item) => item.id === selectedId && !item.is_archived)
    ?? options?.semesters.find((item) => item.id === options.default_semester_id && !item.is_archived)
    ?? options?.semesters.find((item) => !item.is_archived)
}

export function savedGenerationSemester(options: GenerationOptions | null, runId: number | null, loaded: LoadedProjection | null) {
  if (!runId || loaded?.identity?.runId !== runId || loaded?.schedule?.run?.id !== runId) return undefined
  return options?.semesters.find((item) => item.id === loaded.schedule.run!.semester)
}
export interface GeneratedClass {
  id: number
  run: number
  subject_name: string
  lesson_type: string
  teacher_name: string | null
  group_name: string | null
  stream_label: string | null
  project_title: string | null
  slot_day: number
  slot_lesson_number: number
  slot_start_time: string | null
  slot_end_time: string | null
  week_pattern: number
  room_name: string | null
  location_name: string
  format: string
  student_ids: number[]
  slot?: number
  room?: number | null
  event?: number
  teacher_id?: number | null
}
export interface FixedProjectSession {
  session_id: number
  project_title: string
  day_of_week: number
  start: string
  end: string
  teacher_name?: string | null
  teacher_id?: number | null
  room_name?: string | null
  location_name?: string
  student_ids: number[]
  travel_buffer_minutes: number
  place_details?: { raw?: string } | null
}
export interface SavedRun {
  id: number
  semester: number
  module: number | null
  status: string
  message: string
  created_at: string
  solve_time_seconds: number | null
  solver_diagnostics?: { status: string; proven_optimal: boolean; preferences: string }
  settings_snapshot?: GenerationSettings | null
  input_snapshot?: PlanningInputSnapshot | null
  validation_snapshot?: ValidationReport | null
  group_id?: number | null
  scheduled_count?: number
  editable?: boolean
}
export interface GenerationIssue { id: number; level: string; text: string }
export interface GeneratedSchedule {
  run: SavedRun | null
  scheduled_classes: GeneratedClass[]
  fixed_pd_snapshot: FixedProjectSession[]
  issues: GenerationIssue[]
}
export interface GeneratedRunResponse extends SavedRun {
  scheduled_classes: GeneratedClass[]
  fixed_pd_snapshot: FixedProjectSession[]
  issues: GenerationIssue[]
}
export interface GeneratedLesson extends Lesson {
  participantIds: number[]
  travelBuffer: number | null
  isFixed: boolean
}

const typeMap: Record<string, LessonType> = {
  LECTURE: 'lecture', PRACTICE: 'practice', LAB: 'lab', PD: 'project', PE: 'pe', DPO: 'dpo',
}
const clock = (value: string | null | undefined) => value?.slice(0, 5) ?? ''

/** Times come from this saved run, never the current rasp bell-time dictionary. */
export function generatedLessons(schedule: GeneratedSchedule): GeneratedLesson[] {
  return [
    ...schedule.scheduled_classes.map((item): GeneratedLesson => ({
      id: `generated-${item.run}-${item.id}`,
      title: item.subject_name,
      type: typeMap[item.lesson_type] ?? 'other',
      teacher: item.teacher_name || 'Не указан',
      place: item.format === 'ONLINE' ? 'Онлайн' : item.room_name ? [item.room_name, item.location_name].filter(Boolean).join(' · ') : 'Нужно назначить аудиторию',
      dayOfWeek: item.slot_day,
      start: clock(item.slot_start_time), end: clock(item.slot_end_time),
      lessonNumber: item.slot_lesson_number,
      group: item.group_name ?? undefined,
      // Older serializers returned a method-wrapper string for a missing stream.
      stream: item.stream_label?.startsWith('<') ? null : item.stream_label,
      project: item.project_title,
      format: item.format,
      participantIds: item.student_ids ?? [], travelBuffer: null, isFixed: false,
    })),
    ...schedule.fixed_pd_snapshot.map((item): GeneratedLesson => ({
      id: `fixed-${schedule.run?.id}-${item.session_id}`,
      title: item.project_title, type: 'project',
      teacher: item.teacher_name || (item.teacher_id ? `Преподаватель #${item.teacher_id}` : 'Не указан'),
      place: item.room_name || item.place_details?.raw || item.location_name || 'Место не указано',
      dayOfWeek: item.day_of_week,
      start: clock(item.start), end: clock(item.end),
      project: item.project_title, format: 'ONSITE',
      participantIds: item.student_ids, travelBuffer: item.travel_buffer_minutes, isFixed: true,
    })),
  ].sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.start.localeCompare(b.start) || a.id.localeCompare(b.id))
}

export function savedRunFromResponse(response: GeneratedRunResponse): SavedRun {
  return { id: response.id, semester: response.semester, module: response.module,
    status: response.status, message: response.message, created_at: response.created_at,
    solve_time_seconds: response.solve_time_seconds, solver_diagnostics: response.solver_diagnostics,
    settings_snapshot: response.settings_snapshot, input_snapshot: response.input_snapshot,
    validation_snapshot: response.validation_snapshot }
}

export const runStatusLabel = (status: string) => ({
  PENDING: 'Ожидание', SOLVED: 'Нагрузка размещена', PARTIAL: 'Частичное размещение',
  INFEASIBLE: 'Неразрешимо', UNKNOWN: 'Решение не найдено за лимит времени', ERROR: 'Ошибка генерации',
}[status] ?? status)


export interface ProjectionIdentity {
  runId: number
  kind: 'groups' | 'teachers'
  holderId: number
  holderName: string
}
export interface LoadedProjection {
  identity: ProjectionIdentity
  schedule: GeneratedSchedule
}

/** Retained async data must never be presented as a different requested holder/run. */
export function projectionForRequest(
  loaded: LoadedProjection | null,
  requested: ProjectionIdentity | null,
): LoadedProjection | null {
  if (!loaded?.identity || !loaded.schedule || !requested) return null
  const actual = loaded.identity
  return actual.runId === requested.runId && actual.kind === requested.kind
    && actual.holderId === requested.holderId && loaded.schedule.run?.id === requested.runId
    ? loaded : null
}


export function bellPatternLabel(pattern: { name: string; bell_schedule?: { code: string } }): string {
  const code = pattern.bell_schedule?.code ?? pattern.name
  return ({ MOSCOW_DAY: 'Москва: дневные пары', MOSCOW_EVENING: 'Москва: вечерние пары' } as Record<string, string>)[code] ?? pattern.name
}
