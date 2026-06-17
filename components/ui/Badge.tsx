import type { ComputedStatus } from '@/lib/types'

const CONFIGS: Record<ComputedStatus, { dot: string; bg: string; border: string; text: string; label: string }> = {
  green:  { dot: '#10B981', bg: '#ECFDF5', border: '#A7F3D0', text: '#065F46', label: 'On track'  },
  yellow: { dot: '#F59E0B', bg: '#FFFBEB', border: '#FDE68A', text: '#92400E', label: 'In progress' },
  red:    { dot: '#EF4444', bg: '#FEF2F2', border: '#FECACA', text: '#991B1B', label: 'Needs attention' },
}

export function Badge({ status }: { status: ComputedStatus }) {
  const c = CONFIGS[status]
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium"
      style={{ backgroundColor: c.bg, borderColor: c.border, color: c.text }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: c.dot }} />
      {c.label}
    </span>
  )
}
