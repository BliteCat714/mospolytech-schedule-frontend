import { useEffect, useRef, useState } from 'react'
import { CalendarSearch, Search } from 'lucide-react'
import { api, errText } from '../lib/api'
import { useAsync } from '../lib/useAsync'
import { Empty, ErrorBox, Loading } from '../components/Status'
import { freePeriodQuery, validateFreePeriodInput } from '../lib/activities'
import type { FreePeriodInput, FreePeriodsResponse } from '../lib/activities'

interface PublishedGroup { id: number; title: string }
const isoToday = () => { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}` }

export default function FreePeriods() {
  const groups = useAsync((signal) => api.get<PublishedGroup[]>('rasp/groups/', { with_lessons: 1 }, signal), [])
  const [search, setSearch] = useState('')
  const [input, setInput] = useState<FreePeriodInput>({ groups: [], dateFrom: isoToday(), dateTo: isoToday(), minFree: 1, limit: 20, includeSunday: false })
  const [result, setResult] = useState<{ key: string; data: FreePeriodsResponse } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const request = useRef<AbortController | null>(null)
  const key = JSON.stringify(input)
  useEffect(() => () => request.current?.abort(), [])
  function update(patch: Partial<FreePeriodInput>) {
    request.current?.abort(); request.current = null; setLoading(false); setError(null); setResult(null)
    setInput((old) => ({ ...old, ...patch }))
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault()
    const problem = validateFreePeriodInput(input)
    if (problem) { setError(problem); return }
    request.current?.abort()
    const controller = new AbortController(); request.current = controller
    setLoading(true); setError(null); setResult(null)
    try {
      const data = await api.get<FreePeriodsResponse>('events/free-periods/', freePeriodQuery(input), controller.signal)
      if (!controller.signal.aborted) setResult({ key, data })
    } catch (e) { if (!controller.signal.aborted) setError(errText(e)) }
    finally { if (request.current === controller) { setLoading(false); request.current = null } }
  }
  const visible = (groups.data ?? []).filter((group) => group.title.toLocaleLowerCase().includes(search.toLocaleLowerCase()))
  const current = result?.key === key ? result.data : null
  return <div className="max-w-5xl mx-auto space-y-5">
    <header><div className="flex items-center gap-2 text-accent text-xs font-semibold uppercase"><CalendarSearch size={16} /> Планирование мероприятий</div><h1 className="text-2xl font-bold mt-2">Свободные периоды</h1><p className="text-sm text-muted mt-2">Найдите время, когда больше выбранных групп свободны по опубликованному расписанию.</p></header>
    <div className="rounded-xl border border-border bg-surface-2 p-4 text-sm text-muted">Учитываются только опубликованные занятия групп. Выбранная ПД, физкультура, чётность недель и состав подгрупп не учитываются. Отсутствие занятий в источнике не подтверждает, что каждый студент свободен.</div>
    <form onSubmit={submit} className="card p-4 space-y-4">
      <div><label className="text-sm font-medium" htmlFor="free-group-search">Учебные группы · выбрано {input.groups.length} из 30</label><input id="free-group-search" className="generation-input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Найти по номеру группы" />
        {groups.loading ? <Loading text="Загружаем группы с опубликованными занятиями…" /> : groups.error ? <ErrorBox message={groups.error} onRetry={groups.reload} /> : <div className="mt-3 max-h-48 overflow-auto grid sm:grid-cols-3 gap-2">
          {visible.map((group) => <label key={group.id} className="flex items-center gap-2 rounded-lg border border-border p-2 text-sm"><input type="checkbox" checked={input.groups.includes(group.title)} disabled={!input.groups.includes(group.title) && input.groups.length >= 30} onChange={(e) => update({ groups: e.target.checked ? [...input.groups, group.title] : input.groups.filter((title) => title !== group.title) })} />{group.title}</label>)}
          {!visible.length && <p className="text-sm text-muted">Группы не найдены. Для поиска нужны импортированные занятия.</p>}
        </div>}
        {input.groups.length > 0 && <p className="text-xs text-muted mt-2">Выбраны: {input.groups.join(', ')}</p>}
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <label className="text-sm">С даты<input type="date" required className="generation-input" value={input.dateFrom} onChange={(e) => update({ dateFrom: e.target.value })} /></label>
        <label className="text-sm">По дату включительно<input type="date" required className="generation-input" value={input.dateTo} onChange={(e) => update({ dateTo: e.target.value })} /></label>
        <label className="text-sm">Минимум свободных групп<input type="number" min={1} max={Math.max(1, input.groups.length)} className="generation-input" value={input.minFree} onChange={(e) => update({ minFree: Number(e.target.value) })} /></label>
        <label className="text-sm">Количество результатов<input type="number" min={1} max={200} className="generation-input" value={input.limit} onChange={(e) => update({ limit: Number(e.target.value) })} /></label>
      </div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={input.includeSunday} onChange={(e) => update({ includeSunday: e.target.checked })} />Включить воскресенья</label>
      <button className="generation-primary flex items-center gap-2" disabled={loading || groups.loading || !groups.data?.length}><Search size={16} />{loading ? 'Ищем периоды…' : 'Найти свободное время'}</button>
    </form>
    {error && <ErrorBox message={error} />}
    {loading && <Loading text="Сопоставляем расписания групп…" />}
    {current && <section aria-live="polite" className="space-y-3"><h2 className="font-semibold">Найдено периодов: {current.periods.length}</h2><p className="text-xs text-muted">{current.date_from} — {current.date_to} · Сначала больше свободных групп, затем длиннее период и раньше начало.</p>
      {!current.periods.length && <Empty text="За выбранный период подходящих вариантов не найдено. Измените условия поиска." />}
      {current.periods.map((period, index) => <article key={`${period.date}-${period.pair_from}`} className="card p-4"><div className="flex flex-wrap justify-between gap-2"><h3 className="font-semibold">{index + 1}. {new Date(`${period.date}T12:00:00`).toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'long' })} · {period.start}–{period.end}</h3><span className="text-accent text-sm">Свободны {period.free_count} из {period.total}</span></div><p className="text-xs text-muted mt-1">{period.pair_from === period.pair_to ? `Пара ${period.pair_from}` : `Пары ${period.pair_from}–${period.pair_to}`}</p><p className="text-sm mt-3">Свободны: {period.free_groups.join(', ') || '—'}</p><p className="text-sm text-muted mt-1">Заняты: {period.busy_groups.join(', ') || 'нет по учтённому расписанию'}</p></article>)}
    </section>}
  </div>
}
