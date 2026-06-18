import { createServiceRoleClient } from '@/lib/supabase/server'
import type { ExtractionData } from '@/lib/types'

const SYSTEM_PROMPT = `You are an extraction engine for funeral arrangement conferences.
You will receive a transcript of a meeting between a funeral director and a family. Extract all actionable decisions and logistics.

You must output ONLY a valid JSON object with this exact structure:
{
  "case_metadata": {
    "decedent_name": "string or null",
    "service_date_raw": "string or null",
    "venue_name": "string or null",
    "cemetery_name": "string or null"
  },
  "task_confirmations": [
    {
      "task_title": "exact title of existing task to confirm",
      "confirmation_value": "extracted detail to use as confirmation",
      "confidence_score": 0.0,
      "anxiety_flag": false
    }
  ],
  "new_tasks": [
    {
      "title": "task title",
      "category": "Merchandise|Cemetery|Print|Communication|Legal|Arrangements|Facility|Military|Other",
      "confirmation_hint": "what detail will be needed to confirm this",
      "due_days_before": 3,
      "priority": "critical|standard|informational",
      "extracted_detail": "any detail already known from the transcript",
      "confidence_score": 0.0,
      "anxiety_flag": false
    }
  ],
  "service_notes": [
    {
      "note": "family preference or decision that is not a task",
      "confidence_score": 0.0
    }
  ]
}

Rules:
- task_confirmations: existing tasks that were discussed in the meeting. Only match titles exactly.
- new_tasks: action items NOT already in the existing task list
- anxiety_flag: true if the detail is ambiguous, contradicted, or unconfirmed
- confidence_score: 0.0 to 1.0 based on how clearly this was stated
- Do not include markdown, backticks, or any text outside the JSON object`

/**
 * Calls Claude to extract tasks and notes from a stored transcript.
 * Saves the raw extraction to intake_sessions.
 * Does NOT write to tasks — that is done separately via /api/intake/save.
 */
export async function extractFromTranscript(
  intakeSessionId: string,
  serviceId:       string,
): Promise<ExtractionData> {
  const serviceRole = createServiceRoleClient()

  const { data: session, error: sessionErr } = await serviceRole
    .from('intake_sessions')
    .select('transcript, funeral_home_id')
    .eq('id', intakeSessionId)
    .single()

  if (sessionErr || !session?.transcript)
    throw new Error('Intake session or transcript not found.')

  const { data: service } = await serviceRole
    .from('services')
    .select('family_name, service_type, service_date')
    .eq('id', serviceId)
    .single()

  if (!service) throw new Error('Service not found.')

  const { data: existingTasks } = await serviceRole
    .from('tasks')
    .select('id, title')
    .eq('service_id', serviceId)

  const existingTaskTitles = (existingTasks ?? []).map(t => t.title)

  await serviceRole
    .from('intake_sessions')
    .update({ status: 'extracting', updated_at: new Date().toISOString() })
    .eq('id', intakeSessionId)

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set.')

  const userMessage = [
    `Service: ${service.family_name} family (${service.service_type ?? 'type TBD'}), date: ${service.service_date ?? 'TBD'}`,
    `Existing tasks:\n${existingTaskTitles.map(t => `- ${t}`).join('\n') || 'None'}`,
    `\nTranscript:\n${session.transcript}`,
  ].join('\n\n')

  const aiResponse = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key':         apiKey,
      'anthropic-version': '2023-06-01',
      'content-type':      'application/json',
    },
    body: JSON.stringify({
      model:      'claude-sonnet-4-6',
      max_tokens: 4096,
      system:     SYSTEM_PROMPT,
      messages:   [{ role: 'user', content: userMessage }],
    }),
  })

  if (!aiResponse.ok) {
    const errText = await aiResponse.text()
    throw new Error(`Claude API ${aiResponse.status}: ${errText}`)
  }

  const aiData  = await aiResponse.json()
  const rawText: string = aiData.content?.[0]?.text ?? ''

  const cleaned = rawText
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim()

  let extraction: ExtractionData
  try {
    extraction = JSON.parse(cleaned)
  } catch {
    throw new Error(`Failed to parse Claude response as JSON: ${cleaned.slice(0, 200)}`)
  }

  // Save extraction JSON to session — tasks are written separately on FD confirmation
  await serviceRole
    .from('intake_sessions')
    .update({
      raw_extraction: extraction,
      status:         'complete',
      updated_at:     new Date().toISOString(),
    })
    .eq('id', intakeSessionId)

  return extraction
}
