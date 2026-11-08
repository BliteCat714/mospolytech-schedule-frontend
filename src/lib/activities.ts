export interface UniversityEvent {
  id: number
  scope: 'university' | 'city'
  title: string
  date_start: string | null
  date_end: string | null
  announced_at: string | null
  date_text: string
  access: string
  source: string
  url: string
  note: string
  is_published: boolean
}

export interface FreePeriod {
  date: string
  weekday: number
  pair_from: number
  pair_to: number
  start: string
  end: string
  free_count: number
  total: number
  free_groups: string[]
  busy_groups: string[]
}
export interface FreePeriodsResponse {
  groups: string[]
  date_from: string
  date_to: string
  periods: FreePeriod[]
}
export interface FreePeriodInput {
  groups: string[]
  dateFrom: string
  dateTo: string
  minFree: number
  limit: number
  includeSunday: boolean
}

function calendarDay(value: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const stamp = Date.parse(`${value}T00:00:00Z`)
  return Number.isFinite(stamp) && new Date(stamp).toISOString().slice(0, 10) === value ? stamp : null
}
export function validateFreePeriodInput(input: FreePeriodInput): string | null {
  const groups = [...new Set(input.groups)]
  if (groups.length < 1 || groups.length > 30) return 'Выберите от 1 до 30 групп.'
  const start = calendarDay(input.dateFrom), end = calendarDay(input.dateTo)
  if (start === null || end === null) return 'Укажите корректные даты начала и окончания.'
  if (end < start) return 'Дата окончания должна быть не раньше даты начала.'
  if ((end - start) / 86400000 + 1 > 62) return 'Период поиска — не более 62 дней включительно.'
  if (!Number.isInteger(input.minFree) || input.minFree < 1 || input.minFree > groups.length) return 'Минимум свободных групп должен быть от 1 до числа выбранных групп.'
  if (!Number.isInteger(input.limit) || input.limit < 1 || input.limit > 200) return 'Количество результатов — от 1 до 200.'
  return null
}
export function freePeriodQuery(input: FreePeriodInput) {
  return { groups: [...new Set(input.groups)].join(','), date_from: input.dateFrom, date_to: input.dateTo,
    min_free: input.minFree, limit: input.limit, include_sunday: input.includeSunday ? 1 : 0 }
}
export function safeEventUrl(value: string): string | null {
  try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) ? url.href : null } catch { return null }
}
export function eventDateLabel(event: Pick<UniversityEvent, 'date_start' | 'date_end' | 'announced_at' | 'date_text'>): string {
  const format = (value: string) => new Date(`${value}T12:00:00`).toLocaleDateString('ru-RU')
  if (event.date_start) return `${format(event.date_start)}${event.date_end && event.date_end !== event.date_start ? ` — ${format(event.date_end)}` : ''}`
  if (event.date_text) return event.date_text
  return event.announced_at ? `Дата не уточнена · анонс ${format(event.announced_at)}` : 'Дата не уточнена'
}
export const eventAccessLabels: Record<string, string> = {
  free: 'Свободный вход', registration: 'Нужна регистрация', online: 'Онлайн', students_only: 'Для студентов', unknown: 'Условия не уточнены',
}
