import { NextRequest, NextResponse } from 'next/server'
import { getActiveProfile } from '@/lib/utils/impersonation'
import { createServiceRoleClient } from '@/lib/supabase/server'

// POST /api/template-tasks/[id]/tags — attach tag(s) to a template task
// (task_templates row) { tagIds: string[] }. Only custom (funeral-home-owned)
// templates can be tagged; system defaults have no funeral_home_id.
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getActiveProfile()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

  let body: { tagIds?: string[] }
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 }) }
  const tagIds = Array.isArray(body.tagIds) ? body.tagIds.filter(Boolean) : []
  if (tagIds.length === 0) return NextResponse.json({ error: 'tagIds is required.' }, { status: 400 })

  // Service-role client: `authenticated` isn't granted SELECT on `task_templates`,
  // which the template_task_tags RLS policy needs. Tenant scope enforced below.
  const db   = createServiceRoleClient()
  const fhId = ctx.profile.funeral_home_id

  const { data: tpl, error: tplErr } = await db
    .from('task_templates').select('id').eq('id', params.id).eq('funeral_home_id', fhId).maybeSingle()
  if (tplErr) {
    console.error('[POST /api/template-tasks/[id]/tags] template lookup failed:', tplErr.message)
    return NextResponse.json({ error: tplErr.message }, { status: 500 })
  }
  if (!tpl) return NextResponse.json({ error: 'Template task not found.' }, { status: 404 })

  // Own custom tags or any platform default tag.
  const { data: validTags } = await db
    .from('tags').select('id').or(`is_default.eq.true,funeral_home_id.eq.${fhId}`).in('id', tagIds)
  const validIds = (validTags ?? []).map(t => t.id)
  if (validIds.length === 0) return NextResponse.json({ error: 'No valid tags.' }, { status: 400 })

  const { error } = await db
    .from('template_task_tags')
    .upsert(validIds.map(tag_id => ({ template_task_id: params.id, tag_id })), { onConflict: 'template_task_id,tag_id', ignoreDuplicates: true })

  if (error) {
    console.error('[POST /api/template-tasks/[id]/tags] failed:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
