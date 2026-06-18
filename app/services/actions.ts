'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import type { Priority, ServiceType } from '@/lib/types'

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

export async function createService(input: CreateServiceInput): Promise<{ error?: string }> {
  const supabase    = createClient()
  const serviceRole = createServiceRoleClient()

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { error: 'Not authenticated.' }

  const { data: profile } = await serviceRole
    .from('profiles')
    .select('funeral_home_id, role')
    .eq('id', session.user.id)
    .single()

  if (!profile) return { error: 'Profile not found.' }
  if (!['owner', 'fd'].includes(profile.role)) return { error: 'Insufficient permissions.' }

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
      contact_name:      input.contact_name  || null,
      contact_phone:     input.contact_phone || null,
      contact_email:     input.contact_email || null,
      created_by_id:     session.user.id,
      status:            'active',
    })
    .select('id')
    .single()

  if (insertError || !service)
    return { error: insertError?.message ?? 'Failed to create service.' }

  // Only generate tasks if a service type was selected
  if (input.service_type) {
    const { error: rpcError } = await serviceRole.rpc('generate_tasks_for_service', {
      p_service_id: service.id,
    })
    if (rpcError) return { error: rpcError.message }
  }

  revalidatePath('/dashboard')
  return {}
}

// ── Update service notes ───────────────────────────────────────────────────

export async function updateServiceNotes(
  serviceId: string,
  notes: string | null,
): Promise<{ error?: string }> {
  const supabase    = createClient()
  const serviceRole = createServiceRoleClient()

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { error: 'Not authenticated.' }

  const { data: profile } = await serviceRole
    .from('profiles')
    .select('funeral_home_id, role')
    .eq('id', session.user.id)
    .single()

  if (!profile || !['owner', 'fd'].includes(profile.role))
    return { error: 'Insufficient permissions.' }

  const { error } = await serviceRole
    .from('services')
    .update({ notes: notes || null })
    .eq('id', serviceId)
    .eq('funeral_home_id', profile.funeral_home_id)

  if (error) return { error: error.message }
  return {}
}

// ── Update service contact info ───────────────────────────────────────────

export async function updateServiceContact(
  serviceId: string,
  contact: { contact_name: string | null; contact_phone: string | null; contact_email: string | null },
): Promise<{ error?: string }> {
  const supabase    = createClient()
  const serviceRole = createServiceRoleClient()

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { error: 'Not authenticated.' }

  const { data: profile } = await serviceRole
    .from('profiles')
    .select('funeral_home_id, role')
    .eq('id', session.user.id)
    .single()

  if (!profile || !['owner', 'fd'].includes(profile.role))
    return { error: 'Insufficient permissions.' }

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
  const supabase    = createClient()
  const serviceRole = createServiceRoleClient()

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { error: 'Not authenticated.' }

  const { data: profile } = await serviceRole
    .from('profiles')
    .select('funeral_home_id, role')
    .eq('id', session.user.id)
    .single()

  if (!profile || !['owner', 'fd'].includes(profile.role))
    return { error: 'Insufficient permissions.' }

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
  const supabase    = createClient()
  const serviceRole = createServiceRoleClient()

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { added: 0, skipped: 0, error: 'Not authenticated.' }

  const { data: profile } = await serviceRole
    .from('profiles')
    .select('funeral_home_id, role')
    .eq('id', session.user.id)
    .single()

  if (!profile || !['owner', 'fd'].includes(profile.role))
    return { added: 0, skipped: 0, error: 'Insufficient permissions.' }

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

  for (const tpl of templates) {
    if (existingTitles.has(tpl.title.toLowerCase().trim())) {
      skipped++
      continue
    }

    const { error: insertErr } = await serviceRole.from('tasks').insert({
      service_id:        serviceId,
      funeral_home_id:   profile.funeral_home_id,
      title:             tpl.title,
      category:          tpl.category,
      confirmation_hint: tpl.confirmation_hint,
      due_days_before:   tpl.due_days_before,
      priority:          (tpl.priority ?? 'standard') as Priority,
      notes:             tpl.notes ?? null,
      sort_order:        maxOrder + added + 1,
      status:            'not-started',
      assigned_to_id:    null,
    })

    if (!insertErr) {
      added++
      existingTitles.add(tpl.title.toLowerCase().trim())
    }
  }

  // Update the service record with the selected service type
  await serviceRole
    .from('services')
    .update({ service_type: serviceType })
    .eq('id', serviceId)

  revalidatePath(`/services/${serviceId}`)
  revalidatePath('/dashboard')
  return { added, skipped }
}
