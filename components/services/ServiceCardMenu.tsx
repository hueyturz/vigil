'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { duplicateService } from '@/app/services/actions'

// Three-dot action menu on a service card. Currently exposes "Duplicate".
export function ServiceCardMenu({ serviceId }: { serviceId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [open])

  async function handleDuplicate() {
    setOpen(false)
    setBusy(true)
    const res = await duplicateService(serviceId)
    if (res.error || !res.data) {
      toast.error(res.error ?? 'Failed to duplicate service.')
      setBusy(false)
      return
    }
    toast.success('Service duplicated')
    router.push(`/services/${res.data.id}`)
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        disabled={busy}
        className="flex items-center justify-center w-7 h-7 rounded-md transition hover:bg-gray-100 disabled:opacity-60"
        style={{ color: '#94A3B8' }}
        aria-label="Service options"
      >
        {busy ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="animate-spin" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" />
          </svg>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1 z-30 rounded-lg border shadow-lg py-1 min-w-[150px]"
          style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }}
        >
          <button
            type="button"
            onClick={handleDuplicate}
            className="block w-full px-3 py-2 text-sm text-left transition hover:bg-gray-50"
            style={{ color: '#0F172A' }}
          >
            Duplicate
          </button>
        </div>
      )}
    </div>
  )
}
