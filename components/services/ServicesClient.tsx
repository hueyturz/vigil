'use client'

import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { CreateServiceModal } from './CreateServiceModal'
import { ServiceCard } from './ServiceCard'
import { computeServiceStatus } from '@/lib/utils/service-status'
import type { ServiceWithTasks } from '@/lib/types'

type StatusFilter = 'all' | 'active' | 'completed' | 'needs-attention'
type SortKey = 'date_asc' | 'date_desc' | 'name_asc'

const STATUS_TABS: { key: StatusFilter; label: string }[] = [
  { key: 'all',             label: 'All'             },
  { key: 'active',          label: 'Active'          },
  { key: 'needs-attention', label: 'Needs Attention' },
  { key: 'completed',       label: 'Completed'       },
]

// A service "needs attention" when it's active and its computed health is red.
function needsAttention(s: ServiceWithTasks): boolean {
  return s.status === 'active' && computeServiceStatus(s.tasks, s.service_date ?? '') === 'red'
}

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'date_asc',  label: 'Soonest Service Date' },
  { key: 'date_desc', label: 'Most Recent'          },
  { key: 'name_asc',  label: 'A–Z Family Name'      },
]

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return debounced
}

export function ServicesClient({ services }: { services: ServiceWithTasks[] }) {
  const searchParams = useSearchParams()

  const [modalOpen,    setModalOpen]    = useState(false)
  const [searchRaw,    setSearchRaw]    = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active')
  const [sortKey,      setSortKey]      = useState<SortKey>('date_asc')

  // Apply the ?filter= query param on mount (e.g. dashboard "Needs Attention" card).
  useEffect(() => {
    if (searchParams.get('filter') === 'needs-attention') setStatusFilter('needs-attention')
  }, [searchParams])

  const search = useDebounce(searchRaw, 200)

  const filtered = useMemo(() => {
    let list = [...services]

    if (statusFilter === 'needs-attention') {
      list = list.filter(needsAttention)
    } else if (statusFilter !== 'all') {
      list = list.filter(s => s.status === statusFilter)
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(s => s.deceased_name.toLowerCase().includes(q))
    }

    list.sort((a, b) => {
      if (sortKey === 'name_asc') return a.deceased_name.localeCompare(b.deceased_name)
      if (sortKey === 'date_desc') return (b.created_at ?? '').localeCompare(a.created_at ?? '')
      const aDate = a.service_date ?? '9999-12-31'
      const bDate = b.service_date ?? '9999-12-31'
      return aDate.localeCompare(bDate)
    })

    return list
  }, [services, statusFilter, search, sortKey])

  return (
    <>
      {/* Page header */}
      <div className="flex items-start justify-between gap-3 mb-8">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold" style={{ color: '#0F172A' }}>Services</h1>
          <p className="text-sm mt-0.5" style={{ color: '#475569' }}>
            Manage all services across your funeral home
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex-shrink-0 rounded-full sm:rounded-lg px-3 py-1.5 sm:px-4 sm:py-2.5 text-sm font-semibold transition hover:opacity-90"
          style={{ backgroundColor: '#0A2540', color: '#F4C95D' }}
        >
          + New<span className="hidden sm:inline"> Service</span>
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2" width="14" height="14" viewBox="0 0 24 24"
            fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            value={searchRaw}
            onChange={e => setSearchRaw(e.target.value)}
            placeholder="Search by name…"
            className="w-full rounded-lg border pl-8 pr-3 py-2 text-sm outline-none"
            style={{ borderColor: '#E2E8F0', color: '#0F172A', backgroundColor: '#FFFFFF' }}
          />
        </div>
        <select
          value={sortKey}
          onChange={e => setSortKey(e.target.value as SortKey)}
          className="w-full sm:w-auto rounded-lg border px-3 py-2 text-sm outline-none"
          style={{ borderColor: '#E2E8F0', color: '#0F172A', backgroundColor: '#FFFFFF' }}
        >
          {SORT_OPTIONS.map(o => (
            <option key={o.key} value={o.key}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 mb-6 border-b" style={{ borderColor: '#E2E8F0' }}>
        {STATUS_TABS.map(tab => {
          const active = statusFilter === tab.key
          const count  = tab.key === 'all'
            ? services.length
            : tab.key === 'needs-attention'
            ? services.filter(needsAttention).length
            : services.filter(s => s.status === tab.key).length
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setStatusFilter(tab.key)}
              className="pb-2.5 px-3 text-sm font-medium transition"
              style={{
                color:        active ? '#4A7C8C' : '#94A3B8',
                borderBottom: active ? '2px solid #4A7C8C' : '2px solid transparent',
              }}
            >
              {tab.label}
              <span className="ml-1.5 text-xs" style={{ color: active ? '#4A7C8C' : '#CBD5E1' }}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center rounded-xl border py-20 text-center"
          style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }}
        >
          <p className="text-sm font-medium" style={{ color: '#0F172A' }}>
            {search.trim() ? 'No matching services' : 'No services'}
          </p>
          <p className="mt-1 text-sm" style={{ color: '#475569' }}>
            {search.trim()
              ? 'Try a different search term.'
              : statusFilter === 'active'
              ? 'Create your first service to get started.'
              : 'No services with this status.'}
          </p>
          {!search.trim() && statusFilter === 'active' && (
            <button
              onClick={() => setModalOpen(true)}
              className="mt-4 rounded-lg px-4 py-2 text-sm font-semibold transition hover:opacity-90"
              style={{ backgroundColor: '#0A2540', color: '#F4C95D' }}
            >
              + New Service
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pb-8">
          {filtered.map(service => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </div>
      )}

      <CreateServiceModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </>
  )
}
