'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Loader2, ZoomIn, ZoomOut, Maximize } from 'lucide-react'
import dynamic from 'next/dynamic'

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false })

const GROUP_COLORS = {
  topics: '#3b82f6',
  sources: '#a855f7',
  root: '#f59e0b',
  answers: '#10b981',
  orphan: '#64748b',
}

export default function GraphView({ onViewPage }) {
  const [graphData, setGraphData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [dimensions, setDimensions] = useState(null)
  const [hoverNode, setHoverNode] = useState(null)
  const containerRef = useRef(null)
  const graphRef = useRef(null)

  useEffect(() => {
    fetch('/api/graph')
      .then(r => r.json())
      .then(data => { setGraphData(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const measure = () => {
      const { width, height } = el.getBoundingClientRect()
      if (width > 0 && height > 0) setDimensions({ width, height })
    }
    measure()
    const obs = new ResizeObserver(() => measure())
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const highlightNodes = useMemo(() => {
    if (!hoverNode || !graphData) return new Set()
    const set = new Set([hoverNode.id])
    graphData.links.forEach(l => {
      const src = typeof l.source === 'object' ? l.source.id : l.source
      const tgt = typeof l.target === 'object' ? l.target.id : l.target
      if (src === hoverNode.id) set.add(tgt)
      if (tgt === hoverNode.id) set.add(src)
    })
    return set
  }, [hoverNode, graphData])

  const nodeCanvasObject = useCallback((node, ctx, globalScale) => {
    const radius = 4 + Math.sqrt(node.linkCount || 1) * 2
    const color = GROUP_COLORS[node.group] || GROUP_COLORS.orphan
    const isHighlighted = !hoverNode || highlightNodes.has(node.id)

    ctx.beginPath()
    ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI)
    ctx.fillStyle = isHighlighted ? color : color + '22'
    ctx.fill()

    if (isHighlighted && (globalScale > 1.2 || node.linkCount > 5 || node.id === hoverNode?.id)) {
      const fontSize = Math.max(12 / globalScale, 2)
      ctx.font = `${fontSize}px sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      ctx.fillStyle = isHighlighted ? '#e2e8f0' : '#e2e8f022'
      ctx.fillText(node.label, node.x, node.y + radius + 2)
    }
  }, [hoverNode, highlightNodes])

  const nodePointerAreaPaint = useCallback((node, color, ctx) => {
    const radius = 4 + Math.sqrt(node.linkCount || 1) * 2
    ctx.beginPath()
    ctx.arc(node.x, node.y, radius + 4, 0, 2 * Math.PI)
    ctx.fillStyle = color
    ctx.fill()
  }, [])

  const handleNodeClick = useCallback((node) => {
    if (node.filename) onViewPage(node.filename)
  }, [onViewPage])

  const handleNodeHover = useCallback((node) => {
    setHoverNode(node || null)
  }, [])

  useEffect(() => {
    const fg = graphRef.current
    if (!fg) return
    fg.d3Force('charge').strength(-300)
    fg.d3Force('link').distance(80)
    fg.d3Force('center').strength(0.05)
  })

  const handleZoomIn = useCallback(() => {
    const fg = graphRef.current
    if (fg) fg.zoom(fg.zoom() * 1.5, 300)
  }, [])

  const handleZoomOut = useCallback(() => {
    const fg = graphRef.current
    if (fg) fg.zoom(fg.zoom() / 1.5, 300)
  }, [])

  const handleZoomFit = useCallback(() => {
    const fg = graphRef.current
    if (fg) fg.zoomToFit(400, 40)
  }, [])

  const handleEngineStop = useCallback(() => {
    const fg = graphRef.current
    if (!fg) return
    graphData.nodes.forEach(node => { node.fx = node.x; node.fy = node.y })
  }, [graphData])

  const handleNodeDrag = useCallback((node) => {
    node.fx = node.x
    node.fy = node.y
  }, [])

  const handleNodeDragEnd = useCallback((node) => {
    node.fx = node.x
    node.fy = node.y
  }, [])

  const linkColor = useCallback((link) => {
    if (!hoverNode) return 'rgba(148, 163, 184, 0.15)'
    const src = typeof link.source === 'object' ? link.source.id : link.source
    const tgt = typeof link.target === 'object' ? link.target.id : link.target
    if (src === hoverNode.id || tgt === hoverNode.id) return 'rgba(148, 163, 184, 0.6)'
    return 'rgba(148, 163, 184, 0.05)'
  }, [hoverNode])

  const ready = !loading && graphData && graphData.nodes.length > 0 && dimensions

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden" style={{ background: '#020617' }}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center text-slate-400">
          <Loader2 className="animate-spin mr-2" size={20} />
          Loading graph...
        </div>
      )}

      {!loading && (!graphData || graphData.nodes.length === 0) && (
        <div className="absolute inset-0 flex items-center justify-center text-slate-500">
          No wiki pages yet. Ingest some documents to see the graph.
        </div>
      )}

      {ready && (
        <>
          <ForceGraph2D
            ref={graphRef}
            graphData={graphData}
            width={dimensions.width}
            height={dimensions.height}
            backgroundColor="#020617"
            nodeCanvasObject={nodeCanvasObject}
            nodePointerAreaPaint={nodePointerAreaPaint}
            onNodeClick={handleNodeClick}
            onNodeHover={handleNodeHover}
            onNodeDrag={handleNodeDrag}
            onNodeDragEnd={handleNodeDragEnd}
            onEngineStop={handleEngineStop}
            linkColor={linkColor}
            linkDirectionalArrowLength={3}
            linkDirectionalArrowRelPos={1}
            d3AlphaDecay={0.02}
            d3VelocityDecay={0.3}
            cooldownTime={5000}
            nodeLabel={node => `${node.label}${node.group === 'orphan' ? ' (orphan)' : ''}`}
          />

          {/* Zoom controls */}
          <div className="absolute top-4 right-4 flex flex-col gap-1">
            <button
              onClick={handleZoomIn}
              className="p-1.5 rounded-md bg-slate-800/80 backdrop-blur text-slate-400 hover:text-slate-200 hover:bg-slate-700/80 transition-colors"
              title="Zoom in"
            >
              <ZoomIn size={16} />
            </button>
            <button
              onClick={handleZoomOut}
              className="p-1.5 rounded-md bg-slate-800/80 backdrop-blur text-slate-400 hover:text-slate-200 hover:bg-slate-700/80 transition-colors"
              title="Zoom out"
            >
              <ZoomOut size={16} />
            </button>
            <button
              onClick={handleZoomFit}
              className="p-1.5 rounded-md bg-slate-800/80 backdrop-blur text-slate-400 hover:text-slate-200 hover:bg-slate-700/80 transition-colors"
              title="Fit to view"
            >
              <Maximize size={16} />
            </button>
          </div>

          {/* Legend */}
          <div className="absolute bottom-4 left-4 bg-slate-900/80 backdrop-blur rounded-lg px-3 py-2 text-xs space-y-1">
            {Object.entries(GROUP_COLORS).map(([group, color]) => (
              <div key={group} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: color }} />
                <span className="text-slate-400 capitalize">{group}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
