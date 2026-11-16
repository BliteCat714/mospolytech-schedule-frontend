import assert from 'node:assert/strict'
import test from 'node:test'
import { mpunavRoomUrl, roomDirections } from '../src/lib/mpunav.ts'

const directions = (space: string) => `https://mpunav.ru/buildings?space=${space}`

test('uses MPUNav space keys from the catalog, including labels that differ from the key', () => {
  assert.equal(mpunavRoomUrl({ name: 'ПК613', location: 'Павла Корчагина' }), directions('pk-610'))
  assert.equal(mpunavRoomUrl({ name: 'АВ-1108-1' }), directions('av-1108_1'))
  assert.equal(mpunavRoomUrl({ name: 'Пр2507' }), directions('pr-2507'))
})

test('normalizes room variants and uses the campus for numbers without a prefix', () => {
  assert.equal(mpunavRoomUrl({ name: 'Пр2815 а' }), directions('pr-2815a'))
  assert.equal(mpunavRoomUrl({ name: 'Пр ВЦ 2 (2554)' }), directions('pr-2554'))
  assert.equal(mpunavRoomUrl({ name: '2303', location: 'Прянишникова' }), directions('pr-2303'))
  assert.equal(mpunavRoomUrl({ name: '2303', location: 'Автозаводская' }), directions('av-2303'))
})

test('excludes virtual, unknown, conflicting or ambiguous room labels', () => {
  assert.equal(mpunavRoomUrl({ name: 'Webinar' }), undefined)
  assert.equal(mpunavRoomUrl({ name: 'Пр9999' }), undefined)
  assert.equal(mpunavRoomUrl({ name: '2303' }), undefined)
  assert.equal(mpunavRoomUrl({ name: '101', location: 'Большая Семёновская' }), undefined)
  assert.equal(mpunavRoomUrl({ name: 'Пр2303', location: 'Автозаводская' }), undefined)
  assert.equal(mpunavRoomUrl({ name: 'АВ4108' }), undefined)
})

test('matches sports venues that have a specific address on the map', () => {
  assert.equal(mpunavRoomUrl({ name: 'СК на Автозаводской, м.Автозаводская, ул. Автозаводская д.16 стр.2 8й этаж' }), directions('av-sport-8'))
  assert.equal(mpunavRoomUrl({ name: 'Спортзал №1, ул. Большая Семеновская д.38 корп.А ауд.112а' }), directions('a-112a'))
  assert.equal(mpunavRoomUrl({ name: 'Спортзал №5, м.ВДНХ, ул. Павла Корчагина д.22 ауд.102' }), directions('pk-main-1-sport-5'))
  assert.equal(mpunavRoomUrl({ name: 'Спортзал №6, ул. Бориса Галушкина д.9 2й этаж' }), undefined)
})

test('provides a map destination for unlisted rooms at each MPUNav site', () => {
  const entrances = [
    ['Автозаводская', 'av-1-1-enter'],
    ['Большая Семёновская', 'bs-territory-street-kpp'],
    ['Михалковская', 'm-entrance'],
    ['Павла Корчагина', 'PK-main-1-entrance'],
    ['Прянишникова', 'pr-enter-temp'],
  ]
  for (const [location, space] of entrances) {
    const destination = roomDirections({ name: '999999', location })
    assert.equal(destination?.url, directions(space))
    assert.equal(destination?.label, 'Карта корпуса')
  }
  assert.equal(roomDirections({ name: 'НД9999' })?.url, directions('nd-1-enter'))
  assert.equal(roomDirections({ name: 'Пр2303' })?.label, 'Как добраться?')
})

test('uses a verified street address outside MPUNav and keeps a directory link for unknown locations', () => {
  const external = roomDirections({ name: 'Д108' })
  assert.ok(external)
  const address = new URL(external.url)
  assert.equal(address.hostname, 'yandex.ru')
  assert.equal(address.searchParams.get('text'), 'Москва, 1-я Дубровская улица, 16А')
  assert.equal(roomDirections({ name: '999999' })?.url, 'https://mpunav.ru/buildings')
  assert.equal(roomDirections({ name: 'Вебинар' }), undefined)
  assert.equal(roomDirections({ name: 'A101', location: 'Онлайн' }), undefined)
})
