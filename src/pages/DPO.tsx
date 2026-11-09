import { useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, GraduationCap, Plus, Trash2 } from 'lucide-react'
import { dpoDemoApi, validateDemoProgram } from '../lib/dpoDemo'
import type { DemoProgram } from '../lib/dpoDemo'
import { useAsync } from '../lib/useAsync'
import { Empty, ErrorBox, Loading } from '../components/Status'

const steps = ['Программа', 'Слушатели', 'Дисциплины', 'Расписание']
const secondary = 'generation-button'
const today = () => { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}` }
export default function DPO() {
  const catalog = useAsync(() => dpoDemoApi.catalog(), [])
  const [step, setStep] = useState(0)
  const [program, setProgram] = useState<DemoProgram>(() => ({ name: '', start: today(), end: today(), groups: [{ id: 1, name: 'Группа ДПО 1', students: [] }], disciplines: [{ id: 1, title: '', teacher: 1, hours: 18 }] }))
  const nextId = useRef(2)
  const [query, setQuery] = useState('')
  const [sourceGroup, setSourceGroup] = useState('')
  const [activeGroup, setActiveGroup] = useState(1)
  const [result, setResult] = useState<Awaited<ReturnType<typeof dpoDemoApi.plan>> | null>(null)
  const [pending, setPending] = useState(false)
  const busy = useRef(false)
  const [error, setError] = useState<string | null>(null)
  function update(patch: Partial<DemoProgram>) { setProgram(old => ({ ...old, ...patch })); setResult(null); setError(null) }
  function move(target: number) {
    if (target > step) { const problem = validateDemoProgram(program, step); if (problem) { setError(problem); return } }
    setError(null); setStep(target)
  }
  async function plan() {
    if (busy.current) return
    busy.current = true; setPending(true); setError(null)
    try { setResult(await dpoDemoApi.plan(program)) }
    catch (e) { setError(e instanceof Error ? e.message : 'Не удалось составить расписание.') }
    finally { busy.current = false; setPending(false) }
  }
  const group = program.groups.find(item => item.id === activeGroup) ?? program.groups[0]
  const students = catalog.data?.students ?? []
  const visible = students.filter(student => (!sourceGroup || student.group === sourceGroup) && `${student.name} ${student.group}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()))
  const uniqueStudents = new Set(program.groups.flatMap(item => item.students)).size
  return <div className="max-w-4xl mx-auto space-y-5 pb-6">
    <header><p className="flex items-center gap-2 text-xs font-semibold text-accent"><GraduationCap size={16} />ДОПОЛНИТЕЛЬНОЕ ОБУЧЕНИЕ</p><h1 className="text-2xl font-bold mt-2">Составить расписание ДПО</h1><p className="text-sm text-muted mt-2">Выберите слушателей и занятия. Их основное расписание остаётся на месте.</p></header>
    <p className="rounded-xl border border-border bg-surface-2 p-3 text-xs text-muted">Локальное демо: студенты, преподаватели и их занятость вымышлены. Расчёт показывает сценарий интерфейса на тестовых данных; результат не сохраняется на сервере. При обновлении страницы черновик сбросится.</p>
    <ol className="grid grid-cols-2 sm:grid-cols-4 gap-2" aria-label="Этапы программы">{steps.map((label, index) => <li key={label}><button type="button" disabled={index > step || pending} aria-current={index === step ? 'step' : undefined} onClick={() => move(index)} className={`w-full flex items-center gap-2 rounded-xl border p-3 text-sm text-left ${index === step ? 'border-accent bg-accent-soft text-accent' : 'border-border text-muted'} disabled:opacity-50`}><span>{index + 1}.</span>{label}</button></li>)}</ol>
    {error && <ErrorBox message={error} />}
    {catalog.loading ? <Loading /> : catalog.error ? <ErrorBox message={catalog.error} onRetry={catalog.reload} /> : <>
    <section className="card p-5 space-y-5" aria-label={steps[step]}>
      {step === 0 && <><h2 className="font-semibold text-lg">Что будем планировать?</h2><label className="block text-sm">Название программы<input className="generation-input" value={program.name} onChange={e => update({ name: e.target.value })} placeholder="Например, основы анализа данных" maxLength={200} /></label><div className="grid sm:grid-cols-2 gap-4"><label className="text-sm">Начало обучения<input type="date" className="generation-input" value={program.start} onChange={e => update({ start: e.target.value })} /></label><label className="text-sm">Окончание обучения<input type="date" className="generation-input" value={program.end} onChange={e => update({ end: e.target.value })} /></label></div></>}
      {step === 1 && <><div><h2 className="font-semibold text-lg">Кто будет учиться?</h2><p className="text-sm text-muted mt-1">Соберите группу ДПО из существующих студентов. Студенты останутся в своих основных учебных группах.</p></div>
        <div className="flex flex-wrap gap-2">{program.groups.map(item => <button type="button" key={item.id} className={secondary} aria-pressed={item.id === group.id} onClick={() => setActiveGroup(item.id)}>{item.name || 'Без названия'} · {item.students.length}</button>)}<button type="button" className={secondary} onClick={() => { const id = nextId.current++; update({ groups: [...program.groups, { id, name: `Группа ДПО ${program.groups.length + 1}`, students: [] }] }); setActiveGroup(id) }}><Plus size={14} />Ещё группа ДПО</button></div>
        <div className="flex items-end gap-2"><label className="block text-sm flex-1">Название группы ДПО<input className="generation-input" value={group.name} maxLength={50} onChange={e => update({ groups: program.groups.map(item => item.id === group.id ? { ...item, name: e.target.value } : item) })} /></label>{program.groups.length > 1 && <button type="button" className={secondary} aria-label="Удалить группу ДПО" onClick={() => { update({ groups: program.groups.filter(item => item.id !== group.id) }); setActiveGroup(program.groups.find(item => item.id !== group.id)!.id) }}><Trash2 size={16} /></button>}</div>
        <div className="grid sm:grid-cols-2 gap-3"><label className="text-sm">Поиск студента<input className="generation-input" type="search" placeholder="Имя или учебная группа" value={query} onChange={e => setQuery(e.target.value)} /></label><label className="text-sm">Основная учебная группа<select className="generation-input" value={sourceGroup} onChange={e => setSourceGroup(e.target.value)}><option value="">Все группы</option>{[...new Set(students.map(student => student.group))].map(name => <option key={name}>{name}</option>)}</select></label></div>
        <div className="grid sm:grid-cols-2 gap-2">{visible.map(student => <label key={student.id} className="flex items-center gap-3 rounded-xl border border-border p-3 cursor-pointer"><input type="checkbox" checked={group.students.includes(student.id)} onChange={e => update({ groups: program.groups.map(item => item.id === group.id ? { ...item, students: e.target.checked ? [...item.students, student.id] : item.students.filter(id => id !== student.id) } : item) })} /><span className="text-sm">{student.name}<span className="block text-xs text-muted">Основная группа: {student.group}</span></span></label>)}</div>{!visible.length && <Empty text="Студенты не найдены. Измените поиск." />}
        <p className="text-sm text-muted">В этой группе: {group.students.length}. Во всей программе: {uniqueStudents} слушателей.</p><p className="text-xs text-muted">{group.students.map(id => students.find(student => student.id === id)?.name).join(', ') || 'Выберите слушателей из списка.'}</p>
      </>}
      {step === 2 && <><div><h2 className="font-semibold text-lg">Что будут изучать?</h2><p className="text-sm text-muted mt-1">Укажите общий объём каждой дисциплины для каждой группы ДПО. Одна пара — два академических часа.</p></div>{program.disciplines.map((item, index) => <div key={item.id} className="rounded-xl border border-border p-4 space-y-3"><div className="flex justify-between items-center"><h3 className="text-sm font-medium">Дисциплина {index + 1}</h3>{program.disciplines.length > 1 && <button type="button" className={secondary} aria-label={`Удалить дисциплину ${index + 1}`} onClick={() => update({ disciplines: program.disciplines.filter(entry => entry.id !== item.id) })}><Trash2 size={14} /></button>}</div><label className="block text-sm">Название<input className="generation-input" maxLength={200} value={item.title} onChange={e => update({ disciplines: program.disciplines.map(entry => entry.id === item.id ? { ...entry, title: e.target.value } : entry) })} /></label><div className="grid sm:grid-cols-2 gap-3"><label className="text-sm">Преподаватель<select className="generation-input" value={item.teacher} onChange={e => update({ disciplines: program.disciplines.map(entry => entry.id === item.id ? { ...entry, teacher: Number(e.target.value) } : entry) })}>{catalog.data?.teachers.map(teacher => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}</select></label><label className="text-sm">Всего академических часов<input type="number" min={2} max={1000} step={2} className="generation-input" value={item.hours || ''} onChange={e => update({ disciplines: program.disciplines.map(entry => entry.id === item.id ? { ...entry, hours: Number(e.target.value) } : entry) })} /></label></div></div>)}<button type="button" className={secondary} onClick={() => update({ disciplines: [...program.disciplines, { id: nextId.current++, title: '', teacher: 1, hours: 18 }] })}><Plus size={14} />Добавить дисциплину</button></>}
      {step === 3 && <><div><h2 className="font-semibold text-lg">{program.name}</h2><p className="text-sm text-muted mt-1">{program.start} — {program.end} · {uniqueStudents} слушателей · групп ДПО: {program.groups.length}</p></div><ul className="text-sm space-y-2">{program.disciplines.map(item => <li key={item.id}>{item.title} · {item.hours} ак. ч. на группу · {catalog.data?.teachers.find(teacher => teacher.id === item.teacher)?.name}</li>)}</ul><button type="button" className="generation-primary" disabled={pending} onClick={() => void plan()}>{pending ? 'Составляем…' : result ? 'Пересчитать расписание' : 'Составить расписание'}</button><p className="text-xs text-muted">В демо подбираются свободные пары по тестовой занятости слушателей и преподавателей. Это предварительный макет результата, а не ответ серверного генератора.</p>
        {result && <div aria-live="polite" className="space-y-3"><p className="text-sm font-medium">Размещено пар: {result.lessons.length}{result.missing > 0 ? ` · Не удалось разместить: ${result.missing}. Попробуйте расширить период обучения.` : ''}</p><div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead className="text-xs text-muted"><tr><th className="p-2">Дата</th><th className="p-2">Пара</th><th className="p-2">Группа ДПО</th><th className="p-2">Занятие</th><th className="p-2">Преподаватель</th></tr></thead><tbody>{result.lessons.map((lesson, index) => <tr key={index} className="border-t border-border"><td className="p-2 whitespace-nowrap">{new Date(`${lesson.date}T12:00:00`).toLocaleDateString('ru-RU')}</td><td className="p-2">{lesson.pair}</td><td className="p-2">{lesson.group}</td><td className="p-2">{lesson.title}</td><td className="p-2">{lesson.teacher}</td></tr>)}</tbody></table></div></div>}
      </>}
    </section>
    <div className="flex justify-between gap-3">{step > 0 ? <button type="button" className={secondary} disabled={pending} onClick={() => move(step - 1)}><ArrowLeft size={15} />Назад</button> : <span />}{step < 3 && <button type="button" className="generation-primary" onClick={() => move(step + 1)}>Далее<ArrowRight size={15} /></button>}</div>
    </>}
  </div>
}
