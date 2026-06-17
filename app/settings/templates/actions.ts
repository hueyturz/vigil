'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import type { ServiceType, TaskTemplate } from '@/lib/types'

// ── Helper: verify caller is owner or fd and return funeral_home_id ──────────

async function requireFdOrOwner(): Promise<{ funeralHomeId: string } | { error: string }> {
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

  return { funeralHomeId: profile.funeral_home_id }
}

// ── Copy system defaults into custom templates for this funeral home ─────────

export async function customizeTemplate(
  serviceType: ServiceType,
): Promise<{ data?: TaskTemplate[]; error?: string }> {
  const auth = await requireFdOrOwner()
  if ('error' in auth) return { error: auth.error }
  const { funeralHomeId } = auth

  const serviceRole = createServiceRoleClient()

  // Fetch system defaults for this service type
  const { data: systemTemplates, error: fetchErr } = await serviceRole
    .from('task_templates')
    .select('*')
    .is('funeral_home_id', null)
    .eq('service_type', serviceType)
    .order('sort_order', { ascending: true })

  if (fetchErr) return { error: fetchErr.message }
  if (!systemTemplates?.length) return { error: 'No system defaults found for this service type.' }

  // Insert copies as custom templates and return the created rows
  const rows = systemTemplates.map(t => ({
    funeral_home_id:   funeralHomeId,
    service_type:      t.service_type,
    title:             t.title,
    category:          t.category,
    confirmation_hint: t.confirmation_hint,
    due_days_before:   t.due_days_before,
    sort_order:        t.sort_order,
  }))

  const { data: inserted, error: insertErr } = await serviceRole
    .from('task_templates')
    .insert(rows)
    .select('*')

  if (insertErr) return { error: insertErr.message }
  if (!inserted?.length) return { error: 'Insert succeeded but returned no rows.' }

  revalidatePath('/settings/templates')
  return { data: inserted }
}

// ── Delete all custom templates for a service type (reset to defaults) ───────

export async function resetToDefaults(
  serviceType: ServiceType,
): Promise<{ error?: string }> {
  const auth = await requireFdOrOwner()
  if ('error' in auth) return { error: auth.error }
  const { funeralHomeId } = auth

  const serviceRole = createServiceRoleClient()

  const { error } = await serviceRole
    .from('task_templates')
    .delete()
    .eq('funeral_home_id', funeralHomeId)
    .eq('service_type', serviceType)

  if (error) return { error: error.message }

  revalidatePath('/settings/templates')
  return {}
}

// ── Add a custom template row ─────────────────────────────────────────────────

export async function addTemplate(
  serviceType: ServiceType,
  input: {
    title: string
    category: string
    confirmation_hint: string
    due_days_before: number
    priority: string
  },
): Promise<{ data?: TaskTemplate; error?: string }> {
  const auth = await requireFdOrOwner()
  if ('error' in auth) return { error: auth.error }
  const { funeralHomeId } = auth

  const serviceRole = createServiceRoleClient()

  const { data: last } = await serviceRole
    .from('task_templates')
    .select('sort_order')
    .eq('funeral_home_id', funeralHomeId)
    .eq('service_type', serviceType)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  const nextOrder = (last?.sort_order ?? 0) + 1

  const { data, error } = await serviceRole
    .from('task_templates')
    .insert({
      funeral_home_id:   funeralHomeId,
      service_type:      serviceType,
      title:             input.title,
      category:          input.category,
      confirmation_hint: input.confirmation_hint,
      due_days_before:   input.due_days_before,
      priority:          input.priority,
      sort_order:        nextOrder,
    })
    .select('*')
    .single()

  if (error || !data) return { error: error?.message ?? 'Insert failed.' }

  revalidatePath('/settings/templates')
  return { data }
}

// ── Update a custom template row ─────────────────────────────────────────────

export async function updateTemplate(
  templateId: string,
  input: {
    title: string
    category: string
    confirmation_hint: string
    due_days_before: number
    priority: string
  },
): Promise<{ error?: string }> {
  const auth = await requireFdOrOwner()
  if ('error' in auth) return { error: auth.error }
  const { funeralHomeId } = auth

  const serviceRole = createServiceRoleClient()

  // Verify ownership
  const { data: tpl } = await serviceRole
    .from('task_templates')
    .select('funeral_home_id')
    .eq('id', templateId)
    .single()

  if (!tpl || tpl.funeral_home_id !== funeralHomeId)
    return { error: 'Template not found.' }

  const { error } = await serviceRole
    .from('task_templates')
    .update(input)
    .eq('id', templateId)

  if (error) return { error: error.message }

  revalidatePath('/settings/templates')
  return {}
}

// ── Delete a custom template row ─────────────────────────────────────────────

export async function deleteTemplate(
  templateId: string,
): Promise<{ error?: string }> {
  const auth = await requireFdOrOwner()
  if ('error' in auth) return { error: auth.error }
  const { funeralHomeId } = auth

  const serviceRole = createServiceRoleClient()

  const { data: tpl } = await serviceRole
    .from('task_templates')
    .select('funeral_home_id')
    .eq('id', templateId)
    .single()

  if (!tpl || tpl.funeral_home_id !== funeralHomeId)
    return { error: 'Template not found.' }

  const { error } = await serviceRole
    .from('task_templates')
    .delete()
    .eq('id', templateId)

  if (error) return { error: error.message }

  revalidatePath('/settings/templates')
  return {}
}

// ── Move a template up or down (swaps sort_order with neighbour) ──────────────

export async function reorderTemplate(
  templateId: string,
  serviceType: ServiceType,
  direction: 'up' | 'down',
): Promise<{ error?: string }> {
  const auth = await requireFdOrOwner()
  if ('error' in auth) return { error: auth.error }
  const { funeralHomeId } = auth

  const serviceRole = createServiceRoleClient()

  // Fetch all custom templates for this service type ordered
  const { data: templates, error: fetchErr } = await serviceRole
    .from('task_templates')
    .select('id, sort_order')
    .eq('funeral_home_id', funeralHomeId)
    .eq('service_type', serviceType)
    .order('sort_order', { ascending: true })

  if (fetchErr || !templates) return { error: fetchErr?.message ?? 'Fetch failed.' }

  const idx = templates.findIndex(t => t.id === templateId)
  if (idx === -1) return { error: 'Template not found.' }

  const swapIdx = direction === 'up' ? idx - 1 : idx + 1
  if (swapIdx < 0 || swapIdx >= templates.length) return {}  // already at edge — no-op

  const a = templates[idx]
  const b = templates[swapIdx]

  // Swap sort_orders
  const { error: e1 } = await serviceRole
    .from('task_templates')
    .update({ sort_order: b.sort_order })
    .eq('id', a.id)

  const { error: e2 } = await serviceRole
    .from('task_templates')
    .update({ sort_order: a.sort_order })
    .eq('id', b.id)

  if (e1 || e2) return { error: e1?.message ?? e2?.message ?? 'Reorder failed.' }

  revalidatePath('/settings/templates')
  return {}
}
