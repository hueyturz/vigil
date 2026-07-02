'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { activateBilling } from '@/app/admin/actions'

const STATUS_STYLE: Record<string, { label: string; bg: string; color: string }> = {
  trialing:  { label: 'Trialing',     bg: '#FFFBEB', color: '#92400E' },
  active:    { label: 'Active',       bg: '#ECFDF5', color: '#15803D' },
  past_due:  { label: 'Past due',     bg: '#FEF2F2', color: '#991B1B' },
  canceled:  { label: 'Canceled',     bg: '#F1F5F9', color: '#475569' },
  suspended: { label: 'Suspended',    bg: '#FEF2F2', color: '#991B1B' },
  none:      { label: 'No billing',   bg: '#F1F5F9', color: '#64748B' },
}

export function ActivateBillingButton({
  funeralHomeId,
  subscriptionStatus,
  hasSubscription,
}: {
  funeralHomeId:      string
  subscriptionStatus: string | null
  hasSubscription:    boolean
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  const status = STATUS_STYLE[subscriptionStatus ?? 'none'] ?? STATUS_STYLE.none

  async function activate() {
    if (!confirm('Start a 14-day trial subscription for this funeral home?')) return
    setBusy(true)
    const result = await activateBilling(funeralHomeId)
    setBusy(false)
    if (result.error) { toast.error(result.error); return }
    toast.success('Billing activated — 14-day trial started')
    router.refresh()
  }

  return (
    <span className="inline-flex items-center gap-2">
      <span className="rounded-full px-2 py-0.5 text-xs font-semibold" style={{ backgroundColor: status.bg, color: status.color }}>
        {status.label}
      </span>
      {!hasSubscription && (
        <button
          type="button"
          onClick={activate}
          disabled={busy}
          className="rounded-lg px-3 py-1.5 text-sm font-semibold transition hover:opacity-90 disabled:opacity-60"
          style={{ backgroundColor: '#E8B923', color: '#0A2540' }}
        >
          {busy ? 'Activating…' : 'Activate Billing'}
        </button>
      )}
    </span>
  )
}
