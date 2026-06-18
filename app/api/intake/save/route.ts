import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import type { Priority } from '@/lib/types'

interface SaveConfirmation {
  task_title: string
  notes:      string
}

interface SaveNewTask {
  title:             string
  category:          string
  confirmation_hint: string
  due_days_before:   number
  priority:          Priority
  notes:             string
}

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

  let body: {
    intake_session_id: string
    service_id:        string
    confirmations:     SaveConfirmation[]
    new_tasks:         SaveNewTask[]
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 })
  }

  const { intake_session_id, service_id, confirmations = [], new_tasks = [] } = body

  if (!intake_session_id || !service_id)
    return NextResponse.json({ error: 'intake_session_id and service_id are required.' }, { status: 400 })

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
        category:          nt.category,
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

  return NextResponse.json({ notesUpdated, tasksCreated })
}
