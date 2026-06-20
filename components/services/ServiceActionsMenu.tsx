'use client'

import { useState, useEffect, useRef } from 'react'
import { EditServiceModal } from './EditServiceModal'
import type { Service } from '@/lib/types'

type ServiceSlice = Pick<Service,
  'id' | 'family_name' | 'deceased_name' | 'service_type' | 'service_date' |
  'location' | 'assigned_staff_id'
>

export function ServiceActionsMenu({ service }: { service: ServiceSlice }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    function handleOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [menuOpen])

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setMenuOpen(o => !o)}
        className="flex items-center justify-center w-9 h-9 rounded-lg border bg-white transition hover:opacity-80"
        style={{ borderColor: '#E2E8F0', color: '#475569' }}
        aria-label="Service options"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" />
        </svg>
      </button>

      {menuOpen && (
        <div
          className="absolute right-0 top-full mt-1 z-30 rounded-lg border shadow-lg py-1 min-w-[170px]"
          style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }}
        >
          <a
            href={`/services/${service.id}/print`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setMenuOpen(false)}
            className="block w-full px-3 py-2 text-sm text-left transition hover:bg-gray-50"
            style={{ color: '#0F172A' }}
          >
            Print Checklist
          </a>
          <button
            type="button"
            onClick={() => { setMenuOpen(false); setEditOpen(true) }}
            className="block w-full px-3 py-2 text-sm text-left transition hover:bg-gray-50"
            style={{ color: '#0F172A' }}
          >
            Edit Service
          </button>
        </div>
      )}

      <EditServiceModal service={service} open={editOpen} onClose={() => setEditOpen(false)} />
    </div>
  )
}
