export default function ServiceDetailLoading() {
  return (
    <div className="px-8 py-8 max-w-4xl mx-auto animate-pulse">
      {/* Back link */}
      <div className="h-4 w-32 rounded mb-6" style={{ backgroundColor: '#E2E8F0' }} />

      {/* Service header card */}
      <div
        className="rounded-xl border p-6 mb-6 space-y-3"
        style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }}
      >
        <div className="h-3 w-20 rounded" style={{ backgroundColor: '#E2E8F0' }} />
        <div className="h-8 w-56 rounded" style={{ backgroundColor: '#E2E8F0' }} />
        <div className="h-4 w-40 rounded" style={{ backgroundColor: '#E2E8F0' }} />
        <div className="flex gap-4">
          <div className="h-4 w-24 rounded" style={{ backgroundColor: '#E2E8F0' }} />
          <div className="h-4 w-32 rounded" style={{ backgroundColor: '#E2E8F0' }} />
        </div>
        <div className="h-2 w-full rounded-full mt-2" style={{ backgroundColor: '#E2E8F0' }} />
      </div>

      {/* Task list skeleton */}
      <div
        className="rounded-xl border p-6 space-y-6"
        style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }}
      >
        {[0, 1, 2].map(group => (
          <div key={group}>
            <div className="flex justify-between mb-2">
              <div className="h-3 w-24 rounded" style={{ backgroundColor: '#E2E8F0' }} />
              <div className="h-3 w-8 rounded" style={{ backgroundColor: '#E2E8F0' }} />
            </div>
            <div className="space-y-2">
              {[0, 1, 2].map(row => (
                <div
                  key={row}
                  className="flex items-center gap-3 rounded-lg border p-4"
                  style={{ borderColor: '#E2E8F0' }}
                >
                  <div className="h-5 w-5 rounded-full flex-shrink-0" style={{ backgroundColor: '#E2E8F0' }} />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-4 w-48 rounded" style={{ backgroundColor: '#E2E8F0' }} />
                    <div className="h-3 w-24 rounded" style={{ backgroundColor: '#E2E8F0' }} />
                  </div>
                  <div className="h-7 w-28 rounded-lg" style={{ backgroundColor: '#E2E8F0' }} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
