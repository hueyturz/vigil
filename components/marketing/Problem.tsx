function DocumentIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="17" x2="12" y2="17" />
    </svg>
  )
}

function PhoneIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  )
}

function WarningIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

const CARDS = [
  {
    Icon: DocumentIcon,
    title: "The shared note isn't enough",
    body: 'Staff add tasks to a shared document with no ownership, no deadlines, and no proof anything was done. Things get missed.',
  },
  {
    Icon: PhoneIcon,
    title: 'Triple-checking wastes time',
    body: 'Directors follow up personally to confirm tasks — time that should be spent with grieving families, not chasing staff.',
  },
  {
    Icon: WarningIcon,
    title: 'Things fall through the cracks',
    body: 'Without a confirmation layer, critical tasks get missed. Families notice. Reputations suffer.',
  },
]

export default function Problem() {
  return (
    <div id="problem" className="py-24 px-6" style={{ backgroundColor: '#F8F5F0' }}>
      {/* Header */}
      <div className="max-w-3xl mx-auto text-center">
        <p className="text-sm font-semibold tracking-widest uppercase mb-4" style={{ color: '#4A7C8C' }}>
          The Problem
        </p>
        <h2 className="text-4xl md:text-5xl font-bold leading-tight mb-6" style={{ color: '#0F172A' }}>
          Funeral directors spend more time checking on tasks than serving families.
        </h2>
        <p className="text-xl max-w-2xl mx-auto" style={{ color: '#475569' }}>
          The shared note. The group text. The follow-up call. None of them give you
          proof that anything was actually done.
        </p>
      </div>

      {/* Pain point cards */}
      <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {CARDS.map(({ Icon, title, body }) => (
          <div
            key={title}
            className="bg-white border border-[#E2E8F0] rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow"
          >
            <Icon />
            <h3 className="font-semibold text-lg mb-3 mt-4" style={{ color: '#0F172A' }}>{title}</h3>
            <p className="text-sm leading-relaxed" style={{ color: '#475569' }}>{body}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
