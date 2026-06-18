'use server'

import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/utils/email'
import { taskAssignedEmail } from '@/lib/utils/email-templates'
import type { TaskWithProfile } from '@/lib/types'

async function maybeSendAssignmentEmail(
  serviceRole: ReturnType<typeof createServiceRoleClient>,
  assignedToId: string,
  actorId: string,
  actorName: string,
  taskTitle: string,
  familyName: string,
  serviceId: string,
) {
  if (assignedToId === actorId) return
  try {
    const { data: authData } = await serviceRole.auth.admin.getUserById(assignedToId)
    const email = authData?.user?.email
    if (!email) return
    const { subject, html } = taskAssignedEmail({ taskTitle, familyName, serviceId, actorName })
    await sendEmail({ to: email, subject, html })
  } catch { /* fire-and-forget */ }
}

// ── Add a custom task to a specific service ────────────────────────────────

export async function addTaskToService(
  serviceId: string,
  input: {
    title: string
    category: string
    confirmation_hint: string
    due_days_before: number
    assigned_to_id?: string | null
  },
): Promise<{ data?: TaskWithProfile; error?: string }> {
  const supabase     = createClient()
  const serviceRole  = createServiceRoleClient()

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { error: 'Not authenticated.' }

  const { data: profile } = await serviceRole
    .from('profiles')
    .select('funeral_home_id, role, full_name')
    .eq('id', session.user.id)
    .single()

  if (!profile || !['owner', 'fd'].includes(profile.role))
    return { error: 'Insufficient permissions.' }

  const { data: service } = await serviceRole
    .from('services')
    .select('funeral_home_id, family_name')
    .eq('id', serviceId)
    .single()

  if (!service || service.funeral_home_id !== profile.funeral_home_id)
    return { error: 'Service not found.' }

  // Place the new task after the last existing one
  const { data: last } = await serviceRole
    .from('tasks')
    .select('sort_order')
    .eq('service_id', serviceId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  const nextOrder = (last?.sort_order ?? 0) + 1

  const { data: inserted, error } = await serviceRole
    .from('tasks')
    .insert({
      service_id:        serviceId,
      funeral_home_id:   profile.funeral_home_id,
      title:             input.title,
      category:          input.category,
      confirmation_hint: input.confirmation_hint,
      due_days_before:   input.due_days_before,
      sort_order:        nextOrder,
      status:            'not-started',
      assigned_to_id:    input.assigned_to_id ?? null,
    })
    .select('*')
    .single()

  if (error || !inserted) return { error: error?.message ?? 'Insert failed.' }

  const newTask: TaskWithProfile = {
    ...inserted,
    completed_by: null,
    assigned_to:  null,
  }

  if (input.assigned_to_id) {
    void maybeSendAssignmentEmail(
      serviceRole, input.assigned_to_id, session.user.id, profile.full_name,
      input.title, service.family_name, serviceId,
    )
  }

  return { data: newTask }
}

// ── Delete a not-started task from a service ──────────────────────────────

export async function deleteServiceTask(
  taskId: string,
): Promise<{ error?: string }> {
  const supabase    = createClient()
  const serviceRole = createServiceRoleClient()

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { error: 'Not authenticated.' }

  const { data: profile } = await serviceRole
    .from('profiles')
    .select('funeral_home_id, role, full_name')
    .eq('id', session.user.id)
    .single()

  if (!profile || !['owner', 'fd'].includes(profile.role))
    return { error: 'Insufficient permissions.' }

  const { data: task } = await serviceRole
    .from('tasks')
    .select('funeral_home_id, status')
    .eq('id', taskId)
    .single()

  if (!task || task.funeral_home_id !== profile.funeral_home_id)
    return { error: 'Task not found.' }

  if (task.status === 'complete')
    return { error: 'Cannot delete a completed task.' }

  const { error } = await serviceRole.from('tasks').delete().eq('id', taskId)
  if (error) return { error: error.message }

  return {}
}

// ── Inline-edit title and confirmation_hint on a not-started task ─────────

export async function updateServiceTask(
  taskId: string,
  input: { title: string; confirmation_hint: string },
): Promise<{ error?: string }> {
  const supabase    = createClient()
  const serviceRole = createServiceRoleClient()

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { error: 'Not authenticated.' }

  const { data: profile } = await serviceRole
    .from('profiles')
    .select('funeral_home_id, role, full_name')
    .eq('id', session.user.id)
    .single()

  if (!profile || !['owner', 'fd'].includes(profile.role))
    return { error: 'Insufficient permissions.' }

  const { data: task } = await serviceRole
    .from('tasks')
    .select('funeral_home_id, status')
    .eq('id', taskId)
    .single()

  if (!task || task.funeral_home_id !== profile.funeral_home_id)
    return { error: 'Task not found.' }

  if (task.status === 'complete')
    return { error: 'Cannot edit a completed task.' }

  const { error } = await serviceRole
    .from('tasks')
    .update({ title: input.title, confirmation_hint: input.confirmation_hint })
    .eq('id', taskId)

  if (error) return { error: error.message }

  return {}
}

// ── Update notes on any task (all statuses allowed) ───────────────────────

export async function updateTaskNotes(
  taskId: string,
  notes:  string | null,
): Promise<{ error?: string }> {
  const supabase    = createClient()
  const serviceRole = createServiceRoleClient()

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { error: 'Not authenticated.' }

  const { data: profile } = await serviceRole
    .from('profiles')
    .select('funeral_home_id, role, full_name')
    .eq('id', session.user.id)
    .single()

  if (!profile || !['owner', 'fd'].includes(profile.role))
    return { error: 'Insufficient permissions.' }

  const { data: task } = await serviceRole
    .from('tasks')
    .select('funeral_home_id')
    .eq('id', taskId)
    .single()

  if (!task || task.funeral_home_id !== profile.funeral_home_id)
    return { error: 'Task not found.' }

  const { error } = await serviceRole
    .from('tasks')
    .update({ notes: notes || null })
    .eq('id', taskId)

  if (error) return { error: error.message }

  return {}
}

// ── Reassign a task to a different user (or unassign) ─────────────────────

export async function reassignTask(
  taskId:        string,
  assignedToId:  string | null,
): Promise<{ error?: string }> {
  const supabase    = createClient()
  const serviceRole = createServiceRoleClient()

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { error: 'Not authenticated.' }

  const { data: profile } = await serviceRole
    .from('profiles')
    .select('funeral_home_id, role, full_name')
    .eq('id', session.user.id)
    .single()

  if (!profile || !['owner', 'fd'].includes(profile.role))
    return { error: 'Insufficient permissions.' }

  const { data: task } = await serviceRole
    .from('tasks')
    .select('funeral_home_id, title, service_id, services(family_name)')
    .eq('id', taskId)
    .single()

  if (!task || task.funeral_home_id !== profile.funeral_home_id)
    return { error: 'Task not found.' }

  const { error } = await serviceRole
    .from('tasks')
    .update({ assigned_to_id: assignedToId })
    .eq('id', taskId)

  if (error) return { error: error.message }

  if (assignedToId && task.service_id) {
    const svc = task.services as unknown as { family_name: string } | null
    void maybeSendAssignmentEmail(
      serviceRole, assignedToId, session.user.id, profile.full_name,
      task.title, svc?.family_name ?? '', task.service_id,
    )
  }

  return {}
}
