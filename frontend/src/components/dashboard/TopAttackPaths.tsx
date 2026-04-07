import { ArrowRight } from 'lucide-react'
import SeverityBadge from '../shared/SeverityBadge'
import { shortResourceId } from '../../lib/utils'
import type { TopAttackPath } from '../../types'

interface TopAttackPathsProps {
  paths: TopAttackPath[]
}

export default function TopAttackPaths({ paths }: TopAttackPathsProps) {
  return (
    <div>
      <h3 className="text-sm font-medium text-gray-400 mb-3">Top Attack Paths</h3>
      {paths.length === 0 ? (
        <div className="text-sm text-gray-600 py-4 text-center">No attack paths identified</div>
      ) : (
        <div className="space-y-3">
          {paths.map((path) => (
            <div key={path.id} className="p-3 bg-gray-800/50 rounded-lg">
              <div className="flex items-start justify-between gap-2 mb-2">
                <p className="text-sm font-medium text-white">{path.title}</p>
                <div className="flex items-center gap-2 shrink-0">
                  <SeverityBadge severity={path.severity} />
                  <span className="text-xs font-bold text-white">{path.score.toFixed(0)}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-400">
                <span className="rounded bg-gray-700 px-2 py-0.5" title={path.entry_point}>
                  {shortResourceId(path.entry_point)}
                </span>
                <ArrowRight className="w-3 h-3" />
                <span className="rounded bg-gray-700 px-2 py-0.5" title={path.target}>
                  {shortResourceId(path.target)}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-2 line-clamp-2">{path.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
