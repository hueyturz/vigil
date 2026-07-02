import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getActionContext } from '@/lib/utils/impersonation'

// Zod validation (session 10 #2): the arrays were previously unvalidated and
// unbounded — oversized payloads or malformed items now 422 instead of writing.
const SaveSchema = z.object({
  intake_session_id: z.string().uuid(),
  service_id:        z.string().uuid(),
  confirmations: z.array(z.object({
    task_title: z.string().max(500),
    notes:      z.string().max(5000),
  })).max(100).default([]),
  new_tasks: z.array(z.object({
    title:             z.string().min(1).max(255),
    confirmation_hint: z.string().max(500),
    due_days_before:   z.number().int().min(0).max(365),
    priority:          z.enum(['critical', 'standard', 'informational']),
    notes:             z.string().max(5000),
  })).max(100).default([]),
  service_notes: z.array(z.object({
    note:             z.string().max(5000),
    confidence_score: z.number(),
  })).max(100).default([]),
})

export async function POST(request: NextRequest) {
  const ctx = await getActionContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  if (!['owner', 'fd'].includes(ctx.role))
    return NextResponse.json({ error: 'Insufficient permissions.' }, { status: 403 })
  const serviceRole = ctx.serviceRole
  const profile = { id: ctx.userId, role: ctx.role, funeral_home_id: ctx.funeralHomeId }

  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 })
  }

  const parsed = SaveSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 422 })
  }
  const { intake_session_id, service_id, confirmations, new_tasks, service_notes } = parsed.data

  // Verify session + service belong to this funeral home
  const { data: intakeSession } = await serviceRole
    .from('intake_sessions')
    .select('id, funeral_home_id')
    .eq('id', intake_session_id)
    .eq('funeral_home_id', profile.funeral_home_id)
    .single()

  if (!intakeSession)
    return NextResponse.json({ error: 'Intake session not found.' }, { status: 404 })

  const { data: service } = await serviceRole
    .from('services')
    .select('id, funeral_home_id')
    .eq('id', service_id)
    .eq('funeral_home_id', profile.funeral_home_id)
    .single()

  if (!service)
    return NextResponse.json({ error: 'Service not found.' }, { status: 404 })

  // Fetch existing tasks for title-matching
  const { data: existingTasks } = await serviceRole
    .from('tasks')
    .select('id, title, status')
    .eq('service_id', service_id)

  const taskMap = new Map((existingTasks ?? []).map(t => [t.title.toLowerCase(), t]))

  // Update notes on confirmed existing tasks (never touch status or completion)
  let notesUpdated = 0
  for (const conf of confirmations) {
    if (!conf.task_title) continue
    const match = taskMap.get(conf.task_title.toLowerCase())
    if (!match) continue
    await serviceRole
      .from('tasks')
      .update({ notes: conf.notes || null })
      .eq('id', match.id)
    notesUpdated++
  }

  // Insert new tasks
  let tasksCreated = 0
  if (new_tasks.length > 0) {
    const { data: last } = await serviceRole
      .from('tasks')
      .select('sort_order')
      .eq('service_id', service_id)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle()

    let nextOrder = (last?.sort_order ?? 0) + 1

    for (const nt of new_tasks) {
      if (!nt.title) continue
      await serviceRole.from('tasks').insert({
        service_id:        service_id,
        funeral_home_id:   profile.funeral_home_id,
        title:             nt.title,
        confirmation_hint: nt.confirmation_hint,
        due_days_before:   nt.due_days_before,
        priority:          nt.priority,
        notes:             nt.notes || null,
        sort_order:        nextOrder,
        status:            'not-started',
      })
      nextOrder++
      tasksCreated++
    }
  }

  // Persist AI-extracted family notes into service_notes. Best-effort: a failure
  // here must not fail the whole save — saving the tasks is the priority.
  let familyNotesAdded = 0
  const familyNotes = service_notes.filter(n => n?.note?.trim())
  if (familyNotes.length > 0) {
    try {
      // Dedupe: meeting-extracted notes are only persisted once per service.
      // If any 'Meeting Notes' rows already exist for this service, skip the insert
      // (e.g. re-opening/re-saving the same extraction won't duplicate them).
      const { data: existing } = await serviceRole
        .from('service_notes')
        .select('id')
        .eq('service_id', service_id)
        .eq('author_name', 'Meeting Notes')
        .limit(1)

      if (!existing || existing.length === 0) {
        const rows = familyNotes.map(n => ({
          service_id:      service_id,
          funeral_home_id: profile.funeral_home_id,
          author_id:       null,            // AI-generated — no human author
          author_name:     'Meeting Notes', // labels these in the Notes tab
          content:         n.note.trim(),
        }))
        const { error } = await serviceRole.from('service_notes').insert(rows)
        if (error) throw error
        familyNotesAdded = rows.length
      }
    } catch (err) {
      console.error('[intake/save] family notes insert failed:', err instanceof Error ? err.message : err)
    }
  }

  return NextResponse.json({ notesUpdated, tasksCreated, familyNotesAdded })
}
