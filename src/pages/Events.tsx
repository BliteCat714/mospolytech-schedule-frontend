import { useRef, useState } from 'react'
import { CalendarDays, ExternalLink, Plus } from 'lucide-react'
import { api, errText } from '../lib/api'
import { useAsync } from '../lib/useAsync'
import { Empty, ErrorBox, Loading } from '../components/Status'
import AdminAccess, { useAdminAccess } from '../components/AdminAccess'
import { eventAccessLabels, eventDateLabel, safeEventUrl } from '../lib/activities'
import type { UniversityEvent } from '../lib/activities'

const initialFilters = { q: '', scope: '', access: '', year: '', date_from: '', date_to: '' }
const initialEvent = { title: '', scope: 'university', access: 'unknown', date_start: '', date_end: '', announced_at: '', date_text: '', source: '', url: '', note: '' }

export default function Events() {
  const { authorized, version } = useAdminAccess()
  const [filters, setFilters] = useState(initialFilters)
  const key = JSON.stringify(filters)
  const invalidRange = filters.date_from && filters.date_to && filters.date_to < filters.date_from
  const data = useAsync(async (signal) => {
    if (invalidRange) return { key, events: [] as UniversityEvent[] }
    return { key, events: await api.list<UniversityEvent>('events/', Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== '')), signal) }
  }, [key, version])
  const events = data.data?.key === key ? data.data.events : []
  const [create, setCreate] = useState(initialEvent)
  const [json, setJson] = useState('')
  const [pending, setPending] = useState(false)
  const busy = useRef(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState<string | null>(null)
  async function mutate(action: () => Promise<string>) {
    if (!authorized || busy.current) return
    busy.current = true; setPending(true); setError(null); setMessage('')
    try { setMessage(await action()); data.reload() } catch (e) { setError(errText(e)) }
    finally { busy.current = false; setPending(false) }
  }
  function submitCreate(event: React.FormEvent) {
    event.preventDefault()
    if (!safeEventUrl(create.url)) { setError('Укажите полную ссылку http:// или https://.'); return }
    if (create.date_start && create.date_end && create.date_end < create.date_start) { setError('Дата окончания раньше даты начала.'); return }
    void mutate(async () => {
      const saved = await api.post<UniversityEvent>('events/', { ...create, title: create.title.trim(), date_start: create.date_start || null, date_end: create.date_end || null, announced_at: create.announced_at || null, is_published: true })
      setCreate(initialEvent)
      return `Мероприятие «${saved.title}» опубликовано.`
    })
  }
  function submitImport(event: React.FormEvent) {
    event.preventDefault()
    let document: unknown
    try { document = JSON.parse(json) } catch { setError('Не удалось прочитать JSON. Проверьте формат файла.'); return }
    if (!document || typeof document !== 'object' || !('events' in document) || !Array.isArray(document.events) || !('schema_version' in document) || document.schema_version !== 1) {
      setError('Ожидается объект с schema_version: 1 и массивом events.'); return
    }
    void mutate(async () => {
      const result = await api.post<{ created: number; updated: number; skipped: number }>('events/import/', document)
      return `Импорт завершён: создано ${result.created}, обновлено ${result.updated}, пропущено ${result.skipped}.`
    })
  }
  return <div className="max-w-5xl mx-auto space-y-5">
    <header><div className="flex items-center gap-2 text-accent text-xs font-semibold uppercase"><CalendarDays size={16} /> Внеучебная жизнь</div><h1 className="text-2xl font-bold mt-2">Мероприятия</h1><p className="text-muted text-sm mt-2">Каталог событий университета и города. Условия посещения уточняйте у организаторов.</p></header>
    <AdminAccess />
    {authorized && <a href="#event-management" className="inline-flex text-sm text-accent">Добавить или импортировать мероприятия ↓</a>}
    <form className="card p-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3" onSubmit={(e) => e.preventDefault()}>
      <label className="text-sm">Название<input className="generation-input" type="search" placeholder="Поиск мероприятий" value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} /></label>
      <label className="text-sm">Масштаб<select className="generation-input" value={filters.scope} onChange={(e) => setFilters({ ...filters, scope: e.target.value })}><option value="">Все события</option><option value="university">Университет</option><option value="city">Город</option></select></label>
      <label className="text-sm">Доступ<select className="generation-input" value={filters.access} onChange={(e) => setFilters({ ...filters, access: e.target.value })}><option value="">Любые условия</option>{Object.entries(eventAccessLabels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
      <label className="text-sm">Год<input className="generation-input" type="number" min={1900} max={9999} placeholder="Любой год" value={filters.year} onChange={(e) => setFilters({ ...filters, year: e.target.value })} /></label>
      <label className="text-sm">Не раньше<input className="generation-input" type="date" value={filters.date_from} onChange={(e) => setFilters({ ...filters, date_from: e.target.value })} /></label>
      <label className="text-sm">Не позже<input className="generation-input" type="date" value={filters.date_to} onChange={(e) => setFilters({ ...filters, date_to: e.target.value })} /></label>
      <div className="sm:col-span-2 lg:col-span-3 flex flex-wrap items-center justify-between gap-2"><p className="text-xs text-muted">Фильтр дат использует начало события; если оно неизвестно — дату анонса.</p><button type="button" className="text-sm text-accent" onClick={() => setFilters(initialFilters)}>Сбросить фильтры</button></div>
    </form>
    {invalidRange ? <ErrorBox message="Дата окончания фильтра раньше даты начала." /> : data.loading || data.data?.key !== key && !data.error ? <Loading text="Загружаем мероприятия…" /> : data.error ? <ErrorBox message={data.error} onRetry={data.reload} /> : <section className="space-y-3" aria-label="Каталог мероприятий">
      <p className="text-sm text-muted">Найдено: {events.length}</p>
      {!events.length && <Empty text="Мероприятий с такими условиями пока нет. Измените фильтры или добавьте данные через управление." />}
      {events.map((event) => { const url = safeEventUrl(event.url); return <article key={event.id} className="card p-4 space-y-2"><div className="flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-accent-soft text-accent px-2 py-1">{event.scope === 'university' ? 'Университет' : 'Город'}</span><span className="rounded-full bg-surface-2 text-muted px-2 py-1">{eventAccessLabels[event.access] ?? event.access}</span></div><h2 className="font-semibold text-lg">{event.title}</h2><p className="text-sm">{eventDateLabel(event)}</p>{event.date_start && event.date_text && <p className="text-xs text-muted">{event.date_text}</p>}{event.note && <p className="text-sm text-muted whitespace-pre-wrap">{event.note}</p>}{event.source && <p className="text-xs text-muted">Источник: {event.source}</p>}{url && <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-accent">Подробности у организатора <ExternalLink size={14} /></a>}</article> })}
    </section>}
    {authorized && <section id="event-management" className="space-y-3 scroll-mt-4"><h2 className="text-lg font-semibold">Управление каталогом</h2><p className="text-xs text-muted">Новые мероприятия публикуются в каталоге. Импорт обновляет записи с теми же ссылкой, названием и датой начала.</p>
      {error && <ErrorBox message={error} />}{message && <p role="status" className="rounded-xl border border-border p-3 text-sm text-accent">{message}</p>}
      <details className="card p-4"><summary className="cursor-pointer font-medium">Добавить мероприятие</summary><form onSubmit={submitCreate} className="mt-4"><fieldset disabled={pending} className="grid sm:grid-cols-2 gap-3">
        <label className="text-sm sm:col-span-2">Название<input required maxLength={300} className="generation-input" value={create.title} onChange={(e) => setCreate({ ...create, title: e.target.value })} /></label>
        <label className="text-sm">Масштаб<select className="generation-input" value={create.scope} onChange={(e) => setCreate({ ...create, scope: e.target.value })}><option value="university">Университет</option><option value="city">Город</option></select></label>
        <label className="text-sm">Условия посещения<select className="generation-input" value={create.access} onChange={(e) => setCreate({ ...create, access: e.target.value })}>{Object.entries(eventAccessLabels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
        <label className="text-sm">Дата начала<input type="date" className="generation-input" value={create.date_start} onChange={(e) => setCreate({ ...create, date_start: e.target.value })} /></label>
        <label className="text-sm">Дата окончания<input type="date" className="generation-input" value={create.date_end} onChange={(e) => setCreate({ ...create, date_end: e.target.value })} /></label>
        <label className="text-sm">Дата анонса<input type="date" className="generation-input" value={create.announced_at} onChange={(e) => setCreate({ ...create, announced_at: e.target.value })} /></label>
        <label className="text-sm">Уточнение даты<input maxLength={200} className="generation-input" value={create.date_text} onChange={(e) => setCreate({ ...create, date_text: e.target.value })} /></label>
        <label className="text-sm">Источник<input maxLength={200} className="generation-input" value={create.source} onChange={(e) => setCreate({ ...create, source: e.target.value })} /></label>
        <label className="text-sm">Ссылка организатора<input type="url" required maxLength={500} className="generation-input" value={create.url} onChange={(e) => setCreate({ ...create, url: e.target.value })} placeholder="https://…" /></label>
        <label className="text-sm sm:col-span-2">Примечание<textarea className="generation-input min-h-24" value={create.note} onChange={(e) => setCreate({ ...create, note: e.target.value })} /></label>
        <button className="generation-primary flex items-center gap-2 justify-center"><Plus size={16} />{pending ? 'Сохраняем…' : 'Опубликовать мероприятие'}</button>
      </fieldset></form></details>
      <details className="card p-4"><summary className="cursor-pointer font-medium">Импорт мероприятий из JSON</summary><form onSubmit={submitImport} className="space-y-3 mt-4"><p className="text-xs text-muted">Вставьте JSON: объект с schema_version: 1 и массивом events. В каждой записи нужны название title, масштаб scope (university или city) и ссылка url. Даты передаются как ГГГГ-ММ-ДД.</p><label className="text-sm block">Содержимое файла<textarea required disabled={pending} value={json} onChange={(e) => setJson(e.target.value)} className="generation-input min-h-48 font-mono" placeholder={'{"schema_version":1,"events":[]}'} /></label><button className="generation-primary" disabled={pending}>{pending ? 'Импортируем…' : 'Импортировать'}</button></form></details>
    </section>}
  </div>
}
