import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'

interface ChatMessage {
  role:    'user' | 'assistant'
  content: string
}

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

  let body: { intake_session_id?: string; message?: string; conversation_history?: ChatMessage[] }
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 })
  }

  const { intake_session_id, message, conversation_history = [] } = body
  if (!intake_session_id || !message)
    return NextResponse.json({ error: 'intake_session_id and message are required.' }, { status: 400 })

  const { data: intakeSession } = await serviceRole
    .from('intake_sessions')
    .select('transcript, funeral_home_id')
    .eq('id', intake_session_id)
    .single()

  if (!intakeSession || intakeSession.funeral_home_id !== profile.funeral_home_id)
    return NextResponse.json({ error: 'Session not found.' }, { status: 404 })

  if (!intakeSession.transcript)
    return NextResponse.json({
      reply: 'No transcript is available for this meeting. Recording may still be processing.',
    })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'ANTHROPIC_API_KEY is not set.' }, { status: 500 })

  const systemPrompt = [
    'You are an assistant helping a funeral director recall details from an arrangement conference.',
    'Answer questions based ONLY on the transcript provided.',
    'If something was not mentioned in the transcript, say so clearly.',
    'Be concise and specific. Quote relevant parts of the transcript when helpful.',
    '',
    'MEETING TRANSCRIPT:',
    intakeSession.transcript,
  ].join('\n')

  // Build messages: prior history + new user message
  const messages: ChatMessage[] = [
    ...conversation_history,
    { role: 'user', content: message },
  ]

  const aiResponse = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key':         apiKey,
      'anthropic-version': '2023-06-01',
      'content-type':      'application/json',
    },
    body: JSON.stringify({
      model:      'claude-sonnet-4-6',
      max_tokens: 1024,
      system:     systemPrompt,
      messages,
    }),
  })

  if (!aiResponse.ok) {
    const err = await aiResponse.text()
    return NextResponse.json({ error: `Claude API error: ${err}` }, { status: 500 })
  }

  const aiData = await aiResponse.json()
  const reply: string = aiData.content?.[0]?.text?.trim() ?? ''

  return NextResponse.json({ reply })
}
