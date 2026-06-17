'use client'

import { useState } from 'react'
import {
  FileText, ChevronRight, ChevronDown, Upload, Plus,
  BookOpen, FolderOpen, Loader2, CheckCircle, PanelLeftClose, PanelLeftOpen,
} from 'lucide-react'

const EXT_COLORS = {
  '.md':   'text-emerald-400 border-emerald-800',
  '.txt':  'text-slate-400 border-slate-700',
  '.pdf':  'text-red-400 border-red-800',
  '.docx': 'text-blue-400 border-blue-800',
  '.doc':  'text-blue-400 border-blue-800',
  '.pptx': 'text-orange-400 border-orange-800',
  '.ppt':  'text-orange-400 border-orange-800',
  '.xlsx': 'text-green-400 border-green-800',
  '.xls':  'text-green-400 border-green-800',
  '.csv':  'text-green-400 border-green-800',
  '.html': 'text-orange-400 border-orange-800',
  '.htm':  'text-orange-400 border-orange-800',
  '.json': 'text-yellow-400 border-yellow-800',
  '.xml':  'text-yellow-400 border-yellow-800',
  '.zip':  'text-purple-400 border-purple-800',
  '.mp3':  'text-pink-400 border-pink-800',
  '.wav':  'text-pink-400 border-pink-800',
  '.m4a':  'text-pink-400 border-pink-800',
}

function ExtBadge({ ext }) {
  const cls = EXT_COLORS[ext] ?? 'text-slate-400 border-slate-700'
  return (
    <span className={`shrink-0 text-[10px] font-mono px-1 rounded border ${cls}`}>
      {ext.slice(1)}
    </span>
  )
}

function SourceItem({ source, onIngest, ingesting }) {
  return (
    <div className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-slate-800 group">
      <FileText size={13} className="text-slate-500 shrink-0" />
      <span className="text-sm text-slate-300 truncate flex-1 min-w-0" title={source.filename}>
        {source.title}
      </span>
      <ExtBadge ext={source.ext ?? '.md'} />
      <button
        onClick={() => onIngest(source.filename)}
        disabled={ingesting === source.filename}
        className="shrink-0 text-xs px-2 py-0.5 rounded border border-slate-700 text-slate-400
                   hover:border-blue-500 hover:text-blue-400 disabled:opacity-40 disabled:cursor-not-allowed
                   transition-colors opacity-0 group-hover:opacity-100"
      >
        {ingesting === source.filename
          ? <Loader2 size={10} className="animate-spin" />
          : 'Ingest'}
      </button>
    </div>
  )
}

function WikiTree({ pages, onViewPage }) {
  const [open, setOpen] = useState({})

  const groups = {}
  pages.forEach(p => {
    const parts = p.filename.split('/')
    const group = parts.length > 1 ? parts[0] : '_root'
    if (!groups[group]) groups[group] = []
    groups[group].push(p)
  })

  return (
    <div className="space-y-0.5">
      {Object.entries(groups).map(([group, items]) => (
        <div key={group}>
          {group !== '_root' && (
            <button
              onClick={() => setOpen(o => ({ ...o, [group]: !o[group] }))}
              className="flex items-center gap-1.5 w-full px-2 py-1 rounded-md hover:bg-slate-800
                         text-xs font-semibold text-slate-400 uppercase tracking-wide"
            >
              {open[group] ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              <FolderOpen size={12} />
              {group}
              <span className="ml-auto text-slate-600">{items.length}</span>
            </button>
          )}
          {(group === '_root' || open[group]) && items.map(p => (
            <button
              key={p.filename}
              onClick={() => onViewPage(p.filename)}
              className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md hover:bg-slate-800
                         text-sm text-slate-300 hover:text-slate-100 text-left"
            >
              <FileText size={13} className="text-slate-600 shrink-0" />
              <span className="truncate">{group !== '_root' ? p.filename.split('/').pop() : p.filename}</span>
            </button>
          ))}
        </div>
      ))}
    </div>
  )
}

export default function Sidebar({
  sources, wikiPages, ingestingFile,
  onIngestFile, onViewPage, onOpenIngestModal, onOpenUpload, onLint,
  processing,
}) {
  const [collapsed, setCollapsed] = useState(false)
  const [sourcesOpen, setSourcesOpen] = useState(true)
  const [wikiOpen, setWikiOpen] = useState(true)

  // ── Collapsed state ──────────────────────────────────────────────────────────
  if (collapsed) {
    return (
      <aside className="w-12 shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col items-center
                        py-3 gap-3 transition-all">
        {/* Expand button */}
        <button
          onClick={() => setCollapsed(false)}
          className="p-1.5 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-800
                     transition-colors"
          title="Expand sidebar"
        >
          <PanelLeftOpen size={16} />
        </button>

        <div className="w-6 h-px bg-slate-800" />

        {/* Logo icon */}
        <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
          <BookOpen size={14} className="text-white" />
        </div>

        <div className="w-6 h-px bg-slate-800" />

        {/* Action icons */}
        <button
          onClick={onOpenIngestModal}
          disabled={processing}
          title="Ingest"
          className="p-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white
                     disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Plus size={14} />
        </button>
        <button
          onClick={onOpenUpload}
          title="Upload file"
          className="p-1.5 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-800
                     transition-colors"
        >
          <Upload size={14} />
        </button>
        <button
          onClick={onLint}
          disabled={processing}
          title="Lint wiki"
          className="p-1.5 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-800
                     disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {processing
            ? <Loader2 size={14} className="animate-spin text-blue-400" />
            : <CheckCircle size={14} />}
        </button>
      </aside>
    )
  }

  // ── Expanded state ───────────────────────────────────────────────────────────
  return (
    <aside className="w-72 shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col overflow-hidden
                      transition-all">
      {/* Logo + collapse button */}
      <div className="px-4 py-4 border-b border-slate-800 flex items-center gap-2.5">
        <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
          <BookOpen size={14} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-slate-100">LLM Wiki</div>
          <div className="text-xs text-slate-500">Personal knowledge base</div>
        </div>
        <button
          onClick={() => setCollapsed(true)}
          className="p-1 rounded-md text-slate-500 hover:text-slate-300 hover:bg-slate-800
                     transition-colors shrink-0"
          title="Collapse sidebar"
        >
          <PanelLeftClose size={15} />
        </button>
      </div>

      {/* Actions */}
      <div className="px-3 py-3 border-b border-slate-800 flex gap-2">
        <button
          onClick={onOpenIngestModal}
          disabled={processing}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md
                     bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium
                     disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Plus size={13} /> Ingest
        </button>
        <button
          onClick={onLint}
          disabled={processing}
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md
                     border border-slate-700 hover:border-slate-500 text-slate-400 hover:text-slate-200
                     text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {processing ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle size={13} />}
          Lint
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-3">
        {/* Raw Sources */}
        <section>
          <div className="flex items-center gap-1.5 w-full px-2 py-1 text-xs font-semibold
                          text-slate-400 uppercase tracking-wide">
            <button
              onClick={() => setSourcesOpen(o => !o)}
              className="flex items-center gap-1.5 flex-1 hover:text-slate-200 text-left"
            >
              {sourcesOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              Raw Sources
              <span className="ml-auto text-slate-600">{sources.length}</span>
            </button>
            <button
              onClick={onOpenUpload}
              className="ml-1 hover:text-blue-400 transition-colors"
              title="Upload source file"
            >
              <Upload size={11} />
            </button>
          </div>
          {sourcesOpen && (
            <div className="mt-1 space-y-0.5">
              {sources.length === 0
                ? <p className="px-2 py-2 text-xs text-slate-600 italic">No files in sources/raw/</p>
                : sources.map(s => (
                    <SourceItem
                      key={s.filename}
                      source={s}
                      onIngest={onIngestFile}
                      ingesting={ingestingFile}
                    />
                  ))}
            </div>
          )}
        </section>

        {/* Wiki Pages */}
        <section>
          <button
            onClick={() => setWikiOpen(o => !o)}
            className="flex items-center gap-1.5 w-full px-2 py-1 text-xs font-semibold
                       text-slate-400 uppercase tracking-wide hover:text-slate-200"
          >
            {wikiOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            Wiki Pages
            <span className="ml-auto text-slate-600">{wikiPages.length}</span>
          </button>
          {wikiOpen && (
            <div className="mt-1">
              {wikiPages.length === 0
                ? <p className="px-2 py-2 text-xs text-slate-600 italic">No pages yet — ingest a source.</p>
                : <WikiTree pages={wikiPages} onViewPage={onViewPage} />}
            </div>
          )}
        </section>
      </div>
    </aside>
  )
}
