import type { UniversityEvent } from './activities'
import { isCalendarDate } from './calendarDate.ts'

const origin = 'https://mospolytech.ru'
const months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря']
export function polytechAnnouncement(input: { title: string; href: string; date: string; note: string }, id: number): UniversityEvent | null {
  const title = input.title.trim()
  let url: URL
  try { url = new URL(input.href, origin) } catch { return null }
  if (!title || url.origin !== origin || !/^\/events\/[^/]+\/$/.test(url.pathname)) return null
  const match = /^(\d{1,2})\s*([а-я]+)\s+(\d{4})$/.exec(input.date.trim().toLocaleLowerCase('ru-RU'))
  const month = match ? months.indexOf(match[2]) + 1 : 0
  const date = match && month ? `${match[3]}-${String(month).padStart(2, '0')}-${match[1].padStart(2, '0')}` : ''
  return { id, title, url: url.href, scope: 'university', access: 'unknown', date_start: null, date_end: null,
    announced_at: isCalendarDate(date) ? date : null, date_text: '', note: input.note.trim(),
    source: 'Сайт Московского Политеха', is_published: true }
}
/** Vite's fixed-origin local proxy is deliberately not a production backend API. */
export async function loadPolytechAnnouncements(signal: AbortSignal): Promise<UniversityEvent[]> {
  const controller = new AbortController()
  const abort = () => controller.abort()
  signal.addEventListener('abort', abort, { once: true })
  if (signal.aborted) controller.abort()
  const timeout = setTimeout(abort, 20000)
  try {
    const response = await fetch('/__polytech-events', { signal: controller.signal, cache: 'no-store' })
    if (!response.ok) throw new Error('Сайт Политеха временно недоступен. Попробуйте обновить позже.')
    const document = new DOMParser().parseFromString(await response.text(), 'text/html')
    const seen = new Set<string>()
    const events: UniversityEvent[] = []
    for (const [index, card] of [...document.querySelectorAll('.card-news-wide')].entries()) {
      const text = (selector: string) => {
        const element = card.querySelector(selector)?.cloneNode(true) as Element | undefined
        element?.querySelectorAll('br').forEach(br => br.replaceWith(' '))
        return element?.textContent?.replace(/\s+/g, ' ').trim() ?? ''
      }
      const event = polytechAnnouncement({ title: text('.card-news-wide__title'),
        href: card.querySelector('.card-news-wide__link')?.getAttribute('href') ?? '',
        date: text('.card-news-wide__date'), note: text('.card-news-wide__text') }, index + 1)
      if (event && !seen.has(event.url)) { seen.add(event.url); events.push(event) }
    }
    if (!events.length) throw new Error('Не удалось прочитать ленту Политеха: возможно, изменилась разметка сайта.')
    return events
  } catch (error) {
    if (!signal.aborted && controller.signal.aborted) throw new Error('Сайт Политеха не ответил за 20 секунд. Попробуйте ещё раз.')
    throw error
  } finally { clearTimeout(timeout); signal.removeEventListener('abort', abort) }
}
