export interface DPOProgram {
  id: number; name: string; semester: number; module: number | null; weeks: number | null
  groups: number[]; base_run: number | null; description: string
}
export interface DPODiscipline {
  id: number; program: number; subject: number; teacher: number; format: 'ONLINE' | 'ONSITE'
  total_hours: number | null; total_pairs: number | null; pairs_total: number
}
export interface DPOMembership { id: number; group: number; student: number }
export interface DPOGroup { id: number; name: string; semester: number | null; is_dpo: boolean }
export interface DPOStudent { id: number; full_name: string; group: number; group_name: string }
export interface DPORun { id: number; status: string; created_at: string; message: string; module: number | null }
export interface DPOPlanResult {
  run_id: number; status: string; scheduled_count: number; required_count: number; issue_count: number
  base_run_id: number | null; other_dpo_run_ids: number[]; background_classes: number
}

/** Keep unknowns explicit; only the server decides whether a period is plannable. */
export function dpoWeeklyPairs(totalPairs: number, weeks: number | null): number | null {
  return weeks && weeks > 0 && totalPairs > 0 && totalPairs % weeks === 0 ? totalPairs / weeks : null
}
export function dpoRunLabel(status: string): string {
  return ({ SOLVED: 'Нагрузка размещена', PARTIAL: 'Размещено частично', ERROR: 'Ошибка расчёта',
    FAILED: 'Расчёт не завершён', RUNNING: 'Выполняется' } as Record<string, string>)[status] ?? status
}

/** A DPO run cannot be the source for its own background occupancy. */
export function eligibleDPOBaseRuns<T extends { id: number; semester: number; module: number | null; status: string }>(
  runs: T[], dpoRunIds: number[], semester: number, module: number | null,
): T[] {
  const dpo = new Set(dpoRunIds)
  return runs.filter(run => run.semester === semester && run.module === module
    && (run.status === 'SOLVED' || run.status === 'PARTIAL') && !dpo.has(run.id))
}
