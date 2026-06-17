'use client'

import { useState, useRef } from 'react'
import { X, Loader2, FileText, Upload } from 'lucide-react'

export default function IngestModal({ onClose, onSubmit, onSubmitFile, processing }) {
  const [tab, setTab] = useState('text') // 'text' | 'file'

  // Text tab
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')

  // File tab
  const [file, setFile] = useState(null)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef(null)

  const handleSubmitText = () => {
    if (!title.trim() || !content.trim()) return
    onSubmit(title.trim(), content.trim())
  }

  const handleSubmitFile = () => {
    if (!file) return
    onSubmitFile(file)
  }

  const handleDrop = e => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) setFile(f)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-[600px] max-w-[95vw]
                      max-h-[85vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h2 className="text-base font-semibold text-slate-100">Ingest Source</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800 px-6">
          {[['text', 'Paste text'], ['file', 'Upload file']].map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`py-2.5 px-1 mr-6 text-sm font-medium border-b-2 transition-colors
                          ${tab === id
                            ? 'border-blue-500 text-slate-100'
                            : 'border-transparent text-slate-500 hover:text-slate-300'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {tab === 'text' ? (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Title</label>
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Article: What is RAG?"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-sm
                             text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500
                             transition-colors"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Content</label>
                <textarea
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder="Paste the article, document, or notes here…"
                  rows={12}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-sm
                             text-slate-100 placeholder-slate-600 resize-none focus:outline-none
                             focus:border-blue-500 transition-colors font-mono leading-relaxed"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div
                onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors
                            ${dragging ? 'border-blue-500 bg-blue-500/10' : 'border-slate-700 hover:border-slate-500'}`}
              >
                <Upload size={24} className="mx-auto mb-3 text-slate-500" />
                <p className="text-sm text-slate-400">
                  Drop a file here or <span className="text-blue-400">browse</span>
                </p>
                <p className="text-xs text-slate-600 mt-1">
                  PDF · DOCX · PPTX · XLSX · CSV · MD · TXT · HTML · images · audio · ZIP
                </p>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".md,.txt,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv,.json,.xml,.html,.htm,.jpg,.jpeg,.png,.gif,.webp,.bmp,.mp3,.wav,.m4a,.zip"
                  className="hidden"
                  onChange={e => setFile(e.target.files?.[0] || null)}
                />
              </div>

              {file && (
                <div className="flex items-center gap-3 px-4 py-3 bg-slate-800 rounded-xl border border-slate-700">
                  <FileText size={16} className="text-blue-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-200 truncate">{file.name}</p>
                    <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <button
                    onClick={() => setFile(null)}
                    className="text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-700 text-sm text-slate-400
                       hover:text-slate-200 hover:border-slate-500 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={tab === 'text' ? handleSubmitText : handleSubmitFile}
            disabled={tab === 'text' ? (!title.trim() || !content.trim() || processing) : (!file || processing)}
            className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm
                       font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors
                       flex items-center gap-2"
          >
            {processing && <Loader2 size={14} className="animate-spin" />}
            Process into wiki
          </button>
        </div>
      </div>
    </div>
  )
}
