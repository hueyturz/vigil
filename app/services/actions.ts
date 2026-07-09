'use server'

import { revalidatePath } from 'next/cache'
import { getActionContext } from '@/lib/utils/impersonation'
import { sendAndLogSms } from '@/lib/utils/sms'
import { sendAndLogEmail } from '@/lib/utils/email-notify'
import { newServiceEmail } from '@/lib/utils/email-templates'
import { formatDate } from '@/lib/utils/date-helpers'
import type { Priority, ServiceType, ServiceNote } from '@/lib/types'

const SERVICE_TYPE_LABELS: Record<string, string> = {
  'full-burial': 'Full Burial',
  'graveside':   'Graveside',
  'cremation':   'Cremation',
  'military':    'Military Honors',
}

interface CreateServiceInput {
  family_name:       string
  deceased_name:     string
  service_type:      ServiceType | null
  service_date:      string | null
  location:          string | null
  assigned_staff_id: string | null
  contact_name?:     string | null
  contact_phone?:    string | null
  contact_email?:    string | null
}

export async function createService(input: CreateServiceInput): Promise<{ data?: { id: string }; error?: string }> {
  const ctx = await getActionContext()
  if (!ctx) return { error: 'Not authenticated.' }
  if (input.deceased_name.length > 255 || input.family_name.length > 255) {
    return { error: 'Names must be 255 characters or fewer.' }
  }
  if (!['owner', 'fd'].includes(ctx.role)) return { error: 'Insufficient permissions.' }
  const serviceRole = ctx.serviceRole
  const profile = { funeral_home_id: ctx.funeralHomeId, role: ctx.role, full_name: ctx.fullName }
  const userId = ctx.userId

  const { data: service, error: insertError } = await serviceRole
    .from('services')
    .insert({
      funeral_home_id:   profile.funeral_home_id,
      family_name:       input.family_name,
      deceased_name:     input.deceased_name,
      service_type:      input.service_type ?? null,
      service_date:      input.service_date  || null,
      location:          input.location      || null,
      assigned_staff_id: input.assigned_staff_id || null,
      created_by_id:     userId,
      status:            'active',
    })
    .select('id')
    .single()

  if (insertError || !service)
    return { error: insertError?.message ?? 'Failed to create service.' }

  // Contacts now live in service_contacts. If an initial contact was provided,
  // store it there as the primary contact (we no longer write contact_* on services).
  if (input.contact_name && input.contact_name.trim()) {
    await serviceRole.from('service_contacts').insert({
      service_id:      service.id,
      funeral_home_id: profile.funeral_home_id,
      name:            input.contact_name.trim(),
      phone:           input.contact_phone?.trim() || null,
      email:           input.contact_email?.trim() || null,
      is_primary:      true,
    })
  }

  // Only generate tasks if a service type was selected
  if (input.service_type) {
    const { error: rpcError } = await serviceRole.rpc('generate_tasks_for_service', {
      p_service_id: service.id,
    })
    if (rpcError) return { error: rpcError.message }
  }

  // Notify opted-in managers of the new service via SMS (best-effort; never
  // blocks service creation, and the creator is not notified of their own action).
  try {
    const { data: managers } = await serviceRole
      .from('profiles')
      .select('id, phone')
      .eq('funeral_home_id', profile.funeral_home_id)
      .in('role', ['owner', 'fd'])
      .eq('is_active', true)

    const managerIds = (managers ?? []).map(m => m.id)
    if (managerIds.length > 0) {
      const { data: prefRows } = await serviceRole
        .from('notification_preferences')
        .select('user_id, sms_new_service_created, email_new_service_created')
        .in('user_id', managerIds)

      const smsOptedIn   = new Set((prefRows ?? []).filter(p => p.sms_new_service_created).map(p => p.user_id))
      const emailOptedIn = new Set((prefRows ?? []).filter(p => p.email_new_service_created).map(p => p.user_id))
      const typeLabel = input.service_type
        ? (SERVICE_TYPE_LABELS[input.service_type] ?? input.service_type)
        : 'service type TBD'
      const dateStr = input.service_date ? formatDate(input.service_date) : 'date TBD'
      const message = `Vigilight: New service created — ${input.family_name} (${typeLabel}, ${dateStr}). Txt STOP to opt out.`

      // SMS
      for (const m of managers ?? []) {
        if (m.id === userId) continue                 // don't notify the creator
        if (!smsOptedIn.has(m.id) || !m.phone) continue
        await sendAndLogSms(serviceRole, {
          funeralHomeId: profile.funeral_home_id,
          serviceId:     service.id,
          taskId:        null,
          recipientId:   m.id,
          phone:         m.phone,
          message,
        })
      }

      // Email (item 6)
      const { subject, html } = newServiceEmail({
        familyName:    input.family_name,
        typeLabel,
        dateStr,
        serviceId:     service.id,
        createdByName: profile.full_name,
      })
      for (const m of managers ?? []) {
        if (m.id === userId) continue                 // don't notify the creator
        if (!emailOptedIn.has(m.id)) continue
        const { data: authData } = await serviceRole.auth.admin.getUserById(m.id)
        const recipientEmail = authData?.user?.email
        if (!recipientEmail) continue
        await sendAndLogEmail(serviceRole, {
          funeralHomeId:  profile.funeral_home_id,
          serviceId:      service.id,
          taskId:         null,
          recipientId:    m.id,
          recipientEmail,
          subject,
          html,
          stage:          'new-service',
        })
      }
    }
  } catch (notifyErr) {
    console.error('[createService] new-service notify failed:', notifyErr instanceof Error ? notifyErr.message : notifyErr)
  }

  revalidatePath('/dashboard')
  return { data: { id: service.id } }
}

// ── Duplicate an existing service (template-style copy) ────────────────────
// Copies the service fields and its task checklist into a fresh service. Does
// NOT copy contacts, meetings, or intake sessions. The new service starts with
// no date, a "(Copy)" name, and all tasks reset to not-started / unassigned.

export async function duplicateService(
  serviceId: string,
): Promise<{ data?: { id: string }; error?: string }> {
  const ctx = await getActionContext()
  if (!ctx) return { error: 'Not authenticated.' }
  if (!['owner', 'fd'].includes(ctx.role)) return { error: 'Insufficient permissions.' }
  const serviceRole = ctx.serviceRole

  const { data: original } = await serviceRole
    .from('services')
    .select('family_name, deceased_name, service_type, location, assigned_staff_id, notes')
    .eq('id', serviceId)
    .eq('funeral_home_id', ctx.funeralHomeId)
    .single()

  if (!original) return { error: 'Service not found.' }

  const { data: copy, error: insertError } = await serviceRole
    .from('services')
    .insert({
      funeral_home_id:   ctx.funeralHomeId,
      family_name:       original.family_name,
      deceased_name:     `${original.deceased_name} (Copy)`,
      service_type:      original.service_type ?? null,
      service_date:      null,                       // dates differ — don't copy
      location:          original.location ?? null,
      assigned_staff_id: original.assigned_staff_id ?? null,
      notes:             original.notes ?? null,
      created_by_id:     ctx.userId,
      status:            'active',
    })
    .select('id')
    .single()

  if (insertError || !copy) return { error: insertError?.message ?? 'Failed to duplicate service.' }

  // Copy the task checklist (reset progress/assignment). sort_order and
  // confirmation_hint are NOT NULL, so they must be carried over.
  const { data: originalTasks } = await serviceRole
    .from('tasks')
    .select('title, confirmation_hint, due_days_before, priority, notes, sort_order')
    .eq('service_id', serviceId)
    .order('sort_order', { ascending: true })

  if (originalTasks && originalTasks.length > 0) {
    const { error: taskError } = await serviceRole.from('tasks').insert(
      originalTasks.map(t => ({
        service_id:        copy.id,
        funeral_home_id:   ctx.funeralHomeId,
        title:             t.title,
        confirmation_hint: t.confirmation_hint,
        due_days_before:   t.due_days_before,
        priority:          (t.priority ?? 'standard') as Priority,
        notes:             t.notes ?? null,
        sort_order:        t.sort_order,
        status:            'not-started',            // schema CHECK: 'not-started' | 'complete'
        assigned_to_id:    null,
      })),
    )
    if (taskError) return { error: taskError.message }
  }

  revalidatePath('/services')
  revalidatePath('/dashboard')
  return { data: { id: copy.id } }
}

// ── Update service fields (Edit Service modal) ────────────────────────────

interface UpdateServiceInput {
  family_name:       string
  deceased_name:     string
  service_type:      ServiceType | null
  service_date:      string | null
  location:          string | null
  assigned_staff_id: string | null
  // Contact fields are optional — contacts are managed in service_contacts now.
  // When provided, we sync them to the service's primary contact instead of the
  // (deprecated) contact_* columns on the services table.
  contact_name?:     string | null
  contact_phone?:    string | null
  contact_email?:    string | null
}

export async function updateService(
  serviceId: string,
  input: UpdateServiceInput,
): Promise<{ error?: string }> {
  const ctx = await getActionContext()
  if (!ctx) return { error: 'Not authenticated.' }
  if (input.deceased_name.length > 255 || input.family_name.length > 255) {
    return { error: 'Names must be 255 characters or fewer.' }
  }
  if (!['owner', 'fd'].includes(ctx.role)) return { error: 'Insufficient permissions.' }
  const serviceRole = ctx.serviceRole
  const profile = { funeral_home_id: ctx.funeralHomeId, role: ctx.role, full_name: ctx.fullName }

  const { error } = await serviceRole
    .from('services')
    .update({
      family_name:       input.family_name,
      deceased_name:     input.deceased_name,
      service_type:      input.service_type      || null,
      service_date:      input.service_date       || null,
      location:          input.location           || null,
      assigned_staff_id: input.assigned_staff_id  || null,
    })
    .eq('id', serviceId)
    .eq('funeral_home_id', profile.funeral_home_id)

  if (error) return { error: error.message }

  // If a contact name was supplied, sync the contact fields to the primary contact
  // row (kept for backwards compatibility — the Edit Service modal no longer sends
  // these; `name` is NOT NULL, so we only sync when a real name is present).
  if (input.contact_name && input.contact_name.trim()) {
    await serviceRole
      .from('service_contacts')
      .update({
        name:  input.contact_name.trim(),
        phone: input.contact_phone?.trim() || null,
        email: input.contact_email?.trim() || null,
      })
      .eq('service_id', serviceId)
      .eq('funeral_home_id', profile.funeral_home_id)
      .eq('is_primary', true)
  }

  revalidatePath(`/services/${serviceId}`)
  return {}
}

// ── Update service notes ───────────────────────────────────────────────────

export async function updateServiceNotes(
  serviceId: string,
  notes: string | null,
): Promise<{ error?: string }> {
  const ctx = await getActionContext()
  if (!ctx) return { error: 'Not authenticated.' }
  if (!['owner', 'fd'].includes(ctx.role)) return { error: 'Insufficient permissions.' }
  const serviceRole = ctx.serviceRole
  const profile = { funeral_home_id: ctx.funeralHomeId, role: ctx.role, full_name: ctx.fullName }

  const { error } = await serviceRole
    .from('services')
    .update({ notes: notes || null })
    .eq('id', serviceId)
    .eq('funeral_home_id', profile.funeral_home_id)

  if (error) return { error: error.message }
  return {}
}

// ── Service notes (authored, dated rows in service_notes) ─────────────────

export async function addServiceNote(
  serviceId: string,
  content:   string,
): Promise<{ data?: ServiceNote; error?: string }> {
  const trimmed = content.trim()
  if (!trimmed) return { error: 'Note cannot be empty.' }

  const ctx = await getActionContext()
  if (!ctx) return { error: 'Not authenticated.' }
  if (!['owner', 'fd'].includes(ctx.role)) return { error: 'Insufficient permissions.' }
  const serviceRole = ctx.serviceRole
  const profile = { funeral_home_id: ctx.funeralHomeId, role: ctx.role, full_name: ctx.fullName }
  const userId = ctx.userId

  const { data: service } = await serviceRole
    .from('services')
    .select('id')
    .eq('id', serviceId)
    .eq('funeral_home_id', profile.funeral_home_id)
    .single()

  if (!service) return { error: 'Service not found.' }

  const { data: inserted, error } = await serviceRole
    .from('service_notes')
    .insert({
      service_id:      serviceId,
      funeral_home_id: profile.funeral_home_id,
      author_id:       userId,
      author_name:     profile.full_name,
      content:         trimmed,
    })
    .select('*')
    .single()

  if (error || !inserted) return { error: error?.message ?? 'Failed to save note.' }

  return { data: inserted as ServiceNote }
}

export async function deleteServiceNote(
  noteId: string,
): Promise<{ error?: string }> {
  const ctx = await getActionContext()
  if (!ctx) return { error: 'Not authenticated.' }
  if (!['owner', 'fd'].includes(ctx.role)) return { error: 'Insufficient permissions.' }
  const serviceRole = ctx.serviceRole
  const profile = { funeral_home_id: ctx.funeralHomeId, role: ctx.role, full_name: ctx.fullName }

  const { data: note } = await serviceRole
    .from('service_notes')
    .select('funeral_home_id')
    .eq('id', noteId)
    .single()

  if (!note || note.funeral_home_id !== profile.funeral_home_id)
    return { error: 'Note not found.' }

  const { error } = await serviceRole.from('service_notes').delete().eq('id', noteId)
  if (error) return { error: error.message }
  return {}
}

// ── Update service contact info ───────────────────────────────────────────

export async function updateServiceContact(
  serviceId: string,
  contact: { contact_name: string | null; contact_phone: string | null; contact_email: string | null },
): Promise<{ error?: string }> {
  const ctx = await getActionContext()
  if (!ctx) return { error: 'Not authenticated.' }
  if (!['owner', 'fd'].includes(ctx.role)) return { error: 'Insufficient permissions.' }
  const serviceRole = ctx.serviceRole
  const profile = { funeral_home_id: ctx.funeralHomeId, role: ctx.role, full_name: ctx.fullName }

  const { error } = await serviceRole
    .from('services')
    .update({
      contact_name:  contact.contact_name  || null,
      contact_phone: contact.contact_phone || null,
      contact_email: contact.contact_email || null,
    })
    .eq('id', serviceId)
    .eq('funeral_home_id', profile.funeral_home_id)

  if (error) return { error: error.message }
  return {}
}

// ── Update service status (complete / reopen) ─────────────────────────────

export async function updateServiceStatus(
  serviceId: string,
  status: 'active' | 'completed',
): Promise<{ error?: string }> {
  const ctx = await getActionContext()
  if (!ctx) return { error: 'Not authenticated.' }
  if (!['owner', 'fd'].includes(ctx.role)) return { error: 'Insufficient permissions.' }
  const serviceRole = ctx.serviceRole
  const profile = { funeral_home_id: ctx.funeralHomeId, role: ctx.role, full_name: ctx.fullName }

  const { error } = await serviceRole
    .from('services')
    .update({ status })
    .eq('id', serviceId)
    .eq('funeral_home_id', profile.funeral_home_id)

  if (error) return { error: error.message }
  revalidatePath(`/services/${serviceId}`)
  revalidatePath('/dashboard')
  return {}
}

// ── Apply a template to an existing service (with deduplication) ──────────

export async function applyTemplateToService(
  serviceId:   string,
  serviceType: ServiceType,
): Promise<{ added: number; skipped: number; error?: string }> {
  const ctx = await getActionContext()
  if (!ctx) return { added: 0, skipped: 0, error: 'Not authenticated.' }
  if (!['owner', 'fd'].includes(ctx.role)) return { added: 0, skipped: 0, error: 'Insufficient permissions.' }
  const serviceRole = ctx.serviceRole
  const profile = { funeral_home_id: ctx.funeralHomeId, role: ctx.role, full_name: ctx.fullName }

  // Verify service belongs to this funeral home
  const { data: service } = await serviceRole
    .from('services')
    .select('id, funeral_home_id')
    .eq('id', serviceId)
    .eq('funeral_home_id', profile.funeral_home_id)
    .single()

  if (!service) return { added: 0, skipped: 0, error: 'Service not found.' }

  // Fetch existing task titles for deduplication
  const { data: existingTasks } = await serviceRole
    .from('tasks')
    .select('title, sort_order')
    .eq('service_id', serviceId)
    .order('sort_order', { ascending: false })

  const existingTitles = new Set(
    (existingTasks ?? []).map(t => t.title.toLowerCase().trim())
  )
  const maxOrder = existingTasks?.[0]?.sort_order ?? 0

  // Fetch templates: prefer custom, fall back to system defaults
  const { data: customTemplates } = await serviceRole
    .from('task_templates')
    .select('*')
    .eq('funeral_home_id', profile.funeral_home_id)
    .eq('service_type', serviceType)
    .order('sort_order', { ascending: true })

  let templates = customTemplates ?? []
  if (templates.length === 0) {
    const { data: systemTemplates } = await serviceRole
      .from('task_templates')
      .select('*')
      .is('funeral_home_id', null)
      .eq('service_type', serviceType)
      .order('sort_order', { ascending: true })
    templates = systemTemplates ?? []
  }

  if (templates.length === 0)
    return { added: 0, skipped: 0, error: 'No templates found for this service type.' }

  let added   = 0
  let skipped = 0

  // Batch-fetch every template's subtasks and tags up front (session 10 #7) —
  // previously two queries PER template inside the loop (N+1).
  const templateIds = templates.map(t => t.id)
  const [{ data: allSubtasks }, { data: allTplTags }] = await Promise.all([
    serviceRole
      .from('task_template_subtasks')
      .select('template_id, title, sort_order')
      .in('template_id', templateIds)
      .order('sort_order', { ascending: true }),
    serviceRole
      .from('template_task_tags')
      .select('template_task_id, tag_id')
      .in('template_task_id', templateIds),
  ])
  const subtasksByTemplate = new Map<string, { title: string; sort_order: number }[]>()
  for (const s of allSubtasks ?? []) {
    const arr = subtasksByTemplate.get(s.template_id) ?? []
    arr.push({ title: s.title, sort_order: s.sort_order })
    subtasksByTemplate.set(s.template_id, arr)
  }
  const tagsByTemplate = new Map<string, string[]>()
  for (const tt of allTplTags ?? []) {
    const arr = tagsByTemplate.get(tt.template_task_id) ?? []
    arr.push(tt.tag_id)
    tagsByTemplate.set(tt.template_task_id, arr)
  }

  for (const tpl of templates) {
    if (existingTitles.has(tpl.title.toLowerCase().trim())) {
      skipped++
      continue
    }

    const { data: insertedTask, error: insertErr } = await serviceRole.from('tasks').insert({
      service_id:        serviceId,
      funeral_home_id:   profile.funeral_home_id,
      title:             tpl.title,
      confirmation_hint: tpl.confirmation_hint,
      due_days_before:   tpl.due_days_before,
      priority:          (tpl.priority ?? 'standard') as Priority,
      notes:             tpl.notes ?? null,
      sort_order:        maxOrder + added + 1,
      status:            'not-started',
      assigned_to_id:    null,
    }).select('id').single()

    if (!insertErr && insertedTask) {
      added++
      existingTitles.add(tpl.title.toLowerCase().trim())

      // Copy template subtasks to task subtasks (pre-fetched — no per-template query)
      const tplSubtasks = subtasksByTemplate.get(tpl.id) ?? []
      if (tplSubtasks.length) {
        await serviceRole.from('task_subtasks').insert(
          tplSubtasks.map(s => ({
            task_id:        insertedTask.id,
            funeral_home_id: profile.funeral_home_id,
            title:          s.title,
            sort_order:     s.sort_order,
            is_complete:    false,
          }))
        )
      }

      // Carry the template task's tags onto the new task (pre-fetched)
      const tplTagIds = tagsByTemplate.get(tpl.id) ?? []
      if (tplTagIds.length) {
        await serviceRole.from('task_tags').upsert(
          tplTagIds.map(tag_id => ({ task_id: insertedTask.id, tag_id })),
          { onConflict: 'task_id,tag_id', ignoreDuplicates: true },
        )
      }
    }
  }

  // Update the service record with the selected service type
  await serviceRole
    .from('services')
    .update({ service_type: serviceType })
    .eq('id', serviceId)
    .eq('funeral_home_id', profile.funeral_home_id)

  revalidatePath(`/services/${serviceId}`)
  revalidatePath('/dashboard')
  return { added, skipped }
}
