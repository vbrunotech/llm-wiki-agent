'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ArrowLeft, FileText } from 'lucide-react'

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
            className="text-link hover:text-link-hover underline decoration-link/50
                       hover:decoration-link-hover cursor-pointer transition-colors"
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
      <div className="flex items-center gap-3 px-6 py-3 border-b border-border shrink-0">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-muted hover:text-heading
                     transition-colors"
        >
          <ArrowLeft size={15} />
          Back
        </button>
        <div className="h-4 w-px bg-border-subtle" />
        <FileText size={14} className="text-muted" />
        <span className="text-sm font-mono text-muted">{filename}</span>
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
