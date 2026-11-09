import { useState } from 'react'
import { Link } from 'react-router-dom'
import { dpoApi as api } from '../../lib/api'
import { useAsync } from '../../lib/useAsync'
import { dpoConnections } from '../../lib/dpoConnections'
import { dpoRunLabel } from '../../lib/dpo'
import type { DPOProgram, DPOMembership, DPOStudent, DPORun } from '../../lib/dpo'
import type { SavedRun } from '../../lib/generation'
import { Empty, ErrorBox, Loading } from '../Status'
import DPOSchedulePreview from './DPOSchedulePreview'

interface Props { run: SavedRun; groupId: number }
export default function GenerationDPOConnections({ run, groupId }: Props) {
  const [programId, setProgramId] = useState(0)
  const [studentId, setStudentId] = useState(0)
  const connections = useAsync(async signal => {
    const [programs, memberships, students] = await Promise.all([
      api.list<DPOProgram>('schedule/dpo-programs/', undefined, signal),
      api.list<DPOMembership>('schedule/dpo-memberships/', undefined, signal),
      api.list<DPOStudent>('schedule/students/', undefined, signal),
    ])
    return dpoConnections(programs, memberships, students, { semester: run.semester, module: run.module, groupId })
  }, [run.id, groupId])
  const connection = connections.data?.find(item => item.program.id === programId) ?? connections.data?.[0]
  const program = connection?.program
  const student = connection?.students.find(item => item.id === studentId) ?? connection?.students[0]
  const historyKey = program?.id ?? 0
  const [chosenRun, setChosenRun] = useState<{ programId: number; runId: number } | null>(null)
  // A program change must not temporarily reuse another program's retained history.
  const runData = useAsync(async signal => ({ programId: historyKey, items: historyKey
    ? await api.get<DPORun[]>(`schedule/dpo-programs/${historyKey}/runs/`, undefined, signal) : [] }), [historyKey])
  const items = runData.data?.programId === historyKey ? runData.data.items : []
  const selectedRun = items.find(item => chosenRun?.programId === historyKey && item.id === chosenRun.runId) ?? items[0]
  return <section id="generation-dpo" aria-label="ДПО слушателей учебной группы" className="rounded-2xl border border-border bg-surface p-4 sm:p-5 space-y-4">
    <div><h3 className="font-semibold text-lg">ДПО слушателей этой группы</h3><p className="text-xs text-muted mt-1">Сравните основное расписание с дополнительными занятиями конкретного студента.</p></div>
    {connections.loading ? <Loading /> : connections.error ? <ErrorBox message={connections.error} onRetry={connections.reload} /> : !connection ? <Empty text="У студентов этой группы нет сохранённых программ ДПО для выбранного периода." /> : <>
      <div className="grid sm:grid-cols-2 gap-3"><label className="text-sm">Программа ДПО<select className="generation-input" value={program!.id} onChange={event => { setProgramId(Number(event.target.value)); setStudentId(0) }}>{connections.data?.map(item => <option key={item.program.id} value={item.program.id}>{item.program.name}</option>)}</select></label><label className="text-sm">Слушатель<select className="generation-input" value={student?.id ?? 0} onChange={event => setStudentId(Number(event.target.value))}>{connection.students.map(item => <option key={item.id} value={item.id}>{item.full_name}</option>)}</select></label></div>
      {program!.base_run && program!.base_run !== run.id && <p className="text-sm text-muted">В настройках ДПО указан основной расчёт №{program!.base_run}. Здесь открыт №{run.id}: их совместный просмотр не означает, что ДПО пересчитано под новую версию.</p>}
      <Link className="inline-flex text-sm text-accent underline" to={`/dpo?program=${program!.id}&view=schedule&main_run=${run.id}${selectedRun ? `&run=${selectedRun.id}` : ''}${student ? `&student=${student.id}` : ''}`}>Открыть программу и расчёт ДПО</Link>
      {runData.loading ? <Loading /> : runData.error ? <ErrorBox message={runData.error} onRetry={runData.reload} /> : !selectedRun ? <Empty text="У этой программы ещё нет расчёта. Откройте ДПО и составьте расписание." /> : <>
        <label className="block text-sm">Расчёт ДПО<select className="generation-input" value={selectedRun.id} onChange={event => setChosenRun({ programId: historyKey, runId: Number(event.target.value) })}>{items.map(item => <option key={item.id} value={item.id}>№{item.id} · {dpoRunLabel(item.status)}</option>)}</select></label>
        {student && <DPOSchedulePreview key={`${student.id}:${run.id}:${selectedRun.id}`} student={student} mainRunId={run.id} dpoRunId={selectedRun.id} />}
      </>}
    </>}
  </section>
}
