import { NextRequest, NextResponse } from 'next/server'
import { getActiveProfile } from '@/lib/utils/impersonation'
import { createClient } from '@/lib/supabase/server'

const TAG_COLS = 'id, funeral_home_id, name, color, is_default, created_at'

// GET /api/tags — platform default tags + the active funeral home's custom tags,
// sorted defaults-first alphabetically, then custom alphabetically.
export async function GET() {
  const ctx = await getActiveProfile()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

  // Cookie-based client → the user's JWT reaches Supabase so the query runs as the
  // `authenticated` role under RLS (not anon). RLS already scopes to defaults + own.
  const db = createClient()
  const { data, error } = await db
    .from('tags')
    .select(TAG_COLS)
    .or(`is_default.eq.true,funeral_home_id.eq.${ctx.profile.funeral_home_id}`)

  if (error) {
    console.error('[GET /api/tags] failed:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const tags = (data ?? []).sort((a, b) =>
    a.is_default !== b.is_default
      ? (a.is_default ? -1 : 1)
      : a.name.localeCompare(b.name),
  )
  return NextResponse.json({ tags })
}

// POST /api/tags — create a custom tag { name, color } for the active funeral home.
export async function POST(request: NextRequest) {
  const ctx = await getActiveProfile()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

  let body: { name?: string; color?: string }
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 }) }

  const name  = (body.name ?? '').trim()
  const color = (body.color ?? '').trim()
  if (!name)  return NextResponse.json({ error: 'Name is required.' }, { status: 400 })
  if (!color) return NextResponse.json({ error: 'Color is required.' }, { status: 400 })

  // Cookie-based client → runs as `authenticated` under RLS (tags_insert policy),
  // so the user's JWT is what authorizes the write — not the anon key.
  const db   = createClient()
  const fhId = ctx.profile.funeral_home_id

  // Don't let a custom tag duplicate a platform default name.
  const { data: dup } = await db
    .from('tags').select('id').eq('is_default', true).ilike('name', name).maybeSingle()
  if (dup) return NextResponse.json({ error: `"${name}" is a standard tag already.` }, { status: 409 })

  const { data, error } = await db
    .from('tags')
    .insert({ funeral_home_id: fhId, name, color, is_default: false })
    .select(TAG_COLS)
    .single()

  if (error) {
    // Unique (funeral_home_id, name) violation → return the existing tag.
    if (error.code === '23505') {
      const { data: existing } = await db
        .from('tags').select(TAG_COLS).eq('funeral_home_id', fhId).eq('name', name).single()
      if (existing) return NextResponse.json({ tag: existing })
    }
    console.error('[POST /api/tags] failed:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ tag: data })
}
