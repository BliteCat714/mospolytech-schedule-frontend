import type { ValidationReport } from '../lib/generation'
import { findingText } from '../lib/generationValidation'
export { findingText } from '../lib/generationValidation'
export default function GenerationValidation({ report }: { report?: ValidationReport | null }) {
  if (!report) return null
  const groups = [
    { name: 'Перенос недопустим', items: report.blocking, style: 'border-red-200 bg-red-50 text-red-800 dark:bg-red-950/20 dark:text-red-300' },
    { name: 'Отступления от пожеланий', items: report.warnings, style: 'border-amber-200 bg-amber-50 text-amber-900 dark:bg-amber-950/20 dark:text-amber-200' },
    { name: 'Проверки не завершены', items: report.incomplete, style: 'border-border bg-surface-2 text-muted' },
  ]
  return <div className="space-y-2">{groups.map((group) => group.items?.length ? <div key={group.name} className={`rounded-xl border p-3 text-xs ${group.style}`}><p className="font-semibold">{group.name}</p><ul className="list-disc pl-4 mt-1 space-y-1">{group.items.map((item, i) => <li key={i}>{findingText(item)}</li>)}</ul></div> : null)}</div>
}
