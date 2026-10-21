import { useMemo, useState } from 'react'
import { Check, Mail, Search, UserRound, X } from 'lucide-react'
import { api, errText } from '../lib/api'
import { clientId, DAY_NAMES } from '../lib/schedule'
import { matchesSearch } from '../lib/directory'
import type { PDDirection, PDEnrollment, PDProject, PDSlot } from '../lib/types'
import { useApp } from '../context/AppContext'
import { useAsync } from '../lib/useAsync'
import { Empty, ErrorBox, Loading } from '../components/Status'

/** «Пн 14:30–17:40 · Д307»: подряд идущие пары одного дня и аудитории объединяются. */
function scheduleLines(slots: PDSlot[]): string[] {
  const lines: { day: number; start: string; end: string; room: string }[] = []
  for (const s of [...slots].sort((a, b) => a.day_of_week - b.day_of_week || a.start.localeCompare(b.start))) {
    const last = lines[lines.length - 1]
    if (last && last.day === s.day_of_week && last.room === s.room) last.end = s.end
    else lines.push({ day: s.day_of_week, start: s.start, end: s.end, room: s.room })
  }
  return lines.map((l) => `${DAY_NAMES[l.day]} ${l.start}–${l.end}${l.room ? ` · ${l.room}` : ''}`)
}

export default function ProjectActivity() {
  const { user } = useApp()
  const group = user?.role === 'student' ? user.group : undefined
  const owner = clientId()
  const [direction, setDirection] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const directions = useAsync((signal) => api.get<PDDirection[]>('rasp/pd/directions/', undefined, signal), [])
  const projects = useAsync(
    (signal) => api.get<PDProject[]>('rasp/pd/projects/', undefined, signal), [])
  const mine = useAsync((signal) => api.get<PDEnrollment[]>('rasp/pd/enrollments/', { owner }, signal), [owner])
  const current = mine.data?.[0]

  const shown = useMemo(() => (projects.data ?? []).filter((p) =>
    (direction === null || p.direction === direction)
    && (!query.trim() || matchesSearch(`${p.title} ${p.teacher} ${p.direction}`, query))),
  [projects.data, direction, query])

  const choose = async (project: PDProject) => {
    if (busy) return
    setError(null)
    setBusy(true)
    try {
      await api.post('rasp/pd/enrollments/', { owner, group_title: group, project: project.id })
      mine.reload()
    } catch (e) {
      setError(errText(e))
    } finally {
      setBusy(false)
    }
  }

  const cancel = async () => {
    if (!current || busy) return
    setError(null)
    setBusy(true)
    try {
      await api.delete(`rasp/pd/enrollments/${current.id}/?owner=${owner}`)
      mine.reload()
    } catch (e) {
      setError(errText(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="w-full max-w-[1200px] mx-auto">
      <p className="text-[11px] uppercase tracking-wider text-muted mb-1">Раздел</p>
      <h1 className="text-2xl font-bold leading-tight mb-1">Проектная деятельность</h1>
      <p className="text-muted text-sm mb-6">
        Выберите проект. Выбор появится в вашем расписании; пересечения с парами и физкультурой не допускаются.
      </p>

      {current && (
        <div className="mb-5 p-4 rounded-xl border border-accent bg-accent-soft flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-accent font-semibold mb-1">Ваш проект</p>
            <p className="font-semibold">{current.project.title}</p>
            <p className="text-xs text-muted mt-1">{scheduleLines(current.project.slots).join(' · ')}</p>
          </div>
          <button onClick={cancel} disabled={busy}
            className="h-9 px-3 flex items-center gap-1.5 rounded-lg border border-border bg-surface text-sm hover:text-accent transition">
            <X size={14} />Отменить выбор
          </button>
        </div>
      )}

      {error && <div className="mb-4"><ErrorBox message={error} /></div>}
      {mine.error && <div className="mb-4"><ErrorBox message={mine.error} onRetry={mine.reload} /></div>}
      {directions.error && <ErrorBox message={directions.error} onRetry={directions.reload} />}
      {projects.error && <ErrorBox message={projects.error} onRetry={projects.reload} />}
      {(directions.loading || projects.loading) && <Loading />}

      {!projects.loading && !projects.error && (
        <>
          <div className="flex flex-wrap gap-2 mb-4">
            {[{ name: null as string | null, label: 'Все', count: projects.data?.length ?? 0 },
              ...(directions.data ?? []).map((d) => ({ name: d.name as string | null, label: d.name, count: d.count }))].map((d) => (
              <button key={d.label} onClick={() => setDirection(d.name)} aria-pressed={direction === d.name}
                className={`h-9 px-3 rounded-xl border text-sm transition ${direction === d.name
                  ? 'border-accent bg-accent-soft text-accent font-medium'
                  : 'border-border bg-surface hover:border-accent'}`}>
                {d.label} <span className="opacity-60">{d.count}</span>
              </button>
            ))}
          </div>
          <div className="relative mb-4 max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Название проекта или преподаватель…"
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-surface border border-border text-sm outline-none focus:border-accent transition" />
          </div>
          {shown.length === 0 && <Empty text="Проекты не найдены" />}
          <div className="grid md:grid-cols-2 gap-3">
            {shown.map((p) => {
              const active = current?.project.id === p.id
              return (
                <div key={p.id} className={`p-4 rounded-xl border bg-surface flex flex-col gap-2 ${active ? 'border-accent' : 'border-border'}`}>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-muted">{p.direction} · №{p.number}</p>
                    <p className="font-semibold text-sm leading-snug">{p.title}</p>
                  </div>
                  <p className="text-xs text-muted flex gap-1.5"><UserRound size={12} className="mt-0.5 shrink-0" />{p.teacher || 'Преподаватель не указан'}</p>
                  {p.contact && <p className="text-xs text-muted flex gap-1.5 break-all"><Mail size={12} className="mt-0.5 shrink-0" />{p.contact}</p>}
                  <ul className="text-sm space-y-0.5">
                    {scheduleLines(p.slots).map((line) => <li key={line}>{line}</li>)}
                  </ul>
                  {p.note && <p className="text-xs text-muted">Примечание: {p.note}</p>}
                  <button onClick={() => (active ? cancel() : choose(p))} disabled={busy}
                    className={`mt-auto h-9 rounded-lg text-sm flex items-center justify-center gap-1.5 transition ${active
                      ? 'bg-accent text-white'
                      : 'border border-border hover:border-accent hover:text-accent'}`}>
                    {active ? <><Check size={14} />Выбрано</> : 'Выбрать'}
                  </button>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
