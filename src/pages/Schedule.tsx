import { Fragment, useMemo, useState } from 'react'
import { format, addDays, startOfWeek } from 'date-fns'
import { ru } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { lessons, type Lesson } from '../data/mock'
import {
    getLessonsForUser,
    getPElessonsForUser,
    SLOT_TIMES,
} from '../lib/schedule'
import LessonCard from '../components/LessonCard'
import DatePicker from '../components/DatePicker'

type ViewMode = 'day' | 'week'

export default function Schedule() {
    const { user, updateUser } = useApp()
    const [mode, setMode] = useState<ViewMode>('week')
    const [current, setCurrent] = useState(new Date())
    const [pickerOpen, setPickerOpen] = useState(false)

    const weekStart = startOfWeek(current, { weekStartsOn: 1 })
    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

    const allLessons = useMemo(
        () => [...lessons, ...getPElessonsForUser(user)],
        [user],
    )

    const filterDay = (date: Date) =>
        getLessonsForUser(allLessons, user?.group, user?.projectGroupId, date)

    const handleSelectDate = (d: Date) => {
        setCurrent(d)
        setMode('day')
    }

    const removePE = (lesson: Lesson) => {
        if (!user?.peSlots) return
        const slotId = lesson.id.replace(/^pe-/, '')
        updateUser({ peSlots: user.peSlots.filter((id) => id !== slotId) })
    }

    return (
        <div className="w-full max-w-[1400px] mx-auto">
            {/* Header */}
            <div className="grid grid-cols-[1fr_auto] items-end gap-3 mb-6">
                {/* Левая часть — занимает всё оставшееся место, но не влияет на правую */}
                <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-wider text-muted mb-1">
                        {mode === 'day' ? 'День' : 'Неделя'}
                    </p>
                    <h1 className="text-2xl font-bold leading-tight">Расписание</h1>
                    <p className="text-muted text-sm mt-0.5 min-h-[20px] truncate">
                        {mode === 'day'
                            ? format(current, 'd MMMM yyyy, EEEE', { locale: ru })
                            : `${format(weekStart, 'd MMM', { locale: ru })} – ${format(
                                addDays(weekStart, 6),
                                'd MMM yyyy',
                                { locale: ru },
                            )}`}
                    </p>
                </div>

                {/* Правая часть — всегда одной ширины, никогда не сжимается и не двигается */}
                <div className="flex items-center gap-2 shrink-0">
                    <div className="relative">
                        <button
                            onClick={() => setPickerOpen((v) => !v)}
                            className="flex items-center justify-center gap-2 w-[128px] h-10 px-3 rounded-xl border border-border bg-surface hover:border-accent hover:text-accent transition text-sm"
                        >
                            <CalendarDays size={16} className="text-muted shrink-0" />
                            <span className="truncate">
                                {format(current, 'd MMM', { locale: ru })}
                            </span>
                        </button>
                        {pickerOpen && (
                            <div className="absolute right-0 top-full z-50">
                                <DatePicker
                                    selected={current}
                                    onSelect={handleSelectDate}
                                    onClose={() => setPickerOpen(false)}
                                />
                            </div>
                        )}
                    </div>

                    <div className="flex bg-surface rounded-xl border border-border p-1 shadow-sm">
                        {(['day', 'week'] as ViewMode[]).map((m) => (
                            <button
                                key={m}
                                onClick={() => setMode(m)}
                                className={`w-[72px] h-8 inline-flex items-center justify-center text-sm rounded-lg transition ${mode === m
                                        ? 'bg-accent text-white shadow-sm'
                                        : 'text-muted hover:text-text'
                                    }`}
                            >
                                {m === 'day' ? 'День' : 'Неделя'}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={() => setCurrent(addDays(current, mode === 'day' ? -1 : -7))}
                        className="w-10 h-10 inline-flex items-center justify-center rounded-xl border border-border bg-surface hover:bg-surface-2 transition"
                    >
                        <ChevronLeft size={16} />
                    </button>
                    <button
                        onClick={() => setCurrent(addDays(current, mode === 'day' ? 1 : 7))}
                        className="w-10 h-10 inline-flex items-center justify-center rounded-xl border border-border bg-surface hover:bg-surface-2 transition"
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>
            

            {/* Day view */}
            {mode === 'day' && (
                <div className="overflow-x-auto min-h-[560px]">
                    <div className="grid grid-cols-[88px_1fr] gap-2 items-start content-start">
                        {SLOT_TIMES.map((slot) => {
                            const cell = filterDay(current).filter((l) => l.start === slot.start)
                            const isEmpty = cell.length === 0
                            return (
                                <Fragment key={slot.n}>
                                    <div className="pt-1">
                                        <p className="text-[11px] font-semibold text-text">
                                            {slot.n} пара
                                        </p>
                                        <p className="text-[10px] text-muted">
                                            {slot.start}–{slot.end}
                                        </p>
                                    </div>

                                    <div className="min-h-[84px] flex flex-col gap-2">
                                        {isEmpty ? (
                                            <div className="flex-1 empty-slot flex items-center justify-center">
                                                <span className="text-xs font-medium text-muted bg-surface/80 backdrop-blur-[1px] px-2 py-1 rounded-md">
                                                    нет пары
                                                </span>
                                            </div>
                                        ) : (
                                            cell.map((l) => (
                                                <LessonCard
                                                    key={l.id}
                                                    lesson={l}
                                                    onRemove={l.type === 'pe' ? () => removePE(l) : undefined}
                                                />
                                            ))
                                        )}
                                    </div>
                                </Fragment>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* Week view */}
            {mode === 'week' && (
                <div className="overflow-x-auto min-h-[560px]">
                    <div className="min-w-[1100px]">
                        {/* Заголовки дней */}
                        <div className="grid grid-cols-[88px_repeat(7,1fr)] gap-2 mb-2">
                            <div />
                            {days.map((d) => {
                                const isToday = d.toDateString() === new Date().toDateString()
                                return (
                                    <button
                                        key={d.toISOString()}
                                        onClick={() => handleSelectDate(d)}
                                        className={`day-head text-center ${isToday ? '!bg-accent-soft text-accent' : ''
                                            }`}
                                    >
                                        <p className="text-[11px] text-muted uppercase tracking-wide">
                                            {format(d, 'EEEEEE', { locale: ru })}
                                        </p>
                                        <p className="text-sm font-semibold">
                                            {format(d, 'd MMM', { locale: ru })}
                                        </p>
                                    </button>
                                )
                            })}
                        </div>

                        {/* Строки = номера пар */}
                        {SLOT_TIMES.map((slot) => (
                            <div
                                key={slot.n}
                                className="grid grid-cols-[88px_repeat(7,1fr)] gap-2 mb-2 items-start"
                            >
                                <div className="pt-1">
                                    <p className="text-[11px] font-semibold text-text">
                                        {slot.n} пара
                                    </p>
                                    <p className="text-[10px] text-muted">
                                        {slot.start}–{slot.end}
                                    </p>
                                </div>

                                {days.map((d) => {
                                    const cell = filterDay(d).filter((l) => l.start === slot.start)
                                    return (
                                        <div
                                            key={d.toISOString()}
                                            className="min-h-[84px] h-full flex flex-col gap-2"
                                        >
                                            {cell.length === 0 ? (
                                                <div className="flex-1 empty-slot" />
                                            ) : (
                                                cell.map((l) => (
                                                    <div key={l.id} className="flex-1">
                                                        <LessonCard
                                                            lesson={l}
                                                            onRemove={
                                                                l.type === 'pe' ? () => removePE(l) : undefined
                                                            }
                                                        />
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}