import { useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { GraduationCap, Plus, Play, RefreshCw } from 'lucide-react'
import { api, errText } from '../lib/api'
import { useAsync } from '../lib/useAsync'
import { Empty, ErrorBox, Loading } from '../components/Status'
import { useAdminAccess } from '../components/AdminAccess'
import type { DPOProgram, DPODiscipline, DPOMembership, DPOGroup, DPOStudent, DPORun, DPOPlanResult } from '../lib/dpo'
import { dpoRunLabel, dpoWeeklyPairs, eligibleDPOBaseRuns } from '../lib/dpo'
import type { GeneratedSchedule } from '../lib/generation'

type Named = { id: number; name: string }
type Module = { id: number; semester: number; number: number; start_date: string; end_date: string; teaching_weeks: number }
type Teacher = { id: number; full_name: string }
type BaseRun = { id: number; semester: number; module: number | null; status: string }
const base = 'schedule/'
const secondary = 'px-3 py-2 rounded-xl border border-border text-sm hover:bg-surface-2 disabled:opacity-40'
const days = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="text-xs text-muted block">{label}{children}</label>
}
const numberOrNull = (value: FormDataEntryValue | null) => value ? Number(value) : null

export default function DPO() {
  const { authorized, version } = useAdminAccess()
  const [programId, setProgramId] = useState(0)
  const [refreshedProgram, setRefreshedProgram] = useState<DPOProgram | null>(null)
  const [runId, setRunId] = useState(0)
  const [viewGroupId, setViewGroupId] = useState(0)
  const [busy, setBusy] = useState(false)
  const busyRef = useRef(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [planResult, setPlanResult] = useState<DPOPlanResult | null>(null)
  const [newSemester, setNewSemester] = useState(0)
  const [studentGroup, setStudentGroup] = useState(0)
  const programs = useAsync(signal => api.list<DPOProgram>(`${base}dpo-programs/`, undefined, signal), [version])
  const catalog = useAsync(async signal => {
    const [semesters, modules, groups, subjects, teachers] = await Promise.all([
      api.list<Named>(`${base}semesters/`, undefined, signal), api.list<Module>(`${base}modules/`, undefined, signal),
      api.list<DPOGroup>(`${base}groups/`, undefined, signal), api.list<Named>(`${base}subjects/`, undefined, signal),
      api.list<Teacher>(`${base}teachers/`, undefined, signal),
    ])
    return { semesters, modules, groups, subjects, teachers }
  }, [version])
  const privateData = useAsync(async signal => {
    if (!authorized) return null
    const [students, memberships] = await Promise.all([
      api.list<DPOStudent>(`${base}students/`, undefined, signal),
      api.list<DPOMembership>(`${base}dpo-memberships/`, undefined, signal),
    ])
    return { students, memberships, version }
  }, [authorized, version])
  const selectedId = programId || programs.data?.[0]?.id || 0
  const program = refreshedProgram?.id === selectedId ? refreshedProgram : programs.data?.find(item => item.id === selectedId)
  const disciplines = useAsync(signal => api.list<DPODiscipline>(`${base}dpo-disciplines/`, undefined, signal), [version])
  const runs = useAsync(async signal => ({ programId: selectedId, items: selectedId
    ? await api.get<DPORun[]>(`${base}dpo-programs/${selectedId}/runs/`, undefined, signal) : [] }), [selectedId, version])
  const programIds = programs.data?.map(item => item.id).join(',') ?? ''
  const baseRuns = useAsync(async signal => {
    if (!authorized || !program || !programs.data) return { programId: selectedId, items: [] as BaseRun[] }
    const [items, dpoRuns] = await Promise.all([
      api.list<BaseRun>(`${base}runs/`, { semester: program.semester }, signal),
      Promise.all(programs.data.map(item => api.get<DPORun[]>(`${base}dpo-programs/${item.id}/runs/`, undefined, signal))),
    ])
    return { programId: selectedId, items: eligibleDPOBaseRuns(items, dpoRuns.flat().map(item => item.id), program.semester, program.module) }
  }, [selectedId, program?.semester, program?.module, programIds, authorized, version])
  const availableBaseRuns = baseRuns.data?.programId === selectedId ? baseRuns.data.items : []
  const invalidBaseRun = !!program?.base_run && !baseRuns.loading && !baseRuns.error && baseRuns.data?.programId === selectedId && !availableBaseRuns.some(item => item.id === program.base_run)
  const c = catalog.data
  const privateCatalog = authorized && privateData.data?.version === version ? privateData.data : null
  const groups = c?.groups.filter(group => program?.groups.includes(group.id)) ?? []
  const groupId = groups.some(group => group.id === viewGroupId) ? viewGroupId : groups[0]?.id ?? 0
  const runList = runs.data?.programId === selectedId ? runs.data.items : []
  const selectedRunId = runList.some(run => run.id === runId) ? runId : runList[0]?.id ?? 0
  const projection = useAsync(async signal => {
    if (!groupId || !selectedRunId) return null
    return { groupId, runId: selectedRunId, schedule: await api.get<GeneratedSchedule>(
      `${base}schedule/groups/${groupId}/`, { run_id: selectedRunId }, signal) }
  }, [groupId, selectedRunId])
  const schedule = projection.data?.groupId === groupId && projection.data?.runId === selectedRunId ? projection.data.schedule : null
  const programDisciplines = disciplines.data?.filter(item => item.program === selectedId) ?? []
  const memberships = privateCatalog?.memberships.filter(item => program?.groups.includes(item.group)) ?? []
  const weeks = program?.weeks ?? c?.modules.find(item => item.id === program?.module)?.teaching_weeks ?? null

  function reload() { programs.reload(); catalog.reload(); disciplines.reload(); privateData.reload(); runs.reload(); baseRuns.reload(); projection.reload() }
  async function mutate(work: () => Promise<void>) {
    if (!authorized || busyRef.current) return
    busyRef.current = true; setBusy(true); setError(null); setNotice(null)
    try {
      await work()
      if (selectedId) setRefreshedProgram(await api.get<DPOProgram>(`${base}dpo-programs/${selectedId}/`))
      reload()
    } catch (e) { setError(errText(e)) }
    finally { busyRef.current = false; setBusy(false) }
  }
  function submit(event: FormEvent<HTMLFormElement>, work: (data: FormData) => Promise<void>) {
    event.preventDefault()
    const form = event.currentTarget, data = new FormData(form)
    void mutate(async () => { await work(data); form.reset() })
  }
  function chooseProgram(id: number) {
    if (busyRef.current) return
    setRefreshedProgram(null); setProgramId(id); setRunId(0); setViewGroupId(0); setPlanResult(null); setError(null); setNotice(null)
  }
  async function attachGroup(id: number) {
    if (!program) return
    const current = await api.get<DPOProgram>(`${base}dpo-programs/${program.id}/`)
    await api.patch(`${base}dpo-programs/${program.id}/`, { groups: [...new Set([...current.groups, id])] })
  }
  const blocked = busy || !authorized
  return <div className="max-w-6xl mx-auto space-y-5 pb-6">
    <div className="flex flex-wrap items-start justify-between gap-3"><div>
      <p className="text-xs text-accent font-semibold flex items-center gap-2"><GraduationCap size={15} />ДОПОЛНИТЕЛЬНОЕ ОБУЧЕНИЕ</p>
      <h1 className="text-2xl font-bold mt-2">Программы ДПО</h1>
      <p className="text-muted text-sm mt-1">Свои группы и дисциплины — с учётом занятости слушателей по основному обучению.</p>
    </div><button className={secondary} disabled={busy} onClick={() => { setRefreshedProgram(null); reload() }}><RefreshCw size={14} className="inline mr-2" />Обновить</button></div>
    <p className="rounded-xl border border-border bg-surface-2 p-3 text-xs text-muted">Расчёт строит недельный шаблон по сохранённым запускам генератора. Опубликованное расписание, выбранная физкультура и дорога относительно основных пар не учитываются. После изменения основного расписания ДПО нужно рассчитать заново.</p>
    {error && <ErrorBox message={error} />}
    {notice && <p role="status" className="text-sm rounded-xl p-3 bg-accent-soft text-accent">{notice}</p>}
    {programs.error && <ErrorBox message={programs.error} onRetry={programs.reload} />}
    {catalog.error && <ErrorBox message={catalog.error} onRetry={catalog.reload} />}
    {programs.loading && <Loading />}
    <div className="card p-4 space-y-3"><Field label="Программа"><select className="generation-input" disabled={busy} value={selectedId} onChange={e => chooseProgram(Number(e.target.value))}>
      <option value={0}>Выберите программу</option>{programs.data?.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
    </select></Field>{!programs.loading && !programs.data?.length && <Empty text="Программ пока нет." />}
    {authorized && <details><summary className="text-sm text-accent cursor-pointer">Создать программу</summary>{authorized && <form className="grid sm:grid-cols-2 gap-3 mt-3" onSubmit={e => submit(e, async data => {
      const created = await api.post<DPOProgram>(`${base}dpo-programs/`, { name: data.get('name'), semester: Number(data.get('semester')),
        module: numberOrNull(data.get('module')), weeks: numberOrNull(data.get('weeks')), groups: [], base_run: null, description: data.get('description') })
      setProgramId(created.id); setRunId(0); setPlanResult(null); setNotice('Программа создана. Добавьте группы и дисциплины.')
    })}><Field label="Название"><input name="name" required maxLength={200} className="generation-input" disabled={blocked} /></Field>
      <Field label="Семестр"><select name="semester" required className="generation-input" disabled={blocked} value={newSemester || ''} onChange={e => setNewSemester(Number(e.target.value))}><option value="">Выберите семестр</option>{c?.semesters.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
      <Field label="Модуль"><select key={newSemester} name="module" className="generation-input" disabled={blocked}><option value="">Весь семестр</option>{c?.modules.filter(item => item.semester === newSemester).map(item => <option key={item.id} value={item.id}>{item.number}-й · {item.start_date} — {item.end_date}</option>)}</select></Field>
      <Field label="Учебных недель (обязательно для всего семестра)"><input name="weeks" type="number" min={1} max={52} className="generation-input" disabled={blocked} placeholder="Или число недель модуля" /></Field>
      <Field label="Описание"><input name="description" className="generation-input" disabled={blocked} /></Field><button className="generation-primary self-end" disabled={blocked}><Plus size={14} />Создать программу</button>
    </form>}</details>}</div>
    {program && <>
      <div className="card p-4 space-y-3"><h2 className="font-semibold">{program.name}</h2><p className="text-xs text-muted">{c?.semesters.find(item => item.id === program.semester)?.name ?? `Семестр №${program.semester}`} · {program.module ? `${c?.modules.find(item => item.id === program.module)?.number ?? '—'}-й модуль` : 'Весь семестр'} · {weeks ? `${weeks} учебных недель` : 'Число недель не задано'}</p>
        {authorized && <form className="flex flex-wrap items-end gap-3" onSubmit={e => submit(e, async data => {
          await api.patch(`${base}dpo-programs/${program.id}/`, { base_run: numberOrNull(data.get('baseRun')) })
          setNotice('Источник основной занятости сохранён.')
        })}><Field label="Основное расписание"><select name="baseRun" key={`${program.id}:${program.base_run}:${baseRuns.loading}:${availableBaseRuns.map(item => item.id).join(',')}`} defaultValue={program.base_run ?? ''} className="generation-input" disabled={blocked || baseRuns.loading || !!baseRuns.error}><option value="">Последний успешный запуск периода</option>
          {invalidBaseRun && <option value={program.base_run!} disabled>№{program.base_run} · недопустимый источник</option>}
          {availableBaseRuns.map(item => <option key={item.id} value={item.id}>№{item.id} · {dpoRunLabel(item.status)} · {item.module ? `модуль №${item.module}` : 'семестр'}</option>)}
        </select></Field><button className={secondary} disabled={blocked}>Сохранить источник</button></form>}
        {authorized && invalidBaseRun && <ErrorBox message="Сохранённый источник не является успешным основным запуском этого периода. Выберите другой источник или последний успешный запуск периода и сохраните." />}
        {baseRuns.error && authorized && <ErrorBox message={baseRuns.error} onRetry={baseRuns.reload} />}
      </div>
      <section className="grid gap-4">
        <div className="card p-4 space-y-4"><h2 className="font-semibold">Группы программы</h2>
          {groups.map(group => <p key={group.id} className="text-sm rounded-xl bg-surface-2 p-3">{group.name} {authorized && <span className="text-muted">· {memberships.filter(item => item.group === group.id).length} слушателей</span>}</p>)}
          {!groups.length && <p className="text-sm text-muted">В программе пока нет групп.</p>}
          {authorized && <form className="space-y-2" onSubmit={e => submit(e, async data => {
            const group = await api.post<DPOGroup>(`${base}groups/`, { name: data.get('groupName'), is_dpo: true, semester: program.semester })
            try { await attachGroup(group.id) }
            catch (e) { throw new Error(`Группа «${group.name}» создана, но не подключена. Выберите её ниже. ${errText(e)}`) }
            setNotice('Группа создана и подключена к программе.')
          })}><Field label="Новая группа ДПО"><input name="groupName" required pattern="ДПО.*" maxLength={50} placeholder="ДПО-Название" className="generation-input" disabled={blocked} /></Field><button className={secondary} disabled={blocked}>Создать и подключить</button></form>}
          {authorized && <form className="flex flex-wrap items-end gap-2" onSubmit={e => submit(e, async data => {
            await attachGroup(Number(data.get('existingGroup')))
            setNotice('Группа подключена к программе.')
          })}><Field label="Существующая группа ДПО"><select name="existingGroup" required className="generation-input" disabled={blocked}><option value="">Выберите группу</option>{c?.groups.filter(group => group.is_dpo && !program.groups.includes(group.id) && (group.semester === program.semester || group.semester == null)).map(group => <option key={group.id} value={group.id}>{group.name}</option>)}</select></Field><button className={secondary} disabled={blocked}>Подключить</button></form>}
        </div>
        {authorized && <div className="card p-4 space-y-4"><h2 className="font-semibold">Слушатели</h2>
          {authorized && privateData.loading && <Loading />}
          {authorized && privateData.error && <ErrorBox message={privateData.error} onRetry={privateData.reload} />}
          {authorized && <form className="space-y-2" onSubmit={e => submit(e, async data => {
            await api.post(`${base}dpo-memberships/`, { group: Number(data.get('targetGroup')), student: Number(data.get('student')) })
            setNotice('Студент включён в группу ДПО. Основная группа не изменена.')
          })}><Field label="Учебная группа"><select className="generation-input" disabled={blocked} value={studentGroup} onChange={e => setStudentGroup(Number(e.target.value))}><option value={0}>Все учебные группы</option>{c?.groups.filter(group => !group.is_dpo).map(group => <option key={group.id} value={group.id}>{group.name}</option>)}</select></Field>
            <Field label="Студент"><select key={studentGroup} name="student" required className="generation-input" disabled={blocked}><option value="">Выберите студента</option>{privateCatalog?.students.filter(student => (!studentGroup || student.group === studentGroup) && !c?.groups.find(group => group.id === student.group)?.is_dpo).map(student => <option key={student.id} value={student.id}>{student.full_name} · {student.group_name}</option>)}</select></Field>
            <Field label="Группа ДПО"><select name="targetGroup" required className="generation-input" disabled={blocked}><option value="">Выберите группу ДПО</option>{groups.map(group => <option key={group.id} value={group.id}>{group.name}</option>)}</select></Field><button className={secondary} disabled={blocked || !groups.length}>Добавить слушателя</button>
          </form>}
          <ul className="space-y-2 text-sm">{memberships.map(item => <li key={item.id} className="flex items-start justify-between gap-3 border-t border-border pt-2"><span>{privateCatalog?.students.find(student => student.id === item.student)?.full_name ?? `Студент №${item.student}`}<span className="block text-xs text-muted">{groups.find(group => group.id === item.group)?.name}</span></span><button className="text-muted underline text-xs" disabled={blocked} onClick={() => void mutate(async () => { await api.delete(`${base}dpo-memberships/${item.id}/`); setNotice('Слушатель исключён из ДПО. Для обновления расписания выполните новый расчёт.') })}>Исключить</button></li>)}</ul>
        </div>}
      </section>
      <section className="card p-4 space-y-4"><h2 className="font-semibold">Дисциплины и объём</h2>
        {disciplines.error && <ErrorBox message={disciplines.error} onRetry={disciplines.reload} />}
        <div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead className="text-xs text-muted"><tr><th className="p-2">Дисциплина</th><th className="p-2">Преподаватель</th><th className="p-2">Формат</th><th className="p-2">Объём</th><th className="p-2">В неделю</th><th /></tr></thead><tbody>{programDisciplines.map(item => <tr key={item.id} className="border-t border-border"><td className="p-2">{c?.subjects.find(subject => subject.id === item.subject)?.name ?? `Предмет №${item.subject}`}</td><td className="p-2">{c?.teachers.find(teacher => teacher.id === item.teacher)?.full_name ?? `Преподаватель №${item.teacher}`}</td><td className="p-2">{item.format === 'ONLINE' ? 'Онлайн' : 'Очно'}</td><td className="p-2">{item.total_hours != null ? `${item.total_hours} ак. ч.` : `${item.total_pairs} пар`}</td><td className="p-2">{dpoWeeklyPairs(item.pairs_total, weeks) ?? 'Нужна проверка объёма'}</td><td className="p-2">{authorized && <button disabled={blocked} className="text-muted underline text-xs" onClick={() => void mutate(async () => { await api.delete(`${base}dpo-disciplines/${item.id}/`); setNotice('Дисциплина удалена.') })}>Удалить</button>}</td></tr>)}</tbody></table></div>
        {!programDisciplines.length && <p className="text-sm text-muted">В программе пока нет дисциплин.</p>}
        {authorized && <form className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3" onSubmit={e => submit(e, async data => {
          const unit = data.get('unit')
          await api.post(`${base}dpo-disciplines/`, { program: program.id, subject: Number(data.get('subject')), teacher: Number(data.get('teacher')), format: data.get('format'), total_hours: unit === 'hours' ? Number(data.get('volume')) : null, total_pairs: unit === 'pairs' ? Number(data.get('volume')) : null })
          setNotice('Дисциплина добавлена. Объём проверяется при подготовке нагрузки.')
        })}><Field label="Дисциплина"><select name="subject" required className="generation-input" disabled={blocked}><option value="">Выберите предмет</option>{c?.subjects.filter(subject => !programDisciplines.some(item => item.subject === subject.id)).map(subject => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></Field>
          <Field label="Преподаватель"><select name="teacher" required className="generation-input" disabled={blocked}><option value="">Выберите преподавателя</option>{c?.teachers.map(teacher => <option key={teacher.id} value={teacher.id}>{teacher.full_name}</option>)}</select></Field>
          <Field label="Формат"><select name="format" className="generation-input" disabled={blocked}><option value="ONLINE">Онлайн</option><option value="ONSITE">Очно</option></select></Field>
          <Field label="Общий объём"><input name="volume" type="number" min={1} required className="generation-input" disabled={blocked} /></Field>
          <Field label="Единица объёма"><select name="unit" className="generation-input" disabled={blocked}><option value="hours">Академические часы</option><option value="pairs">Пары</option></select></Field><button className="generation-primary self-end" disabled={blocked}>Добавить дисциплину</button>
        </form>}<p className="text-xs text-muted">Одна пара = 2 академических часа. Общий объём должен делиться на число учебных недель без остатка; округление не выполняется.</p>
      </section>
      {authorized && <section className="card p-4 space-y-3"><h2 className="font-semibold">Расчёт расписания</h2>
        {authorized && <form className="flex flex-wrap items-end gap-3" onSubmit={e => submit(e, async data => {
          const result = await api.post<DPOPlanResult>(`${base}dpo-programs/${program.id}/plan/`, { time_limit_seconds: Number(data.get('limit')), seed: 17 }, { timeoutMs: Number(data.get('limit')) * 1000 + 30000 })
          setPlanResult(result); setRunId(result.run_id); setNotice(`Расчёт №${result.run_id}: ${dpoRunLabel(result.status)}. Размещено ${result.scheduled_count} из ${result.required_count} пар.`)
        })}><Field label="Время поиска, секунд"><input name="limit" type="number" min={1} max={300} defaultValue={30} required className="generation-input" disabled={blocked} /></Field><button type="button" className={secondary} disabled={blocked || invalidBaseRun || baseRuns.loading || !!baseRuns.error || !groups.length || !programDisciplines.length} onClick={() => void mutate(async () => {
          const prepared = await api.post<{ event_id: number; group: string; subject: string; pairs_per_week: number }[]>(`${base}dpo-programs/${program.id}/prepare/`, {})
          setNotice(`Нагрузка подготовлена: ${prepared.length} записей, ${prepared.reduce((sum, item) => sum + item.pairs_per_week, 0)} пар в неделю.`)
        })}>Проверить нагрузку</button><button className="generation-primary" disabled={blocked || invalidBaseRun || baseRuns.loading || !!baseRuns.error || !groups.length || !programDisciplines.length}><Play size={14} />{busy ? 'Выполняется…' : 'Рассчитать расписание'}</button></form>}
        <p className="text-xs text-muted">Новый расчёт сохраняется отдельно. Основное расписание не перемещается. При таймауте обновите историю перед повторным запуском.</p>
        {planResult && <p className="text-sm">Учтено основных и фоновых пар: {planResult.background_classes}. Других программ ДПО: {planResult.other_dpo_run_ids.length}. Замечаний: {planResult.issue_count}.</p>}
      </section>}
      <section className="card p-4 space-y-4"><h2 className="font-semibold">Сохранённые результаты</h2>
        {runs.loading && <Loading />}{runs.error && <ErrorBox message={runs.error} onRetry={runs.reload} />}
        {!runs.loading && !runList.length && <Empty text="У программы пока нет сохранённых расчётов." />}
        {!!runList.length && <><div className="grid sm:grid-cols-2 gap-3"><Field label="Расчёт"><select disabled={busy} className="generation-input" value={selectedRunId} onChange={e => setRunId(Number(e.target.value))}>{runList.map(run => <option key={run.id} value={run.id}>№{run.id} · {dpoRunLabel(run.status)} · {new Date(run.created_at).toLocaleString('ru-RU')}</option>)}</select></Field><Field label="Группа ДПО"><select disabled={busy} className="generation-input" value={groupId} onChange={e => setViewGroupId(Number(e.target.value))}>{groups.map(group => <option key={group.id} value={group.id}>{group.name}</option>)}</select></Field></div>
          {projection.loading && <Loading />}{projection.error && <ErrorBox message={projection.error} onRetry={projection.reload} />}
          {schedule && <><p className="text-sm">{dpoRunLabel(schedule.run?.status ?? '')} · {schedule.scheduled_classes.length} пар в неделю для выбранной группы</p>
            {schedule.run?.message && !['SOLVED', 'PARTIAL'].includes(schedule.run.status) && <p className="text-xs text-muted">{schedule.run.message}</p>}
            {schedule.issues.map(issue => <p key={issue.id} className="text-sm text-amber-700 dark:text-amber-300">{issue.text}</p>)}
            <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-xs text-muted"><tr><th className="p-2">День</th><th className="p-2">Время</th><th className="p-2">Занятие</th><th className="p-2">Преподаватель</th><th className="p-2">Место</th></tr></thead><tbody>{schedule.scheduled_classes.map(item => <tr className="border-t border-border" key={item.id}><td className="p-2">{days[item.slot_day]}</td><td className="p-2 whitespace-nowrap">{item.slot_start_time?.slice(0, 5) ?? '—'}–{item.slot_end_time?.slice(0, 5) ?? '—'}</td><td className="p-2">{item.subject_name}</td><td className="p-2">{item.teacher_name || 'Не указан'}</td><td className="p-2">{item.format === 'ONLINE' ? 'Онлайн' : item.room_name || 'Не назначена'}</td></tr>)}</tbody></table></div>
            {!schedule.scheduled_classes.length && <Empty text="В этом расчёте нет размещённых занятий выбранной группы." />}
          </>}
        </>}
      </section>
    </>}
  </div>
}
