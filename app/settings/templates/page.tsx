import { redirect } from 'next/navigation'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/layout/AppShell'
import { TemplatesPanel } from './TemplatesPanel'
import type { TaskTemplate } from '@/lib/types'

export default async function TemplatesPage() {
  const supabase    = createClient()
  const serviceRole = createServiceRoleClient()

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const { data: profile } = await serviceRole
    .from('profiles')
    .select('id, full_name, role, funeral_home_id')
    .eq('id', session.user.id)
    .single()

  if (!profile) redirect('/login')
  if (!['owner', 'fd'].includes(profile.role)) redirect('/dashboard')

  // Fetch this funeral home's custom templates
  const { data: customRaw } = await serviceRole
    .from('task_templates')
    .select('*')
    .eq('funeral_home_id', profile.funeral_home_id)
    .order('sort_order', { ascending: true })

  // Fetch system defaults (funeral_home_id IS NULL)
  const { data: systemRaw } = await serviceRole
    .from('task_templates')
    .select('*')
    .is('funeral_home_id', null)
    .order('sort_order', { ascending: true })

  const customTemplates: TaskTemplate[] = customRaw ?? []
  const systemTemplates: TaskTemplate[] = systemRaw ?? []

  return (
    <AppShell profile={profile}>
      <div className="px-4 py-4 md:px-8 md:py-8 max-w-4xl mx-auto">
        <TemplatesPanel
          customTemplates={customTemplates}
          systemTemplates={systemTemplates}
        />
      </div>
    </AppShell>
  )
}
