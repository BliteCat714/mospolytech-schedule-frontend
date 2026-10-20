import { AlertTriangle, Loader2 } from 'lucide-react'

export function Loading({ text = 'Загрузка…' }: { text?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-muted text-sm">
      <Loader2 size={16} className="animate-spin" /> {text}
    </div>
  )
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2 p-3 rounded-xl border border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300 text-sm"
    >
      <AlertTriangle size={16} className="mt-0.5 shrink-0" />
      <span className="flex-1">{message}</span>
      {onRetry && (
        <button onClick={onRetry} className="underline shrink-0">
          Повторить
        </button>
      )}
    </div>
  )
}

export function Empty({ text }: { text: string }) {
  return <div className="py-12 text-center text-muted text-sm">{text}</div>
}
