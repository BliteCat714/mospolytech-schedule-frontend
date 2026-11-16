import { mpunavRooms } from './mpunavRooms.ts'

export interface NavigationRoom {
  name: string
  location?: string | null
}

const aliases: Readonly<Record<string, string>> = {
  a: 'а', b: 'б', v: 'в', n: 'н', h: 'н', nd: 'нд', m: 'м',
  av: 'ав', pr: 'пр', pk: 'пк',
}

const suffixAliases: Readonly<Record<string, string>> = {
  a: 'а', b: 'в', c: 'с', e: 'е', h: 'н', k: 'к', m: 'м',
  o: 'о', p: 'р', t: 'т', x: 'х', y: 'у',
}

const campuses = [
  { pattern: /прянишников|^пр$/, prefixes: ['пр'], space: 'pr-enter-temp' },
  { pattern: /корчагин|^пк$/, prefixes: ['пк'], space: 'PK-main-1-entrance' },
  { pattern: /автозавод|^ав$/, prefixes: ['ав'], space: 'av-1-1-enter' },
  { pattern: /михалков|^м(?:их)?$/, prefixes: ['м'], space: 'm-entrance' },
  { pattern: /семенов|^бс$/, prefixes: ['а', 'б', 'в', 'н', 'нд'], space: 'bs-territory-street-kpp' },
]

const buildingEntrances: Readonly<Record<string, string>> = {
  а: 'a-0-enter', б: 'b-1-enter', в: 'v-1-enter', н: 'n-0-enter', нд: 'nd-1-enter',
}

// https://mospolytech.ru/ob-universitete/adresa-i-kontakty/
const externalAddresses: readonly [RegExp, string][] = [
  [/дубровск|^д$/, '1-я Дубровская улица, 16А'],
  [/галушкин/, 'улица Бориса Галушкина, 9'],
  [/малая семеновская/, 'Малая Семёновская улица, 12'],
  [/садовая[ -]спасская/, 'Садовая-Спасская улица, 6'],
  [/лефортовский вал|авиамоторная/, 'улица Лефортовский Вал, 26'],
]

const buildingsUrl = 'https://mpunav.ru/buildings'

// These address labels in the PE schedule identify specific spaces in the map.
const peVenues: readonly [RegExp, string][] = [
  [/^ск на автозаводской,.*автозаводская.*д\.\s*16\s+стр\.\s*2\s+8й этаж$/, 'av-sport-8'],
  [/^спортзал\s+no\s*2,.*большая семеновская.*д\.\s*40\s+корп\.\s*б(?=\s|$)/, 'b-101'],
  [/^спортзал\s+no\s*5,.*павла корчагина.*д\.\s*22\s+ауд\.\s*102$/, 'pk-main-1-sport-5'],
]

function normalize(value: string): string {
  return value.normalize('NFKC').toLowerCase().replaceAll('ё', 'е').trim()
}

function parseRoomLabel(name: string) {
  const label = normalize(name).replace(/^(?:аудитория|ауд\.)\s*/, '')
  const match = /^(?<prefix>[a-zа-я]+)?[\s-]*(?<number>\d{2,}(?:\s*[a-zа-я])?(?:\s*[-/]\s*[a-zа-я\d]+)*)(?:\s+[—–-]\s+.+)?$/.exec(label)
    ?? /^(?<prefix>[a-zа-я]+)\s+.+\((?<number>\d{2,}[a-zа-я]?)\)$/.exec(label)
  const { prefix, number } = match?.groups ?? {}
  if (!number) return

  return {
    prefix: prefix && (aliases[prefix] ?? prefix),
    number: number.replace(/\s/g, '').replace(/[a-z]/g, (letter) => suffixAliases[letter] ?? letter),
  }
}

const spaceByRoom = new Map<string, string | null>()
for (const [label, space] of mpunavRooms) {
  const room = parseRoomLabel(label)
  if (!room?.prefix) continue
  const key = room.prefix + room.number
  // Preserve ambiguity when the map lists two spaces with the same room label.
  spaceByRoom.set(key, spaceByRoom.has(key) ? null : space)
}

export function mpunavRoomUrl({ name, location }: NavigationRoom): string | undefined {
  const label = normalize(name)
  const venue = peVenues.find(([pattern]) => pattern.test(label))
  if (venue) return spaceUrl(venue[1])

  const address = /,\s*(ул\..+)$/.exec(label)?.[1]
  const auditorium = address && /ауд\.\s*(?<room>[a-zа-я]?\d{2,}[a-zа-я]?)$/.exec(address)?.groups?.room
  const building = address && /корп\.\s*([a-zа-я])(?=\s)/.exec(address)?.[1]
  const room = parseRoomLabel(auditorium && building ? building + auditorium : auditorium || name)
  if (!room) return
  const campus = normalize(location || address || '')
  const outsideMap = externalAddresses.some(([pattern]) => pattern.test(campus)) || /павловск/.test(campus)
  const campusPrefixes = outsideMap ? [] : campuses.find(({ pattern }) => pattern.test(campus))?.prefixes
  const prefixes = room.prefix ? [room.prefix] : campusPrefixes
  if (!prefixes || (room.prefix && campusPrefixes && !campusPrefixes.includes(room.prefix))) return

  const spaces = prefixes.map((prefix) => spaceByRoom.get(prefix + room.number)).filter((space) => space !== undefined)
  if (spaces.length === 1 && spaces[0]) return spaceUrl(spaces[0])
}

function spaceUrl(space: string): string {
  return `${buildingsUrl}?space=${encodeURIComponent(space)}`
}

export function roomDirections(room: NavigationRoom) {
  const name = normalize(room.name)
  const location = normalize(room.location ?? '')
  const virtual = /вебинар|webinar|онлайн|online|дистанц/
  if (!name || virtual.test(name) || virtual.test(location) || /^(?:пд|—|-|место не указано)$/.test(name)) return

  const exactUrl = mpunavRoomUrl(room)
  if (exactUrl) return { url: exactUrl, label: 'Как добраться?', title: `Открыть ${room.name} в MPUNav` }

  const prefix = parseRoomLabel(name)?.prefix ?? ''
  const addressInName = /,\s*(ул\..+)$/.exec(name)?.[1]
  const site = location || addressInName || name
  const outside = externalAddresses.find(([pattern]) => pattern.test(site))
    ?? (!location && prefix === 'д' ? externalAddresses[0] : undefined)
  const campus = campuses.find(({ pattern }) => pattern.test(site))
    ?? (!location && !addressInName ? campuses.find(({ prefixes }) => prefixes.includes(prefix)) : undefined)
  const address = outside ? addressInName || outside[1]
    : !campus && addressInName && /\d/.test(addressInName) ? addressInName : undefined
  if (address) return {
    url: `https://yandex.ru/maps/?${new URLSearchParams({ text: `Москва, ${address}` })}`,
    label: 'Адрес на карте',
    title: `Открыть адрес для ${room.name} в Яндекс Картах`,
  }

  if (campus) {
    const space = campus.prefixes.includes(prefix) && buildingEntrances[prefix]
    return { url: spaceUrl(space || campus.space), label: 'Карта корпуса', title: 'Открыть карту площадки в MPUNav' }
  }

  return { url: buildingsUrl, label: 'Карта корпусов', title: 'Открыть список корпусов MPUNav' }
}
