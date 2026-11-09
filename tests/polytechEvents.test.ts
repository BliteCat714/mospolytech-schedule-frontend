import test from 'node:test'
import assert from 'node:assert/strict'
import { polytechAnnouncement } from '../src/lib/polytechEvents.ts'

test('official publication date is never presented as the event date', () => {
  const event = polytechAnnouncement({ title: 'Конференция', href: '/events/conference/', date: '27октября 2026', note: '7 и 8 декабря' }, 1)!
  assert.equal(event.announced_at, '2026-10-27')
  assert.equal(event.date_start, null)
  assert.equal(event.url, 'https://mospolytech.ru/events/conference/')
  assert.equal(event.note, '7 и 8 декабря')
})
test('unknown dates stay unknown and links must lead to official event pages', () => {
  assert.equal(polytechAnnouncement({ title: 'Событие', href: '/events/demo/', date: '31 февраля 2026', note: '' }, 1)?.announced_at, null)
  for (const href of ['javascript:alert(1)', 'https://other.example/events/demo/', '', '/events/']) {
    assert.equal(polytechAnnouncement({ title: 'Событие', href, date: '', note: '' }, 1), null)
  }
})
