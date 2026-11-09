import assert from 'node:assert/strict'
import test from 'node:test'
import { eventDateLabel, freePeriodQuery, safeEventUrl, validateFreePeriodInput } from '../src/lib/activities.ts'
import type { FreePeriodInput } from '../src/lib/activities.ts'
const input: FreePeriodInput = { groups: ['241-3210'], dateFrom: '2026-11-01', dateTo: '2027-01-02', minFree: 1, limit: 20, includeSunday: false }

test('free period limits include both endpoints and validate actual calendar dates', () => {
  assert.equal(validateFreePeriodInput({ ...input, dateTo: '2027-01-01' }), null)
  assert.match(validateFreePeriodInput(input)!, /62/)
  assert.match(validateFreePeriodInput({ ...input, dateFrom: '2026-02-30' })!, /корректные даты/)
  assert.match(validateFreePeriodInput({ ...input, dateTo: '2026-10-31' })!, /не раньше/)
})
test('free period request requires groups and meaningful minimum', () => {
  assert.match(validateFreePeriodInput({ ...input, groups: [] })!, /групп/)
  assert.match(validateFreePeriodInput({ ...input, dateTo: '2026-11-02', minFree: 2 })!, /Минимум/)
})
test('free periods serializes backend contract without duplicate groups', () => {
  assert.deepEqual(freePeriodQuery({ ...input, groups: ['241-3210', '241-3210', '251-3210'], includeSunday: true }), {
    groups: '241-3210,251-3210', date_from: '2026-11-01', date_to: '2027-01-02', min_free: 1, limit: 20, include_sunday: 1,
  })
})
test('organizer URLs allow only fully qualified web links', () => {
  assert.equal(safeEventUrl('javascript:alert(1)'), null)
  assert.equal(safeEventUrl('data:text/html,test'), null)
  assert.equal(safeEventUrl('/relative'), null)
  assert.equal(safeEventUrl('https://mospolytech.ru/events'), 'https://mospolytech.ru/events')
})
test('unknown event date is not replaced with its announcement date', () => {
  assert.match(eventDateLabel({ date_start: null, date_end: null, announced_at: '2025-03-01', date_text: '' }), /Дата не уточнена · анонс/)
  assert.equal(eventDateLabel({ date_start: null, date_end: null, announced_at: null, date_text: 'Весна 2025' }), 'Весна 2025')
})
