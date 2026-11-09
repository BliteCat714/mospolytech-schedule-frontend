import { addDays, format } from 'date-fns'
import { lessonsForDay } from './schedule'
import type { Lesson, PairTime } from './types'

export interface Notice { kind: string; text: string }
const minutes = (value: string) => /^\d{2}:\d{2}$/.test(value) ? Number(value.slice(0, 2)) * 60 + Number(value.slice(3)) : NaN
function interval(lesson: Lesson, times: PairTime[]) {
  const slot = times.find((t) => t.pair === lesson.lessonNumber)
  return { start: minutes(lesson.start || slot?.start || ''), end: minutes(lesson.end || slot?.end || '') }
}
function building(lesson: Lesson) {
  const value = lesson.location?.trim() || ''
  return /дистан|онлайн|^ПД$|не указан/i.test(value) || /дистан|онлайн/i.test(lesson.format || '') ? '' : value
}

export function checkWeek(lessons: Lesson[], times: PairTime[], week: Date): Notice[] {
  const result: Notice[] = []
  for (let day = 0; day < 7; day++) {
    const date = addDays(week, day)
    const label = format(date, 'dd.MM')
    const entries = lessonsForDay(lessons, date).map((lesson) => ({ lesson, ...interval(lesson, times) }))
      .filter((e) => Number.isFinite(e.start) && e.end > e.start).sort((a, b) => a.start - b.start)
    const occupied = new Set(entries.map((e) => e.lesson.lessonNumber ? `pair:${e.lesson.lessonNumber}` : `${e.start}:${e.end}`))
    if (occupied.size === 1) result.push({ kind: 'Одна пара', text: `${label}: только одна пара — ${entries.map((e) => e.lesson.title).join(', ')}` })
    if (occupied.size > 4) result.push({ kind: 'Нагрузка', text: `${label}: ${occupied.size} пар за день` })
    for (let i = 0; i < entries.length; i++) {
      const a = entries[i]
      for (const b of entries.slice(i + 1)) {
        if (a.start < b.end && b.start < a.end) result.push({ kind: 'Наложение', text: `${label}: «${a.lesson.title}» и «${b.lesson.title}» пересекаются (${a.lesson.start || times.find((t) => t.pair === a.lesson.lessonNumber)?.start}–${b.lesson.end || times.find((t) => t.pair === b.lesson.lessonNumber)?.end})` })
      }
      // A gap begins only after all overlapping lessons have ended.
      const end = Math.max(...entries.slice(0, i + 1).map((e) => e.end))
      const next = entries[i + 1]
      if (!next || next.start < end) continue
      const free = times.filter((t) => minutes(t.start) >= end && minutes(t.end) <= next.start)
      if (free.length) result.push({ kind: 'Окно', text: `${label}: свободные пары ${free.map((t) => t.pair).join(', ')} между занятиями` })
      const from = building(a.lesson), to = building(next.lesson)
      if (from && to && from !== to && a.end === end) result.push({ kind: 'Переход', text: `${label}: после «${a.lesson.title}» ${from} → ${to}, перерыв ${next.start - end} мин.` })
    }
    const unknown = lessonsForDay(lessons, date).length - entries.length
    if (unknown) result.push({ kind: 'Недостаточно данных', text: `${label}: у ${unknown} занятий неизвестно время; проверка дня может быть неполной` })
  }
  return result
}

// IDs may change after reimport. Match equal content first, then unambiguous
// subject/type/group pairs; ambiguous replacements remain additions/removals.
const content = (l: Lesson) => JSON.stringify([l.title, l.type, l.teacher, l.place, l.dayOfWeek, l.start, l.end, l.lessonNumber, l.dateFrom, l.dateTo, l.group, l.location, l.link])
const identity = (l: Lesson) => JSON.stringify([l.title, l.type, l.group])
const describe = (l: Lesson) => `${l.title}, ${['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'][l.dayOfWeek]} ${l.start || `пара ${l.lessonNumber ?? '?'}`}–${l.end}, ${l.place}${l.dateFrom || l.dateTo ? ` (${l.dateFrom || '…'} — ${l.dateTo || '…'})` : ''}`
export function compareSchedules(before: Lesson[], after: Lesson[]): Notice[] {
  const old = [...before], fresh: Lesson[] = []
  for (const lesson of after) {
    const index = old.findIndex((l) => content(l) === content(lesson))
    if (index >= 0) old.splice(index, 1)
    else fresh.push(lesson)
  }
  const notices: Notice[] = []
  for (const lesson of fresh) {
    const matches = old.filter((l) => identity(l) === identity(lesson))
    if (matches.length === 1 && fresh.filter((l) => identity(l) === identity(lesson)).length === 1) {
      const previous = matches[0]
      old.splice(old.indexOf(previous), 1)
      notices.push({ kind: 'Изменено', text: `Было: ${describe(previous)}; стало: ${describe(lesson)}` })
    } else notices.push({ kind: 'Добавлено', text: describe(lesson) })
  }
  return [...notices, ...old.map((l) => ({ kind: 'Удалено', text: describe(l) }))]
}
