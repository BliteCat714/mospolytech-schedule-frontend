import { dpoApi as api } from '../../lib/api'
import { useAsync } from '../../lib/useAsync'
import { compareDPOSchedules } from '../../lib/dpoSchedule'
import type { DPOStudent } from '../../lib/dpo'
import type { GeneratedSchedule } from '../../lib/generation'
import GeneratedCalendar from '../GeneratedCalendar'
import { Empty, ErrorBox, Loading } from '../Status'

interface Props { student: DPOStudent; mainRunId: number; dpoRunId: number }
export default function DPOSchedulePreview({ student, mainRunId, dpoRunId }: Props) {
  const data = useAsync(async signal => {
    const [main, dpo] = await Promise.all([
      api.get<GeneratedSchedule>(`schedule/schedule/students/${student.id}/`, { run_id: mainRunId }, signal),
      api.get<GeneratedSchedule>(`schedule/schedule/students/${student.id}/`, { run_id: dpoRunId }, signal),
    ])
    if (main.run?.id !== mainRunId || dpo.run?.id !== dpoRunId) throw new Error('Сервер вернул другой расчёт. Обновите расписание.')
    return compareDPOSchedules(main, dpo)
  }, [student.id, mainRunId, dpoRunId])
  // The parent keys this reader by student and both runs, so retained async data
  // cannot appear as another listener's schedule.
  return <section aria-label={`Учебная неделя ${student.full_name}`} className="space-y-3">
    <h3 className="font-semibold">Основные занятия и ДПО · {student.full_name}</h3>
    <p className="text-xs text-muted">Основное расписание №{mainRunId} для сравнения + расчёт ДПО №{dpoRunId}. Это просмотр сохранённых учебных недель. ДПО отмечено отдельной подписью; публикация в «Моём расписании» не выполняется.</p>
    {data.loading ? <Loading /> : data.error ? <ErrorBox message={data.error} onRetry={data.reload} /> : data.data && (data.data.scheduled_classes.length || data.data.fixed_pd_snapshot.length) ? <GeneratedCalendar schedule={data.data} slots={[]} groupName={student.group_name} /> : <Empty text="В выбранных расчётах нет занятий этого слушателя." />}
  </section>
}
