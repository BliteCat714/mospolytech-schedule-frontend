import assert from 'node:assert/strict'
import test from 'node:test'
import { bellPatternLabel, generatedLessons, preferredGenerationSemester, projectionForRequest, savedGenerationSemester } from '../src/lib/generation.ts'
import type { GeneratedSchedule, GenerationOptions, LoadedProjection, ProjectionIdentity } from '../src/lib/generation.ts'

const response: GeneratedSchedule = {
  run: { id: 18, semester: 2, module: 3, status: 'SOLVED', message: '', created_at: '', solve_time_seconds: 0.1 },
  scheduled_classes: [{ id: 1, run: 18, subject_name: 'Практика', lesson_type: 'PRACTICE',
    teacher_name: 'Преподаватель', group_name: '251-3210', stream_label: null, project_title: null,
    slot_day: 1, slot_lesson_number: 2, slot_start_time: '10:40:00', slot_end_time: '12:10:00',
    week_pattern: 2, room_name: 'А101', location_name: 'Корпус', format: 'ONSITE', student_ids: [] }],
  fixed_pd_snapshot: [{ session_id: 7, project_title: 'ПД', day_of_week: 0, start: '09:00', end: '12:15',
    student_ids: [1, 2, 3, 4, 5], travel_buffer_minutes: 30, place_details: { raw: 'Площадка' } }], issues: [],
}

test('saved class times remain literal, including historical nonstandard slots', () => {
  assert.equal(generatedLessons(response).find((x) => !x.isFixed)?.start, '10:40')
  const historical = structuredClone(response)
  historical.scheduled_classes[0].slot_start_time = '10:45:00'
  historical.scheduled_classes[0].slot_end_time = '12:15:00'
  const item = generatedLessons(historical).find((x) => !x.isFixed)
  assert.equal(item?.start, '10:45')
  assert.equal(item?.end, '12:15')
})

test('fixed PD preserves precise interval, participant subset and travel buffer', () => {
  const item = generatedLessons(response).find((x) => x.isFixed)
  assert.equal(item?.start, '09:00')
  assert.equal(item?.end, '12:15')
  assert.deepEqual(item?.participantIds, [1, 2, 3, 4, 5])
  assert.equal(item?.place, 'Площадка')
  assert.equal(item?.travelBuffer, 30)
})


test('retained group/run data cannot appear under a newly requested projection', () => {
  const group: ProjectionIdentity = { runId: 18, kind: 'groups', holderId: 1, holderName: '251-3210' }
  const loaded: LoadedProjection = { identity: group, schedule: response }
  // While a new GET is pending or fails, useAsync can retain the old value.
  assert.equal(projectionForRequest(loaded, { ...group, runId: 19 }), null)
  assert.equal(projectionForRequest(loaded, { ...group, kind: 'teachers' }), null)
  assert.equal(projectionForRequest(loaded, { ...group, holderId: 2 }), null)
  assert.equal(projectionForRequest(loaded, null), null)
})

test('failed POST can retain the confirmed old result, but an inconsistent GET run is rejected', () => {
  const identity: ProjectionIdentity = { runId: 18, kind: 'groups', holderId: 1, holderName: '251-3210' }
  const loaded: LoadedProjection = { identity, schedule: response }
  // A failed launch does not change the selected saved run or holder.
  assert.equal(projectionForRequest(loaded, identity), loaded)
  const wrongRun = structuredClone(loaded)
  wrongRun.schedule.run!.id = 99
  assert.equal(projectionForRequest(wrongRun, identity), null)
})


test('bell profile labels are readable while manual profile names remain unchanged', () => {
  assert.equal(bellPatternLabel({ name: 'MOSCOW_DAY' }), 'Москва: дневные пары')
  assert.equal(bellPatternLabel({ name: 'Current', bell_schedule: { code: 'MOSCOW_EVENING' } }), 'Москва: вечерние пары')
  assert.equal(bellPatternLabel({ name: 'Историческая сетка' }), 'Историческая сетка')
})

test('a pre-wrapper HMR value does not crash or become a confirmed projection', () => {
  const oldShape = JSON.parse('{"run":{"id":18}}')
  assert.equal(projectionForRequest(oldShape, { runId: 18, kind: 'groups', holderId: 1, holderName: 'Группа' }), null)
})

const periods: GenerationOptions = {
  authentication_required: false, default_semester_id: 3,
  semesters: [2, 3].map((id) => ({ id, name: String(id), notice: '', groups: [], modules: [], patterns: [], teachers: [] })),
}

test('a new launch uses the recommended data set while explicit selections still work', () => {
  assert.equal(preferredGenerationSemester(periods, 0)?.id, 3)
  assert.equal(preferredGenerationSemester(periods, 2)?.id, 2)
  assert.equal(preferredGenerationSemester({ ...periods, default_semester_id: null }, 0)?.id, 2)
})

test('historical projection uses its saved period, independently of the new launch default', () => {
  const historical: LoadedProjection = {
    identity: { runId: 18, kind: 'groups', holderId: 1, holderName: '251-3210' }, schedule: response,
  }
  assert.equal(preferredGenerationSemester(periods, 0)?.id, 3)
  assert.equal(savedGenerationSemester(periods, 18, historical)?.id, 2)
  assert.equal(savedGenerationSemester(periods, 19, historical), undefined)
  assert.equal(savedGenerationSemester(periods, 18, null), undefined)
  const wrong = structuredClone(historical)
  wrong.schedule.run!.id = 19
  assert.equal(savedGenerationSemester(periods, 18, wrong), undefined)
})
