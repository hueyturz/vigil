'use client'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="px-8 py-8 max-w-7xl mx-auto">
      <div
        className="rounded-xl border p-10 text-center"
        style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }}
      >
        <p className="text-sm font-medium mb-1" style={{ color: '#0F172A' }}>
          Something went wrong loading the dashboard.
        </p>
        <p className="text-sm mb-4" style={{ color: '#475569' }}>
          {error.message ?? 'An unexpected error occurred.'}
        </p>
        <button
          onClick={reset}
          className="rounded-lg px-4 py-2 text-sm font-semibold"
          style={{ backgroundColor: '#0A2540', color: '#F4C95D' }}
        >
          Try again
        </button>
      </div>
    </div>
  )
}
