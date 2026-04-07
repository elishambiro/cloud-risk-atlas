import { useState } from 'react'
import { Check, ChevronDown, ChevronRight, Copy, X } from 'lucide-react'
import SeverityBadge from '../shared/SeverityBadge'
import { cn, resourceIcon, shortResourceId } from '../../lib/utils'
import type { Finding, GraphNode } from '../../types'

interface NodeDetailPanelProps {
  node: GraphNode
  findings: Finding[]
  findingsLoading?: boolean
  findingsUnavailable?: boolean
  scanAccountId?: string | null
  scanAccountLabel?: string | null
  onClose: () => void
}

function MetadataRow({ k, v }: { k: string; v: unknown }) {
  const isStructured = Array.isArray(v) || (typeof v === 'object' && v !== null)
  const display = isStructured ? JSON.stringify(v, null, 2) : String(v ?? '—')

  return (
    <div className="grid grid-cols-[110px_minmax(0,1fr)] gap-3 border-b border-white/8 py-2">
      <dt className="break-words text-xs text-slate-500">{k.replace(/_/g, ' ')}</dt>
      <dd className="min-w-0">
        {isStructured ? (
          <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-xl bg-slate-950/60 p-2 text-xs text-slate-300">
            {display}
          </pre>
        ) : (
          <span className="break-all text-xs text-slate-300">{display}</span>
        )}
      </dd>
    </div>
  )
}

function FindingItem({ finding }: { finding: Finding }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
      <button
        onClick={() => setExpanded((value) => !value)}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-white/5"
      >
        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-500" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-500" />
        )}
        <SeverityBadge severity={finding.severity} className="shrink-0" />
        <span className="flex-1 truncate text-xs font-medium text-white">{finding.title}</span>
        <span className="shrink-0 text-xs text-slate-500">{finding.score.toFixed(0)}</span>
      </button>
      {expanded && (
        <div className="space-y-2 border-t border-white/8 px-3 pb-3">
          <div>
            <p className="mb-1 mt-2 text-[10px] font-medium uppercase tracking-wide text-slate-500">Explanation</p>
            <p className="text-xs text-slate-300">{finding.explanation}</p>
          </div>
          <div>
            <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-slate-500">Impact</p>
            <p className="text-xs text-slate-300">{finding.impact}</p>
          </div>
          <div>
            <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-slate-500">Remediation</p>
            <p className="text-xs text-emerald-300/80">{finding.remediation}</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default function NodeDetailPanel({
  node,
  findings,
  findingsLoading = false,
  findingsUnavailable = false,
  scanAccountId,
  scanAccountLabel,
  onClose,
}: NodeDetailPanelProps) {
  const [copied, setCopied] = useState(false)
  const metadata = node.metadata ?? {}

  const handleCopy = () => {
    navigator.clipboard.writeText(node.id)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const nodeName = node.name || shortResourceId(node.id)
  const riskBarColor = {
    critical: 'bg-red-500',
    high: 'bg-orange-500',
    medium: 'bg-yellow-500',
    low: 'bg-sky-500',
    none: 'bg-slate-500',
  }[node.severity] ?? 'bg-slate-500'
  const findingSummary = findings.reduce<Record<string, number>>((acc, finding) => {
    acc[finding.severity] = (acc[finding.severity] ?? 0) + 1
    return acc
  }, {})
  const accountLabel =
    node.account_id === scanAccountId && scanAccountLabel
      ? scanAccountLabel
      : node.account_id

  return (
    <aside className="fixed bottom-4 right-4 top-20 z-30 flex w-[25rem] max-w-[calc(100vw-1.5rem)] flex-col overflow-hidden rounded-[28px] border border-white/10 bg-slate-950/92 shadow-[0_35px_120px_rgba(15,23,42,0.55)] backdrop-blur-2xl">
      <div className="shrink-0 border-b border-white/10 bg-[linear-gradient(180deg,_rgba(15,23,42,0.95),_rgba(15,23,42,0.78))] px-5 py-5">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-2xl">
            {resourceIcon(node.type)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold text-white">{nodeName}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.22em] text-slate-500">
              {node.type.replace(/_/g, ' ')}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <SeverityBadge severity={node.severity} />
              {node.region && (
                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-slate-300">
                  {node.region}
                </span>
              )}
              {node.account_id && (
                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-slate-300">
                  {accountLabel}
                </span>
              )}
              {node.is_internet_reachable && (
                <span className="rounded-full border border-orange-400/20 bg-orange-500/10 px-2.5 py-1 text-[11px] text-orange-200">
                  Internet reachable
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 transition-colors hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
            <span>Risk score</span>
            <span className="font-semibold text-white">{node.risk_score.toFixed(0)} / 100</span>
          </div>
          <div className="h-2 rounded-full bg-white/5">
            <div
              className={cn('h-2 rounded-full transition-all', riskBarColor)}
              style={{ width: `${Math.max(4, Math.min(node.risk_score, 100))}%` }}
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="border-b border-white/10 px-5 py-4">
          <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-slate-500">ARN / Resource ID</p>
          <div className="flex items-start gap-2 rounded-2xl border border-white/10 bg-white/5 p-3">
            <p className="flex-1 break-all font-mono text-xs text-slate-300">{node.id}</p>
            <button
              onClick={handleCopy}
              className="mt-0.5 shrink-0 text-slate-500 transition-colors hover:text-white"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        <div className="border-b border-white/10 px-5 py-4">
          <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-slate-500">Signals</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Findings</p>
              <p className="mt-1 text-xl font-semibold text-white">
                {findingsUnavailable ? '—' : findingsLoading ? '…' : findings.length}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Severity Mix</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {findingsLoading ? (
                  <span className="text-xs text-slate-500">Loading...</span>
                ) : findingsUnavailable ? (
                  <span className="text-xs text-slate-500">Unavailable</span>
                ) : Object.entries(findingSummary).length > 0 ? (
                  Object.entries(findingSummary).map(([severity, count]) => (
                    <span
                      key={severity}
                      className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] uppercase tracking-wide text-slate-300"
                    >
                      {severity} {count}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-500">No findings</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {Object.keys(metadata).length > 0 && (
          <div className="border-b border-white/10 px-5 py-4">
            <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-slate-500">Metadata</p>
            <dl>
              {Object.entries(metadata).sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => (
                <MetadataRow key={key} k={key} v={value} />
              ))}
            </dl>
          </div>
        )}

        <div className="px-5 py-4">
          <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-slate-500">
            Findings {findingsUnavailable ? '(Unavailable)' : findingsLoading ? '(Loading)' : `(${findings.length})`}
          </p>
          {findingsLoading ? (
            <p className="text-xs text-slate-500">Loading findings for this resource...</p>
          ) : findingsUnavailable ? (
            <p className="text-xs text-slate-500">Findings data could not be loaded for this scan.</p>
          ) : findings.length === 0 ? (
            <p className="text-xs text-slate-500">No findings for this resource</p>
          ) : (
            <div className="space-y-2">
              {findings.map((finding) => (
                <FindingItem key={finding.id} finding={finding} />
              ))}
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
