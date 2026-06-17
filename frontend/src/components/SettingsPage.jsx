'use client'

import { useState, useEffect } from 'react'
import { Save, CheckCircle, AlertTriangle, Eye, EyeOff, Loader2 } from 'lucide-react'

const MODES = [
  {
    value: 'anthropic_api_key',
    label: 'Anthropic API Key',
    supportsTools: true,
    fields: [
      { key: 'anthropic_api_key', label: 'API Key', placeholder: 'sk-ant-api03-…', secret: true },
      { key: 'anthropic_model', label: 'Model', placeholder: 'claude-sonnet-4-20250514' },
    ],
  },
  {
    value: 'openai_api_key',
    label: 'OpenAI API Key',
    supportsTools: true,
    fields: [
      { key: 'openai_api_key', label: 'API Key', placeholder: 'sk-proj-…', secret: true },
      { key: 'openai_model', label: 'Model', placeholder: 'gpt-4o' },
    ],
  },
  {
    value: 'openrouter_api_key',
    label: 'OpenRouter API Key',
    supportsTools: true,
    fields: [
      { key: 'openrouter_api_key', label: 'API Key', placeholder: 'sk-or-v1-…', secret: true },
      { key: 'openrouter_model', label: 'Model', placeholder: 'anthropic/claude-sonnet-4' },
    ],
  },
  {
    value: 'openclaw_api',
    label: 'OpenClaw API',
    supportsTools: true,
    fields: [
      { key: 'openclaw_base_url', label: 'Base URL', placeholder: 'http://127.0.0.1:18789/v1' },
      { key: 'openclaw_api_key', label: 'API Key', placeholder: 'your-key', secret: true },
      { key: 'openclaw_model', label: 'Model', placeholder: 'openclaw/default' },
      { key: 'openclaw_upstream_model', label: 'Upstream Model', placeholder: 'openai-codex/gpt-5.5' },
    ],
  },
  {
    value: 'openai_codex_oauth',
    label: 'OpenAI Codex OAuth',
    supportsTools: true,
    fields: [
      { key: 'openai_oauth_token', label: 'OAuth Token', placeholder: 'eyJhbGci…', secret: true, multiline: true },
      { key: 'openai_codex_model', label: 'Model', placeholder: 'gpt-5.5' },
    ],
  },
]

function SecretField({ value, onChange, placeholder }) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative">
      <input
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 pr-10 text-sm
                   text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500
                   transition-colors font-mono"
      />
      <button
        type="button"
        onClick={() => setVisible(v => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
      >
        {visible ? <EyeOff size={15} /> : <Eye size={15} />}
      </button>
    </div>
  )
}

function MultilineField({ value, onChange, placeholder }) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={4}
      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-sm
                 text-slate-100 placeholder-slate-600 resize-none focus:outline-none
                 focus:border-blue-500 transition-colors font-mono leading-relaxed"
    />
  )
}

export default function SettingsPage() {
  const [form, setForm] = useState({})
  const [selectedMode, setSelectedMode] = useState('anthropic_api_key')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(data => {
        setForm(data)
        setSelectedMode(data.llm_mode || 'anthropic_api_key')
        setLoading(false)
      })
      .catch(() => { setError('Failed to load settings'); setLoading(false) })
  }, [])

  const set = (key, value) => {
    setForm(f => ({ ...f, [key]: value }))
    setSaved(false)
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, llm_mode: selectedMode }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.detail || 'Save failed')
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const currentMode = MODES.find(m => m.value === selectedMode) || MODES[0]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 size={24} className="animate-spin text-slate-500" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="max-w-2xl w-full mx-auto px-8 py-8">
        <h1 className="text-xl font-bold text-slate-100 mb-1">Settings</h1>
        <p className="text-sm text-slate-500 mb-8">
          Configure your LLM provider. Settings are saved to <code className="bg-slate-800 px-1 rounded text-xs">backend/wiki_settings.json</code>.
        </p>

        {/* Mode selector */}
        <section className="mb-8">
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
            LLM Mode
          </label>
          <div className="grid grid-cols-1 gap-2">
            {MODES.map(mode => (
              <label
                key={mode.value}
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors
                            ${selectedMode === mode.value
                              ? 'border-blue-500 bg-blue-500/10'
                              : 'border-slate-700 hover:border-slate-600 bg-slate-800/50'}`}
              >
                <input
                  type="radio"
                  name="llm_mode"
                  value={mode.value}
                  checked={selectedMode === mode.value}
                  onChange={() => { setSelectedMode(mode.value); set('llm_mode', mode.value) }}
                  className="mt-0.5 accent-blue-500"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-200">{mode.label}</span>
                    {mode.supportsTools
                      ? <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">
                          Tool calling ✓
                        </span>
                      : <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">
                          No tool calling
                        </span>}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 font-mono">{mode.value}</p>
                </div>
              </label>
            ))}
          </div>
        </section>

        {/* No-tool warning */}
        {!currentMode.supportsTools && (
          <div className="flex gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 mb-6">
            <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-300">
              <strong>{currentMode.label}</strong> does not support tool calling.
              Wiki operations (ingest, query, lint) require tool support.
              Use <strong>Anthropic</strong>, <strong>OpenAI</strong>, or <strong>OpenRouter</strong> for full functionality.
            </p>
          </div>
        )}

        {/* Mode-specific fields */}
        <section className="space-y-5 mb-8">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
            {currentMode.label} Configuration
          </h2>
          {currentMode.fields.map(field => (
            <div key={field.key}>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                {field.label}
              </label>
              {field.multiline ? (
                <MultilineField
                  value={form[field.key] || ''}
                  onChange={v => set(field.key, v)}
                  placeholder={field.placeholder}
                />
              ) : field.secret ? (
                <SecretField
                  value={form[field.key] || ''}
                  onChange={v => set(field.key, v)}
                  placeholder={field.placeholder}
                />
              ) : (
                <input
                  type="text"
                  value={form[field.key] || ''}
                  onChange={e => set(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-sm
                             text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500
                             transition-colors"
                />
              )}
            </div>
          ))}
        </section>

        {/* Error */}
        {error && (
          <div className="flex gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 mb-4 text-sm text-red-400">
            <AlertTriangle size={15} className="shrink-0 mt-0.5" /> {error}
          </div>
        )}

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500
                     text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed
                     transition-colors"
        >
          {saving
            ? <><Loader2 size={15} className="animate-spin" /> Saving…</>
            : saved
              ? <><CheckCircle size={15} className="text-emerald-300" /> Saved!</>
              : <><Save size={15} /> Save Settings</>}
        </button>
      </div>
    </div>
  )
}
