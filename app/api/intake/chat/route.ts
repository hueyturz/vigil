import { NextRequest, NextResponse } from 'next/server'
import { getActionContext } from '@/lib/utils/impersonation'

interface ChatMessage {
  role:    'user' | 'assistant'
  content: string
}

interface TranscriptItem { date: string; transcript: string }
interface NoteItem       { date: string; author: string; content: string }

function formatDate(iso: string): string {
  if (!iso) return 'date unknown'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return 'date unknown'
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

// Build the case-context system prompt from transcripts (+ optional notes).
function buildSystemPrompt(transcripts: TranscriptItem[], notes: NoteItem[]): string {
  const lines: string[] = [
    "You are an assistant helping a funeral director recall and understand information about a family's case.",
    '',
    'MEETING TRANSCRIPTS:',
  ]
  transcripts.forEach((t, i) => {
    lines.push(`Meeting ${i + 1} (${formatDate(t.date)}): ${t.transcript}`)
  })
  if (notes.length > 0) {
    lines.push('', 'INTERNAL NOTES:')
    notes.forEach(n => {
      lines.push(`Note (${formatDate(n.date)} — ${n.author}): ${n.content}`)
    })
  }
  lines.push(
    '',
    "Answer questions based only on the above context. If something isn't mentioned in any meeting or note, say so clearly.",
  )
  return lines.join('\n')
}

export async function POST(request: NextRequest) {
  const ctx = await getActionContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  if (!['owner', 'fd'].includes(ctx.role))
    return NextResponse.json({ error: 'Insufficient permissions.' }, { status: 403 })
  const serviceRole = ctx.serviceRole
  const profile = { funeral_home_id: ctx.funeralHomeId, role: ctx.role }

  let body: {
    intake_session_id?:    string
    transcripts?:          TranscriptItem[]
    notes?:                NoteItem[]
    message?:              string
    conversation_history?: ChatMessage[]
  }
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 })
  }

  const { intake_session_id, transcripts, notes = [], message, conversation_history = [] } = body
  if (!message) return NextResponse.json({ error: 'message is required.' }, { status: 400 })

  // Resolve the transcript context. Two modes:
  //   1. Service-level: caller passes a `transcripts` array (+ optional `notes`).
  //   2. Backwards-compatible single meeting: caller passes `intake_session_id`.
  let contextTranscripts: TranscriptItem[]

  if (Array.isArray(transcripts) && transcripts.length > 0) {
    contextTranscripts = transcripts.filter(t => t?.transcript?.trim())
    if (contextTranscripts.length === 0)
      return NextResponse.json({ reply: 'No transcripts are available for this case yet.' })
  } else if (intake_session_id) {
    const { data: intakeSession } = await serviceRole
      .from('intake_sessions')
      .select('transcript, funeral_home_id, created_at')
      .eq('id', intake_session_id)
      .single()

    if (!intakeSession || intakeSession.funeral_home_id !== profile.funeral_home_id)
      return NextResponse.json({ error: 'Session not found.' }, { status: 404 })

    if (!intakeSession.transcript)
      return NextResponse.json({
        reply: 'No transcript is available for this meeting. Recording may still be processing.',
      })

    contextTranscripts = [{ date: intakeSession.created_at, transcript: intakeSession.transcript }]
  } else {
    return NextResponse.json({ error: 'transcripts or intake_session_id is required.' }, { status: 400 })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'ANTHROPIC_API_KEY is not set.' }, { status: 500 })

  const systemPrompt = buildSystemPrompt(contextTranscripts, Array.isArray(notes) ? notes : [])

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
