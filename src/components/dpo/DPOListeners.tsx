import { useState } from 'react'
import { ChevronDown, Plus, Trash2, X } from 'lucide-react'
import type { DPOStudent } from '../../lib/dpo'
import type { DPOFormGroup } from '../../lib/dpoWorkflow'
import { matchesSearch } from '../../lib/directory'

interface Props {
  groups: DPOFormGroup[]
  students: DPOStudent[]
  onChange: (groups: DPOFormGroup[]) => void
  onAddGroup: () => string
  canRemoveGroup: (key: string) => boolean
}
export default function DPOListeners({ groups, students, onChange, onAddGroup, canRemoveGroup }: Props) {
  const [openGroup, setOpenGroup] = useState<string | null>(groups[0]?.key ?? null)
  const [addingTo, setAddingTo] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [sourceGroup, setSourceGroup] = useState(0)
  const changeGroup = (key: string, patch: Partial<DPOFormGroup>) => onChange(groups.map(group => group.key === key ? { ...group, ...patch } : group))
  const openPicker = (key: string) => { setAddingTo(key); setQuery(''); setSourceGroup(0) }
  return <div className="space-y-4">
    <div><h2 className="font-semibold text-lg">Группы и слушатели</h2><p className="text-sm text-muted mt-1">Откройте группу, чтобы увидеть её состав. Основные учебные группы студентов сохранятся.</p></div>
    {groups.map(group => {
      const remaining = students.filter(student => !group.students.includes(student.id))
      const sourceGroups = [...new Map(remaining.map(student => [student.group, student.group_name])).entries()]
      const activeSourceGroup = sourceGroups.some(([id]) => id === sourceGroup) ? sourceGroup : 0
      const available = remaining.filter(student => (!activeSourceGroup || student.group === activeSourceGroup) && matchesSearch(`${student.full_name} ${student.group_name}`, query))
      return <details key={group.key} open={openGroup === group.key} className="rounded-xl border border-border group">
        <summary className="flex items-center justify-between gap-3 cursor-pointer list-none p-4" onClick={event => { event.preventDefault(); setOpenGroup(openGroup === group.key ? null : group.key) }}>
          <span className="text-sm font-semibold">{group.name || 'Без названия'}<span className="block text-xs font-normal text-muted mt-1">В составе: {group.students.length}</span></span><ChevronDown size={17} className="shrink-0 group-open:rotate-180 transition-transform" />
        </summary>
        <div className="p-4 pt-0 space-y-4">
          <div className="flex items-end gap-2"><label className="text-sm flex-1">Название группы ДПО<input className="generation-input" maxLength={40} value={group.name} onChange={event => changeGroup(group.key, { name: event.target.value })} /></label>{groups.length > 1 && <button type="button" className="generation-button" disabled={!canRemoveGroup(group.key)} title="Группу с сохранённым расписанием нельзя удалить" aria-label={`Удалить группу ${group.name}`} onClick={() => { onChange(groups.filter(item => item.key !== group.key)); setOpenGroup(null) }}><Trash2 size={16} /></button>}</div>
          {group.students.length ? <ul aria-label={`Состав группы ${group.name}`} className="divide-y divide-border">{group.students.map(id => {
            const student = students.find(item => item.id === id)
            return <li key={id} className="flex items-center justify-between gap-3 py-3"><div className="text-sm font-medium">{student?.full_name ?? `Студент №${id}`}<p className="text-xs font-normal text-muted mt-1">{student ? `Основная группа: ${student.group_name}` : 'Нет в текущем справочнике'}</p></div><button type="button" className="generation-button" aria-label={`Убрать ${student?.full_name ?? `студента №${id}`} из группы ${group.name}`} onClick={() => changeGroup(group.key, { students: group.students.filter(studentId => studentId !== id) })}><X size={15} />Убрать</button></li>
          })}</ul> : <p className="text-sm text-muted">В группе пока нет слушателей.</p>}
          {addingTo !== group.key && remaining.length > 0 && <button type="button" className="generation-button" onClick={() => openPicker(group.key)}><Plus size={15} />Добавить слушателей</button>}
          {!remaining.length && <p className="text-xs text-muted">Все студенты из справочника уже добавлены в эту группу.</p>}
          {addingTo === group.key && remaining.length > 0 && <section aria-label={`Добавление слушателей в ${group.name}`} className="rounded-xl bg-surface-2 p-3 space-y-3">
            <div className="flex items-center justify-between gap-3"><h3 className="text-sm font-medium">Кого добавить?</h3><button type="button" className="generation-button" onClick={() => setAddingTo(null)}>Готово</button></div>
            <div className="grid sm:grid-cols-2 gap-3"><label className="text-sm">Поиск студента<input type="search" className="generation-input" placeholder="Имя или учебная группа" value={query} onChange={event => setQuery(event.target.value)} /></label><label className="text-sm">Основная учебная группа<select className="generation-input" value={activeSourceGroup} onChange={event => setSourceGroup(Number(event.target.value))}><option value={0}>Все группы</option>{sourceGroups.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label></div>
            <ul className="max-h-64 overflow-auto divide-y divide-border">{available.map(student => <li key={student.id} className="flex items-center justify-between gap-3 py-3"><div className="text-sm">{student.full_name}<p className="text-xs text-muted mt-1">{student.group_name}</p></div><button type="button" className="generation-button" aria-label={`Добавить ${student.full_name} в группу ${group.name}`} onClick={() => { changeGroup(group.key, { students: [...group.students, student.id] }); if (remaining.length === 1) setAddingTo(null) }}><Plus size={14} />Добавить</button></li>)}</ul>
            {!available.length && <p className="text-sm text-muted">По вашему запросу никого нет. Измените поиск или учебную группу.</p>}
          </section>}
        </div>
      </details>
    })}
    <button type="button" className="generation-button" onClick={() => { setOpenGroup(onAddGroup()); setAddingTo(null) }}><Plus size={15} />Создать группу ДПО</button>
    <p className="text-xs text-muted">Изменения состава сохранятся при нажатии «Составить расписание». Для уже рассчитанной программы после изменения слушателей нужен новый расчёт.</p>
  </div>
}
