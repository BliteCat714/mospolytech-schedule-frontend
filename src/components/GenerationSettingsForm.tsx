import { ChevronDown, SlidersHorizontal } from 'lucide-react'
import { generationDays, ruleDefinitions } from '../lib/generationSettings'
import type { GenerationSettings, RuleMode } from '../lib/generationSettings'

const input = 'generation-input'
interface Props {
  value: GenerationSettings
  onChange: (value: GenerationSettings) => void
  buildings: { id: number; name: string }[]
  disabled?: boolean
}
export default function GenerationSettingsForm({ value, onChange, buildings, disabled }: Props) {
  const setRules = (rules: GenerationSettings['rules']) => onChange({ ...value, rules })
  const renderRule = (def: typeof ruleDefinitions[number]) => {
    const rule = value.rules[def.key]
    const update = (patch: Partial<NonNullable<typeof rule>>) => setRules({ ...value.rules, [def.key]: { value: def.type === 'building' ? buildings[0]?.id ?? 0 : def.value, mode: 'preferred', ...rule, ...patch } })
    return <div key={def.key} className={`generation-rule flex flex-col ${rule ? 'generation-rule-enabled' : ''}`}>
      <div className="flex items-start justify-between gap-4">
        <div><h3 className="text-sm font-semibold">{def.title}</h3><p className="mt-1 text-xs text-muted leading-relaxed">{def.description}</p></div>
        <label className="generation-switch shrink-0" title={`${rule ? 'Выключить' : 'Включить'}: ${def.title}`}>
          <input type="checkbox" aria-label={`Включить: ${def.title}`} checked={!!rule} disabled={disabled || (def.type === 'building' && !buildings.length)} onChange={(e) => {
            if (e.target.checked) update({})
            else { const next = { ...value.rules }; delete next[def.key]; setRules(next) }
          }} /><span />
        </label>
      </div>
      {rule ? <div className="grid grid-cols-2 items-end gap-2 mt-auto pt-4">
        <label className="text-xs text-muted">{def.type === 'building' ? 'Место занятий' : def.key === 'earliest_start' ? 'Не раньше' : def.key === 'latest_end' ? 'Не позже' : def.key === 'min_pairs_per_day' ? 'Не меньше' : 'Не больше'}
          {def.type === 'building' ? <select aria-label={def.title} className={input} disabled={disabled} value={Number(rule.value)} onChange={(e) => update({ value: Number(e.target.value) })}>{buildings.map((building) => <option key={building.id} value={building.id}>{building.name}</option>)}</select>
            : <div className="relative"><input aria-label={def.title} className={`${input} ${def.unit ? 'pr-12' : ''}`} disabled={disabled} type={def.type === 'time' ? 'time' : 'number'} min={def.min} max={def.max} value={rule.value} onChange={(e) => update({ value: def.type === 'time' ? e.target.value : Number(e.target.value) })} />{def.unit && <span className="absolute right-3 top-3.5 text-muted text-xs pointer-events-none">{def.unit}</span>}</div>}
        </label>
        <label className="text-xs text-muted">Важность условия<select aria-label={`Режим: ${def.title}`} className={input} disabled={disabled} value={rule.mode} onChange={(e) => update({ mode: e.target.value as RuleMode })}><option value="preferred">Желательно</option><option value="required">Обязательно</option></select></label>
      </div> : <p className="mt-4 text-xs text-muted">Выключено · ограничение не применяется</p>}
    </div>
  }
  return <div className="space-y-5">
    <div className="flex gap-3 items-start"><span className="generation-step">2</span><div><h2 className="text-lg font-semibold">Условия расписания</h2><p className="text-sm text-muted mt-1">Пожелания помогают выбрать удобный вариант. Обязательные условия сохраняются всегда.</p></div></div>
    <div className="generation-rule generation-rule-enabled">
      <h3 className="text-sm font-semibold">Свободные дни</h3><p className="text-xs text-muted mt-1">Выберите, какие дни оставить без общих занятий и личной ПД.</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2 mt-4">{generationDays.map((day) => {
        const mode = value.rules.free_days?.find((item) => item.day === day.code)?.mode ?? 'off'
        return <label key={day.code} className={`rounded-xl border p-3 ${mode === 'off' ? 'border-border' : 'border-accent/25 bg-accent-soft'}`}>
          <span className="block text-sm font-semibold mb-2">{day.name}</span><select className="generation-input generation-day-select" aria-label={`Свободный день: ${day.name}`} disabled={disabled} value={mode} onChange={(e) => {
            const days = (value.rules.free_days ?? []).filter((item) => item.day !== day.code)
            if (e.target.value !== 'off') days.push({ day: day.code, mode: e.target.value as RuleMode })
            setRules({ ...value.rules, free_days: days })
          }}><option value="off">Можно учиться</option><option value="preferred">Лучше без занятий</option><option value="required">Без занятий</option></select>
        </label>
      })}</div>
    </div>
    <div className="grid md:grid-cols-2 gap-3">{ruleDefinitions.filter((def) => !def.additional).map(renderRule)}</div>
    <details className="rounded-2xl border border-border bg-surface group">
      <summary className="flex items-center justify-between cursor-pointer p-4 sm:p-5 list-none"><span className="flex items-center gap-2 text-sm font-semibold"><SlidersHorizontal size={17} />Дополнительные условия<span className="text-muted font-normal">{ruleDefinitions.filter((def) => def.additional && value.rules[def.key]).length}/4</span></span><ChevronDown size={16} className="group-open:rotate-180 transition-transform" /></summary>
      <div className="grid md:grid-cols-2 gap-3 p-3 pt-0 sm:p-4 sm:pt-0">{ruleDefinitions.filter((def) => def.additional).map(renderRule)}</div>
    </details>
    <p className="text-xs leading-relaxed text-muted">Сначала сохраняется полнота нагрузки. Пожелания: свободные дни → время → перерывы → дневная нагрузка и серии → число дней → смены корпуса → желаемый корпус. Личная нагрузка включает общие занятия, онлайн и только собственную ПД.</p>
    <details className="text-sm rounded-xl border border-border p-4">
      <summary className="cursor-pointer text-muted">Параметры поиска</summary><div className="grid sm:grid-cols-2 gap-3 mt-3 max-w-xl">
        <label className="text-xs text-muted">Лимит времени, секунд<input className={input} type="number" min={1} max={600} disabled={disabled} value={value.search.time_limit_seconds} onChange={(e) => onChange({ ...value, search: { ...value.search, time_limit_seconds: Math.min(600, Math.max(1, Number(e.target.value) || 1)) } })} /></label>
        <label className="text-xs text-muted">Номер варианта поиска<input className={input} type="number" min={0} max={2147483647} disabled={disabled} value={value.search.seed} onChange={(e) => onChange({ ...value, search: { ...value.search, seed: Math.trunc(Number(e.target.value) || 0) } })} /><span className="block mt-1">Измените число, чтобы попробовать другое размещение пар.</span></label>
      </div>
    </details>
  </div>
}
