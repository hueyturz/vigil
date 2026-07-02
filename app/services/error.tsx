'use client'

// Route error boundary (audit H4): query failures now throw instead of
// rendering empty-but-200 pages; this catches them with a retry.
import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'

export default function ServicesError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => { Sentry.captureException(error) }, [error])

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6">
      <div className="w-full max-w-sm rounded-xl border p-8 text-center" style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }}>
        <h2 className="text-lg font-bold" style={{ color: '#0F172A' }}>Couldn't load services</h2>
        <p className="mt-2 text-sm" style={{ color: '#475569' }}>
          Something went wrong on our end. Your data is safe — try again in a moment.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="mt-5 rounded-lg px-4 py-2 text-sm font-semibold transition hover:opacity-90"
          style={{ backgroundColor: '#0A2540', color: '#F4C95D' }}
        >
          Try again
        </button>
      </div>
    </div>
  )
}
