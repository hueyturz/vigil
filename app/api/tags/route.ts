import { NextRequest, NextResponse } from 'next/server'
import { getActiveProfile } from '@/lib/utils/impersonation'
import { createServiceRoleClient } from '@/lib/supabase/server'

// GET /api/tags — all tags for the active funeral home.
export async function GET() {
  const ctx = await getActiveProfile()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

  const db = createServiceRoleClient()
  const { data, error } = await db
    .from('tags')
    .select('id, funeral_home_id, name, color, created_at')
    .eq('funeral_home_id', ctx.profile.funeral_home_id)
    .order('name', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ tags: data ?? [] })
}

// POST /api/tags — create a tag { name, color }.
export async function POST(request: NextRequest) {
  const ctx = await getActiveProfile()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

  let body: { name?: string; color?: string }
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 }) }

  const name  = (body.name ?? '').trim()
  const color = (body.color ?? '').trim()
  if (!name)  return NextResponse.json({ error: 'Name is required.' }, { status: 400 })
  if (!color) return NextResponse.json({ error: 'Color is required.' }, { status: 400 })

  const db = createServiceRoleClient()
  const { data, error } = await db
    .from('tags')
    .insert({ funeral_home_id: ctx.profile.funeral_home_id, name, color })
    .select('id, funeral_home_id, name, color, created_at')
    .single()

  if (error) {
    // Unique (funeral_home_id, name) violation → return the existing tag.
    if (error.code === '23505') {
      const { data: existing } = await db
        .from('tags')
        .select('id, funeral_home_id, name, color, created_at')
        .eq('funeral_home_id', ctx.profile.funeral_home_id)
        .eq('name', name)
        .single()
      if (existing) return NextResponse.json({ tag: existing })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ tag: data })
}
