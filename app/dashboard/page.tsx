import { redirect } from 'next/navigation'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/layout/AppShell'
import { StatsRow } from '@/components/services/StatsRow'
import { DashboardClient } from '@/components/services/DashboardClient'
import { computeServiceStatus, isTaskOverdue } from '@/lib/utils/service-status'
import type { ServiceWithTasks } from '@/lib/types'

export default async function DashboardPage() {
  const supabase = createClient()

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const userId = session.user.id
  const db = createServiceRoleClient()

  const { data: profile } = await db
    .from('profiles')
    .select('id, full_name, role, funeral_home_id')
    .eq('id', userId)
    .single()

  if (!profile) redirect('/login')
  if (profile.role === 'staff') redirect('/my-tasks')

  // Fetch all statuses so the client can filter/switch without a page reload
  const { data: servicesRaw } = await db
    .from('services')
    .select('*, tasks (*)')
    .eq('funeral_home_id', profile.funeral_home_id)
    .order('service_date', { ascending: true, nullsFirst: false })

  const services: ServiceWithTasks[] = (servicesRaw ?? []).map(s => ({
    ...s,
    tasks: s.tasks ?? [],
  }))

  const activeServices      = services.filter(s => s.status === 'active')
  const activeCount         = activeServices.length
  const needsAttentionCount = activeServices.filter(
    s => computeServiceStatus(s.tasks, s.service_date ?? '') === 'red'
  ).length
  const overdueTaskCount    = activeServices.reduce(
    (sum, s) => sum + s.tasks.filter(t => isTaskOverdue(t, s.service_date ?? '')).length,
    0
  )

  return (
    <AppShell profile={profile} redAlert={needsAttentionCount > 0}>
      <div className="px-4 py-4 md:px-8 md:py-8 max-w-7xl mx-auto">
        <div className="mb-8">
          <StatsRow
            activeCount={activeCount}
            needsAttentionCount={needsAttentionCount}
            overdueTaskCount={overdueTaskCount}
          />
        </div>

        <DashboardClient services={services} />
      </div>
    </AppShell>
  )
}
