import { useEffect, useState } from 'react'
import { CalendarDays, ExternalLink, RefreshCw } from 'lucide-react'
import { api } from '../lib/api'
import { useAsync } from '../lib/useAsync'
import { Empty, ErrorBox, Loading } from '../components/Status'
import { eventAccessLabels, eventDateLabel, safeEventUrl } from '../lib/activities'
import type { UniversityEvent } from '../lib/activities'
import { loadPolytechAnnouncements } from '../lib/polytechEvents'

const livePreview = import.meta.env.DEV
export default function Events() {
  const [query, setQuery] = useState('')
  const data = useAsync(async signal => ({
    events: livePreview ? await loadPolytechAnnouncements(signal) : await api.list<UniversityEvent>('events/', undefined, signal),
    fetchedAt: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
  }), [])
  useEffect(() => {
    if (!livePreview) return
    const timer = window.setInterval(data.reload, 15 * 60 * 1000)
    return () => window.clearInterval(timer)
  }, [data.reload])
  const events = (data.data?.events ?? []).filter(event => event.title.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))
  return <div className="max-w-5xl mx-auto space-y-5">
    <header><div className="flex items-center gap-2 text-accent text-xs font-semibold uppercase"><CalendarDays size={16} /> Внеучебная жизнь</div><h1 className="text-2xl font-bold mt-2">Мероприятия</h1><p className="text-muted text-sm mt-2">{livePreview ? 'Последние анонсы с официального сайта Московского Политеха.' : 'Каталог событий университета и города.'} Условия посещения уточняйте у организаторов.</p></header>
    {livePreview && <div className="rounded-xl border border-border bg-surface-2 p-4 text-sm space-y-2"><p>Лента загружается при открытии страницы и обновляется каждые 15 минут. Показана первая страница сайта; даты ниже — даты публикации анонсов, а не проведения мероприятий.</p><a href="https://mospolytech.ru/events/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-accent">Все события на сайте Политеха <ExternalLink size={14} /></a></div>}
    <div className="flex flex-wrap items-end gap-3"><label className="text-sm flex-1 min-w-48">{livePreview ? 'Поиск среди загруженных анонсов' : 'Поиск мероприятий'}<input className="generation-input" type="search" placeholder="Название мероприятия" value={query} onChange={event => setQuery(event.target.value)} /></label><button type="button" className="generation-button" disabled={data.loading} onClick={data.reload}><RefreshCw size={15} />Обновить</button></div>
    {data.error && <ErrorBox message={data.error} onRetry={data.reload} />}
    {data.loading && <Loading text="Загружаем мероприятия…" />}
    {data.data && <section className="space-y-3" aria-label="Каталог мероприятий"><p className="text-sm text-muted">Найдено: {events.length} · {data.error ? 'Показана предыдущая загрузка' : 'Загружено'} в {data.data.fetchedAt}</p>
      {!events.length && !data.loading && <Empty text="Мероприятия не найдены. Попробуйте изменить поиск." />}
      {events.map(event => { const url = safeEventUrl(event.url); return <article key={event.url || event.id} className="card p-4 space-y-2">
        {!livePreview && <div className="flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-accent-soft text-accent px-2 py-1">{event.scope === 'university' ? 'Университет' : 'Город'}</span><span className="rounded-full bg-surface-2 text-muted px-2 py-1">{eventAccessLabels[event.access] ?? event.access}</span></div>}
        <h2 className="font-semibold text-lg">{event.title}</h2><p className="text-sm">{eventDateLabel(event)}</p>{event.note && <p className="text-sm text-muted whitespace-pre-wrap">{event.note}</p>}{event.source && <p className="text-xs text-muted">Источник: {event.source}</p>}{url && <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-accent">{livePreview ? 'Читать анонс на сайте Политеха' : 'Подробности у организатора'} <ExternalLink size={14} /></a>}
      </article> })}
    </section>}
  </div>
}
