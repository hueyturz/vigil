import { NextResponse } from 'next/server'
import { getActiveProfile } from '@/lib/utils/impersonation'
import { createServiceRoleClient } from '@/lib/supabase/server'

// DELETE /api/template-tasks/[id]/tags/[tagId] — detach a tag from a template task.
export async function DELETE(_request: Request, { params }: { params: { id: string; tagId: string } }) {
  const ctx = await getActiveProfile()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  // Billing write gate (audit #4): suspended/canceled tenants are read-only.
  // getActiveProfile forces access 'full' during superadmin impersonation.
  if (ctx.billing.access === 'readonly') {
    return NextResponse.json({ error: 'Account suspended — writes are disabled.' }, { status: 403 })
  }

  // Service-role client: `authenticated` isn't granted SELECT on `task_templates`,
  // which the template_task_tags RLS policy needs. Tenant scope enforced below.
  const db   = createServiceRoleClient()
  const fhId = ctx.profile.funeral_home_id

  const { data: tpl, error: tplErr } = await db
    .from('task_templates').select('id').eq('id', params.id).eq('funeral_home_id', fhId).maybeSingle()
  if (tplErr) {
    console.error('[DELETE /api/template-tasks/[id]/tags/[tagId]] template lookup failed:', tplErr.message)
    return NextResponse.json({ error: tplErr.message }, { status: 500 })
  }
  if (!tpl) return NextResponse.json({ error: 'Template task not found.' }, { status: 404 })

  const { error } = await db
    .from('template_task_tags')
    .delete()
    .eq('template_task_id', params.id)
    .eq('tag_id', params.tagId)

  if (error) {
    console.error('[DELETE /api/template-tasks/[id]/tags/[tagId]] failed:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
