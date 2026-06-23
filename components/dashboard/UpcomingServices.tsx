import Link from 'next/link'
import { daysUntil } from '@/lib/utils/date-helpers'
import type { ServiceWithTasks } from '@/lib/types'

const TEAL = '#4A7C8C'
const MAX  = 7

function shortDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function awayBadge(days: number): { text: string; color: string; bg: string } {
  const text =
    days < 0  ? 'Overdue'  :
    days === 0 ? 'Today'    :
    days === 1 ? 'Tomorrow' :
    `${days} days away`
  // red ≤3 days, amber 4-7, gray >7
  if (days <= 3) return { text, color: '#EF4444', bg: '#FEF2F2' }
  if (days <= 7) return { text, color: '#F59E0B', bg: '#FFFBEB' }
  return { text, color: '#94A3B8', bg: '#F1F5F9' }
}

export function UpcomingServices({ services }: { services: ServiceWithTasks[] }) {
  const active   = services.filter(s => s.status === 'active')
  const withDate = active
    .filter(s => s.service_date)
    .sort((a, b) => (a.service_date ?? '').localeCompare(b.service_date ?? ''))
  const noDateCount = active.filter(s => !s.service_date).length

  const shown     = withDate.slice(0, MAX)
  const moreCount = withDate.length - shown.length

  return (
    <section className="mt-8">
      <h2 className="text-base font-semibold mb-3" style={{ color: '#0F172A' }}>Upcoming Services</h2>
      <div className="rounded-xl border p-5" style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }}>
        {shown.length === 0 ? (
          <p className="text-sm" style={{ color: '#94A3B8' }}>No upcoming services with a date set.</p>
        ) : (
          <div className="space-y-1">
            {shown.map(service => {
              const days  = daysUntil(service.service_date as string)
              const badge = awayBadge(days)
              const done  = service.tasks.filter(t => t.status === 'complete').length
              const total = service.tasks.length
              return (
                <Link
                  key={service.id}
                  href={`/services/${service.id}`}
                  className="flex items-center gap-3 rounded-lg px-2 -mx-2 py-2 transition-colors hover:bg-gray-50 cursor-pointer"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold truncate" style={{ color: '#0F172A' }}>{service.deceased_name}</p>
                    <p className="text-xs truncate" style={{ color: '#94A3B8' }}>{service.family_name}</p>
                  </div>
                  <div className="flex-shrink-0 flex items-center gap-2">
                    <span className="text-sm" style={{ color: '#475569' }}>{shortDate(service.service_date as string)}</span>
                    <span
                      className="rounded-full px-2 py-0.5 text-xs font-semibold"
                      style={{ backgroundColor: badge.bg, color: badge.color }}
                    >
                      {badge.text}
                    </span>
                  </div>
                  <div className="flex-shrink-0 w-20 text-right text-xs" style={{ color: '#94A3B8' }}>
                    {done}/{total} confirmed
                  </div>
                </Link>
              )
            })}
          </div>
        )}

        {(moreCount > 0 || noDateCount > 0) && (
          <div className="mt-3 pt-3 border-t flex items-center justify-between" style={{ borderColor: '#F1F5F9' }}>
            {noDateCount > 0 ? (
              <span className="text-xs" style={{ color: '#94A3B8' }}>No date set: {noDateCount}</span>
            ) : <span />}
            {moreCount > 0 && (
              <Link href="/services" className="text-sm font-medium hover:opacity-70" style={{ color: TEAL }}>
                + {moreCount} more →
              </Link>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
