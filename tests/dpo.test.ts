import test from 'node:test'
import assert from 'node:assert/strict'
import { eligibleDPOBaseRuns } from '../src/lib/dpo.ts'

test('base source excludes DPO runs, different modules and unsuccessful results', () => {
  const runs = [
    { id: 1, semester: 3, module: 6, status: 'SOLVED' },
    { id: 2, semester: 3, module: 6, status: 'SOLVED' },
    { id: 3, semester: 3, module: 5, status: 'SOLVED' },
    { id: 4, semester: 3, module: null, status: 'SOLVED' },
    { id: 5, semester: 3, module: 6, status: 'ERROR' },
    { id: 6, semester: 4, module: 6, status: 'PARTIAL' },
    { id: 7, semester: 3, module: 6, status: 'PARTIAL' },
  ]
  assert.deepEqual(eligibleDPOBaseRuns(runs, [2], 3, 6).map(run => run.id), [1, 7])
  assert.deepEqual(eligibleDPOBaseRuns(runs, [2], 3, null).map(run => run.id), [4])
})
