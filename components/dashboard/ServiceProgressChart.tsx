import { formatDate } from '@/lib/utils/date-helpers'
import type { ServiceWithTasks } from '@/lib/types'

const COLORS = {
  confirmed: '#0D6E68',
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
  const serviceDate = service.service_date ?? ''
  let confirmed = 0, onTrack = 0, atRisk = 0, overdue = 0

  for (const task of service.tasks) {
    if (task.status === 'complete') {
      confirmed++
      continue
    }

    if (!serviceDate) {
      onTrack++
      continue
    }

    // Due date = serviceDate minus due_days_before
    const svcMs  = new Date(serviceDate + 'T00:00:00').getTime()
    const dueMs  = svcMs - task.due_days_before * 86400_000
    const today  = new Date(); today.setHours(0, 0, 0, 0)
    const daysLeft = Math.floor((dueMs - today.getTime()) / 86400_000)

    if (daysLeft < 0)      overdue++
    else if (daysLeft <= 3) atRisk++
    else                   onTrack++
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
      className="rounded-xl border p-5"
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
            <div key={service.id} className="flex items-center gap-3">
              {/* Label */}
              <div className="flex-shrink-0" style={{ width: 140 }}>
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
              <div className="flex-shrink-0 text-xs text-right" style={{ width: 80, color: '#94A3B8' }}>
                {buckets.confirmed}/{total} confirmed
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
