import type { ReactNode } from 'react'

export function Spinner({ className = 'size-5' }: { className?: string }) {
  return (
    <svg className={`${className} animate-spin`} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity=".25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

export function PageLoader() {
  return (
    <div className="grid min-h-[40vh] place-items-center text-ink-400" role="status" aria-label="Loading">
      <Spinner className="size-7" />
    </div>
  )
}

export function ErrorNotice({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
      <span>{message}</span>
      {onRetry && (
        <button onClick={onRetry} className="ml-2 cursor-pointer font-semibold underline">
          Retry
        </button>
      )}
    </div>
  )
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="card grid place-items-center gap-2 px-6 py-14 text-center">
      <p className="text-lg font-bold">{title}</p>
      <p className="max-w-sm text-sm text-ink-500">{body}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}

const statusStyles: Record<string, string> = {
  confirmed: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  cancelled: 'bg-ink-100 text-ink-600 ring-ink-300/40',
  completed: 'bg-sky-50 text-sky-700 ring-sky-600/20',
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ring-1 ring-inset ${statusStyles[status] ?? statusStyles.cancelled}`}
    >
      {status}
    </span>
  )
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-500">{hint}</span>}
    </label>
  )
}
