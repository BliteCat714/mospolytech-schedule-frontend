import assert from 'node:assert/strict'
import test from 'node:test'
import type { GeneratedLesson, GeneratedSchedule, GenerationSlot } from '../src/lib/generation.ts'
import { calendarPoint, generatedCalendarRows, placeGeneratedLessons } from '../src/lib/generatedCalendar.ts'

const bells = [['09:00', '10:30'], ['10:40', '12:10'], ['12:20', '13:50'],
  ['14:30', '16:00'], ['16:10', '17:40'], ['17:50', '19:20'], ['19:30', '21:00']]
const slots: GenerationSlot[] = bells.map(([start_time, end_time], index) => ({
  id: index + 1, day_of_week: 0, lesson_number: index + 1, start_time, end_time,
}))
const schedule: GeneratedSchedule = { run: { id: 3, semester: 1, module: 1, status: 'SOLVED',
  message: '', created_at: '', solve_time_seconds: 0.1 }, scheduled_classes: [], fixed_pd_snapshot: [], issues: [] }
const rows = generatedCalendarRows(schedule, slots)
const project = (id: string, start: string, end: string): GeneratedLesson => ({
  id, title: id, type: 'project', teacher: 'Руководитель', place: 'Площадка', dayOfWeek: 0,
  start, end, isFixed: true, participantIds: [1, 2, 3, 4, 5], travelBuffer: 30,
})

test('the weekly axis has seven pair rows, independent of the PD intervals', () => {
  const source = structuredClone(schedule)
  source.fixed_pd_snapshot = [{ session_id: 1, project_title: 'ПД', day_of_week: 0,
    start: '09:00', end: '12:10', student_ids: [1, 2], travel_buffer_minutes: 30 }]
  assert.deepEqual(generatedCalendarRows(source, slots).map((r) => r.number), [1, 2, 3, 4, 5, 6, 7])
  assert.equal(generatedCalendarRows(source, slots).length, 7)
})

test('a two-pair project is one placement spanning both rows, with its participant subset', () => {
  const lesson = project('ПД', '09:00', '12:10')
  const layout = placeGeneratedLessons([lesson], rows)
  assert.equal(layout.placements.length, 1)
  assert.equal(layout.outside.length, 0)
  assert.equal(layout.placements[0].lesson, lesson)
  assert.deepEqual(layout.placements[0].start, { rows: 0, gaps: 0 })
  assert.deepEqual(layout.placements[0].end, { rows: 2, gaps: 1 })
  assert.deepEqual(lesson.participantIds, [1, 2, 3, 4, 5])
})

test('partial-pair times and times inside a break remain literal, without rounding', () => {
  const lesson = project('Нестандартная ПД', '13:00', '16:00')
  const [item] = placeGeneratedLessons([lesson], rows).placements
  assert.equal(item.lesson.start, '13:00')
  assert.equal(item.lesson.end, '16:00')
  assert.equal(item.start.rows, 2 + 40 / 90)
  assert.deepEqual(item.end, { rows: 4, gaps: 3 })
  assert.deepEqual(calendarPoint('12:15', rows), { rows: 2, gaps: 1.5 })
})

test('overlapping projects have separate lanes and disjoint meetings use full width', () => {
  const lessons = [project('первый', '09:00', '12:10'), project('второй', '10:40', '13:50'),
    project('поздний', '16:10', '17:40')]
  const layout = placeGeneratedLessons(lessons, rows)
  assert.equal(new Set(layout.placements.map((p) => p.lesson.id)).size, 3)
  assert.deepEqual(layout.placements.map((p) => [p.lane, p.lanes]), [[0, 2], [1, 2], [0, 1]])
})

test('an event outside the axis is retained for details, never silently discarded', () => {
  const before = project('ранний', '07:00', '08:00')
  const layout = placeGeneratedLessons([before], rows)
  assert.deepEqual(layout.outside, [before])
  assert.equal(layout.placements.length, 0)
})

test('historical saved slot times override a current axis label', () => {
  const historical = structuredClone(schedule)
  historical.scheduled_classes = [{ id: 1, run: 3, subject_name: 'Предмет', lesson_type: 'PRACTICE',
    teacher_name: null, group_name: 'Группа', stream_label: null, project_title: null,
    slot_day: 1, slot_lesson_number: 2, slot_start_time: '10:45:00', slot_end_time: '12:15:00',
    week_pattern: 1, room_name: null, location_name: '', format: 'ONSITE', student_ids: [] }]
  assert.deepEqual(generatedCalendarRows(historical, slots)[1], { number: 2, start: '10:45', end: '12:15' })
})
