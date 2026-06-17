import { createServiceRoleClient } from '@/lib/supabase/server'
import type { ExtractionData, Priority } from '@/lib/types'

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
- task_confirmations: only include tasks that match existing task titles exactly
- new_tasks: only include items that require action and are NOT already in the existing task list
- anxiety_flag: true if the detail is ambiguous, contradicted, or unconfirmed
- confidence_score: 0.0 to 1.0 based on how clearly this was stated
- Do not include markdown, backticks, or any text outside the JSON object`

export interface ExtractionSummary {
  extraction:          ExtractionData
  confirmed_count:     number
  added_count:         number
  needs_review_count:  number
}

export async function runExtraction(
  intakeSessionId: string,
  serviceId:       string,
  callerUserId:    string,
): Promise<ExtractionSummary> {
  const serviceRole = createServiceRoleClient()

  // Fetch session for transcript
  const { data: session, error: sessionErr } = await serviceRole
    .from('intake_sessions')
    .select('transcript, funeral_home_id')
    .eq('id', intakeSessionId)
    .single()

  if (sessionErr || !session?.transcript)
    throw new Error('Intake session or transcript not found.')

  // Fetch service details
  const { data: service } = await serviceRole
    .from('services')
    .select('family_name, service_type, service_date')
    .eq('id', serviceId)
    .single()

  if (!service) throw new Error('Service not found.')

  // Fetch existing tasks
  const { data: existingTasks } = await serviceRole
    .from('tasks')
    .select('id, title, status')
    .eq('service_id', serviceId)
    .eq('status', 'not-started')

  const existingTaskTitles = (existingTasks ?? []).map(t => t.title)

  // Mark session as extracting
  await serviceRole
    .from('intake_sessions')
    .update({ status: 'extracting', updated_at: new Date().toISOString() })
    .eq('id', intakeSessionId)

  // Call Claude
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set.')

  const userMessage = [
    `Service: ${service.family_name} family (${service.service_type}), date: ${service.service_date}`,
    `Existing open tasks:\n${existingTaskTitles.map(t => `- ${t}`).join('\n') || 'None'}`,
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

  const aiData = await aiResponse.json()
  const rawText: string = aiData.content?.[0]?.text ?? ''

  let extraction: ExtractionData
  try {
    extraction = JSON.parse(rawText)
  } catch {
    throw new Error(`Failed to parse Claude response as JSON: ${rawText.slice(0, 200)}`)
  }

  // ── Process task_confirmations ─────────────────────────────────────────────
  let confirmed_count    = 0
  let needs_review_count = 0

  for (const conf of extraction.task_confirmations ?? []) {
    const autoConfirm = conf.confidence_score >= 0.8 && !conf.anxiety_flag

    if (autoConfirm) {
      const match = (existingTasks ?? []).find(
        t => t.title.toLowerCase() === conf.task_title.toLowerCase()
      )
      if (match) {
        await serviceRole
          .from('tasks')
          .update({
            status:             'complete',
            confirmation_value: conf.confirmation_value,
            completed_by_id:    callerUserId,
            completed_at:       new Date().toISOString(),
          })
          .eq('id', match.id)
        confirmed_count++
      }
    } else {
      needs_review_count++
    }
  }

  // ── Process new_tasks ──────────────────────────────────────────────────────
  let added_count = 0

  for (const nt of extraction.new_tasks ?? []) {
    // Find max sort_order for this service
    const { data: lastTask } = await serviceRole
      .from('tasks')
      .select('sort_order')
      .eq('service_id', serviceId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle()

    const nextOrder = (lastTask?.sort_order ?? 0) + 1

    const { error: insertErr } = await serviceRole.from('tasks').insert({
      service_id:        serviceId,
      funeral_home_id:   session.funeral_home_id,
      title:             nt.title,
      category:          nt.category,
      confirmation_hint: nt.confirmation_hint,
      due_days_before:   nt.due_days_before ?? 3,
      priority:          (['critical', 'standard', 'informational'].includes(nt.priority)
                          ? nt.priority
                          : 'standard') as Priority,
      sort_order:        nextOrder,
      status:            'not-started',
    })

    if (!insertErr) added_count++
  }

  // ── Update session ─────────────────────────────────────────────────────────
  await serviceRole
    .from('intake_sessions')
    .update({
      raw_extraction: extraction,
      status:         'complete',
      updated_at:     new Date().toISOString(),
    })
    .eq('id', intakeSessionId)

  return { extraction, confirmed_count, added_count, needs_review_count }
}
