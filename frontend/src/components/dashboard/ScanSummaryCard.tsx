import { CheckCircle2, XCircle, Loader2, Clock } from 'lucide-react'
import type { Scan } from '../../types'
import { formatAccountLabel, formatDuration } from '../../lib/utils'

interface ScanSummaryCardProps {
  scan: Scan
}

const STATUS_ICON: Record<string, React.ReactNode> = {
  complete: <CheckCircle2 className="w-4 h-4 text-green-400" />,
  failed:   <XCircle     className="w-4 h-4 text-red-400" />,
  running:  <Loader2     className="w-4 h-4 text-blue-400 animate-spin" />,
  pending:  <Loader2     className="w-4 h-4 text-blue-400 animate-spin" />,
}

const STATUS_LABEL: Record<string, string> = {
  complete: 'Completed',
  failed:   'Failed',
  running:  'Running',
  pending:  'Pending',
}

export default function ScanSummaryCard({ scan }: ScanSummaryCardProps) {
  const duration =
    scan.started_at && scan.finished_at
      ? Math.round((new Date(scan.finished_at).getTime() - new Date(scan.started_at).getTime()) / 1000)
      : null

  const rows = [
    {
      label: 'Status',
      value: (
        <span className="flex items-center gap-1.5">
          {STATUS_ICON[scan.status] ?? <Clock className="w-4 h-4 text-gray-400" />}
          <span>{STATUS_LABEL[scan.status] ?? scan.status}</span>
        </span>
      ),
    },
    { label: 'Account',   value: formatAccountLabel(scan.account_id, scan.account_name) },
    { label: 'Region',    value: scan.region },
    { label: 'Resources', value: scan.summary?.total_resources ?? '—' },
    { label: 'Findings',  value: scan.summary?.total_findings ?? '—' },
    { label: 'Duration',  value: duration ? formatDuration(duration) : '—' },
  ]

  return (
    <div>
      <h3 className="text-sm font-medium text-gray-400 mb-3">Scan Details</h3>
      <dl className="space-y-2">
        {rows.map(({ label, value }) => (
          <div key={label} className="flex items-center justify-between">
            <dt className="text-xs text-gray-500">{label}</dt>
            <dd className="text-sm text-white font-medium">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
