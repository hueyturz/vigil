import Link from 'next/link'
import { formatDate } from '@/lib/utils/date-helpers'
import type { ServiceWithTasks } from '@/lib/types'

const COLORS = {
  confirmed: '#4A7C8C',
  onTrack:   '#94A3B8',
  atRisk:    '#F59E0B',
  overdue:   '#EF4444',
}

const LEGEND = [
  { key: 'confirmed', label: 'Confirmed', color: COLORS.confirmed },
  { key: 'onTrack',   label: 'On Track',  color: COLORS.onTrack   },
  { key: 'atRisk',    label: 'At Risk',   color: COLORS.atRisk    },
  { key: 'overdue',   label: 'Overdue',   color: COLORS.overdue   },
]

function bucketTasks(service: ServiceWithTasks) {
  let confirmed = 0, onTrack = 0, atRisk = 0, overdue = 0

  const today = new Date(); today.setHours(0, 0, 0, 0)

  for (const task of service.tasks) {
    // Confirmed — task is complete.
    if (task.status === 'complete') {
      confirmed++
      continue
    }

    // On Track — no service date set, so the task can't be "due" yet.
    if (!service.service_date) {
      onTrack++
      continue
    }

    // Due date = service_date minus due_days_before days.
    const dueMs    = new Date(service.service_date + 'T00:00:00').getTime()
                     - task.due_days_before * 86_400_000
    const daysLeft = Math.floor((dueMs - today.getTime()) / 86_400_000)

    // Order matters: check Overdue BEFORE At Risk so a past-due task
    // never falls into the amber (At Risk) bucket.
    if (daysLeft < 0) {
      overdue++                 // due date is before today
    } else if (daysLeft <= 3) {
      atRisk++                  // due within the next 0–3 days
    } else {
      onTrack++                 // due more than 3 days away
    }
  }

  return { confirmed, onTrack, atRisk, overdue }
}

export function ServiceProgressChart({ services }: { services: ServiceWithTasks[] }) {
  const rows = services
    .filter(s => s.status === 'active' && s.tasks.length > 0)
    .sort((a, b) => {
      const aDate = a.service_date ?? '9999-12-31'
      const bDate = b.service_date ?? '9999-12-31'
      return aDate.localeCompare(bDate)
    })

  if (rows.length === 0) return null

  return (
    <div
      className="rounded-xl border p-5 overflow-hidden"
      style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }}
    >
      {/* Legend */}
      <div className="flex flex-wrap gap-4 mb-5">
        {LEGEND.map(l => (
          <div key={l.key} className="flex items-center gap-1.5">
            <span className="rounded-full flex-shrink-0" style={{ width: 8, height: 8, backgroundColor: l.color }} />
            <span className="text-xs" style={{ color: '#475569' }}>{l.label}</span>
          </div>
        ))}
      </div>

      {/* Rows */}
      <div className="space-y-3">
        {rows.map(service => {
          const buckets = bucketTasks(service)
          const total   = service.tasks.length
          const pct     = (n: number) => `${(n / total) * 100}%`

          return (
            <Link key={service.id} href={`/services/${service.id}`}
              className="flex items-center gap-3 rounded-lg px-2 -mx-2 py-1 -my-1 transition-colors hover:bg-gray-50 cursor-pointer">
              {/* Label */}
              <div className="flex-shrink-0 w-24 sm:w-36">
                <p className="text-sm font-medium truncate" style={{ color: '#0F172A' }}>
                  {service.deceased_name}
                </p>
                {service.service_date && (
                  <p className="text-xs truncate" style={{ color: '#94A3B8' }}>
                    {formatDate(service.service_date)}
                  </p>
                )}
              </div>

              {/* Bar */}
              <div className="flex flex-1 rounded-full overflow-hidden" style={{ height: 12, backgroundColor: '#F1F5F9' }}>
                {buckets.confirmed > 0 && (
                  <div style={{ width: pct(buckets.confirmed), backgroundColor: COLORS.confirmed }} />
                )}
                {buckets.onTrack > 0 && (
                  <div style={{ width: pct(buckets.onTrack), backgroundColor: COLORS.onTrack }} />
                )}
                {buckets.atRisk > 0 && (
                  <div style={{ width: pct(buckets.atRisk), backgroundColor: COLORS.atRisk }} />
                )}
                {buckets.overdue > 0 && (
                  <div style={{ width: pct(buckets.overdue), backgroundColor: COLORS.overdue }} />
                )}
              </div>

              {/* Count */}
              <div className="flex-shrink-0 w-16 sm:w-20 text-xs text-right" style={{ color: '#94A3B8' }}>
                {buckets.confirmed}/{total} confirmed
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
