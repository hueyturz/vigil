import { NextResponse } from 'next/server'
import { getActiveProfile } from '@/lib/utils/impersonation'
import { createClient } from '@/lib/supabase/server'

// DELETE /api/tags/[id] — delete a tag. task_tags / template_task_tags rows
// referencing it are removed automatically via ON DELETE CASCADE.
export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const ctx = await getActiveProfile()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  // Billing write gate (audit #4): suspended/canceled tenants are read-only.
  // getActiveProfile forces access 'full' during superadmin impersonation.
  if (ctx.billing.access === 'readonly') {
    return NextResponse.json({ error: 'Account suspended — writes are disabled.' }, { status: 403 })
  }

  // Cookie-based client → runs as `authenticated` under RLS (tags_delete policy,
  // which only permits the user's own non-default tags).
  const db = createClient()
  const { error } = await db
    .from('tags')
    .delete()
    .eq('id', params.id)
    .eq('funeral_home_id', ctx.profile.funeral_home_id)

  if (error) {
    console.error('[DELETE /api/tags/[id]] failed:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
