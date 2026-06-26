import { redirect } from 'next/navigation'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getActiveProfile } from '@/lib/utils/impersonation'
import { AppShell } from '@/components/layout/AppShell'
import { TagsManager } from './TagsManager'
import type { Tag } from '@/lib/types'

export const revalidate = 0

export default async function TagsSettingsPage() {
  const ctx = await getActiveProfile()
  if (!ctx) redirect('/login')
  const { profile } = ctx
  if (!['owner', 'fd'].includes(profile.role)) redirect('/settings')

  const db = createServiceRoleClient()
  const { data } = await db
    .from('tags')
    .select('id, funeral_home_id, name, color, is_default, created_at')
    .or(`is_default.eq.true,funeral_home_id.eq.${profile.funeral_home_id}`)

  const all = (data ?? []) as Tag[]
  const defaults = all.filter(t => t.is_default).sort((a, b) => a.name.localeCompare(b.name))
  const custom   = all.filter(t => !t.is_default).sort((a, b) => a.name.localeCompare(b.name))

  return (
    <AppShell profile={profile}>
      <div className="px-4 py-4 md:px-8 md:py-8 max-w-4xl mx-auto">
        <TagsManager defaults={defaults} initialCustom={custom} />
      </div>
    </AppShell>
  )
}
