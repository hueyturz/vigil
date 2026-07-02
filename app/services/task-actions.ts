'use server'

import * as Sentry from '@sentry/nextjs'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getActionContext } from '@/lib/utils/impersonation'
import { sendEmail } from '@/lib/utils/email'
import { taskAssignedEmail } from '@/lib/utils/email-templates'
import { sendAndLogSms } from '@/lib/utils/sms'
import { formatDate } from '@/lib/utils/date-helpers'
import type { TaskWithProfile } from '@/lib/types'

// SMS the newly-assigned user (best-effort) if they've opted in (default on).
// Never notifies the actor about a self-assignment.
async function maybeSendAssignmentSms(
  serviceRole: ReturnType<typeof createServiceRoleClient>,
  args: {
    assignedToId:  string
    actorId:       string
    taskId:        string
    funeralHomeId: string
    serviceId:     string
    taskTitle:     string
    familyName:    string
    serviceDate:   string | null
    dueDaysBefore: number
  },
): Promise<void> {
  if (args.assignedToId === args.actorId) return
  try {
    const { data: assignee } = await serviceRole
      .from('profiles')
      .select('phone')
      .eq('id', args.assignedToId)
      .single()
    if (!assignee?.phone) return

    const { data: pref } = await serviceRole
      .from('notification_preferences')
      .select('sms_task_assigned')
      .eq('user_id', args.assignedToId)
      .maybeSingle()
    const optedIn = pref ? !!pref.sms_task_assigned : true   // default true
    if (!optedIn) return

    const dateStr = args.serviceDate ? formatDate(args.serviceDate) : 'date TBD'
    const due = args.dueDaysBefore === 0
      ? 'on the day of service'
      : `${args.dueDaysBefore} day${args.dueDaysBefore !== 1 ? 's' : ''} before service`
    const message = `Vigilight: You've been assigned '${args.taskTitle}' for the ${args.familyName} service (${dateStr}). Due ${due}. Txt STOP to opt out.`

    await sendAndLogSms(serviceRole, {
      funeralHomeId: args.funeralHomeId,
      serviceId:     args.serviceId,
      taskId:        args.taskId,
      recipientId:   args.assignedToId,
      phone:         assignee.phone,
      message,
    })
  } catch (err) {
    console.error('[assignment sms] failed:', err instanceof Error ? err.message : err)
  }
}

async function maybeSendAssignmentEmail(
  serviceRole: ReturnType<typeof createServiceRoleClient>,
  assignedToId: string,
  actorId: string,
  actorName: string,
  taskTitle: string,
  familyName: string,
  serviceId: string,
  funeralHomeId: string,
  taskId: string | null,
) {
  if (assignedToId === actorId) return
  try {
    // Respect the assignee's email preference (defaults on when no row exists).
    const { data: pref } = await serviceRole
      .from('notification_preferences')
      .select('email_task_assigned')
      .eq('user_id', assignedToId)
      .maybeSingle()
    if (pref && !pref.email_task_assigned) return

    const { data: authData } = await serviceRole.auth.admin.getUserById(assignedToId)
    const email = authData?.user?.email
    if (!email) return
    const { subject, html } = taskAssignedEmail({ taskTitle, familyName, serviceId, actorName })
    const result = await sendEmail({ to: email, subject, html })

    // Audit trail: assignment emails were previously unlogged and failures
    // fully swallowed (audit C5/H8). Log every attempt; report failures.
    await serviceRole.from('email_log').insert({
      funeral_home_id: funeralHomeId,
      service_id:      serviceId,
      task_id:         taskId,
      recipient_id:    assignedToId,
      recipient_email: email,
      subject,
      status:          result.success ? 'sent' : 'failed',
      error_message:   result.error ?? null,
    })
    if (!result.success) {
      Sentry.captureMessage('[task-assigned] email failed', {
        level: 'error',
        tags:  { channel: 'email', stage: 'task-assigned' },
        extra: { taskId, funeralHomeId, error: result.error },
      })
    }
  } catch (err) {
    // Still fire-and-forget (assignment must not fail on email problems), but
    // no longer invisible.
    Sentry.captureException(err, {
      tags:  { channel: 'email', stage: 'task-assigned' },
      extra: { taskId, funeralHomeId },
    })
    console.error('[task-assigned] email error:', err instanceof Error ? err.message : err)
  }
}

// ── Add a custom task to a specific service ────────────────────────────────

export async function addTaskToService(
  serviceId: string,
  input: {
    title: string
    confirmation_hint: string
    due_days_before: number
    assigned_to_id?: string | null
  },
): Promise<{ data?: TaskWithProfile; error?: string }> {
  const ctx = await getActionContext()
  if (!ctx) return { error: 'Not authenticated.' }
  if (!['owner', 'fd'].includes(ctx.role)) return { error: 'Insufficient permissions.' }
  const serviceRole = ctx.serviceRole
  const profile = { funeral_home_id: ctx.funeralHomeId, role: ctx.role, full_name: ctx.fullName }

  const { data: service } = await serviceRole
    .from('services')
    .select('funeral_home_id, deceased_name, service_date')
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
      serviceRole, input.assigned_to_id, ctx.userId, profile.full_name,
      input.title, service.deceased_name, serviceId,
      profile.funeral_home_id, inserted.id,
    )
    void maybeSendAssignmentSms(serviceRole, {
      assignedToId:  input.assigned_to_id,
      actorId:       ctx.userId,
      taskId:        inserted.id,
      funeralHomeId: profile.funeral_home_id,
      serviceId,
      taskTitle:     input.title,
      familyName:    service.deceased_name,
      serviceDate:   service.service_date ?? null,
      dueDaysBefore: input.due_days_before,
    })
  }

  return { data: newTask }
}

// ── Delete a not-started task from a service ──────────────────────────────

export async function deleteServiceTask(
  taskId: string,
): Promise<{ error?: string }> {
  const ctx = await getActionContext()
  if (!ctx) return { error: 'Not authenticated.' }
  if (!['owner', 'fd'].includes(ctx.role)) return { error: 'Insufficient permissions.' }
  const serviceRole = ctx.serviceRole
  const profile = { funeral_home_id: ctx.funeralHomeId, role: ctx.role, full_name: ctx.fullName }

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
  const ctx = await getActionContext()
  if (!ctx) return { error: 'Not authenticated.' }
  if (!['owner', 'fd'].includes(ctx.role)) return { error: 'Insufficient permissions.' }
  const serviceRole = ctx.serviceRole
  const profile = { funeral_home_id: ctx.funeralHomeId, role: ctx.role, full_name: ctx.fullName }

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

// ── Update the due offset (days before service) on a not-started task ─────

export async function updateTaskDueDays(
  taskId:        string,
  dueDaysBefore: number,
): Promise<{ error?: string }> {
  if (!Number.isInteger(dueDaysBefore)) return { error: 'Invalid due date.' }

  const ctx = await getActionContext()
  if (!ctx) return { error: 'Not authenticated.' }
  if (!['owner', 'fd'].includes(ctx.role)) return { error: 'Insufficient permissions.' }
  const serviceRole = ctx.serviceRole
  const profile = { funeral_home_id: ctx.funeralHomeId, role: ctx.role, full_name: ctx.fullName }

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
    .update({ due_days_before: dueDaysBefore })
    .eq('id', taskId)

  if (error) return { error: error.message }

  return {}
}

// ── Update notes on any task (all statuses allowed) ───────────────────────

export async function updateTaskNotes(
  taskId: string,
  notes:  string | null,
): Promise<{ error?: string }> {
  const ctx = await getActionContext()
  if (!ctx) return { error: 'Not authenticated.' }
  if (!['owner', 'fd'].includes(ctx.role)) return { error: 'Insufficient permissions.' }
  const serviceRole = ctx.serviceRole
  const profile = { funeral_home_id: ctx.funeralHomeId, role: ctx.role, full_name: ctx.fullName }

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
  const ctx = await getActionContext()
  if (!ctx) return { error: 'Not authenticated.' }
  if (!['owner', 'fd'].includes(ctx.role)) return { error: 'Insufficient permissions.' }
  const serviceRole = ctx.serviceRole
  const profile = { funeral_home_id: ctx.funeralHomeId, role: ctx.role, full_name: ctx.fullName }

  const { data: task } = await serviceRole
    .from('tasks')
    .select('funeral_home_id, title, service_id, due_days_before, services(deceased_name, service_date)')
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
    const svc = task.services as unknown as { deceased_name: string; service_date: string | null } | null
    void maybeSendAssignmentEmail(
      serviceRole, assignedToId, ctx.userId, profile.full_name,
      task.title, svc?.deceased_name ?? '', task.service_id,
      task.funeral_home_id, taskId,
    )
    void maybeSendAssignmentSms(serviceRole, {
      assignedToId,
      actorId:       ctx.userId,
      taskId,
      funeralHomeId: task.funeral_home_id,
      serviceId:     task.service_id,
      taskTitle:     task.title,
      familyName:    svc?.deceased_name ?? '',
      serviceDate:   svc?.service_date ?? null,
      dueDaysBefore: task.due_days_before,
    })
  }

  return {}
}

// ── Update a task's sort_order (drag-to-reorder) ──────────────────────────

export async function updateTaskOrder(
  taskId:       string,
  newSortOrder: number,
): Promise<{ error?: string }> {
  if (!Number.isInteger(newSortOrder)) return { error: 'Invalid sort order.' }

  const ctx = await getActionContext()
  if (!ctx) return { error: 'Not authenticated.' }
  if (!['owner', 'fd'].includes(ctx.role)) return { error: 'Insufficient permissions.' }
  const serviceRole = ctx.serviceRole

  const { data: task } = await serviceRole
    .from('tasks')
    .select('funeral_home_id')
    .eq('id', taskId)
    .single()

  if (!task || task.funeral_home_id !== ctx.funeralHomeId)
    return { error: 'Task not found.' }

  const { error } = await serviceRole
    .from('tasks')
    .update({ sort_order: newSortOrder })
    .eq('id', taskId)

  if (error) return { error: error.message }

  return {}
}
