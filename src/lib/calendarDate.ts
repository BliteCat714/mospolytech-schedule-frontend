/** Keep ISO dates in contracts and display day/month/year independently of browser locale. */
export function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000')) return false
  const date = new Date(`${value}T12:00:00Z`)
  return Number.isFinite(+date) && date.toISOString().slice(0, 10) === value
}
export function displayCalendarDate(value: string): string {
  if (!isCalendarDate(value)) return value
  const [year, month, day] = value.split('-')
  return `${day}/${month}/${year}`
}
