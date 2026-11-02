import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, CheckCircle2, ChevronDown, Clock3, History, LoaderCircle, Play, RefreshCw, RotateCcw, Sparkles } from 'lucide-react'
import { api, errText } from '../lib/api'
import { useAsync } from '../lib/useAsync'
import { bellPatternLabel, preferredGenerationSemester, projectionForRequest, runStatusLabel, savedRunFromResponse } from '../lib/generation'
import type { GeneratedRunResponse, GeneratedSchedule, GenerationOptions, LoadedProjection, ManualSchedule, ManualVariant, ProjectionIdentity, SavedRun } from '../lib/generation'
import { defaultGenerationSettings, settingsSummary } from '../lib/generationSettings'
import { buildingLabel, groupLabel, periodLabel, semesterLabel, shortDate, teacherLabel } from '../lib/generationLabels'
import type { SemesterGeneration } from '../lib/generationSemester'
import type { GenerationDrop, GenerationDropProposal } from '../lib/generationDrag'
import GeneratedCalendar from '../components/GeneratedCalendar'
import GenerationSettingsForm from '../components/GenerationSettingsForm'
import GenerationEditor from '../components/GenerationEditor'
import GenerationValidation from '../components/GenerationValidation'
import SemesterGenerationSummary from '../components/SemesterGenerationSummary'
import { Empty, ErrorBox, Loading } from '../components/Status'

const positiveId = (value: string | null) => { const id = Number(value); return Number.isSafeInteger(id) && id > 0 ? id : null }
const dateLabel = (value: string) => new Date(value).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
function authorization(username: string, password: string): string {
  const bytes = new TextEncoder().encode(`${username}:${password}`)
  return `Basic ${btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(''))}`
}

export default function Generation() {
  const options = useAsync((signal) => api.get<GenerationOptions>('schedule/generation-options/', undefined, signal), [])
  const [semesterId, setSemesterId] = useState(0)
  const [moduleId, setModuleId] = useState(0)
  const [patternId, setPatternId] = useState(0)
  const [launchGroupId, setLaunchGroupId] = useState(0)
  const [profileId, setProfileId] = useState('')
  const [viewGroupId, setViewGroupId] = useState(0)
  const [teacherId, setTeacherId] = useState(0)
  const [kind, setKind] = useState<'groups' | 'teachers'>('groups')
  const [settings, setSettings] = useState(defaultGenerationSettings)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [running, setRunning] = useState(false)
  const [startedAt, setStartedAt] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [launchError, setLaunchError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState<SavedRun | null>(null)
  const [showSetup, setShowSetup] = useState(() => !['run', 'semester_run'].some((key) => positiveId(new URLSearchParams(window.location.search).get(key))))
  const [runId, setRunId] = useState<number | null>(() => positiveId(new URLSearchParams(window.location.search).get('run')))
  const [runInput, setRunInput] = useState(() => new URLSearchParams(window.location.search).get('run') ?? '')
  const [inputError, setInputError] = useState<string | null>(null)
  const [variantId, setVariantId] = useState<number | null>(() => positiveId(new URLSearchParams(window.location.search).get('variant')))
  const [openedVariant, setOpenedVariant] = useState<ManualSchedule | null>(null)
  const [draft, setDraft] = useState<ManualSchedule | null>(null)
  const [editClassId, setEditClassId] = useState<number | null>(null)
  const [editing, setEditing] = useState(false)
  const [dropProposal, setDropProposal] = useState<GenerationDropProposal | null>(null)
  const dropNonce = useRef(0)
  const editorBusyRef = useRef(false)
  const [editorBusy, setEditorBusy] = useState(false)
  const onEditorBusyChange = useCallback((busy: boolean) => { editorBusyRef.current = busy; setEditorBusy(busy) }, [])
  const [semesterRunId, setSemesterRunId] = useState<number | null>(() => positiveId(new URLSearchParams(window.location.search).get('semester_run')))
  const [openedSemesterRun, setOpenedSemesterRun] = useState<SemesterGeneration | null>(null)
  const semester = preferredGenerationSemester(options.data, semesterId)
  const module = semester?.modules.find((item) => item.id === moduleId)
  const pattern = semester?.patterns.find((item) => item.id === patternId) ?? semester?.patterns[0]
  const launchGroup = semester?.groups.find((item) => item.id === launchGroupId) ?? semester?.groups[0]
  const profiles = options.data?.resource_profiles?.filter((item) => item.semester_id === semester?.id && item.group_id === launchGroup?.id) ?? []
  const profile = profiles.find((item) => item.id === profileId) ?? profiles[0]
  const availableDemo = options.data?.resource_profiles?.[0]
  const buildings = useMemo(() => [...new Map((profile?.rooms ?? []).filter((room) => room.building_id).map((room) => [room.building_id!, { id: room.building_id!, name: buildingLabel(room) }])).values()], [profile])
  const runDetail = useAsync<GeneratedRunResponse | null>((signal) => runId ? api.get<GeneratedRunResponse>(`schedule/generation-history/${runId}/`, undefined, signal) : Promise.resolve(null), [runId])
  const confirmedRun = runDetail.data?.id === runId ? runDetail.data : null
  const historySemesterId = !showSetup && confirmedRun ? confirmedRun.semester : semester?.id
  const historyModuleId = !showSetup && confirmedRun ? confirmedRun.module : module?.id
  const history = useAsync((signal) => api.get<SavedRun[]>('schedule/generation-history/', { semester: historySemesterId, module: historyModuleId }, signal), [historySemesterId, historyModuleId])
  const periodHistory = history.data?.filter((item) => item.semester === historySemesterId && (historyModuleId == null || item.module === historyModuleId)) ?? []
  const semesterRuns = useAsync((signal) => api.get<{ results: SemesterGeneration[] }>('schedule/semester-generations/', { semester: historySemesterId }, signal), [historySemesterId])
  const semesterRunRequest = useAsync<SemesterGeneration | null>((signal) => semesterRunId ? api.get<SemesterGeneration>(`schedule/semester-generations/${semesterRunId}/`, undefined, signal) : Promise.resolve(null), [semesterRunId])
  const semesterRun = openedSemesterRun?.id === semesterRunId ? openedSemesterRun : semesterRunRequest.data?.id === semesterRunId ? semesterRunRequest.data : null
  const viewSemester = runId ? options.data?.semesters.find((item) => item.id === confirmedRun?.semester) : semester
  const group = viewSemester?.groups.find((item) => item.id === viewGroupId) ?? viewSemester?.groups.find((item) => item.id === confirmedRun?.input_snapshot?.group_id) ?? viewSemester?.groups[0]
  const teacher = viewSemester?.teachers.find((item) => item.id === teacherId) ?? viewSemester?.teachers[0]
  const holder = kind === 'groups' ? group : teacher
  const requested: ProjectionIdentity | null = runId && holder ? { runId, kind, holderId: holder.id, holderName: holder.name } : null
  const projection = useAsync<LoadedProjection | null>(async (signal) => {
    if (!requested) return null
    const schedule = await api.get<GeneratedSchedule>(`schedule/schedule/${requested.kind}/${requested.holderId}/`, { run_id: requested.runId }, signal)
    return { identity: requested, schedule }
  }, [runId, kind, holder?.id, holder?.name])
  const confirmedProjection = projectionForRequest(projection.data, requested)
  const original = confirmedProjection?.schedule
  const fullRun = original?.run && confirmedRun ? { ...original, run: { ...original.run, settings_snapshot: confirmedRun.settings_snapshot, input_snapshot: confirmedRun.input_snapshot, validation_snapshot: confirmedRun.validation_snapshot } } : original
  const variantRequest = useAsync<ManualSchedule | null>((signal) => variantId ? api.get<ManualSchedule>(`schedule/manual-variants/${variantId}/`, undefined, signal) : Promise.resolve(null), [variantId])
  const confirmedVariant = variantId && variantRequest.data?.variant?.id === variantId && variantRequest.data?.run?.id === runId ? variantRequest.data : null
  const savedVariant = openedVariant?.variant?.id === variantId && openedVariant?.run?.id === runId ? openedVariant : confirmedVariant
  const variants = useAsync<{ results: ManualVariant[] } | null>((signal) => runId && confirmedRun?.input_snapshot ? api.get<{ results: ManualVariant[] }>('schedule/manual-variants/', { run_id: runId }, signal) : Promise.resolve(null), [runId, !!confirmedRun?.input_snapshot])
  const runVariants = variants.data?.results.filter((item) => item.source_run_id === runId) ?? []
  const sourceSchedule = variantId ? savedVariant : fullRun
  const schedule = draft ?? sourceSchedule
  const resultSettings = confirmedRun?.settings_snapshot
  const inputSnapshot = confirmedRun?.input_snapshot
  const resultPatternId = inputSnapshot && 'week_pattern_id' in inputSnapshot ? Number(inputSnapshot.week_pattern_id) : schedule?.scheduled_classes[0]?.week_pattern
  const resultPattern = viewSemester?.patterns.find((item) => item.id === resultPatternId) ?? viewSemester?.patterns[0]
  const resultSlots = inputSnapshot?.slots ?? resultPattern?.slots ?? []
  const savedBuildings = [...new Map((inputSnapshot?.rooms ?? []).filter((room) => room.building_id).map((room) => [room.building_id!, { id: room.building_id!, name: buildingLabel(room) }])).values()]
  const roomMissing = schedule?.scheduled_classes.filter((item) => item.format !== 'ONLINE' && !item.room_name).length ?? 0
  const validation = draft?.validation ?? savedVariant?.validation ?? confirmedRun?.validation_snapshot
  const canEdit = !!resultSettings && !!inputSnapshot && kind === 'groups' && group?.id === inputSnapshot.group_id && !!schedule?.scheduled_classes.length

  useEffect(() => {
    if (!running) return
    const tick = () => setElapsed(Math.floor((Date.now() - startedAt) / 1000))
    tick(); const timer = window.setInterval(tick, 1000)
    return () => window.clearInterval(timer)
  }, [running, startedAt])
  useEffect(() => {
    const url = new URL(window.location.href)
    if (runId) url.searchParams.set('run', String(runId)); else url.searchParams.delete('run')
    if (variantId) url.searchParams.set('variant', String(variantId)); else url.searchParams.delete('variant')
    if (semesterRunId) url.searchParams.set('semester_run', String(semesterRunId)); else url.searchParams.delete('semester_run')
    window.history.replaceState(null, '', url)
  }, [runId, variantId, semesterRunId])
  const resetEditing = () => { setDraft(null); setEditing(false); setEditClassId(null); setDropProposal(null) }
  const openEditor = (classId?: number) => {
    setEditing(true)
    if (classId !== undefined) setEditClassId(classId)
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
      const editor = document.getElementById('generation-editor')
      editor?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' })
      editor?.focus({ preventScroll: true })
    }))
  }
  const onDropClass = (proposal: GenerationDrop) => {
    if (editorBusyRef.current) return
    setDropProposal({ ...proposal, nonce: ++dropNonce.current })
    openEditor(proposal.classId)
  }
  const openRun = (id: number | null, keepSemester = false) => {
    if (editorBusyRef.current) return
    if (!id) { setInputError('Укажите положительный номер сохранённого расчёта.'); return }
    setInputError(null); setRunId(id); setRunInput(String(id)); setVariantId(null); setOpenedVariant(null); setViewGroupId(0); resetEditing()
    if (!keepSemester) { setSemesterRunId(null); setOpenedSemesterRun(null) }
    if (id === runId) { runDetail.reload(); projection.reload() }
  }
  const openSemesterRun = (result: SemesterGeneration) => {
    if (editorBusyRef.current) return
    setSemesterRunId(result.id); setOpenedSemesterRun(result); setShowSetup(false)
    const first = result.modules.find((item) => item.run_id)
    if (first?.run_id) openRun(first.run_id, true)
  }
  useEffect(() => {
    if (semesterRun && !runId) {
      const first = semesterRun.modules.find((item) => item.run_id)
      if (first?.run_id) { setRunId(first.run_id); setRunInput(String(first.run_id)) }
    }
  }, [semesterRun, runId])
  const launch = async () => {
    if (!semester || !pattern || !launchGroup || !profile || running) return
    if (options.data?.authentication_required && (!username || !password)) { setLaunchError('Для запуска введите логин и пароль администратора.'); return }
    setRunning(true); setStartedAt(Date.now()); setElapsed(0); setLaunchError(null)
    try {
      const requestOptions = { headers: options.data?.authentication_required ? { Authorization: authorization(username, password) } : undefined, timeoutMs: (settings.search.time_limit_seconds + 60) * 1000 }
      const payload = { semester: semester.id, week_pattern: pattern.id, group: launchGroup.id, resource_profile: profile.id, clear_previous: false, settings }
      if (!module && semester.modules.length) {
        const result = await api.post<SemesterGeneration>('schedule/semester-generations/', payload, requestOptions)
        openSemesterRun(result); semesterRuns.reload(); history.reload(); setKind('groups')
        if (!result.complete) setLaunchError('Семестр рассчитан частично. Посмотрите результат каждой части ниже; обязательные условия сохранены.')
        return
      }
      const response = await api.post<GeneratedRunResponse>('schedule/generate/', { ...payload, module: module?.id ?? null }, requestOptions)
      setAttempt(savedRunFromResponse(response)); history.reload()
      if (!['SOLVED', 'PARTIAL'].includes(response.status)) { setLaunchError(`${runStatusLabel(response.status)}. ${response.message}. Предыдущий результат сохранён.`); return }
      openRun(response.id); setShowSetup(false); setKind('groups')
    } catch (error) { setLaunchError(`${errText(error)} Предыдущий результат сохранён. При обрыве связи расчёт мог продолжиться на сервере; запрос автоматически не повторяется. Проверьте сохранённые расчёты.`) }
    finally { setRunning(false) }
  }
  const chooseDemo = () => {
    if (!availableDemo) return
    setSemesterId(availableDemo.semester_id); setLaunchGroupId(availableDemo.group_id); setProfileId(availableDemo.id); setModuleId(0); setPatternId(0)
  }

  return <div className="max-w-[1500px] mx-auto space-y-6 pb-8">
    <header className="flex flex-wrap justify-between items-center gap-4"><div><div className="flex items-center gap-2 text-accent text-xs font-semibold mb-2"><Sparkles size={15} />ПЛАНИРОВАНИЕ НЕДЕЛИ</div><h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Генерация расписания</h1><p className="text-sm text-muted mt-2">От учебной нагрузки к удобной неделе — с вашими условиями и ручными правками.</p></div>{runId && <button className="generation-button" onClick={() => setShowSetup(!showSetup)}><SlidersIcon />{showSetup ? 'Свернуть настройки' : 'Новый расчёт'}</button>}</header>
    {options.loading && <Loading />}{options.error && <ErrorBox message={options.error} onRetry={options.reload} />}
    {!options.loading && !options.error && !semester && <Empty text="Нет подготовленной нагрузки для генерации." />}
    {semester && <>
      {showSetup && <div className="space-y-5">
        <section className="rounded-2xl border border-border bg-surface p-4 sm:p-6 space-y-5" aria-label="Исходные данные">
          <div className="flex gap-3 items-start"><span className="generation-step">1</span><div><h2 className="text-lg font-semibold">Исходные данные</h2><p className="text-sm text-muted mt-1">Выберите группу и период, на который нужно составить расписание.</p></div></div>
          <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
            <label className="text-xs text-muted">Учебный сценарий<select aria-label="Учебный сценарий" className="generation-input" value={semester.id} disabled={running} onChange={(e) => { setSemesterId(Number(e.target.value)); setModuleId(0); setPatternId(0); setLaunchGroupId(0); setProfileId('') }}>{options.data?.semesters.filter((item) => !item.is_archived).map((item) => <option key={item.id} value={item.id}>{semesterLabel(item)}</option>)}</select></label>
            <label className="text-xs text-muted">Группа<select className="generation-input" value={launchGroup?.id ?? 0} disabled={running} onChange={(e) => setLaunchGroupId(Number(e.target.value))}>{semester.groups.map((item) => <option key={item.id} value={item.id}>{groupLabel(item.name)} · {item.student_count} студентов</option>)}</select></label>
            <label className="text-xs text-muted">Период генерации<select aria-label="Период генерации" className="generation-input" value={module?.id ?? 0} disabled={running || !semester.modules.length} onChange={(e) => setModuleId(Number(e.target.value))}><option value={0}>Весь семестр{semester.modules.length ? ` · ${shortDate(semester.modules[0].start_date)} — ${shortDate(semester.modules.at(-1)!.end_date)}` : ''}</option>{semester.modules.map((item) => <option key={item.id} value={item.id}>{periodLabel(item)}</option>)}</select></label>
            <label className="text-xs text-muted">Расписание звонков<select className="generation-input" value={pattern?.id ?? 0} disabled={running} onChange={(e) => setPatternId(Number(e.target.value))}>{semester.patterns.map((item) => <option key={item.id} value={item.id}>{bellPatternLabel(item)} · {item.slots[0]?.start_time?.slice(0, 5)}–{item.slots.at(-1)?.end_time?.slice(0, 5)}</option>)}</select></label>
          </div>
          <p className="text-xs leading-relaxed text-muted">{semester.notice}</p>
          {profile ? <div className="rounded-xl bg-accent-soft border border-accent/10 p-4 space-y-3"><div className="flex flex-wrap justify-between items-center gap-2"><h3 className="text-sm font-semibold">Аудитории для генерации</h3><span className="generation-badge bg-surface text-accent">Реальные помещения · тестовая вместимость</span></div>{profiles.length > 1 && <select aria-label="Профиль ресурсов" className="generation-input" value={profile.id} disabled={running} onChange={(e) => setProfileId(e.target.value)}>{profiles.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>}<p className="text-xs text-muted">{profile.notice}</p><div className="flex flex-wrap gap-2">{profile.rooms.map((room) => <span className="text-xs rounded-lg border border-accent/10 bg-surface px-3 py-2" key={room.id}>{room.name} <span className="text-muted">· {room.effective_capacity ?? '?'} мест{room.capacity_assumption != null ? ' · Допущение демо' : ''}</span></span>)}</div></div>
            : <div className="rounded-xl border border-border bg-surface-2 p-4"><p className="text-sm">Этот сохранённый набор доступен для просмотра. Для новых настроек подготовлен отдельный демосценарий с реальными аудиториями.</p>{availableDemo && <button className="text-accent text-sm font-medium mt-3 inline-flex items-center gap-2" onClick={chooseDemo} disabled={running}>Открыть новый демосценарий<ArrowRight size={15} /></button>}</div>}
          {pattern && <details className="text-xs text-muted"><summary className="cursor-pointer">Время пар и источник сетки</summary><div className="mt-3 flex flex-wrap gap-2">{[...new Map(pattern.slots.map((slot) => [slot.lesson_number, slot])).values()].map((slot) => <span className="rounded-lg border border-border px-2 py-1" key={slot.lesson_number}>{slot.lesson_number}: {slot.start_time?.slice(0, 5)}–{slot.end_time?.slice(0, 5)}</span>)}</div>{pattern.bell_schedule && <p className="mt-2">{pattern.bell_schedule.scope}. Проверено {pattern.bell_schedule.verified_on}. {pattern.bell_schedule.source_url.startsWith('https://') && <a className="text-accent underline" href={pattern.bell_schedule.source_url} target="_blank" rel="noreferrer noopener">Источник</a>}</p>}</details>}
        </section>
        <section className="rounded-2xl border border-border bg-surface p-4 sm:p-6"><GenerationSettingsForm value={settings} onChange={setSettings} buildings={buildings} disabled={running} /></section>
        {options.data?.authentication_required && <div className="grid sm:grid-cols-2 gap-3 rounded-xl border border-border p-4"><label className="text-xs text-muted">Логин администратора<input className="generation-input" autoComplete="username" value={username} disabled={running} onChange={(e) => setUsername(e.target.value)} /></label><label className="text-xs text-muted">Пароль<input className="generation-input" autoComplete="current-password" type="password" value={password} disabled={running} onChange={(e) => setPassword(e.target.value)} /></label></div>}
        <div className="flex flex-wrap items-center gap-4"><button className="generation-primary h-12 px-6" disabled={running || editorBusy || !profile || !pattern || !launchGroup} onClick={launch}>{running ? <LoaderCircle size={17} className="animate-spin" /> : <Play size={17} />}{running ? 'Составляем расписание…' : (!module && semester.modules.length ? 'Составить расписание на семестр' : 'Составить расписание модуля')}</button><p className="text-xs text-muted">Предыдущие расчёты и ручные варианты сохраняются</p></div>
      </div>}
      {running && <div role="status" className="rounded-2xl border border-accent/20 bg-accent-soft p-6 flex gap-4 items-center"><LoaderCircle className="animate-spin text-accent shrink-0" size={28} /><div><p className="font-semibold">Ищем допустимое расписание</p><p className="text-sm text-muted mt-1">Прошло {elapsed} с · общий лимит поиска {settings.search.time_limit_seconds} с{!module && semester.modules.length > 1 ? ` на ${semester.modules.length} модуля` : ''}</p><p className="text-xs text-muted mt-2">Результат появится после завершения расчёта. Повторный запрос не отправляется.</p></div></div>}
      {launchError && <ErrorBox message={launchError} />}
      {attempt && <p className="text-xs text-muted">Последний расчёт: {runStatusLabel(attempt.status)} · {attempt.solve_time_seconds != null ? `${attempt.solve_time_seconds.toFixed(2)} с` : 'время не задано'}</p>}
      <section className="space-y-4" aria-label="Сохранённые расписания">
        <div className="flex flex-wrap justify-between gap-3 items-center"><div className="flex items-center gap-3"><span className="generation-step">3</span><h2 className="text-lg font-semibold">Сохранённые расписания</h2></div><button className="generation-button" onClick={history.reload} disabled={history.loading || running}><RefreshCw size={14} />Обновить</button></div>
        <div className="rounded-2xl border border-border bg-surface p-4 space-y-3"><div className="grid sm:grid-cols-[1fr_auto] gap-3 items-end"><label className="text-xs text-muted">Сохранённые недельные расписания<select className="generation-input" value={periodHistory.some((item) => item.id === runId) ? runId! : ''} disabled={running || editorBusy || !!draft || history.loading} onChange={(e) => e.target.value && openRun(Number(e.target.value))}><option value="">{history.loading ? 'Загрузка…' : 'Выберите расписание'}</option>{periodHistory.map((item) => <option key={item.id} value={item.id}>{dateLabel(item.created_at)} · {runStatusLabel(item.status)} · {item.scheduled_count ?? '?'} пар · №{item.id}</option>)}</select></label><details className="text-xs text-muted"><summary className="generation-button cursor-pointer"><History size={14} />По номеру</summary><div className="flex gap-2 mt-2"><input aria-label="Номер сохранённого расписания" className="generation-input w-28 mt-0" type="number" min={1} value={runInput} onChange={(e) => setRunInput(e.target.value)} /><button className="generation-button" onClick={() => openRun(positiveId(runInput))} disabled={running || editorBusy || !!draft}>Открыть</button></div></details></div>{history.error && <ErrorBox message={history.error} onRetry={history.reload} />}{inputError && <ErrorBox message={inputError} />}</div>
        {semesterRuns.data?.results.some((item) => item.semester === historySemesterId) && <label className="block text-xs text-muted">Расписания на весь семестр<select aria-label="Сохранённый семестр" className="generation-input" value={semesterRunId ?? ''} disabled={running || editorBusy || !!draft} onChange={(e) => {
          const item = semesterRuns.data?.results.find((entry) => entry.id === Number(e.target.value))
          if (item) openSemesterRun(item)
        }}><option value="">Выберите семестровое расписание</option>{semesterRuns.data.results.filter((item) => item.semester === historySemesterId).map((item) => <option key={item.id} value={item.id}>{dateLabel(item.created_at)} · {item.complete ? 'Весь семестр рассчитан' : 'Частичный результат'}{item.totals_complete ? ` · ${item.scheduled_hours}/${item.required_hours} ч` : ''}</option>)}</select></label>}
        {semesterRunRequest.loading && semesterRunId && !semesterRun && <Loading />}
        {semesterRunRequest.error && <ErrorBox message={semesterRunRequest.error} onRetry={semesterRunRequest.reload} />}
        {semesterRuns.error && <ErrorBox message={semesterRuns.error} onRetry={semesterRuns.reload} />}
        {semesterRun && <SemesterGenerationSummary result={semesterRun} selectedRunId={runId} disabled={running || editorBusy || !!draft} onOpen={(id) => openRun(id, true)} />}
        {runId && (runDetail.loading || projection.loading) && <Loading />}
        {runDetail.error && <ErrorBox message={runDetail.error} onRetry={runDetail.reload} />}
        {projection.error && <ErrorBox message={projection.error} onRetry={projection.reload} />}
        {!runId && <Empty text="Задайте условия и запустите расчёт или откройте сохранённое расписание." />}
        {confirmedRun && <>
          <div className="flex flex-wrap items-end gap-3"><label className="text-xs text-muted">Чьё расписание показать<select className="generation-input" value={kind} disabled={editing || !!draft || !!variantId} onChange={(e) => setKind(e.target.value as 'groups' | 'teachers')}><option value="groups">Учебной группы</option><option value="teachers">Преподавателя</option></select></label><label className="text-xs text-muted">{kind === 'groups' ? 'Группа' : 'Преподаватель'}<select className="generation-input" value={holder?.id ?? 0} disabled={editing || !!draft || !!variantId} onChange={(e) => kind === 'groups' ? setViewGroupId(Number(e.target.value)) : setTeacherId(Number(e.target.value))}>{(kind === 'groups' ? viewSemester?.groups : viewSemester?.teachers)?.map((item) => <option key={item.id} value={item.id}>{kind === 'groups' ? groupLabel(item.name) : teacherLabel(item.name)}</option>)}</select></label></div>
          {confirmedRun.input_snapshot && <div className="flex flex-wrap items-end gap-2"><label className="text-xs text-muted flex-1 min-w-40">Сохранённый вариант<select aria-label="Версия расписания" className="generation-input" value={variantId ?? ''} disabled={!!draft || editorBusy || running} onChange={(e) => { setVariantId(positiveId(e.target.value)); setOpenedVariant(null); resetEditing(); setKind('groups'); setViewGroupId(inputSnapshot?.group_id ?? 0) }}><option value="">Исходное расписание</option>{runVariants.map((item) => <option key={item.id} value={item.id}>{item.name} · {dateLabel(item.created_at)}</option>)}</select></label>{variantId && <button className="generation-button" disabled={!!draft || editorBusy} onClick={() => { setVariantId(null); setOpenedVariant(null); resetEditing() }}><RotateCcw size={14} />К исходному расписанию</button>}</div>}
          {variants.error && <ErrorBox message={variants.error} onRetry={variants.reload} />}
          {variantRequest.error && variantId && <ErrorBox message={variantRequest.error} onRetry={variantRequest.reload} />}
          {variantId && !savedVariant && variantRequest.loading && <Loading />}
          {schedule?.run && <>
            <div className="rounded-2xl border border-border bg-surface p-4 sm:p-5 space-y-4"><div className="flex flex-wrap justify-between gap-3"><div><h3 className="font-semibold text-lg">{draft ? 'Несохранённые правки' : savedVariant ? savedVariant.variant?.name : 'Результат генерации'}</h3><p className="text-xs text-muted mt-1">{holder ? (kind === 'groups' ? groupLabel(holder.name) : teacherLabel(holder.name)) : ''} · {viewSemester ? semesterLabel(viewSemester) : ''} · {viewSemester?.modules.find((item) => item.id === confirmedRun.module) ? periodLabel(viewSemester.modules.find((item) => item.id === confirmedRun.module)!) : 'весь период'}</p></div>{savedVariant && <span className="generation-badge bg-accent-soft text-accent">Ручной вариант</span>}</div><div className="grid sm:grid-cols-3 gap-3"><div className="generation-stat"><CheckCircle2 size={18} className="text-emerald-600" /><div><p className="text-sm font-semibold">{runStatusLabel(confirmedRun.status)}</p><p className="text-xs text-muted mt-1">{schedule.scheduled_classes.length} пар в недельном расписании</p></div></div><div className="generation-stat"><Clock3 size={18} className="text-accent" /><div><p className="text-sm font-semibold">{confirmedRun.solver_diagnostics?.proven_optimal ? 'Лучший вариант найден' : 'Поиск завершён без доказательства оптимальности'}</p><p className="text-xs text-muted mt-1">{confirmedRun.solve_time_seconds?.toFixed(2) ?? '—'} с поиска · исходный расчёт</p></div></div><div className="generation-stat"><span className={`w-2 h-2 rounded-full ${roomMissing ? 'bg-amber-500' : 'bg-emerald-500'}`} /><div><p className="text-sm font-semibold">{roomMissing ? `Без аудитории: ${roomMissing}` : 'Аудитории назначены'}</p><p className="text-xs text-muted mt-1">{schedule.fixed_pd_snapshot.length} фиксированных занятий ПД</p></div></div></div>
              <details className="text-xs text-muted"><summary className="cursor-pointer flex gap-1 items-center">Условия сохранённого расчёта<ChevronDown size={13} /></summary>{resultSettings ? <ul className="mt-3 space-y-1">{settingsSummary(resultSettings, savedBuildings).map((line) => <li key={line}>{line}</li>)}<li className="pt-1">Поиск: {resultSettings.search.time_limit_seconds} с, вариант поиска {resultSettings.search.seed}. Остальные правила выключены.</li></ul> : <p className="mt-2">У исторического расчёта нет снимка условий. Для ручного редактирования создайте новый расчёт.</p>}</details>
              <details className="text-xs text-muted"><summary className="cursor-pointer">Подробности результата</summary><p className="mt-2 break-words">{confirmedRun.message}</p></details>
            </div>
            <GenerationValidation report={validation} />
            {confirmedRun.status !== 'SOLVED' && <p className="text-sm rounded-xl border border-amber-200 bg-amber-50 text-amber-900 p-4">Нагрузка размещена не полностью. {confirmedRun.status === 'UNKNOWN' ? 'Решение не найдено за лимит времени; невозможность не доказана.' : 'Проверьте сообщения о пропущенных занятиях.'}</p>}
            {schedule.issues.length > 0 && <ul className="rounded-xl border border-border p-4 text-sm space-y-1">{schedule.issues.map((issue) => <li key={issue.id}>{issue.text}</li>)}</ul>}
            <div className="flex flex-wrap justify-between items-center gap-3"><p className="text-xs text-muted max-w-3xl leading-relaxed">Расписание повторяется каждую неделю в пределах выбранных дат. ПД закреплена по точному времени и относится только к её участникам. Лимиты считаются персонально; ПД 14:30–17:40 занимает номера 4 и 5. Проверяется только сохранённый срез данных.</p>{canEdit && !editing && <button className="generation-button" onClick={() => openEditor()}>Редактировать расписание</button>}</div>
            {!!schedule.scheduled_classes.length || !!schedule.fixed_pd_snapshot.length ? <GeneratedCalendar key={`${runId}-${kind}-${holder?.id}-${variantId}`} schedule={schedule} slots={resultSlots} groupName={kind === 'groups' ? holder?.name : undefined} onEditClass={canEdit && !editorBusy ? openEditor : undefined} onDropClass={canEdit && !editorBusy && !running ? onDropClass : undefined} /> : <Empty text="В этом расчёте нет занятий для выбранного представления." />}
            {editing && sourceSchedule && canEdit && <GenerationEditor key={`${runId}-${variantId}`} source={sourceSchedule} variantId={variantId} slots={resultSlots} selectedClassId={editClassId} dropProposal={dropProposal} onBusyChange={onEditorBusyChange} onSelect={setEditClassId} onClose={resetEditing} onDraft={setDraft} onSaved={(value) => { setOpenedVariant(value); setVariantId(value.variant!.id); setDraft(null); setEditing(false); setEditClassId(null); variants.reload() }} />}
          </>}
        </>}
      </section>
    </>}
  </div>
}
function SlidersIcon() { return <Sparkles size={15} /> }
