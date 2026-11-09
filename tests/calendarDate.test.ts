import test from 'node:test'
import assert from 'node:assert/strict'
import { displayCalendarDate, parseCalendarDate, isCalendarDate } from '../src/lib/calendarDate.ts'

test('day/month/year is unambiguous and preserves the ISO contract', () => {
  assert.equal(parseCalendarDate('09/11/2026'), '2026-11-09')
  assert.equal(displayCalendarDate('2026-11-09'), '09/11/2026')
  assert.equal(parseCalendarDate('11/25/2026'), null)
  assert.equal(displayCalendarDate('09/1'), '09/1')
})
test('invalid dates cannot roll over into a different month', () => {
  assert.equal(parseCalendarDate('29/02/2028'), '2028-02-29')
  for (const value of ['29/02/2026', '31/04/2026', '00/11/2026', '01/01/0000', '09/11/26']) assert.equal(parseCalendarDate(value), null)
  assert.equal(isCalendarDate('2026-02-30'), false)
})
