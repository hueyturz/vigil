import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { AppShell }              from '@/components/layout/AppShell'
import { Badge }                 from '@/components/ui/Badge'
import { ProgressBar }           from '@/components/ui/ProgressBar'
import { ApplyTemplateBanner }   from '@/components/services/ApplyTemplateBanner'
import { ServiceDetailTabs }     from '@/components/services/ServiceDetailTabs'
import { ServiceCompletionFlow } from '@/components/services/ServiceCompletionFlow'
import { EditServiceButton }     from '@/components/services/EditServiceButton'
import { computeServiceStatus }  from '@/lib/utils/service-status'
import { formatDate }            from '@/lib/utils/date-helpers'
import type { IntakeSession, TaskWithProfile, ServiceContact } from '@/lib/types'

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

  const { data: contactsRaw } = await db
    .from('service_contacts')
    .select('*')
    .eq('service_id', service.id)
    .order('is_primary', { ascending: false })
    .order('created_at', { ascending: true })

  const contacts: ServiceContact[] = (contactsRaw ?? []) as ServiceContact[]

  const status      = computeServiceStatus(tasks, service.service_date ?? '')
  const completed   = tasks.filter(t => t.status === 'complete').length
  const total       = tasks.length
  const progressPct = total > 0 ? (completed / total) * 100 : 0
  const canRecord   = profile.role === 'owner' || profile.role === 'fd'
  const canManage   = profile.role === 'owner' || profile.role === 'fd'

  const actorId   = profile.id
  const actorName = profile.full_name

  return (
    <AppShell profile={profile}>
      <div className="px-4 py-4 md:px-8 md:py-8 max-w-4xl mx-auto">

        {/* Back pill — in-flow on mobile (scrolls with page), fixed on desktop */}
        <Link
          href="/services"
          className="inline-flex items-center gap-1.5 rounded-full border bg-white px-3 py-1.5 text-xs font-medium shadow-sm transition hover:shadow mb-3 md:mb-0 md:fixed md:top-4 md:left-[236px] md:z-40"
          style={{ color: '#0D6E68', borderColor: '#E2E8F0' }}
        >
          ← Services
        </Link>

        {/* Service header */}
        <div
          className="rounded-xl border p-6 mb-6"
          style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }}
        >
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
              <div className="flex flex-wrap items-center gap-2 md:justify-end">
                <Badge status={status} />
                {canManage && (
                  <a
                    href={`/services/${params.id}/print`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg border px-3 py-1.5 text-xs font-semibold transition hover:opacity-80"
                    style={{ borderColor: '#0D6E68', color: '#0D6E68', backgroundColor: 'transparent' }}
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
              <p className="text-xs" style={{ color: '#475569' }}>
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
          notes={service.notes ?? null}
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
