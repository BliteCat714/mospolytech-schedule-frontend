import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight, GraduationCap, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { dpoApi as api, errText } from '../lib/api'
import { useAsync } from '../lib/useAsync'
import { ErrorBox, Loading } from '../components/Status'
import DPOListeners from '../components/dpo/DPOListeners'
import DPOSchedulePreview from '../components/dpo/DPOSchedulePreview'
import { displayCalendarDate } from '../lib/calendarDate'
import { dpoRunLabel } from '../lib/dpo'
import type { DPOProgram, DPODiscipline, DPOMembership, DPOGroup, DPOStudent, DPORun, DPOPlanResult } from '../lib/dpo'
import type { GeneratedSchedule } from '../lib/generation'
import { dpoBaseRuns, saveDPOForm, validateDPOForm } from '../lib/dpoWorkflow'
import type { DPOCatalog, DPOForm, DPOSemester, DPOModule, DPOBaseRun, SavedDPO } from '../lib/dpoWorkflow'

const steps = ['Программа', 'Слушатели', 'Дисциплины', 'Расписание']
const days = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье']
async function loadCatalog(signal: AbortSignal): Promise<DPOCatalog> {
  const [semesters, modules, students, teachers, subjects, groups, programs, disciplines, memberships, runs] = await Promise.all([
    api.list<DPOSemester>('schedule/semesters/', undefined, signal),
    api.list<DPOModule>('schedule/modules/', undefined, signal),
    api.list<DPOStudent>('schedule/students/', undefined, signal),
    api.list<{ id: number; full_name: string }>('schedule/teachers/', undefined, signal),
    api.list<{ id: number; name: string }>('schedule/subjects/', undefined, signal),
    api.list<DPOGroup>('schedule/groups/', undefined, signal),
    api.list<DPOProgram>('schedule/dpo-programs/', undefined, signal),
    api.list<DPODiscipline>('schedule/dpo-disciplines/', undefined, signal),
    api.list<DPOMembership>('schedule/dpo-memberships/', undefined, signal),
    api.list<DPOBaseRun>('schedule/runs/', undefined, signal),
  ])
  const programRuns = Object.fromEntries(await Promise.all(programs.map(async program => [program.id,
    await api.get<DPORun[]>(`schedule/dpo-programs/${program.id}/runs/`, undefined, signal)] as const)))
  return { semesters, modules, students, teachers, subjects, groups, programs, disciplines, memberships, runs, programRuns }
}
export default function DPO() {
  const catalog = useAsync(loadCatalog, [])
  const [busy, setBusy] = useState(false)
  const [selectedId, setSelectedId] = useState<number | null>(() => {
    const value = new URLSearchParams(window.location.search).get('program')
    const id = Number(value)
    return value !== null && Number.isSafeInteger(id) && id >= 0 ? id : null
  })
  const [lastResult, setLastResult] = useState<{ programId: number; plan: DPOPlanResult } | null>(null)
  if (catalog.loading) return <Loading text="Загружаем программы и справочники генератора…" />
  if (catalog.error) return <ErrorBox message={`Не удалось подключиться к генератору. ${catalog.error}`} onRetry={catalog.reload} />
  if (!catalog.data) return null
  const selected = selectedId === 0 ? 0 : catalog.data.programs.some(item => item.id === selectedId) ? selectedId! : catalog.data.programs[0]?.id ?? 0
  const existing = catalog.data.programs.find(item => item.id === selected)
  const existingModule = catalog.data.modules.find(item => item.id === existing?.module)
  const unsupportedPeriod = existing && (!existingModule || existing.module === null
    || existing.weeks !== null && existing.weeks !== existingModule.teaching_weeks)
  return <div className="max-w-5xl mx-auto space-y-5 pb-6">
    <header><p className="flex items-center gap-2 text-xs font-semibold text-accent"><GraduationCap size={16} />ДОПОЛНИТЕЛЬНОЕ ОБУЧЕНИЕ</p><h1 className="text-2xl font-bold mt-2">Составить расписание ДПО</h1><p className="text-sm text-muted mt-2">Соберите слушателей из основных групп и спланируйте дополнительные занятия.</p></header>
    <div className="flex flex-wrap items-end gap-3"><label className="text-sm flex-1">Программа<select className="generation-input" disabled={busy} value={selected} onChange={event => { setSelectedId(Number(event.target.value)); setLastResult(null) }}><option value={0}>Новая программа</option>{catalog.data.programs.map(program => <option key={program.id} value={program.id}>{program.name}</option>)}</select></label><button type="button" className="generation-button" disabled={busy} onClick={catalog.reload}><RefreshCw size={15} />Обновить</button></div>
    {unsupportedPeriod ? <ErrorBox message="В этом интерфейсе поддержаны программы по модулям с числом недель из модуля. Период существующей программы автоматически не меняется." /> : <DPOEditor key={selected} onBusyChange={setBusy} catalog={catalog.data} existing={existing}
      lastResult={lastResult?.programId === selected ? lastResult.plan : null}
      onPlanned={(programId, plan) => { setSelectedId(programId); setLastResult({ programId, plan }); catalog.reload() }} />}
  </div>
}
function DPOEditor({ catalog, existing, lastResult, onPlanned, onBusyChange }: { onBusyChange: (busy: boolean) => void; catalog: DPOCatalog; existing?: DPOProgram; lastResult: DPOPlanResult | null; onPlanned: (programId: number, plan: DPOPlanResult) => void }) {
  const initialModule = catalog.modules.find(module => module.id === existing?.module)
    ?? [...catalog.modules].reverse().find(module => dpoBaseRuns(catalog, { semester: module.semester, module: module.id }).length)
    ?? catalog.modules[0]
  const existingGroups = catalog.groups.filter(group => existing?.groups.includes(group.id))
  const existingDisciplines = catalog.disciplines.filter(item => item.program === existing?.id)
  const saved = useRef<SavedDPO>({ programId: existing?.id ?? 0,
    groupIds: Object.fromEntries(existingGroups.map(group => [`group-${group.id}`, group.id])),
    disciplineIds: Object.fromEntries(existingDisciplines.map(item => [`discipline-${item.id}`, item.id])) })
  const [form, setForm] = useState<DPOForm>(() => ({ name: existing?.name ?? '', semester: existing?.semester ?? initialModule?.semester ?? 0,
    module: existing?.module ?? initialModule?.id ?? 0,
    groups: existingGroups.length ? existingGroups.map(group => ({ key: `group-${group.id}`, name: group.name,
      students: catalog.memberships.filter(item => item.group === group.id).map(item => item.student) })) : [{ key: 'new-group-1', name: 'Группа 1', students: [] }],
    disciplines: existingDisciplines.length ? existingDisciplines.map(item => ({ key: `discipline-${item.id}`, subject: item.subject, teacher: item.teacher,
      hours: item.total_hours ?? (item.total_pairs ?? 0) * 2, format: item.format })) : [{ key: 'new-discipline-1', subject: 0, teacher: 0, hours: (initialModule?.teaching_weeks ?? 1) * 2, format: 'ONLINE' }],
  }))
  const [step, setStep] = useState(lastResult || existing && new URLSearchParams(window.location.search).get('view') === 'schedule' ? 3 : 0)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const busy = useRef(false)
  const nextId = useRef(2)
  const [savedId, setSavedId] = useState(existing?.id ?? 0)
  const [runId, setRunId] = useState(() => {
    const requested = Number(new URLSearchParams(window.location.search).get('run'))
    const items = catalog.programRuns[existing?.id ?? 0] ?? []
    return lastResult?.run_id ?? items.find(item => item.id === requested)?.id ?? items[0]?.id ?? 0
  })
  const [previewStudentId, setPreviewStudentId] = useState(() => Number(new URLSearchParams(window.location.search).get('student')) || 0)
  const [viewGroup, setViewGroup] = useState(() => catalog.memberships.find(item => item.student === previewStudentId && existingGroups.some(group => group.id === item.group))?.group ?? existingGroups[0]?.id ?? 0)
  const runs = useAsync(signal => savedId ? api.get<DPORun[]>(`schedule/dpo-programs/${savedId}/runs/`, undefined, signal) : Promise.resolve([]), [savedId])
  const projection = useAsync(async signal => runId && viewGroup ? { runId, groupId: viewGroup,
    schedule: await api.get<GeneratedSchedule>(`schedule/schedule/groups/${viewGroup}/`, { run_id: runId }, signal) } : null, [runId, viewGroup])
  const schedule = projection.data?.runId === runId && projection.data?.groupId === viewGroup ? projection.data.schedule : null
  const period = catalog.modules.find(module => module.id === form.module)
  const baseRun = dpoBaseRuns(catalog, form).find(run => run.id === existing?.base_run) ?? dpoBaseRuns(catalog, form)[0]
  const comparisonRun = dpoBaseRuns(catalog, form).find(run => run.id === Number(new URLSearchParams(window.location.search).get('main_run'))) ?? baseRun
  const hasHistory = !!catalog.programRuns[existing?.id ?? 0]?.length
  const students = catalog.students.filter(student => !catalog.groups.find(item => item.id === student.group)?.is_dpo)
  const previewStudents = students.filter(student => catalog.memberships.some(item => item.group === viewGroup && item.student === student.id))
  const previewStudent = previewStudents.find(student => student.id === previewStudentId)
  const uniqueStudents = new Set(form.groups.flatMap(item => item.students)).size
  function update(patch: Partial<DPOForm>) { if (busy.current) return; setForm(old => ({ ...old, ...patch })); setError(null) }
  function move(target: number) {
    if (busy.current) return
    if (target > step) { const problem = validateDPOForm(form, catalog, step); if (problem) { setError(problem); return } }
    setError(null); setStep(target)
  }
  async function plan() {
    if (busy.current) return
    const problem = validateDPOForm(form, catalog, 3)
    if (problem) { setError(problem); return }
    busy.current = true; setPending(true); onBusyChange(true); setError(null)
    try {
      const programId = await saveDPOForm(api, form, catalog, saved.current)
      setSavedId(programId)
      const result = await api.post<DPOPlanResult>(`schedule/dpo-programs/${programId}/plan/`, { time_limit_seconds: 30, seed: 17 }, { timeoutMs: 65000 })
      onPlanned(programId, result)
    } catch (event) { setSavedId(saved.current.programId); setError(errText(event)); runs.reload() }
    finally { busy.current = false; setPending(false); onBusyChange(false) }
  }
  return <>
    <p className="rounded-xl border border-border bg-surface-2 p-3 text-xs text-muted">Расчёт выполняет генератор по данным локальной базы. Состав студентов и часть справочников в ней тестовые. Учитывается сохранённое основное расписание, а не опубликованная лента rasp.</p>
    {!!runId && step !== 3 && <button type="button" className="generation-button" onClick={() => { setError(null); setStep(3) }}>Посмотреть расписание ДПО</button>}
    <ol className="grid grid-cols-2 sm:grid-cols-4 gap-2" aria-label="Этапы программы">{steps.map((label, index) => <li key={label}><button type="button" disabled={index > step || pending} aria-current={index === step ? 'step' : undefined} onClick={() => move(index)} className={`w-full flex items-center gap-2 rounded-xl border p-3 text-sm text-left ${index === step ? 'border-accent bg-accent-soft text-accent' : 'border-border text-muted'} disabled:opacity-50`}><span>{index + 1}.</span>{label}</button></li>)}</ol>
    {error && <ErrorBox message={error} />}
    <section className="card p-5 space-y-5" aria-label={steps[step]}>
      {step === 0 && <><h2 className="font-semibold text-lg">Что будем планировать?</h2>
        <label className="block text-sm">Название программы<input className="generation-input" value={form.name} maxLength={200} onChange={event => update({ name: event.target.value })} placeholder="Например, основы анализа данных" /></label>
        <label className="block text-sm">Период обучения<select className="generation-input" disabled={!!existing} value={form.module} onChange={event => { const module = catalog.modules.find(item => item.id === Number(event.target.value)); update({ module: module?.id ?? 0, semester: module?.semester ?? 0 }) }}>
          <option value={0}>Выберите учебный модуль</option>{catalog.modules.map(module => <option key={module.id} value={module.id}>{catalog.semesters.find(item => item.id === module.semester)?.name} · модуль {module.number} · {module.teaching_weeks} учебных недель</option>)}
        </select></label>
        {period && <p className="text-sm">{displayCalendarDate(period.start_date)} — {displayCalendarDate(period.end_date)} · {period.teaching_weeks} учебных недель</p>}
        <p className="text-xs text-muted">Генератор составляет повторяющуюся учебную неделю для выбранного модуля. Произвольный диапазон дат пока не поддерживается.</p>
        <p className="text-sm text-muted">{baseRun ? `Основная занятость: сохранённое расписание №${baseRun.id}. Его занятия останутся на своих местах.` : 'Основное расписание этого периода ещё не рассчитано. Сначала выполните расчёт в разделе «Генерация».'}</p>
      </>}
      {step === 1 && <DPOListeners groups={form.groups} students={students}
        onChange={groups => update({ groups })}
        canRemoveGroup={key => !hasHistory || !saved.current.groupIds[key]}
        onAddGroup={() => {
          const key = `new-group-${nextId.current++}`
          update({ groups: [...form.groups, { key, name: `Группа ${form.groups.length + 1}`, students: [] }] })
          return key
        }} />}
      {step === 2 && <><div><h2 className="font-semibold text-lg">Что будут изучать?</h2><p className="text-sm text-muted mt-1">Объём каждой дисциплины задаётся на каждую группу. Одна пара — два академических часа.</p></div>
        {form.disciplines.map((item, index) => <div key={item.key} className="rounded-xl border border-border p-4 space-y-3"><div className="flex justify-between items-center"><h3 className="text-sm font-medium">Дисциплина {index + 1}</h3>{form.disciplines.length > 1 && <button type="button" className="generation-button" disabled={hasHistory && !!saved.current.disciplineIds[item.key]} title="Дисциплину с сохранённым расписанием нельзя удалить" aria-label={`Удалить дисциплину ${index + 1}`} onClick={() => update({ disciplines: form.disciplines.filter(entry => entry.key !== item.key) })}><Trash2 size={14} /></button>}</div>
          <label className="block text-sm">Дисциплина<select className="generation-input" value={item.subject} onChange={event => update({ disciplines: form.disciplines.map(entry => entry.key === item.key ? { ...entry, subject: Number(event.target.value) } : entry) })}><option value={0}>Выберите дисциплину</option>{catalog.subjects.map(subject => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></label>
          <div className="grid sm:grid-cols-3 gap-3"><label className="text-sm">Преподаватель<select className="generation-input" value={item.teacher} onChange={event => update({ disciplines: form.disciplines.map(entry => entry.key === item.key ? { ...entry, teacher: Number(event.target.value) } : entry) })}><option value={0}>Выберите преподавателя</option>{catalog.teachers.map(teacher => <option key={teacher.id} value={teacher.id}>{teacher.full_name}</option>)}</select></label>
            <label className="text-sm">Всего академических часов<input type="number" min={2} step={2} className="generation-input" value={item.hours || ''} onChange={event => update({ disciplines: form.disciplines.map(entry => entry.key === item.key ? { ...entry, hours: Number(event.target.value) } : entry) })} /></label>
            <label className="text-sm">Формат<select className="generation-input" value={item.format} onChange={event => update({ disciplines: form.disciplines.map(entry => entry.key === item.key ? { ...entry, format: event.target.value as 'ONLINE' | 'ONSITE' } : entry) })}><option value="ONLINE">Онлайн</option><option value="ONSITE">Очно</option></select></label></div>
          <p className="text-xs text-muted">{period && item.hours > 0 && item.hours % (2 * period.teaching_weeks) === 0 ? `Пар в неделю: ${item.hours / (2 * period.teaching_weeks)} · учебных недель: ${period.teaching_weeks}` : `Для этого периода объём должен делиться на ${(period?.teaching_weeks ?? 0) * 2} ак. ч. без остатка.`}</p>
        </div>)}<button type="button" className="generation-button" onClick={() => update({ disciplines: [...form.disciplines, { key: `new-discipline-${nextId.current++}`, subject: 0, teacher: 0, hours: (period?.teaching_weeks ?? 1) * 2, format: 'ONLINE' }] })}><Plus size={14} />Добавить дисциплину</button>
      </>}
      {step === 3 && <><div><h2 className="font-semibold text-lg">{form.name}</h2><p className="text-sm text-muted mt-1">{period && `${displayCalendarDate(period.start_date)} — ${displayCalendarDate(period.end_date)}`} · слушателей: {uniqueStudents} · групп ДПО: {form.groups.length}</p></div>
        <ul className="text-sm space-y-2">{form.disciplines.map(item => <li key={item.key}>{catalog.subjects.find(subject => subject.id === item.subject)?.name} · {item.hours} ак. ч. на группу · {catalog.teachers.find(teacher => teacher.id === item.teacher)?.full_name}</li>)}</ul>
        <button type="button" className="generation-primary" disabled={pending} onClick={() => void plan()}>{pending ? 'Сохраняем программу и рассчитываем…' : runId ? 'Пересчитать расписание' : 'Составить расписание'}</button>
        <p className="text-xs text-muted">Результат сохраняется отдельным запуском. Основные пары не перемещаются. Показана повторяющаяся учебная неделя, а не календарь отдельных дат. После изменения основного расписания нужен новый расчёт ДПО.</p>
        {lastResult && <p role="status" className="text-sm">Расчёт №{lastResult.run_id}: {dpoRunLabel(lastResult.status)} · размещено {lastResult.scheduled_count} из {lastResult.required_count} пар в неделю. Учтено фоновых пар: {lastResult.background_classes}, других программ ДПО: {lastResult.other_dpo_run_ids.length}.</p>}
        {comparisonRun && baseRun && comparisonRun.id !== baseRun.id && <p className="text-xs text-muted">Открыто сравнение с основным расчётом №{comparisonRun.id}. В настройках программы источник №{baseRun.id}; просмотр не меняет его автоматически.</p>}
        {comparisonRun && <Link className="inline-flex text-sm text-accent underline" to={`/generation?run=${comparisonRun.id}${previewStudent ? `&group=${previewStudent.group}` : ''}`}>Открыть основное расписание в «Генерации»</Link>}
        {!!savedId && <div className="space-y-3"><div className="flex flex-wrap items-end gap-3"><label className="text-sm flex-1">Сохранённый расчёт<select disabled={pending} className="generation-input" value={runId} onChange={event => setRunId(Number(event.target.value))}><option value={0}>Выберите расчёт</option>{runs.data?.map(run => <option key={run.id} value={run.id}>№{run.id} · {dpoRunLabel(run.status)} · {new Date(run.created_at).toLocaleString('ru-RU')}</option>)}</select></label><button type="button" className="generation-button" disabled={pending} onClick={runs.reload}>Проверить результат</button></div>
          <label className="block text-sm">Группа ДПО<select disabled={pending} className="generation-input" value={viewGroup} onChange={event => { setViewGroup(Number(event.target.value)); setPreviewStudentId(0) }}>{existingGroups.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          {!!runId && !!comparisonRun && <label className="block text-sm">Посмотреть вместе с основными занятиями слушателя<select className="generation-input" disabled={pending} value={previewStudent?.id ?? 0} onChange={event => setPreviewStudentId(Number(event.target.value))}><option value={0}>Только расписание группы ДПО</option>{previewStudents.map(student => <option key={student.id} value={student.id}>{student.full_name} · {student.group_name}</option>)}</select></label>}
          {previewStudent && comparisonRun && !!runId && <DPOSchedulePreview key={`${previewStudent.id}:${comparisonRun.id}:${runId}`} student={previewStudent} mainRunId={comparisonRun.id} dpoRunId={runId} />}
          {runs.error && <ErrorBox message={runs.error} onRetry={runs.reload} />}
          {projection.loading && <Loading />}{projection.error && <ErrorBox message={projection.error} onRetry={projection.reload} />}
          {schedule && <div className="space-y-3"><p className="text-sm font-medium">{dpoRunLabel(schedule.run?.status ?? '')} · пар в неделю для группы: {schedule.scheduled_classes.length}</p>{schedule.run?.message && !['SOLVED', 'PARTIAL'].includes(schedule.run.status) && <p className="text-xs text-muted">{schedule.run.message}</p>}{schedule.issues.map(issue => <p key={issue.id} className="text-sm text-amber-700 dark:text-amber-300">{issue.text}</p>)}
            <div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead className="text-xs text-muted"><tr><th className="p-2">День</th><th className="p-2">Время</th><th className="p-2">Занятие</th><th className="p-2">Преподаватель</th><th className="p-2">Место</th></tr></thead><tbody>{[...schedule.scheduled_classes].sort((a, b) => a.slot_day - b.slot_day || a.slot_lesson_number - b.slot_lesson_number).map(lesson => <tr key={lesson.id} className="border-t border-border"><td className="p-2">{days[lesson.slot_day]}</td><td className="p-2 whitespace-nowrap">{lesson.slot_start_time?.slice(0, 5)}–{lesson.slot_end_time?.slice(0, 5)}</td><td className="p-2">{lesson.subject_name}</td><td className="p-2">{lesson.teacher_name}</td><td className="p-2">{lesson.format === 'ONLINE' ? 'Онлайн' : lesson.room_name ?? 'Не назначено'}</td></tr>)}</tbody></table></div>
          </div>}
        </div>}
      </>}
    </section>
    <div className="flex justify-between gap-3">{step > 0 ? <button type="button" className="generation-button" disabled={pending} onClick={() => move(step - 1)}><ArrowLeft size={15} />Назад</button> : <span />}{step < 3 && <button type="button" className="generation-primary" onClick={() => move(step + 1)}>Далее<ArrowRight size={15} /></button>}</div>
  </>
}
