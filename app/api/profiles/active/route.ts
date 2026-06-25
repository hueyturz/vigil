import { NextResponse } from 'next/server'
import { getActionContext } from '@/lib/utils/impersonation'

export async function GET() {
  const ctx = await getActionContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  const serviceRole = ctx.serviceRole
  const profile = { funeral_home_id: ctx.funeralHomeId }

  const { data: profiles } = await serviceRole
    .from('profiles')
    .select('id, full_name')
    .eq('funeral_home_id', profile.funeral_home_id)
    .eq('is_active', true)
    .order('full_name')

  return NextResponse.json({ profiles: profiles ?? [] })
}
