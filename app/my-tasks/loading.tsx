// Route loading skeleton (audit H4) — no blank screens on slow queries.
export default function Loading() {
  return (
    <div className="px-4 py-4 md:px-8 md:py-8 max-w-3xl mx-auto animate-pulse">
      <div className="h-7 w-44 rounded-lg mb-6" style={{ backgroundColor: '#E2E8F0' }} />
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 rounded-xl" style={{ backgroundColor: '#EDE9E2' }} />
        ))}
      </div>
    </div>
  )
}
