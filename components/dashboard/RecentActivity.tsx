import Link from 'next/link'
import type { ActivityLog } from '@/lib/types'

const TEAL = '#4A7C8C'

const ACTION_LABELS: Record<string, string> = {
  task_completed:    'Task confirmed',
  task_assigned:     'Task assigned',
  task_added:        'Task added',
  task_deleted:      'Task deleted',
  task_edited:       'Task edited',
  notes_updated:     'Notes updated',
  contact_updated:   'Contact updated',
  service_completed: 'Service completed',
  service_reopened:  'Service reopened',
}

function timeAgo(dateStr: string): string {
  const diffSec = Math.round((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diffSec < 60) return 'just now'
  const diffMin = Math.round(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.round(diffMin / 60)
  if (diffHr < 24) return diffHr === 1 ? '1 hour ago' : `${diffHr} hours ago`
  const diffDay = Math.round(diffHr / 24)
  if (diffDay === 1) return 'yesterday'
  if (diffDay < 30) return `${diffDay} days ago`
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function getDotColor(actionType: string): string {
  switch (actionType) {
    case 'task_completed':
    case 'service_completed':
      return '#10B981'
    case 'task_assigned':
      return '#3B82F6'
    case 'task_added':
      return '#4A7C8C'
    case 'task_deleted':
      return '#EF4444'
    case 'service_reopened':
      return '#F59E0B'
    default:
      return '#94A3B8'
  }
}

export function RecentActivity({
  entries, serviceNameById,
}: {
  entries: ActivityLog[]
  serviceNameById: Record<string, string>
}) {
  return (
    <section className="mt-8">
      <h2 className="text-base font-semibold mb-3" style={{ color: '#0F172A' }}>Recent Activity</h2>
      <div className="rounded-xl border p-5" style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }}>
        {entries.length === 0 ? (
          <p className="text-sm" style={{ color: '#94A3B8' }}>No recent activity.</p>
        ) : (
          <div className="space-y-5">
            {entries.map(entry => {
              const serviceName = entry.service_id ? serviceNameById[entry.service_id] : undefined
              return (
                <div key={entry.id} className="flex gap-3 items-start">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1.5"
                    style={{ backgroundColor: getDotColor(entry.action_type) }}
                  />
                  <div className="min-w-0 flex-1 pt-0.5">
                    <p className="text-sm" style={{ color: '#0F172A' }}>
                      <span className="font-medium">{entry.actor_name}</span>
                      {' — '}
                      {entry.description}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>
                      {serviceName && entry.service_id && (
                        <>
                          <Link href={`/services/${entry.service_id}`} className="font-medium hover:underline" style={{ color: TEAL }}>
                            {serviceName}
                          </Link>
                          {' · '}
                        </>
                      )}
                      {ACTION_LABELS[entry.action_type] ?? entry.action_type} · {timeAgo(entry.created_at)}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
