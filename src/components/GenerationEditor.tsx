import { useEffect, useRef, useState } from 'react'
import { ArrowLeftRight, Check, MapPin, MoveRight, Save, Undo2, X } from 'lucide-react'
import { api, ApiError, errText } from '../lib/api'
import type { GeneratedSchedule, GenerationSlot, ManualSchedule, PlacementChange, SnapshotRoom, ValidationReport } from '../lib/generation'
import { generationDays } from '../lib/generationSettings'
import { mergePlacementChanges } from '../lib/generationManual'
import { changesForGenerationDrop } from '../lib/generationDrag'
import type { GenerationDropProposal } from '../lib/generationDrag'
import GenerationValidation from './GenerationValidation'
import { ErrorBox } from './Status'

const button = 'generation-button'
interface Props {
  source: GeneratedSchedule
  variantId: number | null
  slots: GenerationSlot[]
  selectedClassId: number | null
  onSelect: (id: number | null) => void
  onDraft: (schedule: ManualSchedule | null) => void
  onSaved: (schedule: ManualSchedule) => void
  onClose: () => void
  dropProposal?: GenerationDropProposal | null
  onBusyChange?: (busy: boolean) => void
}
export default function GenerationEditor({ source, variantId, slots, selectedClassId, onSelect, onDraft, onSaved, onClose, dropProposal, onBusyChange }: Props) {
  const [changes, setChanges] = useState<PlacementChange[]>([])
  const [draft, setDraft] = useState<ManualSchedule | null>(null)
  const [mode, setMode] = useState<'move' | 'swap'>('move')
  const [slotId, setSlotId] = useState(0)
  const [swapId, setSwapId] = useState(0)
  const [roomChoice, setRoomChoice] = useState<string>('keep')
  const [rooms, setRooms] = useState<SnapshotRoom[] | null>(null)
  const [candidate, setCandidate] = useState<{ changes: PlacementChange[]; result: ManualSchedule } | null>(null)
  const [name, setName] = useState('Мой вариант расписания')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saveValidation, setSaveValidation] = useState<ValidationReport | null>(null)
  const requestVersion = useRef(0)
  const handledDropNonce = useRef<number | null>(null)
  const busyRef = useRef(false)
  const busyCallback = useRef(onBusyChange)
  busyCallback.current = onBusyChange
  const acceptedSelection = useRef(selectedClassId)
  const setOperationBusy = (value: boolean) => {
    busyRef.current = value
    setBusy(value)
    busyCallback.current?.(value)
  }
  useEffect(() => () => {
    requestVersion.current++; handledDropNonce.current = null
    busyRef.current = false; busyCallback.current?.(false)
  }, [])
  useEffect(() => { busyCallback.current?.(busy) }, [busy])
  useEffect(() => {
    // A stale external selection must not discard acknowledgement of a save
    // that the backend may already have committed. Process it after completion.
    if (busyRef.current || acceptedSelection.current === selectedClassId) return
    acceptedSelection.current = selectedClassId
    requestVersion.current++
    setCandidate(null); setRooms(null); setError(null)
    setSlotId(0); setSwapId(0); setRoomChoice('keep')
  }, [selectedClassId, busy])
  const current = draft ?? source
  const selected = current.scheduled_classes.find((item) => item.id === selectedClassId)
  const second = current.scheduled_classes.find((item) => item.id === swapId)
  const currentSlot = (id: number) => draft?.placements?.find((item) => item.class_id === id)?.slot_id ?? current.scheduled_classes.find((item) => item.id === id)?.slot
  const invalidate = () => { requestVersion.current++; setCandidate(null); setRooms(null); setError(null); setSaveValidation(null) }
  const pendingChanges = () => {
    if (!selected) return changes
    const next: PlacementChange[] = []
    if (mode === 'swap' && second) {
      const a = currentSlot(selected.id), b = currentSlot(second.id)
      if (a && b) next.push({ class_id: selected.id, slot_id: b }, { class_id: second.id, slot_id: a })
    } else next.push({ class_id: selected.id, slot_id: slotId || currentSlot(selected.id) })
    if (roomChoice !== 'keep' && selected.format !== 'ONLINE') {
      const room = roomChoice === 'none' ? null : Number(roomChoice)
      const item = next.find((entry) => entry.class_id === selected.id)
      if (item) item.room_id = room
    }
    return mergePlacementChanges(changes, next)
  }
  const body = (next: PlacementChange[]) => ({ run_id: source.run!.id, variant_id: variantId, changes: next })
  const checkPreview = async (next: PlacementChange[]) => {
    if (busyRef.current) return
    const version = ++requestVersion.current
    setOperationBusy(true); setError(null); setCandidate(null); setSaveValidation(null)
    try {
      const result = await api.post<ManualSchedule>('schedule/manual-variants/preview/', body(next))
      if (version === requestVersion.current) setCandidate({ changes: next, result })
    } catch (e) { if (version === requestVersion.current) setError(errText(e)) }
    finally { if (version === requestVersion.current) setOperationBusy(false) }
  }
  const preview = () => checkPreview(pendingChanges())
  useEffect(() => {
    if (!dropProposal || handledDropNonce.current === dropProposal.nonce) return
    if (busyRef.current) { handledDropNonce.current = dropProposal.nonce; return }
    if (selectedClassId !== dropProposal.classId) { onSelect(dropProposal.classId); return }
    handledDropNonce.current = dropProposal.nonce
    requestVersion.current++
    setCandidate(null); setRooms(null); setError(null); setSaveValidation(null)
    setRoomChoice('keep'); setMode(dropProposal.swapClassId ? 'swap' : 'move')
    setSlotId(dropProposal.slotId); setSwapId(dropProposal.swapClassId ?? 0)
    const proposed = changesForGenerationDrop(dropProposal, current.scheduled_classes)
    if (!proposed.length || !slots.some((slot) => slot.id === dropProposal.slotId)) {
      setOperationBusy(false); setError('Выбранные пары или время больше не доступны. Выберите их в редакторе заново.'); return
    }
    const version = requestVersion.current
    const next = mergePlacementChanges(changes, proposed)
    // React StrictMode replays mount effects. Wait until their cleanup has had
    // a chance to invalidate this proposal before dispatching a read-only POST.
    void Promise.resolve().then(() => { if (version === requestVersion.current) return checkPreview(next) })
  }, [dropProposal?.nonce, selectedClassId])
  const findRooms = async () => {
    if (!selected || busyRef.current) return
    const version = ++requestVersion.current
    setOperationBusy(true); setError(null); setSaveValidation(null)
    try {
      const response = await api.post<{ rooms: SnapshotRoom[] }>('schedule/manual-variants/rooms/', { ...body(pendingChanges()), class_id: selected.id })
      if (version === requestVersion.current) setRooms(response.rooms)
    } catch (e) { if (version === requestVersion.current) setError(errText(e)) }
    finally { if (version === requestVersion.current) setOperationBusy(false) }
  }
  const save = async () => {
    if (!changes.length || busyRef.current) return
    const version = ++requestVersion.current
    setOperationBusy(true); setError(null); setSaveValidation(null)
    try {
      const response = await api.post<ManualSchedule>('schedule/manual-variants/', { ...body(changes), name: name.trim() || 'Мой вариант расписания' })
      if (version === requestVersion.current) { onDraft(null); onSaved(response) }
    } catch (e) {
      if (version === requestVersion.current) {
        setError(errText(e))
        if (e instanceof ApiError && e.body && typeof e.body === 'object' && 'validation' in e.body) setSaveValidation(e.body.validation as ValidationReport)
      }
    }
    finally { if (version === requestVersion.current) setOperationBusy(false) }
  }
  return <section id="generation-editor" tabIndex={-1} className="rounded-2xl border border-accent/20 bg-surface p-4 sm:p-5 space-y-4 scroll-mt-6 focus:outline-none" aria-label="Ручное редактирование">
    <div className="flex flex-wrap justify-between gap-2"><div><h3 className="font-semibold">Изменить расписание</h3><p className="text-xs text-muted mt-1">Перенос и обмен затрагивают только выбранные пары. Исходный расчёт сохраняется.</p></div><div className="flex flex-wrap items-center gap-2">{changes.length > 0 && <span className="generation-badge bg-accent-soft text-accent">Есть несохранённые изменения</span>}<button type="button" className={button} onClick={onClose} disabled={busy}><X size={15} />{changes.length ? 'Отменить и закрыть' : 'Закрыть редактор'}</button></div></div>
    <label className="block text-xs text-muted">Какую пару изменить<select className="generation-input" value={selected?.id ?? ''} disabled={busy} onChange={(e) => { onSelect(Number(e.target.value)); setSlotId(0); setSwapId(0); setRoomChoice('keep'); invalidate() }}><option value="">Выберите пару в календаре или списке</option>{current.scheduled_classes.map((item) => <option value={item.id} key={item.id}>{generationDays[item.slot_day]?.short}, {item.slot_lesson_number} пара · {item.subject_name} · {item.format === 'ONLINE' ? 'Онлайн' : item.room_name ?? 'без аудитории'}</option>)}</select></label>
    {selected && <>
      <div className="flex gap-2"><button type="button" aria-pressed={mode === 'move'} className={button} disabled={busy} onClick={() => { setMode('move'); invalidate() }}><MoveRight size={15} />Перенести пару</button><button type="button" aria-pressed={mode === 'swap'} className={button} disabled={busy} onClick={() => { setMode('swap'); invalidate() }}><ArrowLeftRight size={15} />Обменять две пары</button></div>
      <div className="grid md:grid-cols-2 gap-3">
        {mode === 'move' ? <label className="text-xs text-muted">Куда перенести<select aria-label="Новое время занятия" className="generation-input" value={slotId || currentSlot(selected.id) || ''} disabled={busy} onChange={(e) => { setSlotId(Number(e.target.value)); invalidate() }}>{slots.map((slot) => <option value={slot.id} key={slot.id}>{generationDays[slot.day_of_week]?.name} · {slot.lesson_number} пара · {slot.start_time?.slice(0, 5)}–{slot.end_time?.slice(0, 5)}</option>)}</select></label>
          : <label className="text-xs text-muted">С какой парой обменять<select aria-label="Вторая пара для обмена" className="generation-input" value={swapId} disabled={busy} onChange={(e) => { setSwapId(Number(e.target.value)); invalidate() }}><option value={0}>Выберите пару</option>{current.scheduled_classes.filter((item) => item.id !== selected.id).map((item) => <option value={item.id} key={item.id}>{generationDays[item.slot_day]?.short}, {item.slot_lesson_number} пара · {item.subject_name}</option>)}</select></label>}
        {selected.format !== 'ONLINE' && <label className="text-xs text-muted">Аудитория<select aria-label="Аудитория для переноса" className="generation-input" value={roomChoice} disabled={busy} onChange={(e) => { setRoomChoice(e.target.value); requestVersion.current++; setCandidate(null); setError(null) }}><option value="keep">Оставить {selected.room_name ?? 'без аудитории'}</option><option value="none">Пока без аудитории</option>{rooms?.map((room) => <option value={room.id} key={room.id}>{room.name} · {room.effective_capacity ?? '?'} мест{room.capacity_assumption != null || room.capacity_origin === 'demo_assumption' || room.capacity_source === 'Допущение демо' ? ' · Допущение демо' : ''}</option>)}</select></label>}
      </div>
      {mode === 'swap' && second && <p className="text-xs rounded-xl bg-accent-soft p-3">«{selected.subject_name}» → {generationDays[second.slot_day]?.short}, {second.slot_lesson_number} пара. «{second.subject_name}» → {generationDays[selected.slot_day]?.short}, {selected.slot_lesson_number} пара. Обе позиции освобождаются перед проверкой.</p>}
      {roomChoice === 'none' && <p className="text-xs text-amber-700 dark:text-amber-300">Нужно назначить аудиторию. Вариант можно сохранить с этой пометкой; проверки вместимости и дороги могут остаться незавершёнными.</p>}
      <div className="flex flex-wrap gap-2"><button type="button" className={button} disabled={busy || (mode === 'swap' && !second)} onClick={preview}><Check size={15} />{busy ? 'Проверяем…' : mode === 'swap' ? 'Проверить обмен' : 'Проверить перенос'}</button>{selected.format !== 'ONLINE' && <button type="button" className={button} onClick={findRooms} disabled={busy || (mode === 'swap' && !second)}><MapPin size={15} />Подобрать аудиторию</button>}</div>
      {rooms && <p className="text-xs text-muted">{rooms.length ? `Подходящих аудиторий: ${rooms.length}. Выберите в поле выше. Сначала тот же корпус и этаж, затем близкие номера и другие этажи.` : 'Подходящие свободные аудитории не найдены.'} Это проверка в пределах сохранённого среза, не всего университета.</p>}
      {candidate && <div className="space-y-3"><GenerationValidation report={candidate.result.validation} />{candidate.result.validation.valid && <div className="flex flex-wrap items-center gap-3"><span className="text-sm text-emerald-700 dark:text-emerald-300">Известных блокирующих конфликтов нет</span><button type="button" className="generation-primary" onClick={() => { setChanges(candidate.changes); setDraft(candidate.result); onDraft(candidate.result); setCandidate(null); setSlotId(0); setRoomChoice('keep'); setRooms(null) }}>Применить {mode === 'swap' ? 'обмен' : 'перенос'}</button></div>}</div>}
    </>}
    {error && <ErrorBox message={error} />}
    <GenerationValidation report={saveValidation} />
    {changes.length > 0 && <div className="border-t border-border pt-4 space-y-3"><GenerationValidation report={draft?.validation} /><div className="flex flex-wrap items-end gap-2"><label className="text-xs text-muted flex-1 min-w-40">Название варианта<input className="generation-input" value={name} maxLength={120} disabled={busy} onChange={(e) => setName(e.target.value)} /></label><button type="button" className="generation-primary" onClick={save} disabled={busy}><Save size={15} />Сохранить вариант</button><button type="button" className={button} disabled={busy} onClick={() => { invalidate(); setChanges([]); setDraft(null); onDraft(null) }}><Undo2 size={15} />Отменить правки</button></div></div>}
  </section>
}
