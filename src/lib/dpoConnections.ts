import type { DPOProgram, DPOMembership, DPOStudent } from './dpo'

/** DPO belongs to individuals, not every student in their main academic group. */
export function dpoConnections(programs: DPOProgram[], memberships: DPOMembership[], students: DPOStudent[],
  period: { semester: number; module: number | null; groupId: number }) {
  const groupStudents = students.filter(student => student.group === period.groupId)
  return programs.filter(program => program.semester === period.semester && program.module === period.module)
    .map(program => ({ program, students: groupStudents.filter(student => memberships.some(member => member.student === student.id && program.groups.includes(member.group))) }))
    .filter(connection => connection.students.length > 0)
}
