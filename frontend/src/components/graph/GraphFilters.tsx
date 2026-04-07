import { Filter, RotateCcw, Search, Sparkles, Target } from 'lucide-react'
import { cn } from '../../lib/utils'

interface GraphFiltersProps {
  selectedSeverities: string[]
  onToggleSeverity: (s: string) => void
  selectedTypes: string[]
  onToggleType: (t: string) => void
  showAttackPathsOnly: boolean
  onToggleAttackPaths: () => void
  searchTerm: string
  onSearchTermChange: (value: string) => void
  totalNodes: number
  visibleNodes: number
  totalEdges: number
  visibleEdges: number
  attackPathCount: number
  attackPathLoading?: boolean
  attackPathUnavailable?: boolean
  activeFilterCount: number
  onResetFilters: () => void
}

const SEVERITIES = ['critical', 'high', 'medium', 'low', 'none']
const SEVERITY_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#3b82f6',
  none: '#64748b',
}

const RESOURCE_TYPES = [
  'EC2_INSTANCE',
  'S3_BUCKET',
  'IAM_ROLE',
  'SECURITY_GROUP',
  'VPC',
  'SUBNET',
  'LAMBDA_FUNCTION',
  'IGW',
  'INTERNET',
]

function formatLabel(value: string): string {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export default function GraphFilters({
  selectedSeverities,
  onToggleSeverity,
  selectedTypes,
  onToggleType,
  showAttackPathsOnly,
  onToggleAttackPaths,
  searchTerm,
  onSearchTermChange,
  totalNodes,
  visibleNodes,
  totalEdges,
  visibleEdges,
  attackPathCount,
  attackPathLoading = false,
  attackPathUnavailable = false,
  activeFilterCount,
  onResetFilters,
}: GraphFiltersProps) {
  return (
    <aside className="flex w-80 shrink-0 flex-col overflow-y-auto border-r border-white/10 bg-[linear-gradient(180deg,_rgba(15,23,42,0.92),_rgba(2,6,23,0.98))] p-5">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Graph Controls</p>
          <h2 className="mt-1 text-lg font-semibold text-white">Refine the view</h2>
        </div>
        <button
          type="button"
          onClick={onResetFilters}
          disabled={activeFilterCount === 0}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset
        </button>
      </div>

      <div className="space-y-4">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.35)]">
          <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-500">
            <Filter className="h-3.5 w-3.5" />
            View Summary
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-3">
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Nodes</p>
              <p className="mt-1 text-xl font-semibold text-white">{visibleNodes}</p>
              <p className="text-xs text-slate-500">of {totalNodes}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-3">
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Edges</p>
              <p className="mt-1 text-xl font-semibold text-white">{visibleEdges}</p>
              <p className="text-xs text-slate-500">of {totalEdges}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between rounded-2xl border border-cyan-500/10 bg-cyan-500/5 px-3 py-2 text-xs text-cyan-100/90">
            <span className="inline-flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-cyan-300" />
              {attackPathUnavailable ? 'Attack paths unavailable' : 'Attack paths in view'}
            </span>
            <span className="font-semibold text-white">
              {attackPathUnavailable ? '—' : attackPathLoading ? '…' : attackPathCount}
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Active filter groups: <span className="font-medium text-slate-300">{activeFilterCount}</span>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.35)]">
          <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-500">
            <Search className="h-3.5 w-3.5" />
            Search
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-2">
            <input
              value={searchTerm}
              onChange={(e) => onSearchTermChange(e.target.value)}
              placeholder="Resource, ARN, type"
              className="w-full bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.35)]">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Severity</h3>
          <div className="space-y-2">
            {SEVERITIES.map((severity) => (
              <button
                key={severity}
                type="button"
                onClick={() => onToggleSeverity(severity)}
                className={cn(
                  'flex w-full items-center justify-between rounded-2xl border px-3 py-2 text-left transition-all',
                  selectedSeverities.includes(severity)
                    ? 'border-white/15 bg-white/10 text-white'
                    : 'border-white/10 bg-slate-950/70 text-slate-400 hover:border-white/15 hover:text-slate-200',
                )}
              >
                <span className="inline-flex items-center gap-2 text-sm">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: SEVERITY_COLORS[severity] || '#64748b' }}
                  />
                  <span>{formatLabel(severity)}</span>
                </span>
                <span className="text-xs">{selectedSeverities.includes(severity) ? 'On' : 'Off'}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.35)]">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Resource Type</h3>
          <div className="space-y-2">
            {RESOURCE_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => onToggleType(type)}
                className={cn(
                  'flex w-full items-center justify-between rounded-2xl border px-3 py-2 text-left transition-all',
                  selectedTypes.includes(type)
                    ? 'border-cyan-400/20 bg-cyan-500/10 text-white'
                    : 'border-white/10 bg-slate-950/70 text-slate-400 hover:border-white/15 hover:text-slate-200',
                )}
              >
                <span className="text-sm">{formatLabel(type)}</span>
                <span className="text-xs">{selectedTypes.includes(type) ? 'On' : 'Off'}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.35)]">
          <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-500">
            <Target className="h-3.5 w-3.5" />
            Focus Mode
          </div>
          <button
            type="button"
            onClick={onToggleAttackPaths}
            disabled={attackPathUnavailable || attackPathLoading}
            className={cn(
              'flex w-full items-center justify-between rounded-2xl border px-3 py-3 text-left transition-all',
              showAttackPathsOnly
                ? 'border-red-400/30 bg-red-500/10 text-white'
                : 'border-white/10 bg-slate-950/70 text-slate-400 hover:border-white/15 hover:text-slate-200',
              (attackPathUnavailable || attackPathLoading) && 'cursor-not-allowed opacity-50 hover:border-white/10 hover:text-slate-400',
            )}
          >
            <div>
              <p className="text-sm font-medium">Attack paths only</p>
              <p className="mt-1 text-xs text-slate-500">
                {attackPathLoading
                  ? 'Attack-path data is still loading.'
                  : attackPathUnavailable
                  ? 'Attack-path data is currently unavailable.'
                  : 'Reduce the graph to nodes that participate in discovered attack corridors.'}
              </p>
            </div>
            <div
              className={cn(
                'h-6 w-11 rounded-full border transition-colors',
                showAttackPathsOnly ? 'border-red-300/40 bg-red-500/70' : 'border-white/10 bg-slate-700',
              )}
            >
              <span
                className={cn(
                  'mt-0.5 block h-4 w-4 rounded-full bg-white shadow transition-transform',
                  showAttackPathsOnly ? 'translate-x-5' : 'translate-x-0.5',
                )}
              />
            </div>
          </button>
        </div>
      </div>
    </aside>
  )
}
