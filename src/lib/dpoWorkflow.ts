import { eligibleDPOBaseRuns } from './dpo.ts'
import type { DPOProgram, DPOGroup, DPOStudent, DPOMembership, DPODiscipline, DPORun } from './dpo'
export interface DPOSemester { id: number; name: string; start_date: string; weeks_count: number }
export interface DPOModule { id: number; semester: number; number: number; start_date: string; end_date: string; teaching_weeks: number }
export interface DPOBaseRun { id: number; semester: number; module: number | null; status: string }
export interface DPOCatalog {
  semesters: DPOSemester[]; modules: DPOModule[]; students: DPOStudent[]
  teachers: { id: number; full_name: string }[]; subjects: { id: number; name: string }[]
  groups: DPOGroup[]; programs: DPOProgram[]; disciplines: DPODiscipline[]; memberships: DPOMembership[]
  runs: DPOBaseRun[]; programRuns: Record<number, DPORun[]>
}
export interface DPOFormGroup { key: string; name: string; students: number[] }
export interface DPOFormDiscipline { key: string; subject: number; teacher: number; hours: number; format: 'ONLINE' | 'ONSITE' }
export interface DPOForm {
  name: string; semester: number; module: number; groups: DPOFormGroup[]; disciplines: DPOFormDiscipline[]
}
export interface SavedDPO { programId: number; groupIds: Record<string, number>; disciplineIds: Record<string, number> }
export interface DPOClient {
  get<T>(path: string): Promise<T>
  post<T>(path: string, body: unknown): Promise<T>
  patch<T>(path: string, body: unknown): Promise<T>
  delete(path: string): Promise<void>
}
export function dpoBaseRuns(catalog: DPOCatalog, form: Pick<DPOForm, 'semester' | 'module'>) {
  return eligibleDPOBaseRuns(catalog.runs, Object.values(catalog.programRuns).flat().map(run => run.id), form.semester, form.module)
    .sort((a, b) => b.id - a.id)
}
export function validateDPOForm(form: DPOForm, catalog: DPOCatalog, step: number): string | null {
  if (!form.name.trim()) return 'Укажите название программы.'
  const module = catalog.modules.find(item => item.id === form.module && item.semester === form.semester)
  if (!module || module.teaching_weeks < 1) return 'Выберите учебный модуль с заданным числом недель.'
  if (!dpoBaseRuns(catalog, form).length) return 'Для этого периода нет готового основного расписания. Сначала выполните расчёт в разделе «Генерация».'
  if (step >= 1 && (!form.groups.length || form.groups.some(group => !group.name.trim() || !group.students.length || group.students.some(id => !catalog.students.some(student => student.id === id && !catalog.groups.find(item => item.id === student.group)?.is_dpo))))) return 'Для каждой группы ДПО укажите название и выберите существующих студентов основного обучения.'
  if (step >= 2) {
    if (!form.disciplines.length) return 'Добавьте дисциплину.'
    if (new Set(form.disciplines.map(item => item.subject)).size !== form.disciplines.length) return 'Одна дисциплина может быть добавлена в программу только один раз.'
    for (const item of form.disciplines) {
      if (!catalog.subjects.some(subject => subject.id === item.subject) || !catalog.teachers.some(teacher => teacher.id === item.teacher)) return 'Выберите дисциплину и преподавателя из справочника.'
      if (!Number.isInteger(item.hours) || item.hours <= 0 || item.hours % (2 * module.teaching_weeks) !== 0) return `Объём должен делиться на ${2 * module.teaching_weeks} ак. ч.: сервер планирует целое число пар в каждую из ${module.teaching_weeks} учебных недель.`
    }
  }
  return null
}
/** IDs are retained after each confirmed write so a recoverable error does not duplicate rows. */
export async function saveDPOForm(client: DPOClient, form: DPOForm, catalog: DPOCatalog, saved: SavedDPO): Promise<number> {
  const problem = validateDPOForm(form, catalog, 3)
  if (problem) throw new Error(problem)
  const fields = { name: form.name.trim(), semester: form.semester, module: form.module, weeks: null,
    base_run: dpoBaseRuns(catalog, form)[0].id }
  if (!saved.programId) saved.programId = (await client.post<DPOProgram>('schedule/dpo-programs/', { ...fields, groups: [], description: '' })).id
  const programPath = `schedule/dpo-programs/${saved.programId}/`
  const current = await client.get<DPOProgram>(programPath)
  const module = catalog.modules.find(item => item.id === form.module)!
  if (current.semester !== form.semester || current.module !== form.module
    || current.weeks !== null && current.weeks !== module.teaching_weeks) {
    throw new Error('Период программы изменился или содержит отдельное число недель. Обновите данные; период автоматически не заменяется.')
  }
  // Preserve a valid explicitly chosen background source when editing a saved program.
  if (current.base_run && dpoBaseRuns(catalog, form).some(run => run.id === current.base_run)) fields.base_run = current.base_run
  for (const group of form.groups) {
    const id = saved.groupIds[group.key]
    const name = group.name.trim().startsWith('ДПО') ? group.name.trim() : `ДПО-${saved.programId}-${group.name.trim()}`.slice(0, 50)
    if (!id) saved.groupIds[group.key] = (await client.post<DPOGroup>('schedule/groups/', { name, semester: form.semester, is_dpo: true })).id
    else await client.patch(`schedule/groups/${id}/`, { name })
    const groupId = saved.groupIds[group.key]
    const memberships = await client.get<{ results: DPOMembership[]; next: string | null }>(`schedule/dpo-memberships/?group=${groupId}&page_size=1000`)
    if (memberships.next) throw new Error('Состав группы слишком большой для этого интерфейса. Изменения не завершены.')
    // Some API versions ignore the group filter, so always scope deletes locally too.
    const own = memberships.results.filter(item => item.group === groupId)
    for (const membership of own) if (!group.students.includes(membership.student)) await client.delete(`schedule/dpo-memberships/${membership.id}/`)
    for (const student of new Set(group.students)) if (!own.some(item => item.student === student)) await client.post('schedule/dpo-memberships/', { group: groupId, student })
  }
  await client.patch(programPath, { ...fields, groups: form.groups.map(group => saved.groupIds[group.key]) })
  const records = await client.get<{ results: DPODiscipline[]; next: string | null }>(`schedule/dpo-disciplines/?program=${saved.programId}&page_size=1000`)
  if (records.next) throw new Error('Список дисциплин слишком большой для этого интерфейса. Изменения не завершены.')
  for (const item of form.disciplines) {
    const body = { program: saved.programId, subject: item.subject, teacher: item.teacher, total_hours: item.hours, total_pairs: null, format: item.format }
    const id = saved.disciplineIds[item.key]
    if (id) await client.patch(`schedule/dpo-disciplines/${id}/`, body)
    else saved.disciplineIds[item.key] = (await client.post<DPODiscipline>('schedule/dpo-disciplines/', body)).id
  }
  const keep = new Set(form.disciplines.map(item => saved.disciplineIds[item.key]))
  for (const item of records.results) if (item.program === saved.programId && !keep.has(item.id)) await client.delete(`schedule/dpo-disciplines/${item.id}/`)
  return saved.programId
}
