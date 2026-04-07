import { ArrowRight, Swords } from 'lucide-react'
import { useSelectedScan } from '../hooks/useSelectedScan'
import { useAttackPaths } from '../hooks/useAttackPaths'
import SeverityBadge from '../components/shared/SeverityBadge'
import StatePanel from '../components/shared/StatePanel'
import type { AttackPath } from '../types'
import { getErrorMessage } from '../lib/errors'
import { shortResourceId } from '../lib/utils'

function PathVisualization({ path }: { path: string[] }) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1">
      {path.map((nodeId, index) => (
        <span key={`${nodeId}-${index}`} className="flex items-center gap-1">
          <span
            className="rounded bg-gray-700 px-2 py-0.5 font-mono text-xs text-gray-300"
            title={nodeId}
          >
            {shortResourceId(nodeId)}
          </span>
          {index < path.length - 1 && <ArrowRight className="h-3 w-3 shrink-0 text-gray-600" />}
        </span>
      ))}
    </div>
  )
}

function AttackPathCard({ path }: { path: AttackPath }) {
  const hopCount = Math.max(path.path.length - 1, 0)

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-5 transition-colors hover:border-gray-700">
      <div className="mb-3 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-white">{path.title}</h3>
          <p className="mt-1 text-xs text-gray-500">{path.description}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <SeverityBadge severity={path.severity} />
          <span className="text-sm font-bold text-white">{path.score.toFixed(0)}</span>
        </div>
      </div>

      <PathVisualization path={path.path} />

      <div className="mt-3 flex gap-4 border-t border-gray-800 pt-3 text-xs text-gray-500">
        <span>
          Entry: <span className="text-gray-300" title={path.entry_point}>{shortResourceId(path.entry_point)}</span>
        </span>
        <span>
          Target: <span className="text-gray-300" title={path.target}>{shortResourceId(path.target)}</span>
        </span>
        <span>
          Hops: <span className="text-gray-300">{hopCount}</span>
        </span>
      </div>
    </div>
  )
}

export default function AttackPaths() {
  const { selectedScan } = useSelectedScan()
  const {
    data: paths,
    isLoading,
    isError,
    error,
    refetch,
  } = useAttackPaths(selectedScan?.id)

  return (
    <div className="space-y-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-white">Attack Paths</h1>
          {paths && paths.length > 0 && (
            <p className="mt-1 text-sm text-gray-500">
              Showing top {paths.length} highest-scoring paths stored for this scan
            </p>
          )}
        </div>
      </div>

      {!selectedScan ? (
        <StatePanel
          icon={Swords}
          title="No scan data available"
          message="Select a completed scan to review its stored attack paths."
          compact
          className="bg-transparent"
        />
      ) : isLoading ? (
        <div className="flex items-center justify-center py-20">
          <p className="text-sm text-gray-500">Loading attack paths...</p>
        </div>
      ) : isError ? (
        <StatePanel
          icon={Swords}
          title="Could not load attack paths"
          message={getErrorMessage(error, 'The attack-path API request failed.')}
          actionLabel="Retry"
          onAction={() => void refetch()}
          tone="error"
          compact
          className="bg-transparent"
        />
      ) : !paths?.length ? (
        <StatePanel
          icon={Swords}
          title="No attack paths identified"
          message="This scan does not contain any stored attack paths under the current heuristic model."
          compact
          className="bg-transparent"
        />
      ) : (
        <div className="space-y-4">
          {paths.map((path) => (
            <AttackPathCard key={path.id} path={path} />
          ))}
        </div>
      )}
    </div>
  )
}
