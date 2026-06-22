import Link from 'next/link'

const BULLETS = [
  'Every task assigned to a specific staff member',
  'Staff confirm with specifics — vendor, order number, date',
  'Automatic reminders when tasks approach their deadline',
  'Full audit trail of who did what and when',
]

function CheckCircle() {
  return (
    <span
      className="w-5 h-5 flex-shrink-0 mt-0.5 rounded-full flex items-center justify-center"
      style={{ backgroundColor: '#0D6E68' }}
    >
      <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="2 6 5 9 10 3" />
      </svg>
    </span>
  )
}

export default function Solution() {
  return (
    <div id="solution" className="bg-white py-24 px-6">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
        {/* Left — text */}
        <div>
          <p className="text-sm font-semibold tracking-widest uppercase mb-4" style={{ color: '#0D6E68' }}>
            The Solution
          </p>
          <h2 className="text-4xl md:text-5xl font-bold leading-tight mb-6" style={{ color: '#0F172A' }}>
            Accountability built for funeral operations.
          </h2>
          <p className="text-lg leading-relaxed mb-8" style={{ color: '#475569' }}>
            Vauter gives every task an owner, a deadline, and a confirmation requirement.
            Staff don&apos;t just check a box — they provide proof. Directors get peace of mind
            without making a single follow-up call.
          </p>

          <ul>
            {BULLETS.map(text => (
              <li key={text} className="flex items-start gap-3 mb-4">
                <CheckCircle />
                <span className="font-medium" style={{ color: '#0F172A' }}>{text}</span>
              </li>
            ))}
          </ul>

          <Link href="/#features" className="font-semibold hover:underline" style={{ color: '#0D6E68' }}>
            See all features →
          </Link>
        </div>

        {/* Right — task confirmation mockup */}
        <div>
          <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-xl p-6 max-w-sm ml-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
              <span className="text-xs font-semibold tracking-wider" style={{ color: '#0D6E68' }}>
                TASK CONFIRMED
              </span>
              <span className="w-6 h-6 rounded-full flex items-center justify-center bg-green-100 text-green-600">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
            </div>

            {/* Title + service */}
            <p className="text-lg font-bold mb-1" style={{ color: '#0F172A' }}>Casket ordered</p>
            <p className="text-sm mb-4" style={{ color: '#94A3B8' }}>Henderson Family Service</p>

            <div className="border-t border-[#E2E8F0] mb-4" />

            {/* Details */}
            <DetailRow
              icon={<PersonIcon />}
              label="Confirmed by"
              value="Sarah Mitchell"
              valueClass="font-medium"
            />
            <DetailRow
              icon={<DocIcon />}
              label="Confirmation details"
              value="Batesville #4820, Order #78234, delivery Jun 23"
            />
            <DetailRow
              icon={<ClockIcon />}
              label="Confirmed at"
              value="Jun 20, 2026 at 2:14 PM"
            />

            <div className="mt-4 pt-4 border-t border-[#E2E8F0]">
              <p className="text-xs" style={{ color: '#94A3B8' }}>
                This confirmation is logged in the Vauter activity trail and cannot be edited.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function DetailRow({
  icon, label, value, valueClass = '',
}: {
  icon: React.ReactNode; label: string; value: string; valueClass?: string
}) {
  return (
    <div className="flex items-start gap-3 mb-3">
      <span className="flex-shrink-0 mt-0.5">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs" style={{ color: '#94A3B8' }}>{label}</p>
        <p className={`text-sm ${valueClass}`} style={{ color: '#0F172A' }}>{value}</p>
      </div>
    </div>
  )
}

function PersonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  )
}
function DocIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
    </svg>
  )
}
function ClockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  )
}
