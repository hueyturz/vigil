import Link from 'next/link'
import { Badge } from '@/components/ui/Badge'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { computeServiceStatus } from '@/lib/utils/service-status'
import { formatDate, daysUntil } from '@/lib/utils/date-helpers'
import type { ServiceWithTasks } from '@/lib/types'

const SERVICE_TYPE_LABEL: Record<string, string> = {
  'full-burial': 'Full Burial',
  'graveside':   'Graveside',
  'cremation':   'Cremation',
  'military':    'Military Honors',
}

// Stacked-list row for the Services page. The whole row is a link to the
// service detail page; keep everything inside non-interactive so the row
// stays a single click target.
export function ServiceRow({ service }: { service: ServiceWithTasks }) {
  const { tasks } = service
  const serviceDate = service.service_date ?? ''
  // Completed services get a dedicated badge; computeServiceStatus is only
  // meaningful for active services.
  const isCompleted = service.status === 'completed'
  const status      = isCompleted ? 'green' : computeServiceStatus(tasks, serviceDate)
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

  const typeLabel = service.service_type
    ? (SERVICE_TYPE_LABEL[service.service_type] ?? service.service_type)
    : ''

  return (
    <Link
      href={`/services/${service.id}`}
      // Fixed grid tracks on sm+ so every row aligns regardless of content
      // length (e.g. a wide "58d away" pill can't stretch the date column).
      // Tracks: name (flex) | date+pill | progress | badge.
      className="flex flex-col gap-3 sm:grid sm:grid-cols-[minmax(0,1fr)_12rem_11rem_9rem] sm:items-center sm:gap-5 rounded-xl border p-4 hover:shadow-md transition-shadow"
      style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }}
    >
      {/* Name + type label */}
      <div className="min-w-0">
        <h3 className="font-serif text-lg font-bold leading-tight truncate" style={{ color: '#0F172A' }}>
          {service.deceased_name}
        </h3>
        {typeLabel && (
          <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#94A3B8' }}>
            {typeLabel}
          </span>
        )}
      </div>

      {/* Date + days chip */}
      <div className="flex items-center gap-2 text-sm min-w-0" style={{ color: '#475569' }}>
        <span className="whitespace-nowrap">{serviceDate ? formatDate(serviceDate) : 'Date TBD'}</span>
        {!isCompleted && (
          <span
            className="whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold text-white"
            style={{ backgroundColor: dayChipColor }}
          >
            {dayLabel}
          </span>
        )}
      </div>

      {/* Task progress */}
      <div className="space-y-1.5 min-w-0">
        <div className="text-xs whitespace-nowrap" style={{ color: '#475569' }}>{completed}/{total} tasks confirmed</div>
        <ProgressBar value={progressPct} status={status} />
      </div>

      {/* Status badge */}
      <div className="min-w-0">
        <Badge status={isCompleted ? 'completed' : status} />
      </div>
    </Link>
  )
}
