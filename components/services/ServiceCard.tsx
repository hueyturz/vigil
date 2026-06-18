import Link from 'next/link'
import { Badge } from '@/components/ui/Badge'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { computeServiceStatus, isTaskOverdue } from '@/lib/utils/service-status'
import { formatDate, daysUntil } from '@/lib/utils/date-helpers'
import type { ServiceWithTasks } from '@/lib/types'

const SERVICE_TYPE_LABEL: Record<string, string> = {
  'full-burial': 'Full Burial',
  'graveside':   'Graveside',
  'cremation':   'Cremation',
  'military':    'Military Honors',
}

function familyLabel(name: string): string {
  return /family/i.test(name) ? name : `${name} Family`
}

export function ServiceCard({ service }: { service: ServiceWithTasks }) {
  const { tasks } = service
  const serviceDate = service.service_date ?? ''
  const status      = computeServiceStatus(tasks, serviceDate)
  const completed   = tasks.filter(t => t.status === 'complete').length
  const total       = tasks.length
  const progressPct = total > 0 ? (completed / total) * 100 : 0

  const days = serviceDate ? daysUntil(serviceDate) : null

  let dayChipColor = '#94A3B8'
  if (days !== null && days <= 2)      dayChipColor = '#EF4444'
  else if (days !== null && days <= 5) dayChipColor = '#F59E0B'

  const dayLabel = days === null
    ? 'TBD'
    : days < 0
    ? `${Math.abs(days)}d ago`
    : days === 0
    ? 'Today'
    : `${days}d away`

  return (
    <div
      className="flex flex-col rounded-xl border p-5 gap-3 hover:shadow-md transition-shadow"
      style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }}
    >
      {/* Top row: type label + status badge */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#94A3B8' }}>
          {service.service_type
            ? (SERVICE_TYPE_LABEL[service.service_type] ?? service.service_type)
            : ''}
        </span>
        <Badge status={status} />
      </div>

      {/* Family / deceased names */}
      <div>
        <h3 className="font-serif text-xl font-bold leading-tight" style={{ color: '#0F172A' }}>
          {familyLabel(service.family_name)}
        </h3>
        <p className="mt-0.5 text-sm" style={{ color: '#475569' }}>
          {service.deceased_name}
        </p>
      </div>

      {/* Date + days chip */}
      <div className="flex items-center gap-2 text-sm" style={{ color: '#475569' }}>
        <span>{serviceDate ? formatDate(serviceDate) : 'Date TBD'}</span>
        <span
          className="rounded-full px-2 py-0.5 text-xs font-semibold text-white"
          style={{ backgroundColor: dayChipColor }}
        >
          {dayLabel}
        </span>
      </div>

      {/* Location */}
      {service.location && (
        <p className="text-sm truncate" style={{ color: '#475569' }}>{service.location}</p>
      )}

      {/* Progress */}
      <div className="space-y-1.5 mt-auto pt-1">
        <div className="flex justify-between text-xs" style={{ color: '#475569' }}>
          <span>{completed}/{total} tasks confirmed</span>
        </div>
        <ProgressBar value={progressPct} status={status} />
      </div>

      <Link
        href={`/services/${service.id}`}
        className="mt-1 text-sm font-medium hover:underline"
        style={{ color: '#0D6E68' }}
      >
        View service →
      </Link>
    </div>
  )
}
