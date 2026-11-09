import test from 'node:test'
import assert from 'node:assert/strict'
import { compareDPOSchedules } from '../src/lib/dpoSchedule.ts'
import { generatedLessons } from '../src/lib/generation.ts'
import type { GeneratedSchedule, GeneratedClass } from '../src/lib/generation.ts'
const make = (runId: number): GeneratedSchedule => ({ run: { id: runId, semester: 1, module: 2, status: 'SOLVED', message: '', created_at: '', solve_time_seconds: null }, scheduled_classes: [], fixed_pd_snapshot: [], issues: [] })
const lesson = (run: number, type: string): GeneratedClass => ({ id: 7, run, lesson_type: type, subject_name: 'Предмет', teacher_name: 'Преподаватель', group_name: 'Группа', stream_label: null, project_title: null, slot_day: 1, slot_lesson_number: 2, slot_start_time: '10:40', slot_end_time: '12:10', week_pattern: 1, room_name: null, location_name: '', format: 'ONLINE', student_ids: [61] })
test('comparison keeps both source runs, marks DPO, deduplicates fixed PD and does not invent a saved run', () => {
  const main = make(29), dpo = make(31)
  main.scheduled_classes.push(lesson(29, 'LECTURE'))
  dpo.scheduled_classes.push(lesson(31, 'DPO'))
  const fixed = { session_id: 4, project_title: 'ПД', day_of_week: 0, start: '09:00', end: '10:30', student_ids: [61], travel_buffer_minutes: 30 }
  main.fixed_pd_snapshot.push(fixed); dpo.fixed_pd_snapshot.push(structuredClone(fixed))
  const before = structuredClone({ main, dpo })
  const result = compareDPOSchedules(main, dpo)
  assert.equal(result.run, null)
  assert.deepEqual(result.scheduled_classes.map(item => item.run), [29, 31])
  assert.equal(result.fixed_pd_snapshot.length, 1)
  assert.equal(generatedLessons(result).find(item => item.id === 'generated-31-7')?.type, 'dpo')
  assert.deepEqual({ main, dpo }, before)
})
test('comparison rejects mismatched periods and inconsistent fixed sessions', () => {
  const main = make(29), dpo = make(31)
  dpo.run!.module = 3
  assert.throws(() => compareDPOSchedules(main, dpo), /одного семестра/)
  dpo.run!.module = 2
  main.fixed_pd_snapshot = [{ session_id: 4, project_title: 'ПД', day_of_week: 0, start: '09:00', end: '10:30', student_ids: [61], travel_buffer_minutes: 0 }]
  dpo.fixed_pd_snapshot = [{ ...main.fixed_pd_snapshot[0], start: '10:40', end: '12:10' }]
  assert.throws(() => compareDPOSchedules(main, dpo), /различается фиксированная ПД/)
})
