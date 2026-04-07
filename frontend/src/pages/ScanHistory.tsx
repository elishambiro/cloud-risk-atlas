import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Trash2, Loader2, CheckCircle2, XCircle, Clock, History } from 'lucide-react'
import { useDeleteScan } from '../hooks/useScan'
import { useSelectedScan } from '../hooks/useSelectedScan'
import type { Scan } from '../types'
import { cn, hasDistinctAccountName } from '../lib/utils'

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'complete':
      return (
        <span className="flex items-center gap-1.5 text-green-400">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span className="text-xs font-medium">Complete</span>
        </span>
      )
    case 'failed':
      return (
        <span className="flex items-center gap-1.5 text-red-400">
          <XCircle className="w-3.5 h-3.5" />
          <span className="text-xs font-medium">Failed</span>
        </span>
      )
    case 'running':
      return (
        <span className="flex items-center gap-1.5 text-blue-400">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span className="text-xs font-medium">Running</span>
        </span>
      )
    case 'pending':
      return (
        <span className="flex items-center gap-1.5 text-yellow-400">
          <Clock className="w-3.5 h-3.5" />
          <span className="text-xs font-medium">Pending</span>
        </span>
      )
    default:
      return <span className="text-xs text-gray-500">{status}</span>
  }
}

function ScanRow({
  scan,
  isSelected,
  onDelete,
}: {
  scan: Scan
  isSelected: boolean
  onDelete: (id: string) => void
}) {
  const navigate = useNavigate()
  const [deleting, setDeleting] = useState(false)

  const duration =
    scan.started_at && scan.finished_at
      ? Math.round(
          (new Date(scan.finished_at).getTime() - new Date(scan.started_at).getTime()) / 1000,
        )
      : null

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Delete this scan and all its data?')) return
    setDeleting(true)
    try {
      await onDelete(scan.id)
    } finally {
      setDeleting(false)
    }
  }

  const handleRowClick = () => {
    if (scan.status === 'complete') {
      navigate(`/?scan=${scan.id}`)
    }
  }

  return (
    <tr
      className={cn(
        'border-b border-gray-800 transition-colors',
        scan.status === 'complete' ? 'cursor-pointer hover:bg-gray-800/30' : 'cursor-default',
        isSelected && 'bg-red-500/5 ring-1 ring-inset ring-red-500/20',
      )}
      onClick={handleRowClick}
    >
      <td className="px-4 py-3 text-xs text-gray-400">
        {new Date(scan.started_at).toLocaleString()}
      </td>
      <td className="px-4 py-3">
        {hasDistinctAccountName(scan.account_id, scan.account_name) ? (
          <div className="min-w-0">
            <p className="truncate text-sm text-white">{scan.account_name}</p>
            <p className="text-xs text-gray-500 font-mono">{scan.account_id}</p>
          </div>
        ) : (
          <span className="text-sm text-white font-mono">{scan.account_id}</span>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-gray-300">{scan.region}</td>
      <td className="px-4 py-3">
        <StatusBadge status={scan.status} />
        {scan.status === 'failed' && scan.error && (
          <p className="mt-1 max-w-xs truncate text-xs text-red-300" title={scan.error}>
            {scan.error}
          </p>
        )}
        {isSelected && (
          <p className="mt-1 text-xs font-medium text-amber-300">Currently selected</p>
        )}
      </td>
      <td className="px-4 py-3 text-right text-sm font-bold text-white">
        {scan.summary?.global_risk_score?.toFixed(0) ?? '—'}
      </td>
      <td className="px-4 py-3 text-right text-sm text-gray-300">
        {scan.summary?.total_resources ?? '—'}
      </td>
      <td className="px-4 py-3 text-right text-sm text-gray-300">
        {scan.summary?.total_findings ?? '—'}
      </td>
      <td className="px-4 py-3 text-right text-xs text-gray-500">
        {duration !== null ? `${duration}s` : '—'}
      </td>
      <td className="px-4 py-3 text-right">
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="p-1.5 text-gray-600 hover:text-red-400 transition-colors"
        >
          {deleting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Trash2 className="w-3.5 h-3.5" />
          )}
        </button>
      </td>
    </tr>
  )
}

export default function ScanHistory() {
  const { scans, isLoading, selectedScanId } = useSelectedScan()
  const deleteScannMutation = useDeleteScan()

  const handleDelete = (id: string) => {
    return deleteScannMutation.mutateAsync(id)
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold text-white">Scan History</h1>
      <p className="text-sm text-gray-500">
        Select a completed scan to view it across the dashboard, graph, findings, and attack paths.
      </p>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <p className="text-gray-500 text-sm">Loading scans...</p>
        </div>
      ) : !scans?.length ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <History className="w-12 h-12 text-gray-700" />
          <p className="text-gray-400">No scans in history</p>
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                {[
                  { label: 'Started', align: 'left' },
                  { label: 'Account', align: 'left' },
                  { label: 'Region', align: 'left' },
                  { label: 'Status', align: 'left' },
                  { label: 'Score', align: 'right' },
                  { label: 'Resources', align: 'right' },
                  { label: 'Findings', align: 'right' },
                  { label: 'Duration', align: 'right' },
                  { label: '', align: 'right' },
                ].map(({ label, align }) => (
                  <th
                    key={label}
                    className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 ${
                      align === 'right' ? 'text-right' : 'text-left'
                    }`}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {scans.map((scan) => (
                <ScanRow
                  key={scan.id}
                  scan={scan}
                  isSelected={scan.id === selectedScanId}
                  onDelete={handleDelete}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
