import type { LucideIcon } from 'lucide-react'
import { RefreshCw } from 'lucide-react'
import { cn } from '../../lib/utils'

interface StatePanelProps {
  icon: LucideIcon
  title: string
  message: string
  actionLabel?: string
  onAction?: () => void
  tone?: 'default' | 'error'
  compact?: boolean
  className?: string
}

export default function StatePanel({
  icon: Icon,
  title,
  message,
  actionLabel,
  onAction,
  tone = 'default',
  compact = false,
  className,
}: StatePanelProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-4 rounded-2xl border p-8 text-center',
        tone === 'error'
          ? 'border-red-500/20 bg-red-500/5'
          : 'border-white/10 bg-white/5',
        compact ? 'py-10' : 'py-16',
        className,
      )}
    >
      <div
        className={cn(
          'flex h-14 w-14 items-center justify-center rounded-2xl border',
          tone === 'error'
            ? 'border-red-500/20 bg-red-500/10'
            : 'border-white/10 bg-white/5',
        )}
      >
        <Icon
          className={cn(
            'h-6 w-6',
            tone === 'error' ? 'text-red-400' : 'text-slate-400',
          )}
        />
      </div>
      <div className="space-y-2">
        <p className="text-lg font-semibold text-white">{title}</p>
        <p className="max-w-xl text-sm text-slate-400">{message}</p>
      </div>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 transition-colors hover:bg-white/10"
        >
          <RefreshCw className="h-4 w-4" />
          {actionLabel}
        </button>
      )}
    </div>
  )
}
