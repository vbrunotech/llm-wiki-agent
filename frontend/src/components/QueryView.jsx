'use client'

import { useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Send, Bot, User } from 'lucide-react'

function processWikiLinks(content) {
  return content.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, slug, text) => {
    const label = (text || slug).trim()
    return `[${label}](wiki://${slug.trim()})`
  })
}

function Message({ msg, onWikiLink }) {
  const isUser = msg.role === 'user'

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
      return <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>
    },
  }

  const rendered = isUser ? msg.content : processWikiLinks(msg.content)

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5
                       ${isUser ? 'bg-blue-600' : 'bg-slate-700'}`}>
        {isUser ? <User size={14} /> : <Bot size={14} />}
      </div>
      <div className={`max-w-[75%] rounded-xl px-4 py-3 text-sm
                       ${isUser
                         ? 'bg-blue-600 text-white rounded-tr-none'
                         : 'bg-slate-800 text-slate-200 rounded-tl-none'}`}>
        {isUser
          ? <p>{msg.content}</p>
          : <div className="wiki-content">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}
                             urlTransform={url => url}>{rendered}</ReactMarkdown>
            </div>}
      </div>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="flex gap-3">
      <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center shrink-0">
        <Bot size={14} />
      </div>
      <div className="bg-slate-800 rounded-xl rounded-tl-none px-4 py-3">
        <div className="flex gap-1 items-center h-4">
          {[0, 1, 2].map(i => (
            <div key={i}
              className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export default function QueryView({ messages, loading, input, onInputChange, onSend, onWikiLink }) {
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const handleKey = e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend() }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mb-4">
              <Bot size={28} className="text-blue-500" />
            </div>
            <h2 className="text-lg font-semibold text-slate-200 mb-2">Ask your wiki</h2>
            <p className="text-sm text-slate-500 max-w-sm">
              Ask anything — the agent will read the relevant wiki pages and synthesize an answer.
            </p>
          </div>
        )}
        {messages.map((msg, i) => <Message key={i} msg={msg} onWikiLink={onWikiLink} />)}
        {loading && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-6 py-4 border-t border-slate-800">
        <div className="flex gap-3 items-end">
          <textarea
            value={input}
            onChange={e => onInputChange(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask the wiki anything… (Enter to send)"
            rows={1}
            className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm
                       text-slate-100 placeholder-slate-500 resize-none focus:outline-none
                       focus:border-blue-500 transition-colors"
            style={{ maxHeight: '120px', overflowY: 'auto' }}
          />
          <button
            onClick={onSend}
            disabled={!input.trim() || loading}
            className="w-10 h-10 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed
                       rounded-xl flex items-center justify-center text-white transition-colors shrink-0"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
