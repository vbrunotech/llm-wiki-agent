'use client'

import { useEffect, useRef } from 'react'
import { Loader2, Wrench, ArrowRight, CheckCircle2, XCircle } from 'lucide-react'

function LogEntry({ entry }) {
  const icon = {
    tool_call: <Wrench size={11} className="text-amber-400 shrink-0 mt-0.5" />,
    tool_result: <ArrowRight size={11} className="text-slate-500 shrink-0 mt-0.5" />,
    done: <CheckCircle2 size={11} className="text-emerald-400 shrink-0 mt-0.5" />,
    error: <XCircle size={11} className="text-red-400 shrink-0 mt-0.5" />,
  }[entry.type] || null

  const color = {
    tool_call: 'text-amber-300',
    tool_result: 'text-slate-400',
    done: 'text-emerald-400',
    error: 'text-red-400',
  }[entry.type] || 'text-slate-400'

  return (
    <div className={`flex gap-2 text-xs ${color} font-mono`}>
      {icon}
      <span className="truncate">{entry.message}</span>
    </div>
  )
}

export default function ProgressPanel({ title, log, active }) {
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [log])

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-800 shrink-0">
        {active
          ? <Loader2 size={16} className="text-blue-400 animate-spin shrink-0" />
          : <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />}
        <span className="text-sm font-medium text-slate-200">{title}</span>
      </div>

      {/* Log */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-1.5">
        {log.map((entry, i) => <LogEntry key={i} entry={entry} />)}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
