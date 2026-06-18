import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { transcribeAudio } from '@/lib/utils/deepgram'
import { extractFromTranscript } from '@/lib/utils/intake'

export async function POST(request: NextRequest) {
  const supabase    = createClient()
  const serviceRole = createServiceRoleClient()

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

  const { data: profile } = await serviceRole
    .from('profiles')
    .select('id, role, funeral_home_id')
    .eq('id', session.user.id)
    .single()

  if (!profile || !['owner', 'fd'].includes(profile.role))
    return NextResponse.json({ error: 'Insufficient permissions.' }, { status: 403 })

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data.' }, { status: 400 })
  }

  const audioBlob       = formData.get('audio')            as Blob   | null
  const serviceId       = formData.get('service_id')       as string | null
  const durationRaw     = formData.get('duration_seconds') as string | null
  const clientMimeType  = formData.get('mimeType')         as string | null
  const durationSeconds = durationRaw ? parseInt(durationRaw, 10) : null

  if (!audioBlob || !serviceId)
    return NextResponse.json({ error: 'audio and service_id are required.' }, { status: 400 })

  // Verify service belongs to this funeral home
  const { data: service } = await serviceRole
    .from('services')
    .select('id')
    .eq('id', serviceId)
    .eq('funeral_home_id', profile.funeral_home_id)
    .single()

  if (!service) return NextResponse.json({ error: 'Service not found.' }, { status: 404 })

  // Create intake session
  const { data: intakeSession, error: createErr } = await serviceRole
    .from('intake_sessions')
    .insert({
      service_id:                 serviceId,
      funeral_home_id:            profile.funeral_home_id,
      created_by_id:              profile.id,
      recording_duration_seconds: durationSeconds,
      status:                     'transcribing',
    })
    .select('id')
    .single()

  if (createErr || !intakeSession)
    return NextResponse.json({ error: createErr?.message ?? 'Failed to create session.' }, { status: 500 })

  const intakeSessionId = intakeSession.id

  // Transcribe
  let transcript: string
  try {
    const audioBuffer = Buffer.from(await audioBlob.arrayBuffer())
    // Prefer the MIME type the client detected via MediaRecorder.isTypeSupported(),
    // since audioBlob.type can be empty or wrong on iOS Safari.
    const mimeType = clientMimeType || audioBlob.type || 'audio/webm'
    transcript = await transcribeAudio(audioBuffer, mimeType)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Transcription failed.'
    await serviceRole
      .from('intake_sessions')
      .update({ status: 'failed', error_message: msg, updated_at: new Date().toISOString() })
      .eq('id', intakeSessionId)
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  // Store transcript
  await serviceRole
    .from('intake_sessions')
    .update({ transcript, status: 'extracting', updated_at: new Date().toISOString() })
    .eq('id', intakeSessionId)

  // Extract with Claude — returns ExtractionData only; no task writes happen here
  try {
    const extraction = await extractFromTranscript(intakeSessionId, serviceId)
    return NextResponse.json({
      intake_session_id: intakeSessionId,
      duration_seconds:  durationSeconds,
      extraction,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Extraction failed.'
    await serviceRole
      .from('intake_sessions')
      .update({ status: 'failed', error_message: msg, updated_at: new Date().toISOString() })
      .eq('id', intakeSessionId)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
