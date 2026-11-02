import type { SemesterGeneration } from '../lib/generationSemester'
import { periodLabel, shortDate } from '../lib/generationLabels'
import { runStatusLabel } from '../lib/generation'

interface Props { result: SemesterGeneration; selectedRunId: number | null; disabled?: boolean; onOpen: (id: number) => void }
export default function SemesterGenerationSummary({ result, selectedRunId, disabled, onOpen }: Props) {
  return <section aria-label="Расписание на весь семестр" className="rounded-2xl border border-accent/20 bg-accent-soft p-4 sm:p-5 space-y-4">
    <div className="flex flex-wrap justify-between gap-2"><div><h3 className="font-semibold">Расписание на весь семестр</h3><p className="text-sm text-muted mt-1">{result.complete ? 'Рассчитаны все заданные модули' : 'Некоторые модули рассчитаны не полностью'}{result.coverage ? ` · ${shortDate(result.coverage.start_date)} — ${shortDate(result.coverage.end_date)}` : ''}</p></div>
      <span className="generation-badge bg-surface text-accent">{result.totals_complete ? `${result.scheduled_hours} из ${result.required_hours} академических часов` : 'Полнота часов пока не подтверждена'}</span></div>
    <p className="text-xs text-muted leading-relaxed">В каждой части своё недельное расписание и своя нагрузка. Выберите даты для просмотра и ручных правок; занятия разных модулей не складываются в одну неделю.</p>
    {!!result.coverage?.gaps.length && <p className="text-xs text-amber-800 dark:text-amber-300">Между заданными периодами нет расписания: {result.coverage.gaps.map((gap) => `${shortDate(gap.start_date)} — ${shortDate(gap.end_date)}`).join(', ')}. Полнота календаря семестра не подтверждена.</p>}
    <div className="grid sm:grid-cols-2 gap-3">{result.modules.map((item) => <button type="button" key={item.module_id} className="generation-semester-part text-left" aria-pressed={selectedRunId === item.run_id && !!item.run_id} disabled={disabled || !item.run_id} onClick={() => item.run_id && onOpen(item.run_id)}>
      <span className="font-semibold text-sm block">{periodLabel({ number: item.module_number, start_date: item.start_date, end_date: item.end_date })}</span>
      <span className="text-xs text-muted block mt-2">{item.status === 'NOT_STARTED' ? 'Ещё не рассчитан' : runStatusLabel(item.status)} · {item.weekly_scheduled_pairs} из {item.weekly_required_pairs} пар в неделю</span>
      <span className="text-xs text-muted block mt-1">{item.required_hours != null ? `${item.scheduled_hours} из ${item.required_hours} академических часов` : 'Часы по модулю не подтверждены'}</span>
    </button>)}</div>
  </section>
}
