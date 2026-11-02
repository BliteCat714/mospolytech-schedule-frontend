import assert from 'node:assert/strict'
import test from 'node:test'
import { defaultGenerationSettings, settingsSummary } from '../src/lib/generationSettings.ts'
import { mergePlacementChanges } from '../src/lib/generationManual.ts'
import { generatedLessons, savedRunFromResponse } from '../src/lib/generation.ts'
import type { GeneratedRunResponse } from '../src/lib/generation.ts'
import { findingText } from '../src/lib/generationValidation.ts'

test('new defaults leave numeric rules off and independent form instances cannot mutate each other', () => {
  const first = defaultGenerationSettings(), second = defaultGenerationSettings()
  assert.deepEqual(Object.keys(first.rules), ['free_days'])
  assert.deepEqual(first.rules.free_days, [{ day: 'sat', mode: 'preferred' }, { day: 'sun', mode: 'required' }])
  first.rules.free_days!.pop()
  assert.equal(second.rules.free_days!.length, 2)
})
test('zero building changes remains an enabled rule and time bounds remain independent', () => {
  const settings = defaultGenerationSettings()
  settings.rules.max_building_changes = { value: 0, mode: 'required' }
  settings.rules.latest_end = { value: '17:40', mode: 'preferred' }
  const summary = settingsSummary(settings)
  assert.ok(summary.some((line) => line.includes('0 переходов') && line.includes('обязательно')))
  assert.ok(summary.some((line) => line.includes('17:40')))
  assert.equal(settings.rules.earliest_start, undefined)
})
test('accumulated manual moves keep explicit null rooms and other edits without mutating the source', () => {
  const source = [{ class_id: 1, slot_id: 10, room_id: null }, { class_id: 2, slot_id: 20, room_id: 8 }]
  const next = mergePlacementChanges(source, [{ class_id: 1, slot_id: 30 }, { class_id: 3, room_id: null }])
  assert.deepEqual(next, [{ class_id: 1, slot_id: 30, room_id: null }, { class_id: 2, slot_id: 20, room_id: 8 }, { class_id: 3, room_id: null }])
  assert.equal(source[0].slot_id, 10)
})
test('cleared onsite room survives calendar adaptation while an online class needs no room', () => {
  const base = { id: 1, run: 1, subject_name: 'Практика', lesson_type: 'PRACTICE', teacher_name: '', group_name: '', stream_label: null, project_title: null, slot_day: 1, slot_lesson_number: 1, slot_start_time: '09:00', slot_end_time: '10:30', week_pattern: 1, room_name: null, location_name: '', student_ids: [], format: 'ONSITE' }
  const lessons = generatedLessons({ run: null, scheduled_classes: [base, { ...base, id: 2, format: 'ONLINE' }], fixed_pd_snapshot: [], issues: [] })
  assert.equal(lessons[0].place, 'Нужно назначить аудиторию')
  assert.equal(lessons[1].place, 'Онлайн')
})
test('saved result retains its settings rather than replacing them with current form defaults', () => {
  const settings = defaultGenerationSettings()
  settings.rules.max_pairs_per_day = { value: 3, mode: 'required' }
  const response: GeneratedRunResponse = { id: 5, semester: 2, module: null, status: 'SOLVED', message: '', created_at: '', solve_time_seconds: 1, scheduled_classes: [], fixed_pd_snapshot: [], issues: [], settings_snapshot: settings }
  assert.deepEqual(savedRunFromResponse(response).settings_snapshot?.rules.max_pairs_per_day, { value: 3, mode: 'required' })
  assert.equal(defaultGenerationSettings().rules.max_pairs_per_day, undefined)
})

test('validation displays minute-based time bounds as clock times and keeps rule labels readable', () => {
  assert.equal(findingText({ code: 'earliest_start', actual: 540, limit: 640 }), 'Начало занятий · фактически: 09:00 · предел: 10:40')
  assert.equal(findingText({ rule: 'latest_end', actual: 1160, limit: 1060 }), 'Окончание занятий · фактически: 19:20 · предел: 17:40')
  assert.equal(findingText({ code: 'free_days', message: 'В воскресенье есть занятия', actual: 1, limit: 0 }), 'В воскресенье есть занятия')
  assert.equal(findingText({ code: 'preferred_building', actual: 3, limit: 2 }), 'Желаемый корпус')
  assert.equal(findingText({ code: 'max_building_changes', actual: null, limit: 0 }), 'Максимум смен корпуса · предел: 0')
})
