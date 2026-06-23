import Link from 'next/link'

interface StatsRowProps {
  activeCount: number
  needsAttentionCount: number
  overdueTaskCount: number
}

export function StatsRow({ activeCount, needsAttentionCount, overdueTaskCount }: StatsRowProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <StatCard label="Active Services" value={activeCount}         href="/services" />
      <StatCard label="Needs Attention" value={needsAttentionCount} accent="#EF4444" href="/services?filter=needs-attention" />
      <StatCard label="Overdue Tasks"   value={overdueTaskCount}    accent="#EF4444" href="/tasks?filter=overdue" />
    </div>
  )
}

function StatCard({
  label,
  value,
  accent,
  href,
}: {
  label: string
  value: number
  accent?: string
  href: string
}) {
  return (
    <Link
      href={href}
      className="block rounded-xl border p-5 transition hover:opacity-90 hover:shadow-md"
      style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }}
    >
      <p className="text-sm font-medium" style={{ color: '#475569' }}>{label}</p>
      <p
        className="mt-2 text-3xl font-bold"
        style={{ color: value > 0 && accent ? accent : '#0F172A' }}
      >
        {value}
      </p>
    </Link>
  )
}
