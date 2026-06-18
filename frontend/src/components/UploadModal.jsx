'use client'

import { useState, useRef } from 'react'
import { X, Upload, FileText, Loader2 } from 'lucide-react'

export default function UploadModal({ onClose, onUploaded }) {
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploaded, setUploaded] = useState([])
  const inputRef = useRef(null)

  const uploadFile = async file => {
    setUploading(true)
    const form = new FormData()
    form.append('file', file)
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: form })
      if (!res.ok) throw new Error('Upload failed')
      const data = await res.json()
      setUploaded(u => [...u, data.filename])
      onUploaded()
    } catch (e) {
      alert(e.message)
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = e => {
    e.preventDefault()
    setDragging(false)
    Array.from(e.dataTransfer.files).forEach(uploadFile)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-overlay/60 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-surface border border-border-subtle rounded-2xl w-[480px] max-w-[95vw]
                      shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-heading">Upload Source Files</h2>
          <button onClick={onClose} className="text-muted hover:text-body transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5">
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors
                        ${dragging ? 'border-blue-500 bg-blue-500/10' : 'border-border-subtle hover:border-muted'}`}
          >
            <Upload size={24} className="mx-auto mb-3 text-muted" />
            <p className="text-sm text-muted">Drop files here or <span className="text-link">browse</span></p>
            <p className="text-xs text-muted mt-1">PDF · DOCX · PPTX · XLSX · CSV · MD · TXT · HTML · images · audio · ZIP</p>
            <p className="text-xs text-faint mt-0.5">Saved to sources/raw/ — ingest to build the wiki</p>
            <input
              ref={inputRef}
              type="file"
              accept=".md,.txt,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv,.json,.xml,.html,.htm,.jpg,.jpeg,.png,.gif,.webp,.bmp,.mp3,.wav,.m4a,.zip"
              multiple
              className="hidden"
              onChange={e => Array.from(e.target.files).forEach(uploadFile)}
            />
          </div>

          {uploading && (
            <div className="flex items-center gap-2 mt-3 text-sm text-muted">
              <Loader2 size={14} className="animate-spin" /> Uploading…
            </div>
          )}

          {uploaded.length > 0 && (
            <div className="mt-3 space-y-1">
              {uploaded.map(f => (
                <div key={f} className="flex items-center gap-2 text-sm text-emerald-400">
                  <FileText size={13} /> {f} uploaded
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end px-6 py-4 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-border-subtle text-sm text-muted
                       hover:text-heading hover:border-muted transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
