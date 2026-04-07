import { useState } from 'react'
import { Play, AlertTriangle } from 'lucide-react'
import { useSelectedScan } from '../hooks/useSelectedScan'
import { useDashboard } from '../hooks/useDashboard'
import RiskScoreGauge from '../components/dashboard/RiskScoreGauge'
import SeverityBreakdown from '../components/dashboard/SeverityBreakdown'
import TopRiskyResources from '../components/dashboard/TopRiskyResources'
import TopAttackPaths from '../components/dashboard/TopAttackPaths'
import ScanSummaryCard from '../components/dashboard/ScanSummaryCard'
import ScanTriggerModal from '../components/shared/ScanTriggerModal'
import StatePanel from '../components/shared/StatePanel'
import { getErrorMessage } from '../lib/errors'

function EmptyState({ onOpen, hasScans }: { onOpen: () => void; hasScans: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 p-8">
      <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center">
        <AlertTriangle className="w-8 h-8 text-gray-600" />
      </div>
      <div className="text-center">
        <h2 className="text-xl font-semibold text-white mb-2">
          {hasScans ? 'No completed scans yet' : 'No scans yet'}
        </h2>
        <p className="text-gray-400 text-sm max-w-sm">
          {hasScans
            ? 'Complete a scan successfully to explore its dashboard, graph, findings, and attack paths.'
            : 'Run your first scan to analyze your AWS infrastructure and identify security risks.'}
        </p>
      </div>
      <button
        onClick={onOpen}
        className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-medium rounded-lg transition-colors"
      >
        <Play className="w-5 h-5" />
        Run First Scan
      </button>
    </div>
  )
}

export default function Dashboard() {
  const [modalOpen, setModalOpen] = useState(false)
  const { scans, isLoading: scansLoading, selectedScan } = useSelectedScan()
  const {
    data: dashboard,
    isLoading: dashLoading,
    isError: dashboardUnavailable,
    error: dashboardError,
    refetch: refetchDashboard,
  } = useDashboard(selectedScan?.id)

  if (scansLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500 text-sm">Loading...</div>
      </div>
    )
  }

  if (!scans?.length || !selectedScan) {
    return (
      <>
        <EmptyState onOpen={() => setModalOpen(true)} hasScans={!!scans?.length} />
        <ScanTriggerModal open={modalOpen} onClose={() => setModalOpen(false)} />
      </>
    )
  }

  if (dashLoading || !dashboard) {
    if (dashboardUnavailable) {
      return (
        <div className="p-6">
          <StatePanel
            icon={AlertTriangle}
            title="Could not load the dashboard"
            message={getErrorMessage(dashboardError, 'The dashboard API request failed.')}
            actionLabel="Retry"
            onAction={() => void refetchDashboard()}
            tone="error"
            className="bg-transparent"
          />
        </div>
      )
    }

    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500 text-sm">Loading dashboard...</div>
      </div>
    )
  }

  const scanInfo = dashboard.scan_info
  const displayScan = {
    ...selectedScan,
    account_id: scanInfo.account_id || selectedScan.account_id,
    account_name: scanInfo.account_name ?? selectedScan.account_name,
    region: scanInfo.region || selectedScan.region,
    status: scanInfo.status || selectedScan.status,
    started_at: scanInfo.started_at || selectedScan.started_at,
    finished_at: scanInfo.finished_at ?? selectedScan.finished_at,
    error: scanInfo.error ?? selectedScan.error,
  }

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-3 gap-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-5">
          <div className="flex justify-center">
            <RiskScoreGauge score={dashboard.global_risk_score} />
          </div>
          <div className="border-t border-gray-800 pt-4">
            <ScanSummaryCard scan={displayScan} />
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-medium text-gray-400">Overview</h3>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Resources', value: dashboard.total_resources },
              { label: 'Findings', value: dashboard.total_findings },
              { label: 'Attack Paths', value: dashboard.total_attack_paths },
              {
                label: 'Critical',
                value: dashboard.severity_counts.critical,
                className: 'text-red-400',
              },
            ].map(({ label, value, className }) => (
              <div key={label} className="bg-gray-800/60 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">{label}</p>
                <p className={`text-2xl font-bold text-white ${className ?? ''}`}>{value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <SeverityBreakdown counts={dashboard.severity_counts} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <TopRiskyResources resources={dashboard.top_resources} />
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <TopAttackPaths paths={dashboard.top_attack_paths} />
        </div>
      </div>
    </div>
  )
}
