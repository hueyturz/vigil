import { NextResponse } from 'next/server'
import { getActiveProfile } from '@/lib/utils/impersonation'
import { createClient } from '@/lib/supabase/server'

// DELETE /api/template-tasks/[id]/tags/[tagId] — detach a tag from a template task.
export async function DELETE(_request: Request, { params }: { params: { id: string; tagId: string } }) {
  const ctx = await getActiveProfile()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

  // Cookie-based client → runs as `authenticated` under RLS (template_task_tags policy).
  const db   = createClient()
  const fhId = ctx.profile.funeral_home_id

  const { data: tpl } = await db
    .from('task_templates').select('id').eq('id', params.id).eq('funeral_home_id', fhId).single()
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
