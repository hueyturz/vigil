import { NextRequest, NextResponse } from 'next/server'
import { getActiveProfile } from '@/lib/utils/impersonation'
import { createServiceRoleClient } from '@/lib/supabase/server'

// POST /api/tasks/[id]/tags — attach tag(s) to a task { tagIds: string[] }.
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getActiveProfile()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

  let body: { tagIds?: string[] }
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 }) }
  const tagIds = Array.isArray(body.tagIds) ? body.tagIds.filter(Boolean) : []
  if (tagIds.length === 0) return NextResponse.json({ error: 'tagIds is required.' }, { status: 400 })

  // Service-role client: the task_tags RLS policy references `tasks` via EXISTS, and
  // this project does not grant the authenticated role SELECT on `tasks`. Tenant
  // isolation is enforced via getActiveProfile() + the funeral_home_id checks below.
  const db   = createServiceRoleClient()
  const fhId = ctx.profile.funeral_home_id

  // Verify the task belongs to this funeral home.
  const { data: task, error: taskErr } = await db
    .from('tasks').select('id').eq('id', params.id).eq('funeral_home_id', fhId).maybeSingle()
  if (taskErr) {
    console.error('[POST /api/tasks/[id]/tags] task lookup failed:', taskErr.message)
    return NextResponse.json({ error: taskErr.message }, { status: 500 })
  }
  if (!task) return NextResponse.json({ error: 'Task not found.' }, { status: 404 })

  // Only attach tags visible to this funeral home: its own custom tags or any
  // platform default tag (is_default = true, funeral_home_id NULL).
  const { data: validTags, error: validErr } = await db
    .from('tags').select('id').or(`is_default.eq.true,funeral_home_id.eq.${fhId}`).in('id', tagIds)
  if (validErr) {
    console.error('[POST /api/tasks/[id]/tags] tag lookup failed:', validErr.message)
    return NextResponse.json({ error: validErr.message }, { status: 500 })
  }
  const validIds = (validTags ?? []).map(t => t.id)
  if (validIds.length === 0) return NextResponse.json({ error: 'No valid tags.' }, { status: 400 })

  const { error } = await db
    .from('task_tags')
    .upsert(validIds.map(tag_id => ({ task_id: params.id, tag_id })), { onConflict: 'task_id,tag_id', ignoreDuplicates: true })

  if (error) {
    console.error('[POST /api/tasks/[id]/tags] failed:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
