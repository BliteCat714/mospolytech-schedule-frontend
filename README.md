# Расписание — фронтенд

React + TypeScript + Vite. Данные — реальное расписание rasp.dmami.ru через API бэкенда (`mospolytech-schedule-backend`, приложение `rasp`).

## Запуск

```sh
cp .env.example .env     # VITE_API_URL=http://localhost:8000/api
npm ci
npm run dev              # http://localhost:5173
npm run build && npm run lint
```
Бэкенд должен быть запущен (`python manage.py runserver`) и содержать импортированное расписание (`python manage.py import_rasp`). Всё вместе: `docker compose up -d --build` из корня проекта.

## Как это работает
- Вход: «Я студент» — выбор группы, «Я преподаватель» — поиск по имени. Профиль, открытое расписание и избранное хранятся в localStorage (`profile:v2`).
- Расписание: `GET rasp/groups/<номер>/lessons/`, `GET rasp/teachers/<id>/lessons/`, переключатель «Сессия» (`?session=1`). Занятия показываются по дню недели и периоду действия (`date_from…date_to`).
- Экспорт в календарь: кнопка «В календарь» скачивает `.ics` (`rasp/groups/<номер>/calendar/` или `rasp/teachers/<id>/calendar/`); для своего расписания добавляет физкультуру и выбранный проект (`owner`).
- Время пар: `GET rasp/pair-times/`.
- Кабинеты: `GET rasp/rooms/free/`. Физкультура: `schedule/pe/*`, запись привязана к идентификатору браузера (`clientId` в localStorage).
- Офлайн-режим с тестовым снимком (`VITE_DATA_SOURCE=mock`) удалён: данные были от старого генератора и несовместимы с реальным API.
