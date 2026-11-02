import type { GenerationSemester, SnapshotRoom } from './generation'

export function shortDate(value: string): string {
  return new Date(`${value}T12:00:00`).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }).replace(/\.$/, '')
}
export function periodLabel(period: { number: number; start_date: string; end_date: string; teaching_weeks?: number }): string {
  return `${period.number}-й модуль · ${shortDate(period.start_date)} — ${shortDate(period.end_date)}`
}
export function semesterLabel(semester: GenerationSemester): string {
  return semester.display_name || semester.name
}
export function groupLabel(name: string): string {
  return name.replace(/ · демо (?:без ПД|настроек)$/, ' · демо')
}
export function buildingLabel(room: Pick<SnapshotRoom, 'building_id' | 'building_name'> & { location_name?: string }): string {
  const name = room.building_name || String(room.building_id)
  return `${room.location_name ? `${room.location_name} · ` : ''}${/^\d+$/.test(name) ? `корпус ${name}` : name}`
}
export function teacherLabel(name: string): string {
  if (!name.includes(' · пример ')) return name
  return name.replace(/ · пример \d+$/, '').replace(/^Тестовый лектор$/, 'Лектор').replace(/^Тестовый преподаватель/, 'Преподаватель') + ' · демо'
}
