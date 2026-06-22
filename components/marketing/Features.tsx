function CheckCircleIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0D6E68" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><polyline points="8 12 11 15 16 9" />
    </svg>
  )
}
function BellIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0D6E68" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}
function MicIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0D6E68" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="2" width="6" height="12" rx="3" /><path d="M19 10a7 7 0 0 1-14 0" /><line x1="12" y1="19" x2="12" y2="22" />
    </svg>
  )
}
function PersonIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0D6E68" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  )
}
function HistoryIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0D6E68" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v5h5" /><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" /><polyline points="12 7 12 12 15 14" />
    </svg>
  )
}
function ChartIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0D6E68" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="21" x2="21" y2="21" /><rect x="5" y="11" width="4" height="7" /><rect x="11" y="6" width="4" height="12" /><rect x="17" y="14" width="4" height="4" />
    </svg>
  )
}

const FEATURES = [
  { Icon: CheckCircleIcon, title: 'Task Confirmation Layer',
    body: 'Staff confirm tasks with specifics — not just a checkbox. Directors get documented proof without asking.' },
  { Icon: BellIcon, title: 'Automatic Reminders',
    body: 'Vauter follows up when tasks approach their deadline. Staff get reminded so nothing slips through the cracks.' },
  { Icon: MicIcon, title: 'Meeting Intelligence',
    body: 'Record your arrangement conference. Vauter transcribes it and automatically extracts tasks for the service.' },
  { Icon: PersonIcon, title: 'Per-Task Assignment',
    body: 'Assign individual tasks to specific staff members. Everyone knows exactly what they’re responsible for.' },
  { Icon: HistoryIcon, title: 'Activity Log',
    body: 'A complete audit trail of every action taken on every service. Know who did what and when.' },
  { Icon: ChartIcon, title: 'Service Dashboard',
    body: 'See every active service at a glance. Color-coded progress bars surface problems before they become crises.' },
]

export default function Features() {
  return (
    <div id="features" className="py-24 px-6" style={{ backgroundColor: '#F7F8FA' }}>
      {/* Header */}
      <div className="max-w-3xl mx-auto text-center mb-16">
        <p className="text-sm font-semibold tracking-widest uppercase mb-4" style={{ color: '#0D6E68' }}>
          Features
        </p>
        <h2 className="text-4xl md:text-5xl font-bold leading-tight mb-6" style={{ color: '#0F172A' }}>
          Everything a funeral home needs to run without missing a beat.
        </h2>
        <p className="text-xl" style={{ color: '#475569' }}>
          Built specifically for funeral home operations — not adapted from generic
          project management software.
        </p>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {FEATURES.map(({ Icon, title, body }) => (
          <div key={title} className="bg-white rounded-2xl p-8 border border-[#E2E8F0] shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: '#E6F4F3' }}>
              <Icon />
            </div>
            <h3 className="text-lg font-bold mb-2" style={{ color: '#0F172A' }}>{title}</h3>
            <p className="text-sm leading-relaxed" style={{ color: '#475569' }}>{body}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
