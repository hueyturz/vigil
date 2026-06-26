import { NextResponse } from 'next/server'
import { getActiveProfile } from '@/lib/utils/impersonation'
import { createServiceRoleClient } from '@/lib/supabase/server'

// DELETE /api/tags/[id] — delete a tag. task_tags / template_task_tags rows
// referencing it are removed automatically via ON DELETE CASCADE.
export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const ctx = await getActiveProfile()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

  const db = createServiceRoleClient()
  const { error } = await db
    .from('tags')
    .delete()
    .eq('id', params.id)
    .eq('funeral_home_id', ctx.profile.funeral_home_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
