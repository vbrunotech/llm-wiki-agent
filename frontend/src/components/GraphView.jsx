'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Loader2, ZoomIn, ZoomOut, Maximize } from 'lucide-react'
import { useTheme } from './ThemeProvider'
import dynamic from 'next/dynamic'

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false })

const GROUP_COLORS = {
  light: { topics: '#2563eb', sources: '#9333ea', root: '#d97706', answers: '#059669', orphan: '#64748b' },
  dark:  { topics: '#60a5fa', sources: '#c084fc', root: '#fbbf24', answers: '#34d399', orphan: '#94a3b8' },
}

export default function GraphView({ onViewPage }) {
  const [graphData, setGraphData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [dimensions, setDimensions] = useState(null)
  const [hoverNode, setHoverNode] = useState(null)
  const containerRef = useRef(null)
  const graphRef = useRef(null)
  const { resolvedTheme } = useTheme()
  const palette = resolvedTheme === 'dark' ? GROUP_COLORS.dark : GROUP_COLORS.light

  const themeColors = useMemo(() => {
    if (typeof document === 'undefined') return { bg: '#020617', label: '#e2e8f0', link: '148, 163, 184' }
    const s = getComputedStyle(document.documentElement)
    const get = name => s.getPropertyValue(name).trim().replace(/ /g, ', ')
    return {
      bg: `rgb(${get('--color-graph-bg')})`,
      label: `rgb(${get('--color-graph-label')})`,
      link: get('--color-graph-link'),
    }
  }, [resolvedTheme])

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
    const color = palette[node.group] || palette.orphan
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
      ctx.fillStyle = isHighlighted ? themeColors.label : themeColors.label + '22'
      ctx.fillText(node.label, node.x, node.y + radius + 2)
    }
  }, [hoverNode, highlightNodes, themeColors, palette])

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

  const isDark = resolvedTheme === 'dark'

  const linkColor = useCallback((link) => {
    const rgb = themeColors.link
    if (!hoverNode) return `rgba(${rgb}, ${isDark ? 0.35 : 0.2})`
    const src = typeof link.source === 'object' ? link.source.id : link.source
    const tgt = typeof link.target === 'object' ? link.target.id : link.target
    if (src === hoverNode.id || tgt === hoverNode.id) return `rgba(${rgb}, ${isDark ? 0.85 : 0.6})`
    return `rgba(${rgb}, ${isDark ? 0.08 : 0.05})`
  }, [hoverNode, themeColors, isDark])

  const ready = !loading && graphData && graphData.nodes.length > 0 && dimensions

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden" style={{ background: themeColors.bg }}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center text-muted">
          <Loader2 className="animate-spin mr-2" size={20} />
          Loading graph...
        </div>
      )}

      {!loading && (!graphData || graphData.nodes.length === 0) && (
        <div className="absolute inset-0 flex items-center justify-center text-muted">
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
            backgroundColor={themeColors.bg}
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
              className="p-1.5 rounded-md bg-raised/80 backdrop-blur text-muted hover:text-heading hover:bg-hover/80 transition-colors"
              title="Zoom in"
            >
              <ZoomIn size={16} />
            </button>
            <button
              onClick={handleZoomOut}
              className="p-1.5 rounded-md bg-raised/80 backdrop-blur text-muted hover:text-heading hover:bg-hover/80 transition-colors"
              title="Zoom out"
            >
              <ZoomOut size={16} />
            </button>
            <button
              onClick={handleZoomFit}
              className="p-1.5 rounded-md bg-raised/80 backdrop-blur text-muted hover:text-heading hover:bg-hover/80 transition-colors"
              title="Fit to view"
            >
              <Maximize size={16} />
            </button>
          </div>

          {/* Legend */}
          <div className="absolute bottom-4 left-4 bg-surface/80 backdrop-blur rounded-lg px-3 py-2 text-xs space-y-1">
            {Object.entries(palette).map(([group, color]) => (
              <div key={group} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: color }} />
                <span className="text-muted capitalize">{group}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
