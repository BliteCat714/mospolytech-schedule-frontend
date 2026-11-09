import type { GeneratedSchedule } from './generation'

/** Read-only comparison, not a new saved run. Preserve each class's real source run. */
export function compareDPOSchedules(main: GeneratedSchedule, dpo: GeneratedSchedule): GeneratedSchedule {
  if (!main.run || !dpo.run || main.run.semester !== dpo.run.semester || main.run.module !== dpo.run.module) {
    throw new Error('Для сравнения нужны расписания одного семестра и модуля.')
  }
  const classes = [...new Map([...main.scheduled_classes, ...dpo.scheduled_classes].map(item => [`${item.run}:${item.id}`, item])).values()]
  for (const session of dpo.fixed_pd_snapshot) {
    const previous = main.fixed_pd_snapshot.find(item => item.session_id === session.session_id)
    if (previous && (previous.day_of_week !== session.day_of_week || previous.start !== session.start || previous.end !== session.end)) {
      throw new Error('В расчётах различается фиксированная ПД. Выберите согласованные версии расписаний.')
    }
  }
  const fixed = [...new Map([...main.fixed_pd_snapshot, ...dpo.fixed_pd_snapshot].map(item => [item.session_id, item])).values()]
  return { run: null, scheduled_classes: classes, fixed_pd_snapshot: fixed, issues: [...main.issues, ...dpo.issues] }
}
