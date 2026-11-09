import test from 'node:test'
import assert from 'node:assert/strict'
import { dpoDemoApi, demoStudents, demoTeachers, validateDemoProgram } from '../src/lib/dpoDemo.ts'
import type { DemoProgram } from '../src/lib/dpoDemo.ts'
const program = (): DemoProgram => ({ name: 'ДПО', start: '2026-11-09', end: '2026-11-14', groups: [{ id: 1, name: 'ДПО 1', students: [1, 3] }, { id: 2, name: 'ДПО 2', students: [1, 2] }], disciplines: [{ id: 1, title: 'Анализ данных', teacher: 1, hours: 12 }, { id: 2, title: 'Практика', teacher: 2, hours: 6 }] })
test('demo planning keeps main groups and avoids student, teacher and DPO group collisions', async () => {
  const input = program(), original = structuredClone(input), students = structuredClone(demoStudents)
  const result = await dpoDemoApi.plan(input)
  assert.equal(result.missing, 0)
  assert.equal(result.lessons.length, 18)
  const studentSlots = new Set<string>(), teacherSlots = new Set<string>(), groupSlots = new Set<string>()
  for (const lesson of result.lessons) {
    const day = new Date(`${lesson.date}T12:00:00Z`).getUTCDay()
    const slot = (day - 1) * 8 + lesson.pair, key = `${lesson.date}:${lesson.pair}`
    const group = input.groups.find(item => item.name === lesson.group)!
    const teacher = demoTeachers.find(item => item.name === lesson.teacher)!
    assert.ok(!teacher.busy.includes(slot))
    assert.ok(!teacherSlots.has(`${teacher.id}:${key}`))
    assert.ok(!groupSlots.has(`${group.id}:${key}`))
    teacherSlots.add(`${teacher.id}:${key}`); groupSlots.add(`${group.id}:${key}`)
    for (const id of group.students) {
      assert.ok(!demoStudents.find(student => student.id === id)!.busy.includes(slot))
      assert.ok(!studentSlots.has(`${id}:${key}`))
      studentSlots.add(`${id}:${key}`)
    }
  }
  assert.deepEqual(input, original)
  assert.deepEqual(demoStudents, students)
})
test('demo reports unplaced workload rather than claiming success when no day is available', async () => {
  const input = program(); input.start = '2026-11-15'; input.end = '2026-11-15'
  const result = await dpoDemoApi.plan(input)
  assert.equal(result.lessons.length, 0)
  assert.equal(result.missing, 18)
})
test('wizard requires individual listeners and whole pairs before planning', () => {
  const input = program(); input.groups[0].students = []
  assert.ok(validateDemoProgram(input, 1))
  input.groups[0].students = [1]; input.disciplines[0].hours = 3
  assert.ok(validateDemoProgram(input, 2))
})
test('a three-month program distributes nine pairs across the period instead of its first two days', async () => {
  const input: DemoProgram = { name: 'Анализ данных', start: '2026-11-09', end: '2027-02-09', groups: [{ id: 1, name: 'ДПО 1', students: [1] }], disciplines: [{ id: 1, title: 'Анализ данных', teacher: 1, hours: 18 }] }
  const result = await dpoDemoApi.plan(input)
  assert.equal(result.missing, 0)
  assert.equal(result.lessons.length, 9)
  assert.equal(new Set(result.lessons.map(lesson => lesson.date)).size, 9)
  const first = Date.parse(result.lessons[0].date), last = Date.parse(result.lessons.at(-1)!.date)
  assert.ok(last - first >= 60 * 86400000, 'lessons should cover the chosen period')
})
