import Link from 'next/link'
import { daysUntil } from '@/lib/utils/date-helpers'
import type { ServiceWithTasks, Priority } from '@/lib/types'

const PRIORITY_COLOR: Record<Priority, string> = {
  critical:      '#EF4444',
  standard:      '#F59E0B',
  informational: '#94A3B8',
}
const PRIORITY_RANK: Record<Priority, number> = {
  critical:      0,
  standard:      1,
  informational: 2,
}
const TEAL = '#0D6E68'
const MAX  = 8

interface ActionItem {
  id:          string
  title:       string
  priority:    Priority
  serviceId:   string
  serviceName: string
  daysLeft:    number
}

export function TodaysActions({ services }: { services: ServiceWithTasks[] }) {
  const items: ActionItem[] = []

  for (const service of services) {
    if (service.status !== 'active' || !service.service_date) continue
    const daysToService = daysUntil(service.service_date)
    for (const task of service.tasks) {
      if (task.status !== 'not-started') continue
      // Due date in days from today = daysUntil(service) - due_days_before.
      const daysLeft = daysToService - task.due_days_before
      if (daysLeft > 1) continue // only today/tomorrow (and any past-due)
      items.push({
        id:          task.id,
        title:       task.title,
        priority:    task.priority,
        serviceId:   service.id,
        serviceName: service.deceased_name,
        daysLeft,
      })
    }
  }

  items.sort((a, b) =>
    a.daysLeft - b.daysLeft || PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]
  )

  const shown   = items.slice(0, MAX)
  const hasMore = items.length > MAX

  return (
    <section className="mt-8">
      <h2 className="text-base font-semibold mb-3" style={{ color: '#0F172A' }}>Today&apos;s Actions</h2>
      <div className="rounded-xl border p-5" style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }}>
        {shown.length === 0 ? (
          <p className="text-sm font-medium" style={{ color: '#0D6E68' }}>
            All caught up for the next 2 days ✓
          </p>
        ) : (
          <div className="space-y-3">
            {shown.map(item => {
              const dueToday   = item.daysLeft <= 0
              const dueLabel   = dueToday ? 'Due today' : 'Due tomorrow'
              const labelColor = dueToday ? '#F59E0B' : '#94A3B8'
              return (
                <div key={item.id} className="flex items-center gap-3">
                  <span
                    className="flex-shrink-0 rounded-full"
                    style={{ width: 8, height: 8, backgroundColor: PRIORITY_COLOR[item.priority] }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate" style={{ color: '#0F172A' }}>{item.title}</p>
                    <Link
                      href={`/services/${item.serviceId}`}
                      className="text-xs font-medium hover:underline"
                      style={{ color: TEAL }}
                    >
                      {item.serviceName}
                    </Link>
                  </div>
                  <span className="flex-shrink-0 text-xs font-medium" style={{ color: labelColor }}>
                    {dueLabel}
                  </span>
                </div>
              )
            })}
            {hasMore && (
              <div className="pt-1">
                <Link href="/tasks" className="text-sm font-medium hover:opacity-70" style={{ color: TEAL }}>
                  View all →
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
