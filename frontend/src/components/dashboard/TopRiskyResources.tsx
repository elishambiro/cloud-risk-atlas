import { Wifi } from 'lucide-react'
import SeverityBadge from '../shared/SeverityBadge'
import { resourceIcon, shortResourceId } from '../../lib/utils'
import type { TopResource } from '../../types'

interface TopRiskyResourcesProps {
  resources: TopResource[]
}

export default function TopRiskyResources({ resources }: TopRiskyResourcesProps) {
  return (
    <div>
      <h3 className="text-sm font-medium text-gray-400 mb-3">Top Risky Resources</h3>
      {resources.length === 0 ? (
        <div className="text-sm text-gray-600 py-4 text-center">No risky resources found</div>
      ) : (
        <div className="space-y-2">
          {resources.map((r) => (
            <div
              key={r.resource_id}
              className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg"
            >
              <span className="text-xl">{resourceIcon(r.type)}</span>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-white" title={r.resource_id}>
                  {r.name || shortResourceId(r.resource_id)}
                </p>
                <p className="text-xs text-gray-500">{r.type.replace(/_/g, ' ')}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {r.is_internet_reachable && (
                  <span title="Internet reachable">
                    <Wifi className="h-3.5 w-3.5 text-orange-400" />
                  </span>
                )}
                <SeverityBadge severity={r.severity} />
                <span className="text-sm font-bold text-white">
                  {r.risk_score.toFixed(0)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
