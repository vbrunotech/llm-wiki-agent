'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Settings, Network, Sun, Moon } from 'lucide-react'
import { useTheme } from '../components/ThemeProvider'
import Sidebar from '../components/Sidebar'
import QueryView from '../components/QueryView'
import PageViewer from '../components/PageViewer'
import ProgressPanel from '../components/ProgressPanel'
import SettingsPage from '../components/SettingsPage'
import GraphView from '../components/GraphView'
import IngestModal from '../components/IngestModal'
import UploadModal from '../components/UploadModal'
import { streamSSE } from '../utils/sse'

function App() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { resolvedTheme, toggleTheme } = useTheme()
  // Data
  const [sources, setSources] = useState([])
  const [wikiPages, setWikiPages] = useState([])

  // View: 'query' | 'page' | 'progress' | 'settings' | 'graph'
  const [view, setView] = useState('query')
  const [currentPage, setCurrentPage] = useState(null) // { filename, content }
  const [pageHistory, setPageHistory] = useState([])   // stack of previous { filename, content }

  // Query chat
  const [messages, setMessages] = useState([])
  const [queryInput, setQueryInput] = useState('')
  const [queryLoading, setQueryLoading] = useState(false)

  // Progress (ingest / lint)
  const [processing, setProcessing] = useState(false)
  const [progressTitle, setProgressTitle] = useState('')
  const [progressLog, setProgressLog] = useState([])
  const [ingestingFile, setIngestingFile] = useState(null) // filename being ingested

  // Modals
  const [showIngestModal, setShowIngestModal] = useState(false)
  const [showUpload, setShowUpload] = useState(false)

  // ── Data loaders ────────────────────────────────────────────────────────────

  const loadSources = useCallback(async () => {
    try {
      const res = await fetch('/api/sources')
      const data = await res.json()
      setSources(data.sources)
    } catch (e) { console.error(e) }
  }, [])

  const loadPages = useCallback(async () => {
    try {
      const res = await fetch('/api/pages')
      const data = await res.json()
      setWikiPages(data.pages)
    } catch (e) { console.error(e) }
  }, [])

  useEffect(() => { loadSources(); loadPages() }, [loadSources, loadPages])

  // ── SSE operation runner ────────────────────────────────────────────────────

  const runOperation = useCallback(async (title, url, body) => {
    setProcessing(true)
    setProgressTitle(title)
    setProgressLog([])
    setView('progress')

    try {
      let finalResult = ''
      await streamSSE(url, body, event => {
        if (event.type === 'tool_call') {
          setProgressLog(l => [...l, { type: 'tool_call', message: `${event.message}(…)` }])
        } else if (event.type === 'tool_result') {
          setProgressLog(l => [...l, { type: 'tool_result', message: event.message }])
        } else if (event.type === 'done') {
          finalResult = event.result
          setProgressLog(l => [...l, { type: 'done', message: 'Done.' }])
        }
      })
      await loadPages()
      return finalResult
    } catch (e) {
      setProgressLog(l => [...l, { type: 'error', message: e.message }])
    } finally {
      setProcessing(false)
    }
  }, [loadPages])

  // ── Actions ─────────────────────────────────────────────────────────────────

  const handleIngestSubmit = useCallback(async (title, content) => {
    setShowIngestModal(false)
    await runOperation(`Ingesting: ${title}`, '/api/ingest', { title, content })
  }, [runOperation])

  const handleIngestFileUpload = useCallback(async (file) => {
    setShowIngestModal(false)
    const form = new FormData()
    form.append('file', file)
    await runOperation(`Ingesting: ${file.name}`, '/api/ingest-upload', form)
    await loadSources()
  }, [runOperation, loadSources])

  const handleIngestFile = useCallback(async filename => {
    setIngestingFile(filename)
    await runOperation(`Ingesting: ${filename}`, '/api/ingest-file', { filename })
    setIngestingFile(null)
  }, [runOperation])

  const handleLint = useCallback(async () => {
    await runOperation('Linting wiki…', '/api/lint', {})
  }, [runOperation])

  const handleViewPage = useCallback(async (filename, { fromLink = false } = {}) => {
    try {
      const res = await fetch(`/api/page?filename=${encodeURIComponent(filename)}`)
      const data = await res.json()
      if (fromLink && currentPage) {
        setPageHistory(h => [...h, currentPage])
      } else if (!fromLink) {
        setPageHistory([])
      }
      setCurrentPage(data)
      setView('page')
      router.push(`?page=${encodeURIComponent(filename)}`, { scroll: false })
    } catch (e) { console.error(e) }
  }, [router, currentPage])

  // Restore page from URL on first load
  useEffect(() => {
    const pageParam = searchParams.get('page')
    if (pageParam) handleViewPage(pageParam)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handlePageBack = useCallback(() => {
    if (pageHistory.length === 0) {
      setView('query')
      router.push('/', { scroll: false })
      return
    }
    const prev = pageHistory[pageHistory.length - 1]
    setPageHistory(h => h.slice(0, -1))
    setCurrentPage(prev)
    router.push(`?page=${encodeURIComponent(prev.filename)}`, { scroll: false })
  }, [pageHistory, router])

  const handleWikiLink = useCallback((slug) => {
    const match = wikiPages.find(p => {
      const base = p.filename.replace(/\.md$/i, '').split('/').pop()
      return base === slug
    })
    if (match) handleViewPage(match.filename, { fromLink: true })
  }, [wikiPages, handleViewPage])

  const handleQuery = useCallback(async () => {
    const question = queryInput.trim()
    if (!question || queryLoading) return
    setQueryInput('')
    setQueryLoading(true)
    setMessages(m => [...m, { role: 'user', content: question }])

    try {
      let answer = ''
      await streamSSE('/api/query', { question }, event => {
        if (event.type === 'done') answer = event.result
      })
      setMessages(m => [...m, { role: 'assistant', content: answer || '(no response)' }])
      await loadPages()
    } catch (e) {
      setMessages(m => [...m, { role: 'assistant', content: `Error: ${e.message}` }])
    } finally {
      setQueryLoading(false)
    }
  }, [queryInput, queryLoading, loadPages])

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full">
      <Sidebar
        sources={sources}
        wikiPages={wikiPages}
        ingestingFile={ingestingFile}
        processing={processing}
        onIngestFile={handleIngestFile}
        onViewPage={handleViewPage}
        onOpenIngestModal={() => setShowIngestModal(true)}
        onOpenUpload={() => setShowUpload(true)}
        onLint={handleLint}
      />

      {/* Main panel */}
      <main className="flex-1 flex flex-col min-w-0 bg-base">
        {/* Top bar */}
        <div className="flex items-center gap-4 px-6 py-3 border-b border-border shrink-0">
          <div className="flex gap-2 flex-1">
            <button
              onClick={() => setView('query')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors
                          ${view === 'query'
                            ? 'bg-raised text-heading'
                            : 'text-muted hover:text-heading'}`}
            >
              Ask
            </button>
            <button
              onClick={() => {
                if (!currentPage) handleViewPage('index.md')
                else setView('page')
              }}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors
                          ${view === 'page'
                            ? 'bg-raised text-heading'
                            : 'text-muted hover:text-heading'}`}
            >
              Pages
            </button>
            <button
              onClick={() => setView('graph')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-sm font-medium transition-colors
                          ${view === 'graph'
                            ? 'bg-raised text-heading'
                            : 'text-muted hover:text-heading'}`}
            >
              <Network size={14} />
              Graph
            </button>
            {progressLog.length > 0 && (
              <button
                onClick={() => setView('progress')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors
                            ${view === 'progress'
                              ? 'bg-raised text-heading'
                              : 'text-muted hover:text-heading'}`}
              >
                {processing ? 'Running…' : 'Log'}
              </button>
            )}
          </div>
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-md text-muted hover:text-heading hover:bg-raised transition-colors"
            title={resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {resolvedTheme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button
            onClick={() => setView(v => v === 'settings' ? 'query' : 'settings')}
            className={`p-1.5 rounded-md transition-colors
                        ${view === 'settings'
                          ? 'bg-raised text-heading'
                          : 'text-muted hover:text-heading'}`}
            title="Settings"
          >
            <Settings size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden relative">
          {view === 'query' && (
            <QueryView
              messages={messages}
              loading={queryLoading}
              input={queryInput}
              onInputChange={setQueryInput}
              onSend={handleQuery}
              onWikiLink={handleWikiLink}
            />
          )}
          {view === 'page' && currentPage && (
            <PageViewer
              filename={currentPage.filename}
              content={currentPage.content}
              onBack={handlePageBack}
              onWikiLink={handleWikiLink}
            />
          )}
          {view === 'progress' && (
            <ProgressPanel
              title={progressTitle}
              log={progressLog}
              active={processing}
            />
          )}
          {view === 'graph' && (
            <GraphView onViewPage={(filename) => handleViewPage(filename)} />
          )}
          {view === 'settings' && <SettingsPage />}
        </div>
      </main>

      {showIngestModal && (
        <IngestModal
          processing={processing}
          onClose={() => setShowIngestModal(false)}
          onSubmit={handleIngestSubmit}
          onSubmitFile={handleIngestFileUpload}
        />
      )}
      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onUploaded={loadSources}
        />
      )}
    </div>
  )
}

export default function Page() {
  return (
    <Suspense>
      <App />
    </Suspense>
  )
}
