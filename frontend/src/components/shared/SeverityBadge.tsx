import { cn, severityBgColor } from '../../lib/utils'
import type { Severity } from '../../types'

interface SeverityBadgeProps {
  severity: Severity | string
  className?: string
}

export default function SeverityBadge({ severity, className }: SeverityBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
        severityBgColor(severity),
        className,
      )}
    >
      {severity.toUpperCase()}
    </span>
  )
}
