import { NextRequest, NextResponse } from 'next/server'
import { getActionContext } from '@/lib/utils/impersonation'
import { rateLimit } from '@/lib/rate-limit'
import { transcribeAudio } from '@/lib/utils/deepgram'

// Transcribe-only endpoint for voice NOTES. Unlike /api/intake/transcribe, this
// does NOT create an intake_sessions row and does NOT run task extraction — it
// just returns the transcript so the caller can save it as a service note.
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

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data.' }, { status: 400 })
  }

  const audioBlob      = formData.get('audio')    as Blob   | null
  const clientMimeType = formData.get('mimeType') as string | null

  if (!audioBlob) return NextResponse.json({ error: 'audio is required.' }, { status: 400 })

  try {
    const audioBuffer = Buffer.from(await audioBlob.arrayBuffer())
    const mimeType = clientMimeType || audioBlob.type || 'audio/webm'
    const transcript = await transcribeAudio(audioBuffer, mimeType)
    return NextResponse.json({ transcript })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Transcription failed.'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
