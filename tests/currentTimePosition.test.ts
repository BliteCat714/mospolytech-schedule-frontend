import assert from 'node:assert/strict'
import test from 'node:test'
import { currentTimePosition } from '../src/lib/schedule.ts'

const slots = [
  { start: '09:00', end: '10:30' },
  { start: '10:40', end: '12:10' },
  { start: '12:20', end: '13:05' },
]
const at = (hours: number, minutes: number) => new Date(2026, 10, 16, hours, minutes)

test('positions the marker within the displayed slot and across breaks', () => {
  assert.deepEqual(currentTimePosition(slots, at(9, 45)), { index: 0, rowFraction: 0.5, gapFraction: 0 })
  assert.deepEqual(currentTimePosition(slots, at(10, 35)), { index: 0, rowFraction: 1, gapFraction: 0.5 })
  assert.deepEqual(currentTimePosition(slots, at(10, 40)), { index: 1, rowFraction: 0, gapFraction: 0 })
  assert.deepEqual(currentTimePosition(slots, at(12, 35)), { index: 2, rowFraction: 1 / 3, gapFraction: 0 })
})

test('hides the marker outside the displayed time range', () => {
  assert.equal(currentTimePosition(slots, at(8, 59)), undefined)
  assert.equal(currentTimePosition(slots, at(13, 6)), undefined)
  assert.equal(currentTimePosition([], at(10, 0)), undefined)
})
