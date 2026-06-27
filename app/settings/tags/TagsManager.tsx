'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { TAG_COLORS, tint } from '@/components/tags/colors'
import type { Tag } from '@/lib/types'

export function TagsManager({ defaults, initialCustom }: { defaults: Tag[]; initialCustom: Tag[] }) {
  const router = useRouter()
  const [custom, setCustom] = useState<Tag[]>(initialCustom)
  const [creating, setCreating] = useState(false)
  const [name, setName]   = useState('')
  const [color, setColor] = useState(TAG_COLORS[0].value)
  const [busy, setBusy]   = useState(false)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  async function create() {
    const trimmed = name.trim()
    if (!trimmed || busy) return
    setBusy(true)
    try {
      const res = await fetch('/api/tags', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: trimmed, color }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok || !d.tag) throw new Error(d.error || `Failed to create tag (${res.status})`)
      setCustom(prev => [...prev.filter(t => t.id !== d.tag.id), d.tag].sort((a, b) => a.name.localeCompare(b.name)))
      setName(''); setColor(TAG_COLORS[0].value); setCreating(false)
      toast.success('Tag created')
      router.refresh()
    } catch (err) {
      console.error('[TagsManager] create failed:', err)
      toast.error(err instanceof Error ? err.message : 'Failed to create tag.')
    } finally {
      setBusy(false)
    }
  }

  async function remove(tag: Tag) {
    setBusy(true)
    try {
      const res = await fetch(`/api/tags/${tag.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || `Failed to delete tag (${res.status})`)
      }
      setCustom(prev => prev.filter(t => t.id !== tag.id))
      setConfirmId(null)
      toast.success('Tag deleted')
      router.refresh()
    } catch (err) {
      console.error('[TagsManager] delete failed:', err)
      toast.error(err instanceof Error ? err.message : 'Failed to delete tag.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-8">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#0F172A' }}>Tags</h1>
          <p className="text-sm mt-0.5" style={{ color: '#475569' }}>Create and manage task tags</p>
        </div>
        {!creating && (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="flex-shrink-0 rounded-lg px-4 py-2 text-sm font-semibold transition hover:opacity-90"
            style={{ backgroundColor: '#E8B923', color: '#0A2540' }}
          >
            New Tag
          </button>
        )}
      </div>

      {/* New tag form */}
      {creating && (
        <div className="mb-8 rounded-xl border p-5" style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }}>
          <p className="text-sm font-semibold mb-3" style={{ color: '#0F172A' }}>New tag</p>
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') create(); if (e.key === 'Escape') setCreating(false) }}
            placeholder="Tag name"
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none mb-3"
            style={{ borderColor: '#E2E8F0', color: '#0F172A' }}
          />
          <p className="text-xs font-medium mb-2" style={{ color: '#475569' }}>Color</p>
          <div className="flex flex-wrap gap-2 mb-4">
            {TAG_COLORS.map(c => (
              <button
                key={c.value}
                type="button"
                onClick={() => setColor(c.value)}
                aria-label={c.name}
                className="h-7 w-7 rounded-full transition"
                style={{ backgroundColor: c.value, outline: color === c.value ? '2px solid #0A2540' : 'none', outlineOffset: 2 }}
              />
            ))}
          </div>
          {name.trim() && (
            <div className="mb-4">
              <span
                className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold"
                style={{ backgroundColor: tint(color, 0.15), color, border: `1px solid ${tint(color, 0.35)}` }}
              >
                {name.trim()}
              </span>
            </div>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={create}
              disabled={busy || !name.trim()}
              className="rounded-lg px-4 py-2 text-sm font-semibold transition hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: '#0A2540', color: '#F4C95D' }}
            >
              {busy ? 'Creating…' : 'Create tag'}
            </button>
            <button
              type="button"
              onClick={() => { setCreating(false); setName(''); setColor(TAG_COLORS[0].value) }}
              className="rounded-lg border px-4 py-2 text-sm font-medium transition hover:bg-gray-50"
              style={{ borderColor: '#E2E8F0', color: '#475569' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Standard tags — stacked full-width rows */}
      <section className="mb-8">
        <h2 className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: '#94A3B8' }}>Standard Tags</h2>
        <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }}>
          {defaults.map((tag, i) => (
            <div
              key={tag.id}
              className={`flex items-center gap-3 px-4 py-3${i < defaults.length - 1 ? ' border-b' : ''}`}
              style={{ borderColor: '#E2E8F0' }}
            >
              <span className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: tag.color }} />
              <span className="text-sm font-medium" style={{ color: '#0F172A' }}>{tag.name}</span>
              <span className="ml-auto inline-flex items-center gap-2">
                <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ backgroundColor: '#F1F5F9', color: '#64748B' }}>Default</span>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-label="Locked">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Custom tags — stacked full-width rows */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: '#94A3B8' }}>Custom Tags</h2>
        {custom.length === 0 ? (
          <div className="rounded-xl border py-12 text-center" style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }}>
            <p className="text-sm" style={{ color: '#94A3B8' }}>No custom tags yet — create your first one.</p>
          </div>
        ) : (
          <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }}>
            {custom.map((tag, i) => (
              <div
                key={tag.id}
                className={`flex items-center gap-3 px-4 py-3${i < custom.length - 1 ? ' border-b' : ''}`}
                style={{ borderColor: '#E2E8F0' }}
              >
                <span className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: tag.color }} />
                <span className="text-sm font-medium" style={{ color: '#0F172A' }}>{tag.name}</span>
                {confirmId === tag.id ? (
                  <span className="ml-auto inline-flex items-center gap-2">
                    <button type="button" disabled={busy} onClick={() => remove(tag)} className="text-xs font-bold hover:opacity-70" style={{ color: '#DC2626' }}>Delete</button>
                    <button type="button" onClick={() => setConfirmId(null)} className="text-xs hover:opacity-70" style={{ color: '#94A3B8' }}>Cancel</button>
                  </span>
                ) : (
                  <button type="button" onClick={() => setConfirmId(tag.id)} aria-label={`Delete ${tag.name}`} className="ml-auto leading-none hover:opacity-70" style={{ color: '#DC2626' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
