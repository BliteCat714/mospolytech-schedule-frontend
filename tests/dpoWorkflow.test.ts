import test from 'node:test'
import assert from 'node:assert/strict'
import { dpoBaseRuns, saveDPOForm, validateDPOForm } from '../src/lib/dpoWorkflow.ts'
import type { DPOCatalog, DPOClient, DPOForm, SavedDPO } from '../src/lib/dpoWorkflow.ts'
const catalog = (): DPOCatalog => ({ semesters: [{ id: 1, name: 'Осень', start_date: '2026-09-01', weeks_count: 18 }],
  modules: [{ id: 2, semester: 1, number: 2, start_date: '2026-11-02', end_date: '2027-01-03', teaching_weeks: 9 }],
  students: [{ id: 10, full_name: 'Студент', group: 3, group_name: 'Основная' }], teachers: [{ id: 20, full_name: 'Преподаватель' }],
  subjects: [{ id: 30, name: 'Предмет' }], groups: [{ id: 3, name: 'Основная', semester: 1, is_dpo: false }],
  programs: [], disciplines: [], memberships: [], runs: [{ id: 40, semester: 1, module: 2, status: 'SOLVED' }, { id: 41, semester: 1, module: 2, status: 'SOLVED' }],
  programRuns: { 9: [{ id: 41, status: 'SOLVED', module: 2, created_at: '', message: '' }] } })
const form = (): DPOForm => ({ name: 'Программа', semester: 1, module: 2,
  groups: [{ key: 'group-a', name: 'Группа А', students: [10] }], disciplines: [{ key: 'subject-a', subject: 30, teacher: 20, hours: 18, format: 'ONLINE' }] })
test('real DPO form follows weekly backend contract and never chooses a DPO run as background', () => {
  const c = catalog(), f = form()
  assert.deepEqual(dpoBaseRuns(c, f).map(run => run.id), [40])
  assert.equal(validateDPOForm(f, c, 3), null)
  f.disciplines[0].hours = 20
  assert.match(validateDPOForm(f, c, 3)!, /18 ак. ч./)
  c.runs = []
  assert.match(validateDPOForm(form(), c, 3)!, /основного расписания/)
})
test('save sends original student IDs as memberships, scopes changes and resumes confirmed writes', async () => {
  const c = catalog(), f = form(), saved: SavedDPO = { programId: 0, groupIds: {}, disciplineIds: {} }
  const calls: { method: string; path: string; body?: unknown }[] = []
  let fail = true
  const members: { id: number; group: number; student: number }[] = [{ id: 100, group: 999, student: 10 }]
  let program = { id: 50, name: '', semester: 1, module: 2, groups: [], weeks: null, base_run: null, description: '' }
  const client: DPOClient = {
    async get<T>(path: string) {
      calls.push({ method: 'GET', path })
      if (path.includes('dpo-programs/')) return program as T
      if (path.includes('dpo-memberships/')) return { results: members, next: null } as T
      return { results: [], next: null } as T
    },
    async post<T>(path: string, body: unknown) {
      calls.push({ method: 'POST', path, body })
      if (path.includes('dpo-programs/')) return program as T
      if (path === 'schedule/groups/') return { id: 60 } as T
      if (path === 'schedule/dpo-memberships/') {
        if (fail) { fail = false; throw new Error('temporary failure') }
        members.push({ id: 101, group: 60, student: 10 }); return members.at(-1) as T
      }
      return { id: 70 } as T
    },
    async patch<T>(path: string, body: unknown) { calls.push({ method: 'PATCH', path, body }); if (path.includes('dpo-programs/')) program = { ...program, ...body as object }; return {} as T },
    async delete(path: string) { calls.push({ method: 'DELETE', path }) },
  }
  await assert.rejects(saveDPOForm(client, f, c, saved), /temporary failure/)
  assert.equal(saved.programId, 50); assert.equal(saved.groupIds['group-a'], 60)
  await saveDPOForm(client, f, c, saved)
  assert.equal(calls.filter(call => call.method === 'POST' && call.path === 'schedule/dpo-programs/').length, 1)
  assert.equal(calls.filter(call => call.method === 'POST' && call.path === 'schedule/groups/').length, 1)
  assert.ok(calls.some(call => call.method === 'POST' && call.path === 'schedule/dpo-memberships/' && JSON.stringify(call.body) === JSON.stringify({ group: 60, student: 10 })))
  assert.ok(!calls.some(call => call.path.startsWith('schedule/students/') && call.method !== 'GET'))
  assert.ok(!calls.some(call => call.method === 'DELETE' && call.path.includes('100')))
})
test('saving a stale form does not overwrite a different period or explicit week count', async () => {
  const saved: SavedDPO = { programId: 50, groupIds: {}, disciplineIds: {} }
  let writes = 0
  const client: DPOClient = {
    async get<T>() { return { id: 50, semester: 1, module: 2, weeks: 4 } as T },
    async post<T>() { writes++; return {} as T },
    async patch<T>() { writes++; return {} as T },
    async delete() { writes++ },
  }
  await assert.rejects(saveDPOForm(client, form(), catalog(), saved), /Период программы/)
  assert.equal(writes, 0)
})
