import test from 'node:test'
import assert from 'node:assert/strict'
import { dpoConnections } from '../src/lib/dpoConnections.ts'
import type { DPOProgram } from '../src/lib/dpo.ts'
const program = (id: number, module: number, groups: number[]): DPOProgram => ({ id, module, groups, semester: 1, name: `ДПО ${id}`, weeks: null, base_run: 29, description: '' })
test('generation links only DPO listeners of the displayed main group and period', () => {
  const students = [{ id: 61, full_name: 'А', group: 3, group_name: 'Основная А' }, { id: 62, full_name: 'Б', group: 9, group_name: 'Основная Б' }]
  const memberships = [{ id: 1, group: 4, student: 61 }, { id: 2, group: 4, student: 62 }, { id: 3, group: 5, student: 62 }]
  const programs = [program(1, 6, [4]), program(2, 5, [4]), program(3, 6, [5])]
  const result = dpoConnections(programs, memberships, students, { semester: 1, module: 6, groupId: 3 })
  assert.deepEqual(result.map(item => item.program.id), [1])
  assert.deepEqual(result[0].students.map(student => student.id), [61])
  assert.deepEqual(dpoConnections(programs, memberships, students, { semester: 2, module: 6, groupId: 3 }), [])
})
