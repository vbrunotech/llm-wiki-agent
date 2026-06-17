'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ArrowLeft, FileText } from 'lucide-react'

// [[slug]] → [slug](wiki://slug)
// [[slug|display text]] → [display text](wiki://slug)
function processWikiLinks(content) {
  return content.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, slug, text) => {
    const label = (text || slug).trim()
    return `[${label}](wiki://${slug.trim()})`
  })
}

export default function PageViewer({ filename, content, onBack, onWikiLink }) {
  const processed = processWikiLinks(content)

  const components = {
    a({ href, children }) {
      if (href?.startsWith('wiki://')) {
        const slug = decodeURIComponent(href.slice(7))
        return (
          <button
            onClick={() => onWikiLink?.(slug)}
            className="text-blue-400 hover:text-blue-300 underline decoration-blue-400/50
                       hover:decoration-blue-300 cursor-pointer transition-colors"
          >
            {children}
          </button>
        )
      }
      return (
        <a href={href} target="_blank" rel="noopener noreferrer">
          {children}
        </a>
      )
    },
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-slate-800 shrink-0">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200
                     transition-colors"
        >
          <ArrowLeft size={15} />
          Back
        </button>
        <div className="h-4 w-px bg-slate-700" />
        <FileText size={14} className="text-slate-500" />
        <span className="text-sm font-mono text-slate-400">{filename}</span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        <div className="max-w-3xl wiki-content">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={components}
            urlTransform={url => url}
          >
            {processed}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  )
}
