import { useCallback, useEffect, useMemo } from 'react'
import {
  Background,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Edge,
  type Node,
} from '@xyflow/react'
import dagre from '@dagrejs/dagre'
import '@xyflow/react/dist/style.css'
import ResourceNode from './ResourceNode'
import type { GraphEdge as ApiGraphEdge, GraphNode as ApiGraphNode } from '../../types'

const nodeTypes = { resourceNode: ResourceNode }

const NODE_WIDTH = 220
const NODE_HEIGHT = 100

function getLayoutedGraph(
  nodes: Node[],
  edges: Edge[],
): { nodes: Node[]; edges: Edge[] } {
  const graph = new dagre.graphlib.Graph()
  graph.setDefaultEdgeLabel(() => ({}))
  graph.setGraph({ rankdir: 'TB', ranksep: 160, nodesep: 100 })

  nodes.forEach((node) => {
    graph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT })
  })

  edges.forEach((edge) => {
    graph.setEdge(edge.source, edge.target)
  })

  dagre.layout(graph)

  return {
    nodes: nodes.map((node) => {
      const nodeWithPosition = graph.node(node.id)
      return {
        ...node,
        position: {
          x: nodeWithPosition.x - NODE_WIDTH / 2,
          y: nodeWithPosition.y - NODE_HEIGHT / 2,
        },
      }
    }),
    edges,
  }
}

function apiNodesToFlow(apiNodes: ApiGraphNode[]): Node[] {
  return apiNodes.map((node) => ({
    id: node.id,
    type: 'resourceNode',
    position: { x: 0, y: 0 },
    data: {
      label: node.name || node.id.split('/').pop() || node.id,
      type: node.type,
      severity: node.severity,
      risk_score: node.risk_score,
      is_internet_reachable: node.is_internet_reachable,
    },
  }))
}

function apiEdgesToFlow(apiEdges: ApiGraphEdge[]): Edge[] {
  return apiEdges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: 'smoothstep',
    label:
      edge.relation_type === 'EXPOSES' || edge.relation_type === 'GRANTS_ACCESS'
        ? edge.relation_type.replace(/_/g, ' ').toLowerCase()
        : undefined,
    labelStyle: { fill: '#94a3b8', fontSize: 10, fontWeight: 500 },
    labelBgStyle: { fill: 'rgba(15, 23, 42, 0.92)', stroke: 'rgba(148, 163, 184, 0.12)' },
    style: {
      stroke: edge.relation_type === 'EXPOSES' ? '#f97316' : '#475569',
      strokeWidth: edge.relation_type === 'EXPOSES' ? 2.4 : 1.6,
    },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: edge.relation_type === 'EXPOSES' ? '#f97316' : '#475569',
    },
    animated: edge.relation_type === 'EXPOSES',
  }))
}

interface InfraGraphProps {
  apiNodes: ApiGraphNode[]
  apiEdges: ApiGraphEdge[]
  onNodeClick: (node: ApiGraphNode) => void
  selectedNodeId: string | null
  filteredNodeIds?: Set<string>
  totalNodeCount: number
  visibleNodeCount: number
  visibleEdgeCount: number
  attackPathCount: number
}

export default function InfraGraph({
  apiNodes,
  apiEdges,
  onNodeClick,
  selectedNodeId,
  filteredNodeIds,
  totalNodeCount,
  visibleNodeCount,
  visibleEdgeCount,
  attackPathCount,
}: InfraGraphProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])

  const visibleApiNodes = useMemo(() => {
    if (!filteredNodeIds) return apiNodes
    return apiNodes.filter((node) => filteredNodeIds.has(node.id))
  }, [apiNodes, filteredNodeIds])

  const visibleApiEdges = useMemo(() => {
    if (!filteredNodeIds) return apiEdges
    return apiEdges.filter(
      (edge) => filteredNodeIds.has(edge.source) && filteredNodeIds.has(edge.target),
    )
  }, [apiEdges, filteredNodeIds])

  useEffect(() => {
    if (!visibleApiNodes.length) {
      setNodes([])
      setEdges([])
      return
    }

    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedGraph(
      apiNodesToFlow(visibleApiNodes),
      apiEdgesToFlow(visibleApiEdges),
    )
    setNodes(layoutedNodes)
    setEdges(layoutedEdges)
  }, [setEdges, setNodes, visibleApiEdges, visibleApiNodes])

  useEffect(() => {
    setNodes((existingNodes) =>
      existingNodes.map((node) => ({
        ...node,
        selected: node.id === selectedNodeId,
      })),
    )
  }, [selectedNodeId, setNodes])

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const apiNode = apiNodes.find((item) => item.id === node.id)
      if (apiNode) onNodeClick(apiNode)
    },
    [apiNodes, onNodeClick],
  )

  return (
    <div className="h-full flex-1">
      <div className="pointer-events-none absolute inset-x-5 top-5 z-10 flex items-start justify-between gap-4">
        <div className="pointer-events-auto rounded-3xl border border-white/10 bg-slate-950/80 px-4 py-3 shadow-[0_20px_60px_rgba(15,23,42,0.45)] backdrop-blur-xl">
          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Graph Legend</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {[
              ['Critical', '#ef4444'],
              ['High', '#f97316'],
              ['Medium', '#eab308'],
              ['Low', '#3b82f6'],
              ['None', '#64748b'],
            ].map(([label, color]) => (
              <span
                key={label}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300"
              >
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
                {label}
              </span>
            ))}
          </div>
        </div>

        <div className="pointer-events-auto rounded-3xl border border-white/10 bg-slate-950/80 px-4 py-3 text-right shadow-[0_20px_60px_rgba(15,23,42,0.45)] backdrop-blur-xl">
          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Viewport</p>
          <div className="mt-2 space-y-1 text-sm text-slate-300">
            <p>{visibleNodeCount} / {totalNodeCount} nodes visible</p>
            <p>{visibleEdgeCount} edges rendered</p>
            <p>{attackPathCount} attack paths available</p>
          </div>
        </div>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
        nodesConnectable={false}
        nodesDraggable
        colorMode="dark"
        className="graph-canvas"
      >
        <Background color="#1e293b" gap={28} size={1.15} />
        <Controls />
        <MiniMap
          pannable
          zoomable
          nodeColor={(node) => {
            const severity = (node.data as { severity?: string })?.severity
            switch (severity) {
              case 'critical':
                return '#ef4444'
              case 'high':
                return '#f97316'
              case 'medium':
                return '#eab308'
              case 'low':
                return '#3b82f6'
              default:
                return '#4b5563'
            }
          }}
        />
      </ReactFlow>
    </div>
  )
}
