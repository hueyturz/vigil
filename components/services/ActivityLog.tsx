'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ActivityLog as ActivityLogType } from '@/lib/types'

interface ActivityLogProps {
  serviceId: string
}

const ACTION_LABELS: Record<string, string> = {
  task_completed:   'Task confirmed',
  task_assigned:    'Task assigned',
  task_added:       'Task added',
  task_deleted:     'Task deleted',
  task_edited:      'Task edited',
  notes_updated:    'Notes updated',
  contact_updated:  'Contact updated',
  service_completed:'Service completed',
  service_reopened: 'Service reopened',
}

function timeAgo(dateStr: string): string {
  const diffSec = Math.round((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diffSec < 60)  return 'just now'
  const diffMin = Math.round(diffSec / 60)
  if (diffMin < 60)  return `${diffMin}m ago`
  const diffHr = Math.round(diffMin / 60)
  if (diffHr  < 24)  return `${diffHr}h ago`
  const diffDay = Math.round(diffHr / 24)
  if (diffDay < 30)  return `${diffDay}d ago`
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function ActionIcon({ action }: { action: string }) {
  const color = action === 'service_completed' ? '#4A7C8C'
    : action === 'service_reopened'  ? '#475569'
    : action === 'task_completed'    ? '#4A7C8C'
    : action === 'task_deleted'      ? '#EF4444'
    : '#64748B'

  return (
    <div
      className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center"
      style={{ backgroundColor: `${color}18` }}
    >
      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
    </div>
  )
}

export function ActivityLog({ serviceId }: ActivityLogProps) {
  const [mounted,  setMounted]  = useState(false)
  const [entries,  setEntries]  = useState<ActivityLogType[]>([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('activity_log')
      .select('*')
      .eq('service_id', serviceId)
      // Billing events are internal (and service_id is null on them anyway) —
      // never surface them in this customer-facing feed.
      .neq('action_type', 'billing_event')
      .order('created_at', { ascending: false })
      .limit(100)
      .then(({ data }) => {
        setEntries((data ?? []) as ActivityLogType[])
        setLoading(false)
      })
  }, [serviceId])

  if (!mounted) return null

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="vigil-spin w-6 h-6 rounded-full border-2" style={{ borderColor: '#E2E8F0', borderTopColor: '#4A7C8C' }} />
      </div>
    )
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-sm font-medium" style={{ color: '#0F172A' }}>No activity yet</p>
        <p className="mt-1 text-sm" style={{ color: '#94A3B8' }}>Actions taken on this service will appear here.</p>
      </div>
    )
  }

  return (
    <div className="relative pl-4">
      {/* Vertical line */}
      <div
        className="absolute left-[17px] top-4 bottom-4 w-px"
        style={{ backgroundColor: '#E2E8F0' }}
      />

      <div className="space-y-5">
        {entries.map(entry => (
          <div key={entry.id} className="flex gap-3 items-start">
            <ActionIcon action={entry.action_type} />
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-sm" style={{ color: '#0F172A' }}>
                <span className="font-medium">{entry.actor_name}</span>
                {' — '}
                {entry.description}
              </p>
              <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>
                {ACTION_LABELS[entry.action_type] ?? entry.action_type} · {timeAgo(entry.created_at)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
