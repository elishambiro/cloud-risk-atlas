import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import { cn, resourceIcon } from '../../lib/utils'
import type { ResourceType, Severity } from '../../types'

interface ResourceNodeData {
  label: string
  type: ResourceType | string
  severity: Severity | string
  risk_score: number
  is_internet_reachable: boolean
}

interface ResourceNodeProps {
  data: ResourceNodeData
  selected: boolean
}

const severityConfig = {
  critical: {
    border: 'border-red-500/50',
    glow: 'shadow-[0_0_24px_rgba(239,68,68,0.25)]',
    topBar: 'bg-red-500',
    badge: 'bg-red-500/15 text-red-300 border-red-500/30',
    icon: 'bg-red-500/10 text-red-300',
    score: 'text-red-400',
  },
  high: {
    border: 'border-orange-500/50',
    glow: 'shadow-[0_0_24px_rgba(249,115,22,0.22)]',
    topBar: 'bg-orange-500',
    badge: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
    icon: 'bg-orange-500/10 text-orange-300',
    score: 'text-orange-400',
  },
  medium: {
    border: 'border-yellow-500/40',
    glow: 'shadow-[0_0_20px_rgba(234,179,8,0.18)]',
    topBar: 'bg-yellow-400',
    badge: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30',
    icon: 'bg-yellow-500/10 text-yellow-300',
    score: 'text-yellow-400',
  },
  low: {
    border: 'border-blue-500/40',
    glow: 'shadow-[0_0_18px_rgba(59,130,246,0.15)]',
    topBar: 'bg-blue-500',
    badge: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
    icon: 'bg-blue-500/10 text-blue-300',
    score: 'text-blue-400',
  },
  none: {
    border: 'border-slate-700/60',
    glow: 'shadow-[0_4px_20px_rgba(0,0,0,0.3)]',
    topBar: 'bg-slate-600',
    badge: 'bg-slate-700/50 text-slate-400 border-slate-600/40',
    icon: 'bg-slate-800 text-slate-400',
    score: 'text-slate-400',
  },
}

function ResourceNode({ data, selected }: ResourceNodeProps) {
  const cfg = severityConfig[data.severity as keyof typeof severityConfig] ?? severityConfig.none

  return (
    <div
      className={cn(
        'relative w-[220px] rounded-2xl border bg-slate-900 transition-all duration-150',
        cfg.border,
        cfg.glow,
        selected && 'ring-2 ring-cyan-400/40 ring-offset-1 ring-offset-slate-950 -translate-y-0.5',
      )}
    >
      {/* Top severity bar */}
      <div className={cn('h-1 w-full rounded-t-2xl', cfg.topBar)} />

      <Handle
        type="target"
        position={Position.Top}
        className="!-top-1.5 !h-3 !w-3 !border-2 !border-slate-900 !bg-slate-500"
      />

      <div className="px-4 py-3">
        {/* Header row */}
        <div className="flex items-center gap-3">
          <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-base', cfg.icon)}>
            {resourceIcon(data.type)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white" title={data.label}>
              {data.label}
            </p>
            <p className="mt-0.5 text-[10px] uppercase tracking-widest text-slate-500">
              {data.type.replace(/_/g, ' ')}
            </p>
          </div>
        </div>

        {/* Footer row */}
        <div className="mt-3 flex items-center justify-between border-t border-slate-800 pt-2.5">
          <div className="flex items-baseline gap-1.5">
            <span className={cn('text-lg font-bold tabular-nums', cfg.score)}>
              {data.risk_score.toFixed(0)}
            </span>
            <span className="text-[10px] text-slate-600">/ 100</span>
          </div>
          <div className="flex items-center gap-1.5">
            {data.is_internet_reachable && (
              <span className="rounded-md border border-orange-500/30 bg-orange-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-orange-400">
                Public
              </span>
            )}
            <span className={cn('rounded-md border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest', cfg.badge)}>
              {data.severity}
            </span>
          </div>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!-bottom-1.5 !h-3 !w-3 !border-2 !border-slate-900 !bg-slate-500"
      />
    </div>
  )
}

export default memo(ResourceNode)
