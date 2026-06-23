'use client'

import Link from 'next/link'

export default function ServiceDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="px-8 py-8 max-w-4xl mx-auto">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1 text-sm mb-6 hover:underline"
        style={{ color: '#475569' }}
      >
        ← Back to Dashboard
      </Link>
      <div
        className="rounded-xl border p-10 text-center"
        style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }}
      >
        <p className="text-sm font-medium mb-1" style={{ color: '#0F172A' }}>
          Could not load this service.
        </p>
        <p className="text-sm mb-4" style={{ color: '#475569' }}>
          {error.message ?? 'An unexpected error occurred.'}
        </p>
        <button
          onClick={reset}
          className="rounded-lg px-4 py-2 text-sm font-semibold text-white"
          style={{ backgroundColor: '#4A7C8C' }}
        >
          Try again
        </button>
      </div>
    </div>
  )
}
