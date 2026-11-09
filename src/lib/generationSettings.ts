export type RuleMode = 'preferred' | 'required'
export type DayCode = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'
export type RuleKey = 'earliest_start' | 'latest_end' | 'max_pairs_per_day' | 'max_break_minutes' | 'preferred_building' | 'max_consecutive_pairs' | 'min_pairs_per_day' | 'max_study_days' | 'max_building_changes'
export interface GenerationRule { value: string | number; mode: RuleMode }
export interface GenerationSettings {
  schema_version: 1
  rules: Partial<Record<RuleKey, GenerationRule>> & { free_days?: { day: DayCode; mode: RuleMode }[] }
  search: { time_limit_seconds: number; seed: number }
}
export const generationDays: { code: DayCode; short: string; name: string }[] = [
  { code: 'mon', short: 'Пн', name: 'Понедельник' }, { code: 'tue', short: 'Вт', name: 'Вторник' },
  { code: 'wed', short: 'Ср', name: 'Среда' }, { code: 'thu', short: 'Чт', name: 'Четверг' },
  { code: 'fri', short: 'Пт', name: 'Пятница' }, { code: 'sat', short: 'Сб', name: 'Суббота' }, { code: 'sun', short: 'Вс', name: 'Воскресенье' },
]
export const ruleDefinitions: { key: RuleKey; title: string; description: string; unit?: string; value: number | string; min?: number; max?: number; type?: 'time' | 'building'; additional?: boolean }[] = [
  { key: 'earliest_start', title: 'Начало учебного дня', description: 'Первое занятие студента должно начинаться не раньше указанного времени', value: '09:00', type: 'time' },
  { key: 'latest_end', title: 'Окончание учебного дня', description: 'Последнее занятие студента должно закончиться не позже указанного времени', value: '17:40', type: 'time' },
  { key: 'max_pairs_per_day', title: 'Максимум пар в день', description: 'Разные занятые номера пар, включая личную ПД', value: 4, min: 1, max: 12, unit: 'пар' },
  { key: 'max_break_minutes', title: 'Максимальный перерыв между парами', description: 'Ограничение для каждого отдельного перерыва, включая обычные перемены', value: 60, min: 0, max: 720, unit: 'мин' },
  { key: 'preferred_building', title: 'Корпус для очных занятий', description: 'Где проводить обычные пары; место закреплённой ПД остаётся прежним', value: 0, type: 'building' },
  { key: 'max_consecutive_pairs', title: 'Максимум пар подряд', description: 'Длина серии соседних занятых номеров', value: 3, min: 1, max: 12, unit: 'пар', additional: true },
  { key: 'min_pairs_per_day', title: 'Минимум пар в учебный день', description: 'Полностью свободный день разрешён', value: 2, min: 1, max: 12, unit: 'пар', additional: true },
  { key: 'max_study_days', title: 'Максимум учебных дней в неделю', description: 'Дни с общими занятиями или собственной ПД студента', value: 4, min: 1, max: 7, unit: 'дней', additional: true },
  { key: 'max_building_changes', title: 'Максимум переходов между корпусами', description: 'Сколько раз за день студент меняет корпус между очными занятиями', value: 1, min: 0, max: 12, unit: 'переходов', additional: true },
]
export function defaultGenerationSettings(): GenerationSettings {
  return { schema_version: 1, rules: { free_days: [{ day: 'sat', mode: 'preferred' }, { day: 'sun', mode: 'required' }] }, search: { time_limit_seconds: 30, seed: 17 } }
}
export function settingsSummary(settings: GenerationSettings | null | undefined, buildings: { id: number; name: string }[] = []): string[] {
  if (!settings?.rules) return []
  const result = (settings.rules.free_days ?? []).map((day) => `${generationDays.find((item) => item.code === day.day)?.name ?? day.day}: свободный день · ${day.mode === 'required' ? 'обязательно' : 'желательно'}`)
  for (const def of ruleDefinitions) {
    const rule = settings.rules[def.key]
    if (!rule) continue
    const value = def.type === 'building' ? buildings.find((item) => item.id === Number(rule.value))?.name ?? `Корпус ${rule.value}` : rule.value
    result.push(`${def.title}: ${value}${def.unit ? ` ${def.unit}` : ''} · ${rule.mode === 'required' ? 'обязательно' : 'желательно'}`)
  }
  return result
}
