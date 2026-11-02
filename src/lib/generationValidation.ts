import type { ValidationFinding } from './generation'

const ruleLabels: Record<string, string> = {
  free_days: 'Занятия в свободный день', earliest_start: 'Начало занятий', latest_end: 'Окончание занятий',
  max_pairs_per_day: 'Максимум пар в день', max_break_minutes: 'Максимум отдельного перерыва',
  preferred_building: 'Желаемый корпус', max_consecutive_pairs: 'Максимум пар подряд',
  min_pairs_per_day: 'Минимум пар в учебный день', max_study_days: 'Максимум учебных дней',
  max_building_changes: 'Максимум смен корпуса', room_unassigned: 'Нужно назначить аудиторию',
  capacity_unknown: 'Вместимость аудитории неизвестна', room_capacity: 'Недостаточная вместимость аудитории',
  attendee_overlap: 'Пересечение занятий у слушателей', teacher_overlap: 'Преподаватель занят',
  room_overlap: 'Аудитория занята', pd_travel_buffer: 'Запас времени на дорогу к ПД',
  ordinary_travel_buffer: 'Запас времени между локациями', room_location_unknown: 'Место аудитории неизвестно',
}
function displayValue(value: unknown, isClock: boolean): string {
  if (isClock && typeof value === 'number' && Number.isFinite(value)) {
    const minutes = Math.trunc(value)
    return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
  }
  return String(value)
}
export function findingText(item: ValidationFinding): string {
  const code = item.code || item.rule || ''
  const title = item.message || item.text || item.reason || ruleLabels[code] || 'Проверка расписания'
  if (code === 'free_days' || code === 'preferred_building') return title
  const isClock = code === 'earliest_start' || code === 'latest_end'
  return `${title}${item.actual != null ? ` · фактически: ${displayValue(item.actual, isClock)}` : ''}${item.limit != null ? ` · предел: ${displayValue(item.limit, isClock)}` : ''}`
}
