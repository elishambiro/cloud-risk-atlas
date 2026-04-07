import { useEffect, useState } from 'react'
import { ChevronDown, ChevronLeft, ChevronRight, ShieldAlert } from 'lucide-react'
import { useSelectedScan } from '../hooks/useSelectedScan'
import { useFindings } from '../hooks/useFindings'
import SeverityBadge from '../components/shared/SeverityBadge'
import StatePanel from '../components/shared/StatePanel'
import type { Finding } from '../types'
import { getErrorMessage } from '../lib/errors'
import { formatResourceType, shortResourceId } from '../lib/utils'

const PAGE_SIZE = 50
const SEVERITY_FILTERS = ['all', 'critical', 'high', 'medium', 'low']

function PaginationButton({
  disabled,
  onClick,
  label,
  direction,
}: {
  disabled: boolean
  onClick: () => void
  label: string
  direction: 'left' | 'right'
}) {
  const Icon = direction === 'left' ? ChevronLeft : ChevronRight

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-slate-200 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {direction === 'left' && <Icon className="h-4 w-4" />}
      {label}
      {direction === 'right' && <Icon className="h-4 w-4" />}
    </button>
  )
}

function FindingRow({ finding }: { finding: Finding }) {
  const [expanded, setExpanded] = useState(false)
  const resourceLabel = finding.resource_name || shortResourceId(finding.resource_id)
  const resourceTypeLabel = formatResourceType(finding.resource_type)

  return (
    <>
      <tr
        className="cursor-pointer border-b border-gray-800 transition-colors hover:bg-gray-800/30"
        onClick={() => setExpanded((value) => !value)}
      >
        <td className="w-8 px-4 py-3">
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-gray-500" />
          ) : (
            <ChevronRight className="h-4 w-4 text-gray-500" />
          )}
        </td>
        <td className="px-4 py-3">
          <SeverityBadge severity={finding.severity} />
        </td>
        <td className="px-4 py-3 text-xs font-mono text-gray-500">{finding.rule_id}</td>
        <td className="px-4 py-3 text-sm font-medium text-white">{finding.title}</td>
        <td className="px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm text-white">{resourceLabel}</p>
            <p className="truncate text-xs text-gray-500">
              {resourceTypeLabel}
              <span className="mx-1.5 text-gray-700">|</span>
              <span className="font-mono">{shortResourceId(finding.resource_id)}</span>
            </p>
          </div>
        </td>
        <td className="px-4 py-3 text-right">
          <span className="text-sm font-bold text-white">{finding.score.toFixed(0)}</span>
        </td>
      </tr>
      {expanded && (
        <tr className="border-b border-gray-800 bg-gray-900/50">
          <td colSpan={6} className="px-8 py-4">
            <div className="mb-4 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-slate-300">
                Resource <span className="font-medium text-white">{resourceLabel}</span>
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-slate-300">
                Type <span className="font-medium text-white">{resourceTypeLabel}</span>
              </span>
              <span
                className="max-w-full rounded-full border border-white/10 bg-white/5 px-2.5 py-1 font-mono text-slate-300"
                title={finding.resource_id}
              >
                {finding.resource_id}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-6">
              <div>
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                  Explanation
                </p>
                <p className="text-xs text-gray-300">{finding.explanation}</p>
              </div>
              <div>
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                  Impact
                </p>
                <p className="text-xs text-gray-300">{finding.impact}</p>
              </div>
              <div>
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                  Remediation
                </p>
                <p className="text-xs text-green-400/80">{finding.remediation}</p>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

export default function Findings() {
  const [severityFilter, setSeverityFilter] = useState('all')
  const [page, setPage] = useState(0)
  const { selectedScan } = useSelectedScan()
  const {
    data: findingsPage,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useFindings(selectedScan?.id, {
    severity: severityFilter !== 'all' ? severityFilter : undefined,
    page,
    pageSize: PAGE_SIZE,
    keepPreviousData: true,
  })

  useEffect(() => {
    setPage(0)
  }, [selectedScan?.id, severityFilter])

  const SEVERITY_COLORS: Record<string, string> = {
    all: 'bg-gray-700 text-gray-300',
    critical: 'border border-red-500/30 bg-red-500/20 text-red-400',
    high: 'border border-orange-500/30 bg-orange-500/20 text-orange-400',
    medium: 'border border-yellow-500/30 bg-yellow-500/20 text-yellow-400',
    low: 'border border-blue-500/30 bg-blue-500/20 text-blue-400',
  }

  const findings = findingsPage?.items ?? []
  const total = findingsPage?.total ?? 0
  const start = total === 0 ? 0 : findingsPage!.offset + 1
  const end = findingsPage ? findingsPage.offset + findings.length : 0
  const hasPreviousPage = page > 0
  const hasNextPage = findingsPage?.has_more ?? false

  return (
    <div className="space-y-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-white">Findings</h1>
          {selectedScan && findingsPage && (
            <p className="mt-1 text-sm text-gray-500">
              {total === 0 ? 'No findings available' : `Showing ${start}-${end} of ${total} findings`}
              {isFetching && !isLoading ? ' · Refreshing…' : ''}
            </p>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        {SEVERITY_FILTERS.map((severity) => (
          <button
            key={severity}
            type="button"
            onClick={() => setSeverityFilter(severity)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
              severityFilter === severity
                ? SEVERITY_COLORS[severity]
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {severity}
          </button>
        ))}
      </div>

      {!selectedScan ? (
        <StatePanel
          icon={ShieldAlert}
          title="No scan data available"
          message="Select a completed scan to review its findings."
          compact
          className="bg-transparent"
        />
      ) : isLoading && !findingsPage ? (
        <div className="flex items-center justify-center py-20">
          <p className="text-sm text-gray-500">Loading findings...</p>
        </div>
      ) : isError ? (
        <StatePanel
          icon={ShieldAlert}
          title="Could not load findings"
          message={getErrorMessage(error, 'The findings API request failed.')}
          actionLabel="Retry"
          onAction={() => void refetch()}
          tone="error"
          compact
          className="bg-transparent"
        />
      ) : total === 0 ? (
        <StatePanel
          icon={ShieldAlert}
          title={severityFilter === 'all' ? 'No findings for this scan' : `No ${severityFilter} findings`}
          message={
            severityFilter === 'all'
              ? 'This scan completed without any findings in the current dataset.'
              : `No findings match the ${severityFilter} severity filter for this scan.`
          }
          compact
          className="bg-transparent"
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-800 bg-gray-900">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="w-8" />
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Severity
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Rule ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Title
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Resource
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Score
                </th>
              </tr>
            </thead>
            <tbody>
              {findings.map((finding) => (
                <FindingRow key={finding.id} finding={finding} />
              ))}
            </tbody>
          </table>

          {total > findingsPage!.limit && (
            <div className="flex items-center justify-between border-t border-gray-800 bg-gray-900/60 px-4 py-3">
              <p className="text-xs text-gray-500">
                Page {page + 1} · {start}-{end} of {total}
              </p>
              <div className="flex items-center gap-2">
                <PaginationButton
                  disabled={!hasPreviousPage}
                  onClick={() => setPage((value) => Math.max(0, value - 1))}
                  label="Previous"
                  direction="left"
                />
                <PaginationButton
                  disabled={!hasNextPage}
                  onClick={() => setPage((value) => value + 1)}
                  label="Next"
                  direction="right"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
