import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getActiveProfile, auditActorName } from '@/lib/utils/impersonation'
import { AppShell }              from '@/components/layout/AppShell'
import { ProgressBar }           from '@/components/ui/ProgressBar'
import { ApplyTemplateBanner }   from '@/components/services/ApplyTemplateBanner'
import { ServiceDetailTabs }     from '@/components/services/ServiceDetailTabs'
import { ServiceCompletionFlow } from '@/components/services/ServiceCompletionFlow'
import { EditServiceButton }     from '@/components/services/EditServiceButton'
import { ServiceActionsMenu }    from '@/components/services/ServiceActionsMenu'
import { computeServiceStatus }  from '@/lib/utils/service-status'
import { formatDate }            from '@/lib/utils/date-helpers'
import type { IntakeSession, TaskWithProfile, ServiceContact, ServiceNote, Tag } from '@/lib/types'

// Always render fresh — contact data changes via client mutations and we never
// want a cached/stale snapshot of the service detail page.
export const revalidate = 0

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
  const ctx = await getActiveProfile()
  if (!ctx) redirect('/login')
  const { profile } = ctx

  const db = createServiceRoleClient()

  const { data: service } = await db
    .from('services')
    .select('*')
    .eq('id', params.id)
    .eq('funeral_home_id', profile.funeral_home_id)
    .single()

  if (!service) notFound()

  // Fetch tasks WITHOUT embedding tags — task visibility must never depend on the
  // tag tables/embed resolving. Tags are loaded separately below and merged in.
  const { data: tasksRaw } = await db
    .from('tasks')
    .select(`
      *,
      completed_by:profiles!tasks_completed_by_id_fkey (id, full_name),
      assigned_to:profiles!tasks_assigned_to_id_fkey  (id, full_name)
    `)
    .eq('service_id', params.id)
    .order('sort_order', { ascending: true })

  // Tags per task (best-effort): a failure here leaves tasks tagless, not hidden.
  const taskIds = (tasksRaw ?? []).map(t => t.id)
  const tagsByTask = new Map<string, Tag[]>()
  if (taskIds.length > 0) {
    const { data: tagLinks } = await db
      .from('task_tags')
      .select('task_id, tag:tags ( id, funeral_home_id, name, color, created_at )')
      .in('task_id', taskIds)

    for (const link of tagLinks ?? []) {
      const tag = (Array.isArray(link.tag) ? link.tag[0] : link.tag) as Tag | null
      if (!tag) continue
      const arr = tagsByTask.get(link.task_id) ?? []
      arr.push(tag)
      tagsByTask.set(link.task_id, arr)
    }
  }

  const tasks: TaskWithProfile[] = (tasksRaw ?? []).map(t => ({
    ...t,
    completed_by: t.completed_by ?? null,
    assigned_to:  t.assigned_to  ?? null,
    tags:         tagsByTask.get(t.id) ?? [],
  }))

  const { data: intakeRaw } = await db
    .from('intake_sessions')
    .select('*')
    .eq('service_id', params.id)
    .order('created_at', { ascending: false })

  const intakeSessions: IntakeSession[] = (intakeRaw ?? []) as IntakeSession[]

  const { data: contactsRaw } = await db
    .from('service_contacts')
    .select('*')
    .eq('service_id', service.id)
    .order('is_primary', { ascending: false })
    .order('created_at', { ascending: true })

  const contacts: ServiceContact[] = (contactsRaw ?? []) as ServiceContact[]

  const { data: notesRaw } = await db
    .from('service_notes')
    .select('*')
    .eq('service_id', params.id)
    .order('created_at', { ascending: true })

  const serviceNotes: ServiceNote[] = (notesRaw ?? []) as ServiceNote[]

  const status      = computeServiceStatus(tasks, service.service_date ?? '')
  const completed   = tasks.filter(t => t.status === 'complete').length
  const total       = tasks.length
  const progressPct = total > 0 ? (completed / total) * 100 : 0
  const canRecord   = profile.role === 'owner' || profile.role === 'fd'
  const canManage   = profile.role === 'owner' || profile.role === 'fd'

  const actorId   = profile.id
  // During impersonation the activity log shows "[Admin: X] on behalf of <home>".
  const actorName = auditActorName(ctx)

  return (
    <AppShell profile={profile}>
      <div className="px-4 py-4 md:px-8 md:py-8 max-w-4xl mx-auto">

        {/* Back pill — in-flow on mobile (scrolls with page), fixed on desktop */}
        <Link
          href="/services"
          className="inline-flex items-center gap-1.5 rounded-full border bg-white px-3 py-1.5 text-xs font-medium shadow-sm transition hover:shadow mb-3 md:mb-0 md:fixed md:top-4 md:left-[236px] md:z-40"
          style={{ color: '#4A7C8C', borderColor: '#E2E8F0' }}
        >
          ← Services
        </Link>

        {/* Service header */}
        <div
          className="relative rounded-xl border p-6 mb-6"
          style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }}
        >
          {/* Mobile-only three-dot actions menu (top-right) */}
          {canManage && (
            <div className="absolute top-4 right-4 md:hidden">
              <ServiceActionsMenu service={{
                id:                service.id,
                family_name:       service.family_name,
                deceased_name:     service.deceased_name,
                service_type:      service.service_type,
                service_date:      service.service_date,
                location:          service.location,
                assigned_staff_id: service.assigned_staff_id,
              }} />
            </div>
          )}

          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
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
                {service.deceased_name}
              </h1>
              {(service.service_date || service.location) && (
                <div className="mt-3 flex flex-wrap gap-4 text-sm" style={{ color: '#475569' }}>
                  {service.service_date && <span>{formatDate(service.service_date)}</span>}
                  {service.service_date && service.location && <span>·</span>}
                  {service.location && <span>{service.location}</span>}
                </div>
              )}
            </div>

            <div className="w-full md:w-auto md:flex-shrink-0 flex flex-col items-start md:items-end gap-3">
              {/* Pill actions — desktop only; mobile uses the three-dot menu */}
              <div className="hidden md:flex flex-wrap items-center gap-2 md:justify-end">
                {canManage && (
                  <a
                    href={`/services/${params.id}/print`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg border px-3 py-1.5 text-xs font-semibold transition hover:opacity-80"
                    style={{ borderColor: '#4A7C8C', color: '#4A7C8C', backgroundColor: 'transparent' }}
                  >
                    Print Checklist
                  </a>
                )}
                {canManage && (
                  <EditServiceButton service={{
                    id:                service.id,
                    family_name:       service.family_name,
                    deceased_name:     service.deceased_name,
                    service_type:      service.service_type,
                    service_date:      service.service_date,
                    location:          service.location,
                    assigned_staff_id: service.assigned_staff_id,
                  }} />
                )}
              </div>
              <p className="text-sm text-gray-400">
                {completed}/{total} tasks confirmed
              </p>
              {canManage && (
                <ServiceCompletionFlow
                  serviceId={params.id}
                  funeralHomeId={profile.funeral_home_id}
                  actorId={actorId}
                  actorName={actorName}
                  serviceStatus={service.status as 'active' | 'completed'}
                  canManage={canManage}
                />
              )}
            </div>
          </div>

          <div className="mt-5">
            <ProgressBar value={progressPct} status={status} />
          </div>
        </div>

        {/* Tabbed content */}
        <ServiceDetailTabs
          tasks={tasks}
          serviceDate={service.service_date ?? ''}
          serviceId={params.id}
          serviceType={service.service_type}
          funeralHomeId={profile.funeral_home_id}
          actorId={actorId}
          actorName={actorName}
          intakeSessions={intakeSessions}
          contacts={contacts}
          notes={serviceNotes}
          canRecord={canRecord}
          canManage={canManage}
          applyBanner={
            !service.service_type && canManage
              ? <ApplyTemplateBanner
                  serviceId={params.id}
                  funeralHomeId={profile.funeral_home_id}
                  actorId={actorId}
                  actorName={actorName}
                />
              : null
          }
        />
      </div>
    </AppShell>
  )
}
