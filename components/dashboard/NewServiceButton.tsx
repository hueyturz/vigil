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
        className="flex-shrink-0 rounded-lg px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
        style={{ backgroundColor: '#4A7C8C' }}
      >
        + New Service
      </button>
      <CreateServiceModal open={open} onClose={() => setOpen(false)} />
    </>
  )
}
