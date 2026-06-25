import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getActiveProfile } from '@/lib/utils/impersonation'
import { AppShell } from '@/components/layout/AppShell'
import { StatsRow } from '@/components/services/StatsRow'
import { ServiceProgressChart } from '@/components/dashboard/ServiceProgressChart'
import { TodaysActions } from '@/components/dashboard/TodaysActions'
import { UpcomingServices } from '@/components/dashboard/UpcomingServices'
import { RecentActivity } from '@/components/dashboard/RecentActivity'
import { NewServiceButton } from '@/components/dashboard/NewServiceButton'
import { DashboardGreeting } from '@/components/dashboard/DashboardGreeting'
import { computeServiceStatus, isTaskOverdue } from '@/lib/utils/service-status'
import type { ServiceWithTasks, ActivityLog } from '@/lib/types'

export default async function DashboardPage() {
  const ctx = await getActiveProfile()
  if (!ctx) redirect('/login')
  const { profile } = ctx

  const db = createServiceRoleClient()

  if (profile.role === 'staff') redirect('/my-tasks')

  const { data: servicesRaw } = await db
    .from('services')
    .select('*, tasks (*)')
    .eq('funeral_home_id', profile.funeral_home_id)

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

  const { data: activityRaw } = await db
    .from('activity_log')
    .select('*')
    .eq('funeral_home_id', profile.funeral_home_id)
    .order('created_at', { ascending: false })
    .limit(10)

  const activity: ActivityLog[] = (activityRaw ?? []) as ActivityLog[]
  const serviceNameById: Record<string, string> = {}
  for (const s of services) serviceNameById[s.id] = s.deceased_name

  const firstName = profile.full_name?.split(' ')[0] ?? ''

  return (
    <AppShell profile={profile} redAlert={needsAttentionCount > 0}>
      <div className="px-4 py-4 md:px-8 md:py-8 max-w-7xl mx-auto">
        <div className="mb-8 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold mb-1" style={{ color: '#0F172A' }}>Dashboard</h1>
            <DashboardGreeting firstName={firstName} />
          </div>
          <NewServiceButton />
        </div>

        <StatsRow
          activeCount={activeCount}
          needsAttentionCount={needsAttentionCount}
          overdueTaskCount={overdueTaskCount}
        />

        <TodaysActions services={services} />

        <UpcomingServices services={services} />

        <div className="mt-8 mb-3">
          <h2 className="text-base font-semibold" style={{ color: '#0F172A' }}>Service Progress</h2>
        </div>
        <ServiceProgressChart services={services} />

        <div className="mt-6">
          <Link
            href="/services"
            className="inline-flex items-center gap-1.5 text-sm font-medium transition hover:opacity-70"
            style={{ color: '#4A7C8C' }}
          >
            View all services →
          </Link>
        </div>

        <RecentActivity entries={activity} serviceNameById={serviceNameById} />
      </div>
    </AppShell>
  )
}
