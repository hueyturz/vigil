'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CreateServiceModal } from '@/components/services/CreateServiceModal'

// First-run nudge shown on the dashboard when a funeral home has no active
// services yet. Gives the two natural starting points: create a service, or
// set up task templates.
export function GetStartedBanner() {
  const [open, setOpen] = useState(false)

  return (
    <div
      className="mt-6 rounded-xl border p-6 sm:p-8"
      style={{ backgroundColor: '#F8F5F0', borderColor: '#E2E8F0' }}
    >
      <h2 className="text-xl font-bold" style={{ color: '#0A2540' }}>
        Welcome to Vigilight
      </h2>
      <p className="mt-1.5 text-sm" style={{ color: '#0A2540' }}>
        Get started by creating your first service or setting up your task templates.
      </p>

      <div className="mt-5 flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-lg px-4 py-2.5 text-sm font-semibold transition hover:opacity-90"
          style={{ backgroundColor: '#E8B923', color: '#0A2540' }}
        >
          Create your first service
        </button>
        <Link
          href="/settings/templates"
          className="rounded-lg border px-4 py-2.5 text-sm font-semibold text-center transition hover:opacity-90"
          style={{ borderColor: '#0A2540', color: '#0A2540' }}
        >
          Set up templates
        </Link>
      </div>

      <CreateServiceModal open={open} onClose={() => setOpen(false)} />
    </div>
  )
}
