import { api } from './api'
import type { Group, ScheduleTarget, Teacher, User } from './types'
import { useAsync } from './useAsync'

export const targetKey = (target: ScheduleTarget) => `${target.kind}:${target.id}`
export const profileTarget = (user: User): ScheduleTarget => ({
  kind: user.role === 'student' ? 'group' : 'teacher', id: user.id, name: user.name,
})
export const matchesSearch = (text: string, query: string) => {
  const normalize = (value: string) => value.toLocaleLowerCase('ru').replaceAll('ё', 'е')
  const name = normalize(text)
  return normalize(query).trim().split(/\s+/).every((part) => name.includes(part))
}
export function useDirectory() {
  return useAsync(async (signal): Promise<ScheduleTarget[]> => {
    const [groups, teachers] = await Promise.all([
      api.list<Group>('groups/', undefined, signal),
      api.list<Teacher>('imported/teachers/', undefined, signal),
    ])
    return [
      ...groups.map((g): ScheduleTarget => ({ kind: 'group', id: g.id, name: g.name })),
      ...teachers.map((t): ScheduleTarget => ({ kind: 'teacher', id: t.id, name: t.full_name })),
    ]
  }, [])
}
