import type { GenerationSettings } from './generationSettings'

export interface SemesterModuleResult {
  module_id: number; module_number: number; start_date: string; end_date: string
  run_id: number | null; status: string; required_hours: number | null; scheduled_hours: number | null
  scheduled_count: number; weekly_required_pairs: number; weekly_scheduled_pairs: number
  budget_seconds: number; message: string
}
export interface SemesterGeneration {
  id: number; semester: number; group: number; created_at: string; status: string
  modules: SemesterModuleResult[]; complete: boolean; totals_complete: boolean
  required_hours: number | null; scheduled_hours: number | null; scheduled_count: number
  settings_snapshot: GenerationSettings; solve_time_seconds: number; message: string
  coverage?: { start_date: string; end_date: string; gaps: { start_date: string; end_date: string }[]; calendar_complete: boolean | null }
}
