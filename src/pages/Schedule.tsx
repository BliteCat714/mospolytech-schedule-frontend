import { Fragment, useMemo, useState, type CSSProperties } from 'react'
import { format, addDays, startOfWeek, parseISO } from 'date-fns'
import { ru } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, CalendarDays, Star, ArrowLeft } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { profileTarget, targetKey } from '../lib/directory'
import { api, errText } from '../lib/api'
import type { ImportedScheduleResponse, Lesson, ScheduleResponse } from '../lib/types'
import { classToLesson, fixedPDToLesson, importedToLesson, lessonsForDay, SLOT_TIMES } from '../lib/schedule'
import { useAsync } from '../lib/useAsync'
import LessonCard from '../components/LessonCard'
import LessonDetails from '../components/LessonDetails'
import WeekPicker from '../components/WeekPicker'
import { Empty, ErrorBox, Loading } from '../components/Status'

type ScheduleData = { lessons: Lesson[]; imported?: boolean; sourceDate?: string; firstDate?: string; skipped?: number }

export default function Schedule() {
    const { user, semester, viewedSchedule, favorites, toggleFavorite, viewSchedule } = useApp()
    const target = viewedSchedule
    const isOwn = !!user && !!target && targetKey(profileTarget(user)) === targetKey(target)
    const isFavorite = !!target && favorites.some((f) => targetKey(f) === targetKey(target))
    const [current, setCurrent] = useState(new Date())
    const [pickerOpen, setPickerOpen] = useState(false)
    const [actionError, setActionError] = useState<string | null>(null)
    const [selection, setSelection] = useState<{ id: string; date: Date } | null>(null)

    const weekStart = startOfWeek(current, { weekStartsOn: 1 })
    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
    const todayIndex = days.findIndex((d) => d.toDateString() === new Date().toDateString())

    const semesterId = semester.data?.id
    const imported = target?.kind === 'teacher'
    const data = useAsync<ScheduleData>(
        async (signal) => {
            if (!target) return { lessons: [] }
            if (imported) {
                const path = `imported/teachers/${target.id}/schedule/`
                const first = await api.get<ImportedScheduleResponse>(path, { page_size: 1000 }, signal)
                const rules = [...first.results]
                let next = first.next
                let page = 2
                while (next) {
                    const result = await api.get<ImportedScheduleResponse>(path, {
                        page: page++, page_size: 1000, import_id: first.schedule_import?.id,
                    }, signal)
                    rules.push(...result.results)
                    next = result.next
                }
                // Номер/чётность недели пока не интерпретируются парсером.
                const usable = rules.filter((r) => !r.week_raw?.trim() && r.start && r.end && r.date_from && r.date_to)
                return {
                    lessons: usable.map(importedToLesson), imported: true,
                    sourceDate: first.schedule_import?.source_metadata.date,
                    firstDate: usable.map((r) => r.date_from!).sort()[0],
                    skipped: rules.length - usable.length,
                }
            }
            if (semesterId === undefined) return { lessons: [] }
            const response = await api.get<ScheduleResponse>(
                `schedule/groups/${target.id}/`,
                { semester: semesterId },
                signal,
            )
            const lessons = [
                ...response.scheduled_classes.map(classToLesson),
                ...response.fixed_pd_snapshot.map(fixedPDToLesson),
            ]
            return { lessons }
        },
        [target?.id, target?.kind, imported, semesterId],
    )

    const allLessons = useMemo(() => data.data?.lessons ?? [], [data.data])
    const selectedLesson = selection ? allLessons.find((lesson) => lesson.id === selection.id) : undefined
    const slots = useMemo(() => {
        const times = new Map(SLOT_TIMES.map((s) => [s.start, { ...s, n: s.n as number | null }]))
        for (const lesson of allLessons) {
            if (lesson.start && !times.has(lesson.start)) {
                times.set(lesson.start, { n: null, start: lesson.start, end: lesson.end })
            }
        }
        return [...times.values()].sort((a, b) => a.start.localeCompare(b.start))
    }, [allLessons])
    const filterDay = (date: Date) => lessonsForDay(allLessons, date)

    const handleSelectDate = (d: Date) => {
        setSelection(null)
        setCurrent(startOfWeek(d, { weekStartsOn: 1 }))
    }

    const removePE = async (lesson: Lesson) => {
        setActionError(null)
        try {
            await api.delete(`pe/enrollments/${lesson.id.replace(/^pe-/, '')}/`)
            data.reload()
        } catch (e) {
            setActionError(errText(e))
        }
    }

    return (
        <div className="schedule-page w-full h-full min-h-0 flex flex-col">
            {/* Header */}
            <div className="flex flex-wrap items-end justify-between gap-3 mb-3 shrink-0">
                <div className="min-w-0 flex-1 basis-48">
                    <h1 className="text-xl font-bold leading-tight truncate" title={target?.name}>{isOwn ? 'Моё расписание' : `Расписание · ${target?.name ?? ''}`}</h1>
                    <p className="text-muted text-xs mt-0.5 truncate">
                        {isOwn && target ? `${target.name} · ` : ''}{`${format(weekStart, 'd MMM', { locale: ru })} – ${format(addDays(weekStart, 6), 'd MMM yyyy', { locale: ru })}`}
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {!isOwn && user && <button onClick={() => viewSchedule(profileTarget(user))}
                        className="h-10 px-3 flex items-center gap-2 rounded-xl border border-border bg-surface text-sm hover:bg-accent-soft hover:text-accent transition">
                        <ArrowLeft size={16} />Моё расписание
                    </button>}
                    {!isOwn && target && <button onClick={() => toggleFavorite(target)} aria-pressed={isFavorite}
                        className="h-10 px-3 flex items-center gap-2 rounded-xl border border-border bg-surface text-sm text-accent hover:bg-accent-soft transition">
                        <Star size={16} fill={isFavorite ? 'currentColor' : 'none'} />{isFavorite ? 'В избранном' : 'Добавить в избранное'}
                    </button>}
                    <div className="relative">
                        <button
                            onClick={() => setPickerOpen((v) => !v)}
                            aria-label="Выбрать неделю"
                            aria-expanded={pickerOpen}
                            aria-haspopup="dialog"
                            className="flex items-center justify-center gap-2 h-10 px-3 rounded-xl border border-border bg-surface hover:border-accent hover:text-accent transition text-sm"
                        >
                            <CalendarDays size={16} className="text-muted shrink-0" />
                            <span className="truncate">
                                {`${format(weekStart, 'd MMM', { locale: ru })} – ${format(addDays(weekStart, 6), 'd MMM', { locale: ru })}`}
                            </span>
                        </button>
                        {pickerOpen && (
                            <WeekPicker
                                selected={current}
                                onSelect={handleSelectDate}
                                onClose={() => setPickerOpen(false)}
                            />
                        )}
                    </div>


                    <button
                        onClick={() => handleSelectDate(addDays(weekStart, -7))}
                        aria-label="Предыдущая неделя"
                        className="w-10 h-10 inline-flex items-center justify-center rounded-xl border border-border bg-surface hover:bg-surface-2 transition"
                    >
                        <ChevronLeft size={16} />
                    </button>
                    <button
                        onClick={() => handleSelectDate(addDays(weekStart, 7))}
                        aria-label="Следующая неделя"
                        className="w-10 h-10 inline-flex items-center justify-center rounded-xl border border-border bg-surface hover:bg-surface-2 transition"
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>

            {((!imported && semester.loading) || data.loading) && <Loading />}
            {!imported && semester.error && <ErrorBox message={semester.error} onRetry={semester.reload} />}
            {data.error && <ErrorBox message={data.error} onRetry={data.reload} />}
            {actionError && <ErrorBox message={actionError} />}
            {!imported && !semester.loading && !semester.error && !semester.data && (
                <Empty text="Семестр ещё не создан" />
            )}
            {!data.loading && !data.error && (imported || semester.data) && allLessons.length === 0 && (
                <Empty text="Расписание пока не сформировано" />
            )}

            {!data.loading && !data.error && data.data?.imported && (
                <div className="mb-2 p-2 rounded-xl border border-border bg-surface text-xs shrink-0">
                    <p>Источник: rasp.dmami.ru{data.data.sourceDate ? ` · обновление ${data.data.sourceDate}` : ''}. Импорт требует проверки.</p>
                    {data.data.firstDate && <button className="text-accent mt-1" onClick={() => handleSelectDate(parseISO(data.data!.firstDate!))}>Открыть начало периода расписания</button>}
                    {!!data.data.skipped && <p className="text-muted mt-1">Не показано записей: {data.data.skipped}. Не определены даты, время или правило недели.</p>}
                </div>
            )}

            {!data.loading && allLessons.length > 0 && (
                <div className="schedule-viewport flex-1 min-h-0 overflow-auto">
                    <div
                        className="schedule-grid schedule-week"
                        style={{ '--slot-count': slots.length } as CSSProperties}
                    >
                        {todayIndex >= 0 && <div aria-hidden="true" className="schedule-today-column"
                            style={{ gridColumn: `${todayIndex + 2} / ${todayIndex + 3}` }} />}
                        <div className="schedule-axis-heading">Пара</div>
                        {days.map((d) => {
                            const isToday = d.toDateString() === new Date().toDateString()
                            return (
                                <div
                                    key={format(d, 'yyyy-MM-dd')}
                                    aria-current={isToday ? 'date' : undefined}
                                    title={isToday ? 'Сегодня' : undefined}
                                    className={`day-head flex items-center justify-center gap-1.5 text-xs ${isToday ? 'day-head-today' : ''}`}
                                >
                                    <span className="uppercase text-muted">{format(d, 'EEEEEE', { locale: ru })}</span>
                                    <span className="font-semibold">{format(d, 'd MMM', { locale: ru })}</span>
                                </div>
                            )
                        })}
                        {slots.map((slot) => (
                            <Fragment key={slot.start}>
                                <div className="schedule-axis" title={`${slot.start}–${slot.end}`}>
                                    <span className="schedule-axis-number">{slot.n ?? '•'}</span>
                                    <span className="schedule-axis-time">{slot.start}<br />–<br />{slot.end}</span>
                                </div>
                                {days.map((d) => {
                                    const cell = filterDay(d).filter((l) => l.start === slot.start)
                                    return (
                                        <div key={format(d, 'yyyy-MM-dd')}
                                            className={`schedule-cell ${d.toDateString() === new Date().toDateString() ? 'schedule-cell-today' : ''}`}>
                                            {cell.length === 0 ? <div className="empty-slot h-full" /> : cell.map((l) => (
                                                <LessonCard key={l.id} lesson={l}
                                                    selected={selection?.id === l.id && selection.date.toDateString() === d.toDateString()}
                                                    onOpen={() => { setPickerOpen(false); setSelection({ id: l.id, date: d }) }}
                                                    onRemove={isOwn && user?.role === 'student' && user.studentId && l.type === 'pe' ? () => removePE(l) : undefined} />
                                            ))}
                                        </div>
                                    )
                                })}
                            </Fragment>
                        ))}
                    </div>
                </div>
            )}
            {selectedLesson && selection && <LessonDetails lesson={selectedLesson} date={selection.date}
                semester={!imported ? semester.data?.name : undefined}
                userGroup={isOwn && target?.kind === 'group' ? target.name : undefined}
                onClose={() => setSelection(null)} />}
        </div>
    )
}
