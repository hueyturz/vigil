import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/layout/AppShell'
import { Badge } from '@/components/ui/Badge'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { TaskList } from '@/components/tasks/TaskList'
import { MeetingRecorder } from '@/components/intake/MeetingRecorder'
import { PastMeetings } from '@/components/intake/PastMeetings'
import { ApplyTemplateBanner } from '@/components/services/ApplyTemplateBanner'
import { computeServiceStatus } from '@/lib/utils/service-status'
import { formatDate } from '@/lib/utils/date-helpers'
import type { IntakeSession, TaskWithProfile } from '@/lib/types'

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

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const db = createServiceRoleClient()

  const { data: profile } = await db
    .from('profiles')
    .select('id, full_name, role, funeral_home_id')
    .eq('id', session.user.id)
    .single()

  if (!profile) redirect('/login')

  const { data: service } = await db
    .from('services')
    .select('*')
    .eq('id', params.id)
    .eq('funeral_home_id', profile.funeral_home_id)
    .single()

  if (!service) notFound()

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

  const { data: intakeRaw } = await db
    .from('intake_sessions')
    .select('*')
    .eq('service_id', params.id)
    .order('created_at', { ascending: false })

  const intakeSessions: IntakeSession[] = (intakeRaw ?? []) as IntakeSession[]

  const status      = computeServiceStatus(tasks, service.service_date ?? '')
  const completed   = tasks.filter(t => t.status === 'complete').length
  const total       = tasks.length
  const progressPct = total > 0 ? (completed / total) * 100 : 0
  const canRecord   = profile.role === 'owner' || profile.role === 'fd'
  const canManage   = profile.role === 'owner' || profile.role === 'fd'

  return (
    <AppShell profile={profile}>
      <div className="px-4 py-4 md:px-8 md:py-8 max-w-4xl mx-auto">

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
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="min-w-0">
              {service.service_type && (
                <p
                  className="text-xs font-semibold uppercase tracking-wide mb-1"
                  style={{ color: '#94A3B8' }}
                >
                  {SERVICE_TYPE_LABEL[service.service_type] ?? service.service_type}
                </p>
              )}
              <h1
                className="font-serif text-3xl font-bold leading-tight"
                style={{ color: '#0F172A' }}
              >
                {/family/i.test(service.family_name) ? service.family_name : `${service.family_name} Family`}
              </h1>
              <p className="mt-1 text-base" style={{ color: '#475569' }}>
                {service.deceased_name}
              </p>
              {(service.service_date || service.location) && (
                <div className="mt-3 flex flex-wrap gap-4 text-sm" style={{ color: '#475569' }}>
                  {service.service_date && <span>{formatDate(service.service_date)}</span>}
                  {service.service_date && service.location && <span>·</span>}
                  {service.location && <span>{service.location}</span>}
                </div>
              )}
            </div>

            <div className="flex-shrink-0 flex flex-row sm:flex-col sm:items-end items-center gap-2">
              <Badge status={status} />
              <p className="text-xs" style={{ color: '#475569' }}>
                {completed}/{total} tasks confirmed
              </p>
              {canRecord && (
                <div className="mt-1">
                  <MeetingRecorder serviceId={params.id} />
                </div>
              )}
            </div>
          </div>

          <div className="mt-5">
            <ProgressBar value={progressPct} status={status} />
          </div>
        </div>

        {/* Apply template banner — shown when no service_type set */}
        {!service.service_type && canManage && (
          <ApplyTemplateBanner serviceId={params.id} />
        )}

        {/* Task list */}
        {tasks.length > 0 ? (
          <TaskList tasks={tasks} serviceDate={service.service_date ?? ''} serviceId={params.id} />
        ) : service.service_type ? (
          <p className="text-sm text-center py-12" style={{ color: '#94A3B8' }}>
            No tasks found for this service.
          </p>
        ) : null}

        {/* Past Meetings */}
        {intakeSessions.length > 0 && (
          <div className="mt-10">
            <PastMeetings sessions={intakeSessions} />
          </div>
        )}
      </div>
    </AppShell>
  )
}
