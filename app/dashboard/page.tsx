import { redirect } from 'next/navigation'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/layout/AppShell'
import { StatsRow } from '@/components/services/StatsRow'
import { ServiceGrid } from '@/components/services/ServiceGrid'
import { DashboardHeader } from '@/components/services/DashboardHeader'
import { computeServiceStatus, isTaskOverdue } from '@/lib/utils/service-status'
import type { ServiceWithTasks } from '@/lib/types'

export default async function DashboardPage() {
  const supabase = createClient()

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const userId = session.user.id

  // Use service role for data fetches to avoid RLS session-context issues on the server
  const db = createServiceRoleClient()

  const { data: profile } = await db
    .from('profiles')
    .select('id, full_name, role, funeral_home_id')
    .eq('id', userId)
    .single()

  if (!profile) redirect('/login')
  if (profile.role === 'staff') redirect('/my-tasks')

  const { data: servicesRaw } = await db
    .from('services')
    .select('*, tasks (*)')
    .eq('funeral_home_id', profile.funeral_home_id)
    .eq('status', 'active')
    .order('service_date', { ascending: true })

  const services: ServiceWithTasks[] = (servicesRaw ?? []).map(s => ({
    ...s,
    tasks: s.tasks ?? [],
  }))

  const activeCount         = services.length
  const needsAttentionCount = services.filter(
    s => computeServiceStatus(s.tasks, s.service_date ?? '') === 'red'
  ).length
  const overdueTaskCount    = services.reduce(
    (sum, s) => sum + s.tasks.filter(t => isTaskOverdue(t, s.service_date ?? '')).length,
    0
  )

  return (
    <AppShell profile={profile} redAlert={needsAttentionCount > 0}>
      <div className="px-4 py-4 md:px-8 md:py-8 max-w-7xl mx-auto">
        <DashboardHeader />

        <div className="mb-8">
          <StatsRow
            activeCount={activeCount}
            needsAttentionCount={needsAttentionCount}
            overdueTaskCount={overdueTaskCount}
          />
        </div>

        <ServiceGrid services={services} />
      </div>
    </AppShell>
  )
}
