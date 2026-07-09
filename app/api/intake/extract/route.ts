import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getActionContext } from '@/lib/utils/impersonation'
import { rateLimit } from '@/lib/rate-limit'
import { extractFromTranscript } from '@/lib/utils/intake'

const Schema = z.object({
  intake_session_id: z.string().uuid(),
  service_id:        z.string().uuid(),
})

export async function POST(request: NextRequest) {
  const ctx = await getActionContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  if (!['owner', 'fd'].includes(ctx.role))
    return NextResponse.json({ error: 'Insufficient permissions.' }, { status: 403 })

  // AI cost guard: 50 calls/day per funeral home across the intake AI routes
  // (Deepgram + Anthropic spend) — audit C3.
  const { success: aiAllowed } = await rateLimit('ai', ctx.funeralHomeId)
  if (!aiAllowed) {
    return NextResponse.json({ error: 'Daily AI usage limit reached. Resets at midnight UTC.' }, { status: 429 })
  }
  const serviceRole = ctx.serviceRole
  const profile = { id: ctx.userId, role: ctx.role, funeral_home_id: ctx.funeralHomeId }

  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 })
  }

  const parsed = Schema.safeParse(body)
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 422 })

  const { intake_session_id, service_id } = parsed.data

  // Verify service belongs to this funeral home
  const { data: service } = await serviceRole
    .from('services')
    .select('id')
    .eq('id', service_id)
    .eq('funeral_home_id', profile.funeral_home_id)
    .single()

  if (!service) return NextResponse.json({ error: 'Service not found.' }, { status: 404 })

  try {
    const extraction = await extractFromTranscript(intake_session_id, service_id)
    return NextResponse.json({ intake_session_id, status: 'complete', extraction })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Extraction failed.'
    await serviceRole
      .from('intake_sessions')
      .update({ status: 'failed', error_message: msg, updated_at: new Date().toISOString() })
      .eq('id', intake_session_id)
      .eq('funeral_home_id', profile.funeral_home_id)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
