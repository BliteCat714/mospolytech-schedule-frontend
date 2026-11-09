import { useEffect, useState } from 'react'
import { checkWeek, compareSchedules } from '../lib/checker'
import type { Lesson, PairTime } from '../lib/types'

interface Props { lessons: Lesson[]; times: PairTime[]; week: Date; storageKey: string; demoBaseline?: Lesson[] }
function read(key: string): Lesson[] | null {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) || 'null')
    return Array.isArray(value) && value.every((l) => l && typeof l.title === 'string' && typeof l.place === 'string' && typeof l.dayOfWeek === 'number') ? value : null
  } catch { return null }
}
export default function ScheduleChecker({ lessons, times, week, storageKey, demoBaseline }: Props) {
  const key = `schedule-checker:v1:${storageKey}`
  const [baseline, setBaseline] = useState<Lesson[] | null>(() => read(key) ?? demoBaseline ?? null)
  const [storageError, setStorageError] = useState(false)
  const save = (value: Lesson[]) => {
    try { localStorage.setItem(key, JSON.stringify(value)); setStorageError(false) }
    catch { setStorageError(true) }
  }
  useEffect(() => {
    if (baseline === null) { save(lessons); setBaseline(lessons) }
  }, [lessons, baseline])
  const issues = checkWeek(lessons, times, week)
  const changes = baseline ? compareSchedules(baseline, lessons) : []
  return <details open={demoBaseline ? true : undefined} className="shrink-0 mb-3 rounded-xl border border-border bg-surface p-3 max-h-64 overflow-auto">
    <summary className="cursor-pointer text-sm font-semibold" aria-live="polite">
      Проверка расписания · {issues.length ? `${issues.length} замечаний за неделю` : 'Замечаний за неделю нет'}{changes.length ? ` · ${changes.length} изменений` : ''}
    </summary>
    <div className="text-sm mt-3 space-y-3">
      {demoBaseline && <button onClick={() => { save(demoBaseline); setBaseline(demoBaseline) }} className="px-3 py-2 rounded-lg border border-border hover:bg-accent-soft">Повторить демонстрацию изменений</button>}
      {storageError && <p role="status">Браузер не разрешил сохранить снимок. После закрытия страницы история может потеряться.</p>}
      <p className="text-xs text-muted">Проверяется выбранная неделя. Изменения сравниваются по всему загруженному расписанию с последним прочитанным снимком в этом браузере. Переходы проверяются только при известном корпусе.</p>
      {changes.length > 0 && <section><h2 className="font-semibold mb-2">Изменения расписания</h2><ul className="space-y-2">{changes.map((n, i) => <li key={i}><strong>{n.kind}:</strong> {n.text}</li>)}</ul>
        <button onClick={() => { save(lessons); setBaseline(lessons) }} className="mt-2 px-3 py-2 rounded-lg border border-border hover:bg-accent-soft">Прочитано</button></section>}
      <section><h2 className="font-semibold mb-2">Выбранная неделя</h2><ul className="space-y-2">{issues.map((n, i) => <li key={i}><strong>{n.kind}:</strong> {n.text}</li>)}</ul>{!issues.length && <p>Замечаний нет.</p>}</section>
    </div>
  </details>
}
