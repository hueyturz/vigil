import { NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase    = createClient()
  const serviceRole = createServiceRoleClient()

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

  const { data: profile } = await serviceRole
    .from('profiles')
    .select('funeral_home_id')
    .eq('id', session.user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Profile not found.' }, { status: 401 })

  const { data: profiles } = await serviceRole
    .from('profiles')
    .select('id, full_name')
    .eq('funeral_home_id', profile.funeral_home_id)
    .eq('is_active', true)
    .order('full_name')

  return NextResponse.json({ profiles: profiles ?? [] })
}
