import { redirect } from 'next/navigation'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/layout/AppShell'
import { UsersPanel } from './UsersPanel'
import type { Role } from '@/lib/types'

export default async function UsersPage() {
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
  if (profile.role !== 'owner') redirect('/dashboard')

  // Fetch all profiles for this funeral home
  const { data: profiles, error: profilesErr } = await serviceRole
    .from('profiles')
    .select('id, full_name, role, phone, is_active')
    .eq('funeral_home_id', profile.funeral_home_id)
    .order('created_at', { ascending: true })
  // Throw (audit H4) so the settings error.tsx renders — never an empty user list.
  if (profilesErr) throw new Error(`Failed to load users: ${profilesErr.message}`)

  // Fetch auth emails for each profile via admin API
  // listUsers returns all users; we filter to our set by id
  const { data: { users: authUsers } } = await serviceRole.auth.admin.listUsers({
    perPage: 1000,
  })

  const emailByUserId: Record<string, string> = {}
  for (const au of authUsers) {
    emailByUserId[au.id] = au.email ?? ''
  }

  const rows = (profiles ?? []).map(p => ({
    id:        p.id,
    full_name: p.full_name,
    role:      p.role as Role,
    phone:     p.phone as string | null,
    is_active: p.is_active as boolean,
    email:     emailByUserId[p.id] ?? null,
  }))

  return (
    <AppShell profile={profile}>
      <div className="px-4 py-4 md:px-8 md:py-8 max-w-5xl mx-auto">
        <UsersPanel users={rows} currentUserId={session.user.id} />
      </div>
    </AppShell>
  )
}
