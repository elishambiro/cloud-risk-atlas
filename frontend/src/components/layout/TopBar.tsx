import { useState } from 'react'
import { Play, Loader2, Clock, XCircle } from 'lucide-react'
import { useSelectedScan } from '../../hooks/useSelectedScan'
import ScanTriggerModal from '../shared/ScanTriggerModal'
import { formatAccountLabel, formatRelativeTime, severityColor } from '../../lib/utils'

export default function TopBar() {
  const [modalOpen, setModalOpen] = useState(false)
  const { latestScan, selectedScan } = useSelectedScan()
  const displayScan = selectedScan ?? latestScan
  const isRunning = latestScan?.status === 'running' || latestScan?.status === 'pending'
  const hasFailed = displayScan?.status === 'failed'
  const isViewingSelectedScan =
    !!displayScan && !!latestScan && displayScan.id !== latestScan.id
  const displayAccountLabel = displayScan
    ? formatAccountLabel(displayScan.account_id, displayScan.account_name)
    : null
  const latestAccountLabel = latestScan
    ? formatAccountLabel(latestScan.account_id, latestScan.account_name)
    : null

  return (
    <>
      <header className="h-14 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-6 shrink-0">
        {/* Scan status */}
        <div className="flex items-center gap-4 text-sm">
          {displayScan ? (
            <div className="flex items-center gap-2 text-gray-400">
              {isRunning ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                  <span className="text-blue-400">Scan running...</span>
                  {latestAccountLabel && (
                    <>
                      <span className="text-gray-600">|</span>
                      <span className="max-w-[18rem] truncate text-gray-500">{latestAccountLabel}</span>
                    </>
                  )}
                  {selectedScan && selectedScan.id !== latestScan?.id && (
                    <>
                      <span className="text-gray-600">|</span>
                      <span className="text-gray-500">
                        Viewing {formatAccountLabel(selectedScan.account_id, selectedScan.account_name)} in {selectedScan.region} from {formatRelativeTime(selectedScan.started_at)}
                      </span>
                    </>
                  )}
                </>
              ) : hasFailed ? (
                <>
                  <XCircle className="w-4 h-4 text-red-400" />
                  <span className="text-red-400">Selected scan failed</span>
                  {displayAccountLabel && (
                    <span className="max-w-[18rem] truncate text-gray-500">
                      {displayAccountLabel}
                    </span>
                  )}
                  {displayScan.error && (
                    <span className="max-w-[28rem] truncate text-gray-500" title={displayScan.error}>
                      {displayScan.error}
                    </span>
                  )}
                </>
              ) : (
                <>
                  {isViewingSelectedScan && (
                    <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-300">
                      Viewing selected scan
                    </span>
                  )}
                  <Clock className="w-3.5 h-3.5" />
                  <span>{displayScan.region}</span>
                  {displayAccountLabel && (
                    <>
                      <span className="text-gray-600">|</span>
                      <span className="max-w-[18rem] truncate">{displayAccountLabel}</span>
                    </>
                  )}
                  <span className="text-gray-600">|</span>
                  <span>Started: {formatRelativeTime(displayScan.started_at)}</span>
                  {displayScan.summary?.global_risk_score !== undefined && (
                    <span className="flex items-center gap-1">
                      <span className="text-gray-600">|</span>
                      <span>Score:</span>
                      <span
                        className={`font-semibold ${severityColor(
                          displayScan.summary.global_risk_score >= 80
                            ? 'critical'
                            : displayScan.summary.global_risk_score >= 60
                            ? 'high'
                            : displayScan.summary.global_risk_score >= 30
                            ? 'medium'
                            : 'low',
                        )}`}
                      >
                        {displayScan.summary.global_risk_score.toFixed(0)}
                      </span>
                    </span>
                  )}
                </>
              )}
            </div>
          ) : (
            <span className="text-gray-600 text-sm">No scans yet</span>
          )}
        </div>

        {/* Run Scan button */}
        <button
          onClick={() => setModalOpen(true)}
          disabled={isRunning}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
        >
          {isRunning ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Play className="w-4 h-4" />
          )}
          {isRunning ? 'Scanning...' : 'Run Scan'}
        </button>
      </header>

      <ScanTriggerModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  )
}
