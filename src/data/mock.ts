export type LessonType = 'lecture' | 'practice' | 'lab' | 'project' | 'pe'

export interface Period {
  from: string
  to: string
}

export interface Lesson {
  id: string
  title: string
  type: LessonType
  teacher: string
  building: string
  room: string
  dayOfWeek: number // 1 = Пн ... 7 = Вс
  start: string
  end: string
  periods: Period[]
  groupIds: string[]
}

export interface PEslot {
  id: string
  direction: string
  dayOfWeek: number
  start: string
  end: string
  building: string
  room: string
}

export interface User {
  id: string
  name: string
  role: 'student' | 'teacher'
  group?: string
  projectGroupId?: string
  peDirection?: string
  peSlots?: string[]
}

// ---------- Пользователи ----------
export const users: User[] = [
  {
    id: 'u1',
    name: 'Иванов Иван',
    role: 'student',
    group: 'ИУ7-32Б',
    projectGroupId: 'pg1',
    peDirection: 'volleyball',
    peSlots: [],
  },
  {
    id: 'u2',
    name: 'Петрова Анна',
    role: 'student',
    group: 'ИУ7-31Б',
    projectGroupId: 'pg2',
    peDirection: undefined,
    peSlots: [],
  },
  {
    id: 't1',
    name: 'Сидоров Пётр (преподаватель)',
    role: 'teacher',
  },
]

// ---------- Периоды ----------
const P1: Period = { from: '2026-09-01', to: '2026-11-02' }
const P2: Period = { from: '2026-11-03', to: '2026-12-30' }
const FULL: Period = { from: '2026-09-01', to: '2026-12-30' }

// ---------- Расписание ----------
// ---------- Расписание ----------
export const lessons: Lesson[] = [
  // ==================== ПОНЕДЕЛЬНИК (только проект, слот 2) ====================
  {
    id: 'p-pg1',
    title: 'Проектная деятельность',
    type: 'project',
    teacher: 'Кузнецов А.В.',
    building: 'Корпус Б',
    room: 'Б-412',
    dayOfWeek: 1,
    start: '10:40',
    end: '12:10',
    periods: [FULL],
    groupIds: ['pg1'],
  },
  {
    id: 'p-pg2',
    title: 'Проектная деятельность',
    type: 'project',
    teacher: 'Морозова И.С.',
    building: 'Корпус Б',
    room: 'Б-408',
    dayOfWeek: 1,
    start: '10:40',
    end: '12:10',
    periods: [FULL],
    groupIds: ['pg2'],
  },

  // ==================== ВТОРНИК (слоты 1, 2, 4, 5 — пропуск в 3) ====================
  // ИУ7-32Б
  {
    id: 't1-a1',
    title: 'Математический анализ',
    type: 'lecture',
    teacher: 'Смирнова Е.П.',
    building: 'Корпус А',
    room: 'А-301',
    dayOfWeek: 2,
    start: '09:00',
    end: '10:30',
    periods: [P1],
    groupIds: ['ИУ7-32Б'],
  },
  {
    id: 't1-a2',
    title: 'Математический анализ',
    type: 'practice',
    teacher: 'Смирнова Е.П.',
    building: 'Корпус А',
    room: 'А-301',
    dayOfWeek: 2,
    start: '09:00',
    end: '10:30',
    periods: [P2],
    groupIds: ['ИУ7-32Б'],
  },
  {
    id: 't1-b',
    title: 'Физика',
    type: 'lab',
    teacher: 'Орлов Д.С.',
    building: 'Корпус В',
    room: 'В-105',
    dayOfWeek: 2,
    start: '10:40',
    end: '12:10',
    periods: [FULL],
    groupIds: ['ИУ7-32Б'],
  },
  // пропуск: слот 3
  {
    id: 't1-c',
    title: 'Английский язык',
    type: 'practice',
    teacher: 'Фёдорова Л.К.',
    building: 'Корпус Г',
    room: 'Г-115',
    dayOfWeek: 2,
    start: '14:30',
    end: '16:00',
    periods: [FULL],
    groupIds: ['ИУ7-32Б'],
  },
  {
    id: 't1-d',
    title: 'История',
    type: 'lecture',
    teacher: 'Романова Т.А.',
    building: 'Корпус Б',
    room: 'Б-201',
    dayOfWeek: 2,
    start: '16:10',
    end: '17:40',
    periods: [P1],
    groupIds: ['ИУ7-32Б'],
  },

  // ИУ7-31Б
  {
    id: 't2-a',
    title: 'Дискретная математика',
    type: 'lecture',
    teacher: 'Гусев Н.В.',
    building: 'Корпус А',
    room: 'А-210',
    dayOfWeek: 2,
    start: '09:00',
    end: '10:30',
    periods: [FULL],
    groupIds: ['ИУ7-31Б'],
  },
  {
    id: 't2-b',
    title: 'Английский язык',
    type: 'practice',
    teacher: 'Фёдорова Л.К.',
    building: 'Корпус Г',
    room: 'Г-112',
    dayOfWeek: 2,
    start: '10:40',
    end: '12:10',
    periods: [FULL],
    groupIds: ['ИУ7-31Б'],
  },
  // пропуск: слот 3
  {
    id: 't2-c',
    title: 'Физика',
    type: 'lecture',
    teacher: 'Орлов Д.С.',
    building: 'Корпус В',
    room: 'В-201',
    dayOfWeek: 2,
    start: '14:30',
    end: '16:00',
    periods: [FULL],
    groupIds: ['ИУ7-31Б'],
  },

  // ==================== СРЕДА (слоты 1, 3, 5, 7 — пропуски 2, 4) ====================
  // ИУ7-32Б
  {
    id: 'w1-a',
    title: 'Программирование',
    type: 'practice',
    teacher: 'Волков М.И.',
    building: 'Корпус А',
    room: 'А-205',
    dayOfWeek: 3,
    start: '09:00',
    end: '10:30',
    periods: [FULL],
    groupIds: ['ИУ7-32Б'],
  },
  // пропуск: слот 2
  {
    id: 'w1-b',
    title: 'Теория вероятностей',
    type: 'lecture',
    teacher: 'Смирнова Е.П.',
    building: 'Корпус А',
    room: 'А-301',
    dayOfWeek: 3,
    start: '12:20',
    end: '13:50',
    periods: [FULL],
    groupIds: ['ИУ7-32Б'],
  },
  // пропуск: слот 4
  {
    id: 'w1-c',
    title: 'Философия',
    type: 'lecture',
    teacher: 'Лебедев С.О.',
    building: 'Корпус Б',
    room: 'Б-305',
    dayOfWeek: 3,
    start: '16:10',
    end: '17:40',
    periods: [P2],
    groupIds: ['ИУ7-32Б'],
  },
  {
    id: 'w1-d',
    title: 'Машинное обучение (спецкурс)',
    type: 'lecture',
    teacher: 'Иванова М.А.',
    building: 'Корпус А',
    room: 'А-401',
    dayOfWeek: 3,
    start: '19:30',
    end: '21:00',
    periods: [P2],
    groupIds: ['ИУ7-32Б'],
  },

  // ИУ7-31Б
  {
    id: 'w2-a',
    title: 'Физика',
    type: 'lecture',
    teacher: 'Орлов Д.С.',
    building: 'Корпус В',
    room: 'В-201',
    dayOfWeek: 3,
    start: '09:00',
    end: '10:30',
    periods: [FULL],
    groupIds: ['ИУ7-31Б'],
  },
  // пропуск: слот 2
  {
    id: 'w2-b',
    title: 'Дискретная математика',
    type: 'practice',
    teacher: 'Гусев Н.В.',
    building: 'Корпус А',
    room: 'А-210',
    dayOfWeek: 3,
    start: '12:20',
    end: '13:50',
    periods: [FULL],
    groupIds: ['ИУ7-31Б'],
  },

  // ==================== ЧЕТВЕРГ (слоты 2, 3, 6 — пропуски 1, 4, 5) ====================
  // ИУ7-32Б
  // пропуск: слот 1
  {
    id: 'th1-a',
    title: 'Архитектура ЭВМ',
    type: 'lecture',
    teacher: 'Белов А.Р.',
    building: 'Корпус А',
    room: 'А-105',
    dayOfWeek: 4,
    start: '10:40',
    end: '12:10',
    periods: [P1],
    groupIds: ['ИУ7-32Б'],
  },
  {
    id: 'th1-a2',
    title: 'Архитектура ЭВМ',
    type: 'lab',
    teacher: 'Белов А.Р.',
    building: 'Корпус А',
    room: 'А-107',
    dayOfWeek: 4,
    start: '10:40',
    end: '12:10',
    periods: [P2],
    groupIds: ['ИУ7-32Б'],
  },
  {
    id: 'th1-b',
    title: 'Философия',
    type: 'lecture',
    teacher: 'Лебедев С.О.',
    building: 'Корпус Б',
    room: 'Б-305',
    dayOfWeek: 4,
    start: '12:20',
    end: '13:50',
    periods: [FULL],
    groupIds: ['ИУ7-32Б'],
  },
  // пропуск: слоты 4, 5
  {
    id: 'th1-c',
    title: 'История',
    type: 'lecture',
    teacher: 'Романова Т.А.',
    building: 'Корпус Б',
    room: 'Б-201',
    dayOfWeek: 4,
    start: '17:50',
    end: '19:20',
    periods: [FULL],
    groupIds: ['ИУ7-32Б'],
  },

  // ИУ7-31Б
  {
    id: 'th2-a',
    title: 'Программирование',
    type: 'lab',
    teacher: 'Волков М.И.',
    building: 'Корпус А',
    room: 'А-206',
    dayOfWeek: 4,
    start: '10:40',
    end: '12:10',
    periods: [FULL],
    groupIds: ['ИУ7-31Б'],
  },
  {
    id: 'th2-b',
    title: 'Теория вероятностей',
    type: 'lecture',
    teacher: 'Смирнова Е.П.',
    building: 'Корпус А',
    room: 'А-301',
    dayOfWeek: 4,
    start: '12:20',
    end: '13:50',
    periods: [FULL],
    groupIds: ['ИУ7-31Б'],
  },
  // пропуск: слоты 4, 5
  {
    id: 'th2-c',
    title: 'Английский язык',
    type: 'practice',
    teacher: 'Фёдорова Л.К.',
    building: 'Корпус Г',
    room: 'Г-112',
    dayOfWeek: 4,
    start: '17:50',
    end: '19:20',
    periods: [FULL],
    groupIds: ['ИУ7-31Б'],
  },

  // ==================== ПЯТНИЦА (слоты 1, 4, 6 — пропуски 2, 3, 5) ====================
  // ИУ7-32Б
  {
    id: 'f1-a',
    title: 'Философия',
    type: 'lecture',
    teacher: 'Лебедев С.О.',
    building: 'Корпус Б',
    room: 'Б-305',
    dayOfWeek: 5,
    start: '09:00',
    end: '10:30',
    periods: [FULL],
    groupIds: ['ИУ7-32Б'],
  },
  // пропуск: слоты 2, 3
  {
    id: 'f1-b',
    title: 'Английский язык',
    type: 'practice',
    teacher: 'Фёдорова Л.К.',
    building: 'Корпус Г',
    room: 'Г-115',
    dayOfWeek: 5,
    start: '14:30',
    end: '16:00',
    periods: [FULL],
    groupIds: ['ИУ7-32Б'],
  },
  // пропуск: слот 5
  {
    id: 'f1-c',
    title: 'Математический анализ',
    type: 'practice',
    teacher: 'Смирнова Е.П.',
    building: 'Корпус А',
    room: 'А-302',
    dayOfWeek: 5,
    start: '17:50',
    end: '19:20',
    periods: [FULL],
    groupIds: ['ИУ7-32Б'],
  },

  // ИУ7-31Б
  {
    id: 'f2-a',
    title: 'Теория вероятностей',
    type: 'lecture',
    teacher: 'Смирнова Е.П.',
    building: 'Корпус А',
    room: 'А-301',
    dayOfWeek: 5,
    start: '09:00',
    end: '10:30',
    periods: [FULL],
    groupIds: ['ИУ7-31Б'],
  },
  // пропуск: слоты 2, 3
  {
    id: 'f2-b',
    title: 'История',
    type: 'practice',
    teacher: 'Романова Т.А.',
    building: 'Корпус Б',
    room: 'Б-202',
    dayOfWeek: 5,
    start: '14:30',
    end: '16:00',
    periods: [FULL],
    groupIds: ['ИУ7-31Б'],
  },
  // пропуск: слот 5
  {
    id: 'f2-c',
    title: 'Философия',
    type: 'lecture',
    teacher: 'Лебедев С.О.',
    building: 'Корпус Б',
    room: 'Б-306',
    dayOfWeek: 5,
    start: '17:50',
    end: '19:20',
    periods: [FULL],
    groupIds: ['ИУ7-31Б'],
  },

  // ==================== СУББОТА (слоты 2, 4 — пусто утром и вечером) ====================
  // ИУ7-32Б
  // пропуск: слот 1
  {
    id: 's1-a',
    title: 'Архитектура ЭВМ',
    type: 'practice',
    teacher: 'Белов А.Р.',
    building: 'Корпус А',
    room: 'А-105',
    dayOfWeek: 6,
    start: '10:40',
    end: '12:10',
    periods: [FULL],
    groupIds: ['ИУ7-32Б'],
  },
  // пропуск: слот 3
  {
    id: 's1-b',
    title: 'Физическая культура (теория)',
    type: 'lecture',
    teacher: 'Громов В.В.',
    building: 'Корпус Б',
    room: 'Б-101',
    dayOfWeek: 6,
    start: '14:30',
    end: '16:00',
    periods: [P1],
    groupIds: ['ИУ7-32Б'],
  },

  // ИУ7-31Б
  // пропуск: слот 1
  {
    id: 's2-a',
    title: 'Дискретная математика',
    type: 'practice',
    teacher: 'Гусев Н.В.',
    building: 'Корпус А',
    room: 'А-210',
    dayOfWeek: 6,
    start: '10:40',
    end: '12:10',
    periods: [FULL],
    groupIds: ['ИУ7-31Б'],
  },
  // пропуск: слот 3
  {
    id: 's2-b',
    title: 'Философия',
    type: 'practice',
    teacher: 'Лебедев С.О.',
    building: 'Корпус Б',
    room: 'Б-306',
    dayOfWeek: 6,
    start: '14:30',
    end: '16:00',
    periods: [FULL],
    groupIds: ['ИУ7-31Б'],
  },
]


// ---------- Кабинеты ----------
export const rooms = [
  { building: 'Корпус А', room: 'А-101', capacity: 30 },
  { building: 'Корпус А', room: 'А-205', capacity: 25 },
  { building: 'Корпус А', room: 'А-301', capacity: 40 },
  { building: 'Корпус Б', room: 'Б-201', capacity: 35 },
  { building: 'Корпус Б', room: 'Б-412', capacity: 20 },
  { building: 'Корпус В', room: 'В-105', capacity: 24 },
]

// ---------- Физкультура ----------
export const peDirections = [
  { id: 'aerobics', name: 'Аэробика', icon: '🤸' },
  { id: 'volleyball', name: 'Волейбол', icon: '🏐' },
  { id: 'basketball', name: 'Баскетбол', icon: '🏀' },
  { id: 'football', name: 'Футбол', icon: '⚽' },
  { id: 'swimming', name: 'Плавание', icon: '🏊' },
  { id: 'athletics', name: 'Лёгкая атлетика', icon: '🏃' },
  { id: 'chess', name: 'Шахматы', icon: '♟️' },
  { id: 'tabletennis', name: 'Настольный теннис', icon: '🏓' },
  { id: 'yoga', name: 'Йога', icon: '🧘' },
]

const PE_TIMES = [
  { start: '09:00', end: '10:30' },
  { start: '10:40', end: '12:10' },
  { start: '12:20', end: '13:50' },
  { start: '14:30', end: '16:00' },
  { start: '16:10', end: '17:40' },
]

const PE_PLACES: Record<string, { building: string; room: string }> = {
  aerobics: { building: 'Спортзал', room: 'Зал 2' },
  volleyball: { building: 'Спортзал', room: 'Зал 1' },
  basketball: { building: 'Спортзал', room: 'Зал 1' },
  football: { building: 'Стадион', room: 'Поле 1' },
  swimming: { building: 'Бассейн', room: 'Дорожка 3' },
  athletics: { building: 'Стадион', room: 'Дорожка' },
  chess: { building: 'Корпус Б', room: 'Б-110' },
  tabletennis: { building: 'Спортзал', room: 'Зал 3' },
  yoga: { building: 'Спортзал', room: 'Зал 2' },
}

// Генерируем слоты: каждое направление × Пн–Сб × 5 пар
export const peSlots: PEslot[] = peDirections.flatMap((dir) =>
  [1, 2, 3, 4, 5, 6].flatMap((day) =>
    PE_TIMES.map((t, i) => ({
      id: `${dir.id}-d${day}-s${i + 1}`,
      direction: dir.id,
      dayOfWeek: day,
      start: t.start,
      end: t.end,
      building: PE_PLACES[dir.id].building,
      room: PE_PLACES[dir.id].room,
    })),
  ),
)