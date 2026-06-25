'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { retrySms } from '@/app/admin/actions'

export function ResendSmsButton({ smsLogId }: { smsLogId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleResend() {
    setLoading(true)
    const result = await retrySms(smsLogId)
    setLoading(false)
    if (result.error) { toast.error(result.error); return }
    toast.success('SMS resent')
    router.refresh()
  }

  return (
    <button
      type="button"
      onClick={handleResend}
      disabled={loading}
      className="rounded-lg border px-2.5 py-1 text-xs font-semibold transition hover:opacity-80 disabled:opacity-50"
      style={{ borderColor: '#0A2540', color: '#0A2540' }}
    >
      {loading ? 'Sending…' : 'Resend'}
    </button>
  )
}
