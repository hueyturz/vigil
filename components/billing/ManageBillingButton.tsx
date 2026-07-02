'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'

// Opens the Stripe Customer Portal via /api/stripe/portal (owner-only server
// check). Used by the billing settings page and the suspension wall.
export function ManageBillingButton({ label = 'Manage billing' }: { label?: string }) {
  const [busy, setBusy] = useState(false)

  async function open() {
    setBusy(true)
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.url) throw new Error(data.error || 'Could not open the billing portal.')
      window.location.href = data.url
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not open the billing portal.')
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      onClick={open}
      disabled={busy}
      className="rounded-lg px-4 py-2.5 text-sm font-semibold transition hover:opacity-90 disabled:opacity-60"
      style={{ backgroundColor: '#E8B923', color: '#0A2540' }}
    >
      {busy ? 'Opening…' : label}
    </button>
  )
}
