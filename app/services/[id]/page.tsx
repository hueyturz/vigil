import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/layout/AppShell'
import { Badge } from '@/components/ui/Badge'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { TaskList } from '@/components/tasks/TaskList'
import { computeServiceStatus } from '@/lib/utils/service-status'
import { formatDate } from '@/lib/utils/date-helpers'
import type { TaskWithProfile } from '@/lib/types'

const SERVICE_TYPE_LABEL: Record<string, string> = {
  'full-burial': 'Full Burial',
  'graveside':   'Graveside',
  'cremation':   'Cremation',
  'military':    'Military Honors',
}

export default async function ServiceDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const db = createServiceRoleClient()

  const { data: profile } = await db
    .from('profiles')
    .select('id, full_name, role, funeral_home_id')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  // Fetch service
  const { data: service } = await db
    .from('services')
    .select('*')
    .eq('id', params.id)
    .eq('funeral_home_id', profile.funeral_home_id)
    .single()

  if (!service) notFound()

  // Fetch tasks with completed_by and assigned_to profile joins
  const { data: tasksRaw } = await db
    .from('tasks')
    .select(`
      *,
      completed_by:profiles!tasks_completed_by_id_fkey (id, full_name),
      assigned_to:profiles!tasks_assigned_to_id_fkey  (id, full_name)
    `)
    .eq('service_id', params.id)
    .order('sort_order', { ascending: true })

  const tasks: TaskWithProfile[] = (tasksRaw ?? []).map(t => ({
    ...t,
    completed_by: t.completed_by ?? null,
    assigned_to:  t.assigned_to  ?? null,
  }))

  const status      = computeServiceStatus(tasks, service.service_date)
  const completed   = tasks.filter(t => t.status === 'complete').length
  const total       = tasks.length
  const progressPct = total > 0 ? (completed / total) * 100 : 0

  return (
    <AppShell profile={profile}>
      <div className="px-8 py-8 max-w-4xl mx-auto">

        {/* Back link */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm mb-6 hover:underline"
          style={{ color: '#475569' }}
        >
          ← Back to Dashboard
        </Link>

        {/* Service header */}
        <div
          className="rounded-xl border p-6 mb-6"
          style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p
                className="text-xs font-semibold uppercase tracking-wide mb-1"
                style={{ color: '#94A3B8' }}
              >
                {SERVICE_TYPE_LABEL[service.service_type] ?? service.service_type}
              </p>
              <h1
                className="font-serif text-3xl font-bold leading-tight"
                style={{ color: '#0F172A' }}
              >
                {/family/i.test(service.family_name) ? service.family_name : `${service.family_name} Family`}
              </h1>
              <p className="mt-1 text-base" style={{ color: '#475569' }}>
                {service.deceased_name}
              </p>
              <div className="mt-3 flex flex-wrap gap-4 text-sm" style={{ color: '#475569' }}>
                <span>{formatDate(service.service_date)}</span>
                <span>·</span>
                <span>{service.location}</span>
              </div>
            </div>

            <div className="flex-shrink-0 flex flex-col items-end gap-2">
              <Badge status={status} />
              <p className="text-xs" style={{ color: '#475569' }}>
                {completed}/{total} tasks confirmed
              </p>
            </div>
          </div>

          {/* Full-width progress bar */}
          <div className="mt-5">
            <ProgressBar value={progressPct} status={status} />
          </div>
        </div>

        {/* Task list */}
        {tasks.length > 0 ? (
          <TaskList tasks={tasks} serviceDate={service.service_date} />
        ) : (
          <p className="text-sm text-center py-12" style={{ color: '#94A3B8' }}>
            No tasks found for this service.
          </p>
        )}
      </div>
    </AppShell>
  )
}
