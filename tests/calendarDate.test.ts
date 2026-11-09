import test from 'node:test'
import assert from 'node:assert/strict'
import { displayCalendarDate, isCalendarDate } from '../src/lib/calendarDate.ts'

test('module dates are displayed day/month/year independently of browser locale', () => {
  assert.equal(displayCalendarDate('2026-11-09'), '09/11/2026')
  assert.equal(displayCalendarDate('2027-02-09'), '09/02/2027')
})
test('invalid calendar dates cannot roll over into a different month', () => {
  assert.equal(isCalendarDate('2028-02-29'), true)
  for (const value of ['2026-02-29', '2026-04-31', '2026-11-00', '0000-01-01', '09/11/2026']) assert.equal(isCalendarDate(value), false)
})
