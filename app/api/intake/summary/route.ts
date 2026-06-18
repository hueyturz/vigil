import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase    = createClient()
  const serviceRole = createServiceRoleClient()

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

  const { data: profile } = await serviceRole
    .from('profiles')
    .select('funeral_home_id, role')
    .eq('id', session.user.id)
    .single()

  if (!profile || !['owner', 'fd'].includes(profile.role))
    return NextResponse.json({ error: 'Insufficient permissions.' }, { status: 403 })

  let body: { intake_session_id?: string }
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 })
  }

  const { intake_session_id } = body
  if (!intake_session_id)
    return NextResponse.json({ error: 'intake_session_id is required.' }, { status: 400 })

  const { data: intakeSession } = await serviceRole
    .from('intake_sessions')
    .select('transcript, ai_summary, funeral_home_id')
    .eq('id', intake_session_id)
    .single()

  if (!intakeSession || intakeSession.funeral_home_id !== profile.funeral_home_id)
    return NextResponse.json({ error: 'Session not found.' }, { status: 404 })

  // Return cached summary if it exists
  if (intakeSession.ai_summary)
    return NextResponse.json({ summary: intakeSession.ai_summary })

  if (!intakeSession.transcript)
    return NextResponse.json({ summary: null })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'ANTHROPIC_API_KEY is not set.' }, { status: 500 })

  const aiResponse = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key':         apiKey,
      'anthropic-version': '2023-06-01',
      'content-type':      'application/json',
    },
    body: JSON.stringify({
      model:      'claude-sonnet-4-6',
      max_tokens: 512,
      system:     'You are summarizing a funeral arrangement conference transcript. Write a 2-3 sentence summary covering: key decisions made (casket, flowers, venue, date), any special requests from the family, and any unresolved items that need follow-up. Be specific and factual. Use past tense. Do not include filler phrases like "In this meeting" or "The transcript shows".',
      messages:   [{ role: 'user', content: intakeSession.transcript }],
    }),
  })

  if (!aiResponse.ok) {
    const err = await aiResponse.text()
    return NextResponse.json({ error: `Claude API error: ${err}` }, { status: 500 })
  }

  const aiData  = await aiResponse.json()
  const summary: string = aiData.content?.[0]?.text?.trim() ?? ''

  if (summary) {
    await serviceRole
      .from('intake_sessions')
      .update({ ai_summary: summary, updated_at: new Date().toISOString() })
      .eq('id', intake_session_id)
  }

  return NextResponse.json({ summary: summary || null })
}
