'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'

interface ServiceResult { id: string; deceased_name: string; service_type: string | null; service_date: string | null; status: string }
interface TaskResult    { id: string; title: string; service_id: string; service_deceased_name: string }
interface ContactResult { id: string; name: string; service_id: string; service_deceased_name: string }
interface TagResult     { id: string; name: string; color: string }
interface SearchResults { services: ServiceResult[]; tasks: TaskResult[]; contacts: ContactResult[]; tags: TagResult[] }

// A single navigable/actionable row, flattened across sections for keyboard nav.
interface FlatItem {
  key:       string
  section:   'Services' | 'Tasks' | 'Contacts' | 'Tags'
  primary:   string
  secondary: string
  icon:      'service' | 'task' | 'contact' | 'tag'
  href?:     string     // navigation target (services/tasks/contacts)
  tagName?:  string     // set for Tag items — selecting filters tasks by this tag
  color?:    string     // tag dot color
}

const EMPTY: SearchResults = { services: [], tasks: [], contacts: [], tags: [] }

const SERVICE_TYPE_LABEL: Record<string, string> = {
  'full-burial': 'Full Burial', 'graveside': 'Graveside', 'cremation': 'Cremation', 'military': 'Military Honors',
}

export function CommandPalette({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const router = useRouter()
  const [mounted, setMounted]     = useState(false)
  const [query, setQuery]         = useState('')
  const [tagFilter, setTagFilter] = useState<string | null>(null)
  const [results, setResults]     = useState<SearchResults>(EMPTY)
  const [loading, setLoading]     = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!isOpen) return
    setQuery(''); setTagFilter(null); setResults(EMPTY); setActiveIndex(0)
    const t = setTimeout(() => inputRef.current?.focus(), 0)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { clearTimeout(t); document.body.style.overflow = prevOverflow }
  }, [isOpen])

  // Debounced fetch (re-runs when the tag filter changes too).
  useEffect(() => {
    if (!isOpen) return
    const trimmed = query.trim()
    if (trimmed.length < 2 && !tagFilter) { setResults(EMPTY); setLoading(false); return }

    let cancelled = false
    setLoading(true)
    const t = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q: trimmed })
        if (tagFilter) params.set('tag', tagFilter)
        const res  = await fetch(`/api/search?${params.toString()}`)
        const data = await res.json()
        if (!cancelled) setResults(res.ok ? {
          services: data.services ?? [], tasks: data.tasks ?? [], contacts: data.contacts ?? [], tags: data.tags ?? [],
        } : EMPTY)
      } catch {
        if (!cancelled) setResults(EMPTY)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, 200)

    return () => { cancelled = true; clearTimeout(t) }
  }, [query, tagFilter, isOpen])

  const items = useMemo<FlatItem[]>(() => {
    const out: FlatItem[] = []
    for (const s of results.services) {
      const bits = [s.service_type ? (SERVICE_TYPE_LABEL[s.service_type] ?? s.service_type) : null, s.status].filter(Boolean)
      out.push({ key: `s-${s.id}`, section: 'Services', primary: s.deceased_name, secondary: bits.join(' · '), href: `/services/${s.id}`, icon: 'service' })
    }
    for (const t of results.tasks) {
      out.push({ key: `t-${t.id}`, section: 'Tasks', primary: t.title, secondary: t.service_deceased_name, href: `/services/${t.service_id}?tab=tasks`, icon: 'task' })
    }
    for (const c of results.contacts) {
      out.push({ key: `c-${c.id}`, section: 'Contacts', primary: c.name, secondary: c.service_deceased_name, href: `/services/${c.service_id}?tab=contacts`, icon: 'contact' })
    }
    for (const tag of results.tags) {
      out.push({ key: `tag-${tag.id}`, section: 'Tags', primary: tag.name, secondary: 'View tasks with this tag', icon: 'tag', tagName: tag.name, color: tag.color })
    }
    return out
  }, [results])

  useEffect(() => { setActiveIndex(0) }, [items.length])

  const select = useCallback((item: FlatItem | undefined) => {
    if (!item) return
    onClose()
    // Tag → open the cross-service tasks page filtered to that tag.
    if (item.tagName) { router.push(`/tasks?tag=${encodeURIComponent(item.tagName)}`); return }
    if (item.href) router.push(item.href)
  }, [onClose, router])

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape')      { e.preventDefault(); onClose() }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(i => Math.min(i + 1, items.length - 1)) }
    else if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIndex(i => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter')     { e.preventDefault(); select(items[activeIndex]) }
  }

  if (!mounted || !isOpen) return null

  const q = query.trim()
  const hasResults = items.length > 0

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center px-4 pt-[12vh]"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-xl rounded-xl overflow-hidden shadow-2xl" style={{ backgroundColor: '#FFFFFF' }} onKeyDown={onKeyDown}>
        {/* Navy header with input */}
        <div className="flex items-center gap-3 px-4 py-3" style={{ backgroundColor: '#0A2540' }}>
          <SearchIcon color="rgba(248,245,240,0.6)" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setTagFilter(null) }}
            placeholder="Search services, tasks, contacts, tags…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-[rgba(248,245,240,0.5)]"
            style={{ color: '#FFFFFF' }}
          />
          <kbd className="hidden sm:inline-block rounded px-1.5 py-0.5 text-[11px] font-medium" style={{ backgroundColor: 'rgba(248,245,240,0.12)', color: 'rgba(248,245,240,0.7)' }}>Esc</kbd>
        </div>

        <div style={{ height: 2, backgroundColor: '#E8B923' }} />

        {/* Active tag filter banner */}
        {tagFilter && (
          <div className="flex items-center gap-2 px-4 py-2 text-xs" style={{ backgroundColor: '#F8F5F0', color: '#475569' }}>
            <span>Filtering tasks by tag:</span>
            <span className="font-semibold" style={{ color: '#0A2540' }}>{tagFilter}</span>
            <button type="button" onClick={() => setTagFilter(null)} className="ml-auto font-semibold hover:opacity-70" style={{ color: '#4A7C8C' }}>Clear ×</button>
          </div>
        )}

        {/* Body */}
        <div className="max-h-[55vh] overflow-y-auto">
          {q.length < 2 && !tagFilter ? (
            <p className="px-4 py-10 text-center text-sm" style={{ color: '#94A3B8' }}>Type to search…</p>
          ) : loading ? (
            <p className="px-4 py-10 text-center text-sm" style={{ color: '#94A3B8' }}>Searching…</p>
          ) : !hasResults ? (
            <p className="px-4 py-10 text-center text-sm" style={{ color: '#94A3B8' }}>No results{q ? ` for “${q}”` : ''}</p>
          ) : (
            <Sections items={items} activeIndex={activeIndex} onHover={setActiveIndex} onSelect={select} />
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}

function Sections({ items, activeIndex, onHover, onSelect }: {
  items: FlatItem[]; activeIndex: number; onHover: (i: number) => void; onSelect: (item: FlatItem) => void
}) {
  const sections: FlatItem['section'][] = ['Services', 'Tasks', 'Contacts', 'Tags']
  return (
    <div className="py-2">
      {sections.map(section => {
        const sectionItems = items.filter(i => i.section === section)
        if (sectionItems.length === 0) return null
        return (
          <div key={section} className="mb-1">
            <p className="px-4 pt-2 pb-1 text-xs font-semibold uppercase tracking-wide" style={{ color: '#94A3B8' }}>{section}</p>
            {sectionItems.map(item => {
              const index  = items.indexOf(item)
              const active = index === activeIndex
              return (
                <button
                  key={item.key}
                  type="button"
                  onMouseEnter={() => onHover(index)}
                  onClick={() => onSelect(item)}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition"
                  style={{ backgroundColor: active ? '#F8F5F0' : 'transparent' }}
                >
                  <span className="flex-shrink-0 flex items-center justify-center" style={{ width: 18, color: '#4A7C8C' }}>
                    {item.icon === 'tag'
                      ? <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color ?? '#94A3B8' }} />
                      : <ResultIcon icon={item.icon} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium truncate" style={{ color: '#0F172A' }}>{item.primary}</span>
                    {item.secondary && <span className="block text-xs truncate" style={{ color: '#94A3B8' }}>{item.secondary}</span>}
                  </span>
                </button>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}

// ── Icons ───────────────────────────────────────────────────────────────────

function ResultIcon({ icon }: { icon: FlatItem['icon'] }) {
  if (icon === 'service') return <CalendarIcon />
  if (icon === 'task')    return <CheckboxIcon />
  return <PersonIcon />
}

function SearchIcon({ color }: { color: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

function CheckboxIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 11 12 14 22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  )
}

function PersonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  )
}
