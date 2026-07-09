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
import { GetStartedBanner } from '@/components/dashboard/GetStartedBanner'
import { DashboardGreeting } from '@/components/dashboard/DashboardGreeting'
import { WelcomeModal } from '@/components/onboarding/WelcomeModal'
import { computeServiceStatus, isTaskOverdue } from '@/lib/utils/service-status'
import type { ServiceWithTasks, ActivityLog } from '@/lib/types'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { welcome?: string }
}) {
  const ctx = await getActiveProfile()
  if (!ctx) redirect('/login')
  const { profile } = ctx

  const db = createServiceRoleClient()

  if (profile.role === 'staff') redirect('/my-tasks')

  // First-run welcome slideshow (shown once). Default to "seen" if the column
  // read fails (e.g. migration 040 not yet applied) so it never nags or crashes.
  // ?welcome=1 (sidebar "Getting started") force-opens it without re-marking.
  const { data: welcomeRow } = await db
    .from('profiles')
    .select('has_seen_welcome')
    .eq('id', profile.id)
    .maybeSingle()
  const hasSeenWelcome = welcomeRow?.has_seen_welcome ?? true
  const forceWelcome   = searchParams.welcome === '1'
  const showWelcome    = forceWelcome || !hasSeenWelcome

  const { data: servicesRaw, error: servicesErr } = await db
    .from('services')
    .select('*, tasks (*)')
    .eq('funeral_home_id', profile.funeral_home_id)
  // Throw (audit H4) so error.tsx renders — never an empty-but-200 dashboard.
  if (servicesErr) throw new Error(`Failed to load services: ${servicesErr.message}`)

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

  const { data: activityRaw, error: activityErr } = await db
    .from('activity_log')
    .select('*')
    // Billing events are internal — never surface them in the customer feed.
    // They remain visible to superadmins on the admin funeral-home detail page.
    .neq('action_type', 'billing_event')
    .eq('funeral_home_id', profile.funeral_home_id)
    .order('created_at', { ascending: false })
    .limit(10)
  if (activityErr) throw new Error(`Failed to load activity: ${activityErr.message}`)

  const activity: ActivityLog[] = (activityRaw ?? []) as ActivityLog[]
  const serviceNameById: Record<string, string> = {}
  for (const s of services) serviceNameById[s.id] = s.deceased_name

  const firstName = profile.full_name?.split(' ')[0] ?? ''

  return (
    <AppShell profile={profile} redAlert={needsAttentionCount > 0}>
      <WelcomeModal initialOpen={showWelcome} firstTime={!hasSeenWelcome} />
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

        {activeCount === 0 && <GetStartedBanner />}

        <TodaysActions services={services} />

        <UpcomingServices services={services} />

        {activeServices.some(s => s.tasks.length > 0) && (
          <>
            <div className="mt-8 mb-3">
              <h2 className="text-base font-semibold" style={{ color: '#0F172A' }}>Service Progress</h2>
            </div>
            <ServiceProgressChart services={services} />
          </>
        )}

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
