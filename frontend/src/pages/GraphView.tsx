import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, GitBranch, Network, RotateCcw, Search, ShieldAlert } from 'lucide-react'
import { useSelectedScan } from '../hooks/useSelectedScan'
import { useGraph } from '../hooks/useGraph'
import { useFindings } from '../hooks/useFindings'
import { useAttackPaths } from '../hooks/useAttackPaths'
import InfraGraph from '../components/graph/InfraGraph'
import GraphFilters from '../components/graph/GraphFilters'
import NodeDetailPanel from '../components/graph/NodeDetailPanel'
import StatePanel from '../components/shared/StatePanel'
import type { GraphNode } from '../types'
import { formatAccountLabel } from '../lib/utils'
import { getErrorMessage } from '../lib/errors'

const ALL_SEVERITIES = ['critical', 'high', 'medium', 'low', 'none']
const ALL_TYPES = [
  'EC2_INSTANCE', 'S3_BUCKET', 'IAM_ROLE', 'SECURITY_GROUP',
  'VPC', 'SUBNET', 'LAMBDA_FUNCTION', 'IGW', 'INTERNET',
]

function NoScanState() {
  return (
    <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.10),_transparent_42%),linear-gradient(180deg,_rgba(2,6,23,0.96),_rgba(2,6,23,1))] p-8">
      <div className="rounded-3xl border border-white/10 bg-slate-950/80 px-10 py-12 text-center shadow-[0_30px_90px_rgba(15,23,42,0.55)] backdrop-blur-xl">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-500/20 bg-cyan-500/10">
          <Network className="h-8 w-8 text-cyan-300" />
        </div>
        <p className="text-lg font-semibold text-white">No scan data available</p>
        <p className="mt-2 text-sm text-slate-400">
          Run a completed scan to explore your infrastructure graph, risk hotspots, and attack corridors.
        </p>
      </div>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="rounded-2xl border border-white/10 bg-slate-950/80 px-5 py-4 text-sm text-slate-400 shadow-[0_20px_60px_rgba(15,23,42,0.45)] backdrop-blur">
        Loading graph...
      </div>
    </div>
  )
}

function NoDataState() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="rounded-2xl border border-white/10 bg-slate-950/80 px-5 py-4 text-sm text-slate-400 shadow-[0_20px_60px_rgba(15,23,42,0.45)] backdrop-blur">
        No graph data for this scan
      </div>
    </div>
  )
}

function ErrorState({
  title,
  message,
  onRetry,
}: {
  title: string
  message: string
  onRetry: () => void
}) {
  return (
    <div className="flex h-full items-center justify-center p-6">
      <StatePanel
        icon={AlertTriangle}
        title={title}
        message={message}
        actionLabel="Retry"
        onAction={onRetry}
        tone="error"
        className="max-w-xl rounded-[28px] border border-red-500/20 bg-slate-950/88 shadow-[0_30px_90px_rgba(15,23,42,0.5)]"
      />
    </div>
  )
}

function NoMatchState({ onReset }: { onReset: () => void }) {
  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="max-w-md rounded-[28px] border border-white/10 bg-slate-950/82 px-8 py-8 text-center shadow-[0_30px_90px_rgba(15,23,42,0.5)] backdrop-blur-xl">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
          <Search className="h-6 w-6 text-slate-300" />
        </div>
        <p className="text-lg font-semibold text-white">No resources match the current filters</p>
        <p className="mt-2 text-sm text-slate-400">
          Broaden the severity, type, or attack-path filters to bring resources back into view.
        </p>
        <button
          type="button"
          onClick={onReset}
          className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 transition-colors hover:bg-white/10"
        >
          <RotateCcw className="h-4 w-4" />
          Reset filters
        </button>
      </div>
    </div>
  )
}

export default function GraphView() {
  const { selectedScan } = useSelectedScan()
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)
  const [selectedSeverities, setSelectedSeverities] = useState<string[]>(ALL_SEVERITIES)
  const [selectedTypes, setSelectedTypes] = useState<string[]>(ALL_TYPES)
  const [showAttackPathsOnly, setShowAttackPathsOnly] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const {
    data: graphData,
    isLoading: graphLoading,
    isError: graphUnavailable,
    error: graphError,
    refetch: refetchGraph,
  } = useGraph(selectedScan?.id)
  const {
    data: findingsSummaryPage,
    isLoading: findingsSummaryLoading,
    isError: findingsSummaryUnavailable,
    error: findingsSummaryError,
    refetch: refetchFindingsSummary,
  } = useFindings(selectedScan?.id, { pageSize: 1 })
  const {
    data: selectedNodeFindingsPage,
    isLoading: selectedNodeFindingsLoading,
    isError: selectedNodeFindingsUnavailable,
  } = useFindings(selectedScan?.id, {
    resourceId: selectedNode?.id,
    pageSize: 100,
    enabled: !!selectedScan?.id && !!selectedNode?.id,
  })
  const {
    data: attackPaths,
    isLoading: attackPathsLoading,
    isError: attackPathsUnavailable,
    error: attackPathsError,
    refetch: refetchAttackPaths,
  } = useAttackPaths(selectedScan?.id)

  const deferredSearch = useDeferredValue(searchTerm.trim().toLowerCase())
  const selectedNodeFindings = selectedNodeFindingsPage?.items ?? []

  const toggle = <T,>(setter: React.Dispatch<React.SetStateAction<T[]>>, value: T) =>
    setter((prev) => prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value])

  const resetFilters = () => {
    setSelectedSeverities(ALL_SEVERITIES)
    setSelectedTypes(ALL_TYPES)
    setShowAttackPathsOnly(false)
    setSearchTerm('')
  }

  const attackPathNodeIds = useMemo(() => {
    const ids = new Set<string>()
    attackPaths?.forEach((path) => path.path.forEach((id) => ids.add(id)))
    return ids
  }, [attackPaths])

  const filteredNodeIds = useMemo(() => {
    if (!graphData) return undefined
    return new Set(
      graphData.nodes
        .filter((node) => {
          if (!selectedSeverities.includes(node.severity)) return false
          if (!selectedTypes.includes(node.type)) return false
          if (showAttackPathsOnly && !attackPathNodeIds.has(node.id)) return false
          if (deferredSearch && ![node.name, node.id, node.type].some((v) => String(v ?? '').toLowerCase().includes(deferredSearch))) return false
          return true
        })
        .map((node) => node.id),
    )
  }, [attackPathNodeIds, deferredSearch, graphData, selectedSeverities, selectedTypes, showAttackPathsOnly])

  const visibleNodeCount = filteredNodeIds?.size ?? graphData?.nodes.length ?? 0

  const visibleEdgeCount = useMemo(() => {
    if (!graphData) return 0
    if (!filteredNodeIds) return graphData.edges.length
    return graphData.edges.filter((e) => filteredNodeIds.has(e.source) && filteredNodeIds.has(e.target)).length
  }, [filteredNodeIds, graphData])

  const activeFilterCount = useMemo(() => (
    (selectedSeverities.length !== ALL_SEVERITIES.length ? 1 : 0) +
    (selectedTypes.length !== ALL_TYPES.length ? 1 : 0) +
    (showAttackPathsOnly ? 1 : 0) +
    (searchTerm.trim() ? 1 : 0)
  ), [searchTerm, selectedSeverities.length, selectedTypes.length, showAttackPathsOnly])

  useEffect(() => { setSelectedNode(null) }, [selectedScan?.id])
  useEffect(() => {
    if (selectedNode && filteredNodeIds && !filteredNodeIds.has(selectedNode.id))
      setSelectedNode(null)
  }, [filteredNodeIds, selectedNode])
  useEffect(() => {
    if (attackPathsUnavailable && showAttackPathsOnly) {
      setShowAttackPathsOnly(false)
    }
  }, [attackPathsUnavailable, showAttackPathsOnly])

  if (!selectedScan) return <NoScanState />
  if (graphUnavailable) {
    return (
      <ErrorState
        title="Could not load the infrastructure graph"
        message={getErrorMessage(graphError, 'The graph API request failed.')}
        onRetry={() => void refetchGraph()}
      />
    )
  }

  const hasSupplementalDataError = findingsSummaryUnavailable || attackPathsUnavailable

  return (
    <div className="flex h-full bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.08),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(249,115,22,0.06),_transparent_30%),linear-gradient(180deg,_rgba(2,6,23,0.98),_rgba(3,7,18,1))]">
      <GraphFilters
        selectedSeverities={selectedSeverities}
        onToggleSeverity={(s) => toggle(setSelectedSeverities, s)}
        selectedTypes={selectedTypes}
        onToggleType={(t) => toggle(setSelectedTypes, t)}
        showAttackPathsOnly={showAttackPathsOnly}
        onToggleAttackPaths={() => setShowAttackPathsOnly((v) => !v)}
        searchTerm={searchTerm}
        onSearchTermChange={setSearchTerm}
        totalNodes={graphData?.nodes.length ?? 0}
        visibleNodes={visibleNodeCount}
        totalEdges={graphData?.edges.length ?? 0}
        visibleEdges={visibleEdgeCount}
        attackPathCount={attackPaths?.length ?? 0}
        attackPathLoading={attackPathsLoading}
        attackPathUnavailable={attackPathsUnavailable}
        activeFilterCount={activeFilterCount}
        onResetFilters={resetFilters}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="border-b border-white/10 bg-slate-950/65 px-6 py-4 backdrop-blur-xl">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-500/20 bg-cyan-500/10">
                  <GitBranch className="h-5 w-5 text-cyan-300" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-white">Infrastructure Graph</h1>
                  <p className="text-sm text-slate-400">
                    Explore how identities, public exposure, and AWS resources connect inside {selectedScan.region}.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  ['Account', formatAccountLabel(selectedScan.account_id, selectedScan.account_name)],
                  ['Visible nodes', visibleNodeCount],
                  ['Visible edges', visibleEdgeCount],
                  ['Findings', findingsSummaryUnavailable ? '—' : findingsSummaryLoading ? '…' : findingsSummaryPage?.total ?? 0],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
                    {label} <span className="font-medium text-white">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid min-w-[18rem] gap-3 sm:grid-cols-2">
              {[
                {
                  icon: ShieldAlert,
                  label: 'Attack Paths',
                  value: attackPathsUnavailable ? '—' : attackPathsLoading ? '…' : attackPaths?.length ?? 0,
                  desc: attackPathsLoading
                    ? 'Attack-path data is still loading.'
                    : attackPathsUnavailable
                    ? 'Attack-path data is unavailable right now.'
                    : 'Toggle focus mode to isolate nodes in discovered paths.',
                },
                { icon: Search, label: 'Filter State', value: activeFilterCount, desc: 'Active filter groups shaping the current graph view.' },
              ].map(({ icon: Icon, label, value, desc }) => (
                <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[0_12px_32px_rgba(15,23,42,0.35)]">
                  <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-500">
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </div>
                  <div className="text-2xl font-semibold text-white">{value}</div>
                  <p className="mt-1 text-xs text-slate-400">{desc}</p>
                </div>
              ))}
            </div>
          </div>

          {hasSupplementalDataError && (
            <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100/90">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-300" />
              <span className="flex-1">
                {[
                  findingsSummaryUnavailable
                    ? `Findings unavailable: ${getErrorMessage(findingsSummaryError, 'Findings request failed.')}`
                    : null,
                  attackPathsUnavailable
                    ? `Attack paths unavailable: ${getErrorMessage(attackPathsError, 'Attack-path request failed.')}`
                    : null,
                ]
                  .filter(Boolean)
                  .join(' ')}
              </span>
              <button
                type="button"
                onClick={() => {
                  if (findingsSummaryUnavailable) void refetchFindingsSummary()
                  if (attackPathsUnavailable) void refetchAttackPaths()
                }}
                className="rounded-full border border-amber-400/20 bg-white/5 px-3 py-1.5 text-xs text-amber-50 transition-colors hover:bg-white/10"
              >
                Retry failed data
              </button>
            </div>
          )}
        </div>

        <div className="relative min-h-0 flex-1">
          {graphLoading ? <LoadingState /> :
           !graphData || graphData.nodes.length === 0 ? <NoDataState /> :
           visibleNodeCount === 0 ? <NoMatchState onReset={resetFilters} /> :
           <InfraGraph
             apiNodes={graphData.nodes}
             apiEdges={graphData.edges}
             onNodeClick={setSelectedNode}
             selectedNodeId={selectedNode?.id || null}
             filteredNodeIds={filteredNodeIds}
             totalNodeCount={graphData.nodes.length}
             visibleNodeCount={visibleNodeCount}
             visibleEdgeCount={visibleEdgeCount}
             attackPathCount={attackPaths?.length ?? 0}
           />
          }
        </div>
      </div>

      {selectedNode && (
        <NodeDetailPanel
          node={selectedNode}
          findings={selectedNodeFindings}
          findingsLoading={selectedNodeFindingsLoading}
          findingsUnavailable={selectedNodeFindingsUnavailable}
          scanAccountId={selectedScan.account_id}
          scanAccountLabel={formatAccountLabel(selectedScan.account_id, selectedScan.account_name)}
          onClose={() => setSelectedNode(null)}
        />
      )}
    </div>
  )
}
