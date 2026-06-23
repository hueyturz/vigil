'use client'

import { useState } from 'react'
import { CreateServiceModal } from '@/components/services/CreateServiceModal'

export function NewServiceButton() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex-shrink-0 rounded-lg px-4 py-2 text-sm font-semibold transition hover:opacity-90"
        style={{ backgroundColor: '#0A2540', color: '#F4C95D' }}
      >
        + New Service
      </button>
      <CreateServiceModal open={open} onClose={() => setOpen(false)} />
    </>
  )
}
