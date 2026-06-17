export default function DashboardLoading() {
  return (
    <div className="px-8 py-8 max-w-7xl mx-auto animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-2">
          <div className="h-7 w-32 rounded-md" style={{ backgroundColor: '#E2E8F0' }} />
          <div className="h-4 w-52 rounded-md" style={{ backgroundColor: '#E2E8F0' }} />
        </div>
        <div className="h-9 w-32 rounded-lg" style={{ backgroundColor: '#E2E8F0' }} />
      </div>

      {/* Stats row skeleton */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="rounded-xl border p-5"
            style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }}
          >
            <div className="h-3 w-24 rounded mb-3" style={{ backgroundColor: '#E2E8F0' }} />
            <div className="h-8 w-12 rounded" style={{ backgroundColor: '#E2E8F0' }} />
          </div>
        ))}
      </div>

      {/* Service card grid skeleton */}
      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}
      >
        {[0, 1, 2, 3].map(i => (
          <div
            key={i}
            className="rounded-xl border p-5 space-y-3"
            style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }}
          >
            <div className="flex justify-between">
              <div className="h-3 w-20 rounded" style={{ backgroundColor: '#E2E8F0' }} />
              <div className="h-5 w-16 rounded-full" style={{ backgroundColor: '#E2E8F0' }} />
            </div>
            <div className="h-6 w-40 rounded" style={{ backgroundColor: '#E2E8F0' }} />
            <div className="h-4 w-32 rounded" style={{ backgroundColor: '#E2E8F0' }} />
            <div className="h-4 w-24 rounded" style={{ backgroundColor: '#E2E8F0' }} />
            <div className="h-2 w-full rounded-full" style={{ backgroundColor: '#E2E8F0' }} />
          </div>
        ))}
      </div>
    </div>
  )
}
