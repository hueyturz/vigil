'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import toast from 'react-hot-toast'
import { TAG_COLORS, tint } from './colors'
import type { Tag } from '@/lib/types'

interface TagPickerProps {
  taskId:       string                  // task id, or template-task (task_templates) id
  existingTags: Tag[]
  mode:         'task' | 'template-task'
  onChange?:    (tags: Tag[]) => void
}

export function TagPicker({ taskId, existingTags, mode, onChange }: TagPickerProps) {
  const [tags, setTags]       = useState<Tag[]>(existingTags)
  const [allTags, setAllTags] = useState<Tag[]>([])
  const [query, setQuery]     = useState('')
  const [open, setOpen]       = useState(false)
  const [creating, setCreating] = useState(false)
  const [pickColor, setPickColor] = useState(TAG_COLORS[0].value)
  const [busy, setBusy]       = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const base = mode === 'task'
    ? `/api/tasks/${taskId}/tags`
    : `/api/template-tasks/${taskId}/tags`

  const loadTags = useCallback(() => {
    fetch('/api/tags').then(r => r.json()).then(d => setAllTags(d.tags ?? [])).catch(() => toast.error('Could not load tags.'))
  }, [])

  useEffect(() => { loadTags() }, [loadTags])

  useEffect(() => {
    if (!open) return
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setCreating(false) }
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [open])

  function update(next: Tag[]) { setTags(next); onChange?.(next) }

  const attachedIds = new Set(tags.map(t => t.id))
  const q       = query.trim()
  const qLower  = q.toLowerCase()
  // q === '' → includes('') is true for all, so this is the full unattached list.
  const matches = allTags.filter(t => !attachedIds.has(t.id) && t.name.toLowerCase().includes(qLower))
  const standardMatches = matches.filter(t => t.is_default)
  const customMatches   = matches.filter(t => !t.is_default)
  const exact   = q ? allTags.find(t => t.name.toLowerCase() === qLower) : undefined

  async function attach(tag: Tag) {
    const prev = tags
    update([...tags.filter(t => t.id !== tag.id), tag])  // optimistic
    setQuery(''); setOpen(false); setCreating(false)
    try {
      const res = await fetch(base, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ tagIds: [tag.id] }) })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || `Failed to add tag (${res.status})`)
      }
    } catch (err) {
      update(prev)  // roll back the optimistic add
      console.error('[TagPicker] attach failed:', err)
      toast.error(err instanceof Error ? err.message : 'Failed to add tag.')
    }
  }

  async function detach(tag: Tag) {
    const prev = tags
    update(tags.filter(t => t.id !== tag.id))            // optimistic
    try {
      const res = await fetch(`${base}/${tag.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || `Failed to remove tag (${res.status})`)
      }
    } catch (err) {
      update(prev)  // roll back the optimistic remove
      console.error('[TagPicker] detach failed:', err)
      toast.error(err instanceof Error ? err.message : 'Failed to remove tag.')
    }
  }

  async function createAndAttach() {
    if (!q || busy) return
    setBusy(true)
    try {
      const res = await fetch('/api/tags', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: q, color: pickColor }) })
      const d = await res.json().catch(() => ({}))
      if (!res.ok || !d.tag) throw new Error(d.error || `Failed to create tag (${res.status})`)
      setAllTags(prev => prev.some(t => t.id === d.tag.id) ? prev : [...prev, d.tag])
      await attach(d.tag)
      setPickColor(TAG_COLORS[0].value)
    } catch (err) {
      console.error('[TagPicker] create failed:', err)
      toast.error(err instanceof Error ? err.message : 'Failed to create tag.')
    } finally {
      setBusy(false)
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape')      { e.preventDefault(); setOpen(false); setCreating(false) }
    else if (e.key === 'Enter')  {
      e.preventDefault()
      if (creating)            createAndAttach()
      else if (exact && !attachedIds.has(exact.id)) attach(exact)
      else if (matches[0])     attach(matches[0])
      else if (q)              setCreating(true)
    }
  }

  return (
    <div className="relative" ref={ref}>
      {/* Current tags */}
      <div className="flex flex-wrap items-center gap-1.5">
        {tags.map(tag => (
          <span
            key={tag.id}
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold"
            style={{ backgroundColor: tint(tag.color, 0.15), color: tag.color, border: `1px solid ${tint(tag.color, 0.35)}` }}
          >
            {tag.name}
            <button type="button" onClick={() => detach(tag)} aria-label={`Remove ${tag.name}`} className="leading-none hover:opacity-70" style={{ color: tag.color }}>×</button>
          </span>
        ))}
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); setCreating(false) }}
          onFocus={() => { setOpen(true); loadTags() }}
          onKeyDown={onKeyDown}
          placeholder={tags.length ? 'Add tag…' : 'Add a tag…'}
          className="min-w-[90px] flex-1 rounded border px-2 py-1 text-xs outline-none"
          style={{ borderColor: '#E2E8F0', color: '#0F172A', backgroundColor: '#FFFFFF' }}
        />
      </div>

      {/* Dropdown — opens on focus and shows the full tag list before typing */}
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-64 rounded-lg border shadow-lg" style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }}>
          {matches.length > 0 && (
            <div className="py-1 max-h-60 overflow-y-auto">
              {standardMatches.length > 0 && (
                <>
                  <p className="px-3 pt-1.5 pb-0.5 text-[10px] font-semibold uppercase tracking-wide" style={{ color: '#94A3B8' }}>Standard Tags</p>
                  {standardMatches.map(tag => (
                    <button key={tag.id} type="button" onClick={() => attach(tag)}
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition hover:bg-gray-50">
                      <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: tag.color }} />
                      <span style={{ color: '#0F172A' }}>{tag.name}</span>
                    </button>
                  ))}
                </>
              )}
              {customMatches.length > 0 && (
                <>
                  <p className="px-3 pt-1.5 pb-0.5 text-[10px] font-semibold uppercase tracking-wide" style={{ color: '#94A3B8' }}>Custom Tags</p>
                  {customMatches.map(tag => (
                    <button key={tag.id} type="button" onClick={() => attach(tag)}
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition hover:bg-gray-50">
                      <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: tag.color }} />
                      <span style={{ color: '#0F172A' }}>{tag.name}</span>
                    </button>
                  ))}
                </>
              )}
            </div>
          )}

          {/* Create option — only once the user has typed a name with no exact match */}
          {q.length > 0 && !exact && (
            <div className={matches.length > 0 ? 'border-t' : ''} style={{ borderColor: '#E2E8F0' }}>
              {!creating ? (
                <button
                  type="button"
                  onClick={() => setCreating(true)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition hover:bg-gray-50"
                  style={{ color: '#0F172A' }}
                >
                  <span style={{ color: '#94A3B8' }}>＋</span> Create “{q}”
                </button>
              ) : (
                <div className="px-3 py-2.5">
                  <p className="mb-2 text-xs font-medium" style={{ color: '#475569' }}>Pick a color for “{q}”</p>
                  <div className="grid grid-cols-8 gap-1.5">
                    {TAG_COLORS.map(c => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setPickColor(c.value)}
                        aria-label={c.name}
                        className="h-5 w-5 rounded-full transition"
                        style={{ backgroundColor: c.value, outline: pickColor === c.value ? '2px solid #0A2540' : 'none', outlineOffset: 2 }}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={createAndAttach}
                    disabled={busy}
                    className="mt-3 w-full rounded-lg px-3 py-1.5 text-xs font-semibold transition hover:opacity-90 disabled:opacity-60"
                    style={{ backgroundColor: '#0A2540', color: '#F4C95D' }}
                  >
                    {busy ? 'Creating…' : 'Create & add'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Empty hints */}
          {matches.length === 0 && q.length === 0 && (
            <p className="px-3 py-2 text-xs" style={{ color: '#94A3B8' }}>
              {allTags.length === 0 ? 'No tags yet — type to create one.' : 'All tags added.'}
            </p>
          )}
          {matches.length === 0 && q.length > 0 && exact && (
            <p className="px-3 py-2 text-xs" style={{ color: '#94A3B8' }}>Already added.</p>
          )}
        </div>
      )}
    </div>
  )
}
