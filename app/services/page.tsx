import { redirect } from 'next/navigation'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getActiveProfile } from '@/lib/utils/impersonation'
import { AppShell } from '@/components/layout/AppShell'
import { ServicesClient } from '@/components/services/ServicesClient'
import type { ServiceWithTasks } from '@/lib/types'

export default async function ServicesPage() {
  const ctx = await getActiveProfile()
  if (!ctx) redirect('/login')
  const { profile } = ctx

  const db = createServiceRoleClient()

  if (profile.role === 'staff') redirect('/my-tasks')

  const { data: servicesRaw, error: servicesErr } = await db
    .from('services')
    .select('*, tasks (*)')
    .eq('funeral_home_id', profile.funeral_home_id)
    .neq('status', 'archived')
    .order('service_date', { ascending: true, nullsFirst: false })
  // Throw (audit H4) so error.tsx renders — never an empty-but-200 list.
  if (servicesErr) throw new Error(`Failed to load services: ${servicesErr.message}`)

  const services: ServiceWithTasks[] = (servicesRaw ?? []).map(s => ({
    ...s,
    tasks: s.tasks ?? [],
  }))

  return (
    <AppShell profile={profile}>
      <div className="px-4 py-4 md:px-8 md:py-8 max-w-7xl mx-auto">
        <ServicesClient services={services} />
      </div>
    </AppShell>
  )
}
