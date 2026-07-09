'use server'

import { getActionContext } from '@/lib/utils/impersonation'
import type { ServiceContact } from '@/lib/types'

// Server actions for family-contact writes (audit #4). These used to be direct
// browser-client Supabase writes in MultiContactCard, which meant no billing
// write gate (suspended tenants could still mutate) and a client-supplied
// funeral_home_id. All tenant members may manage contacts (no role check —
// parity with the RLS behavior this replaces), but writes fail closed on a
// readonly billing state via getActionContext.

interface ContactPayload {
  name:         string
  relationship: string | null
  phone:        string | null
  email:        string | null
}

function validate(payload: ContactPayload): string | null {
  if (!payload.name.trim()) return 'Name is required.'
  if (payload.name.length > 255) return 'Name must be 255 characters or fewer.'
  return null
}

export async function addContact(
  serviceId: string,
  payload: ContactPayload,
): Promise<{ data?: ServiceContact; error?: string }> {
  const ctx = await getActionContext()
  if (!ctx) return { error: 'Not authenticated.' }
  const invalid = validate(payload)
  if (invalid) return { error: invalid }

  const { data: service } = await ctx.serviceRole
    .from('services')
    .select('id')
    .eq('id', serviceId)
    .eq('funeral_home_id', ctx.funeralHomeId)
    .maybeSingle()
  if (!service) return { error: 'Service not found.' }

  // First contact on a service becomes primary automatically.
  const { count } = await ctx.serviceRole
    .from('service_contacts')
    .select('id', { count: 'exact', head: true })
    .eq('service_id', serviceId)

  const { data, error } = await ctx.serviceRole
    .from('service_contacts')
    .insert({
      ...payload,
      name:            payload.name.trim(),
      service_id:      serviceId,
      funeral_home_id: ctx.funeralHomeId,
      is_primary:      (count ?? 0) === 0,
    })
    .select('*')
    .single()

  if (error || !data) return { error: error?.message ?? 'Failed to add contact.' }
  return { data: data as ServiceContact }
}

export async function updateContact(
  contactId: string,
  payload: ContactPayload,
): Promise<{ data?: ServiceContact; error?: string }> {
  const ctx = await getActionContext()
  if (!ctx) return { error: 'Not authenticated.' }
  const invalid = validate(payload)
  if (invalid) return { error: invalid }

  const { data, error } = await ctx.serviceRole
    .from('service_contacts')
    .update({ ...payload, name: payload.name.trim() })
    .eq('id', contactId)
    .eq('funeral_home_id', ctx.funeralHomeId)   // tenant scope on the write itself
    .select('*')
    .maybeSingle()

  if (error) return { error: error.message }
  if (!data) return { error: 'Contact not found.' }
  return { data: data as ServiceContact }
}

export async function makePrimaryContact(contactId: string): Promise<{ error?: string }> {
  const ctx = await getActionContext()
  if (!ctx) return { error: 'Not authenticated.' }

  const { data: contact } = await ctx.serviceRole
    .from('service_contacts')
    .select('id, service_id')
    .eq('id', contactId)
    .eq('funeral_home_id', ctx.funeralHomeId)
    .maybeSingle()
  if (!contact) return { error: 'Contact not found.' }

  const { error: clearErr } = await ctx.serviceRole
    .from('service_contacts')
    .update({ is_primary: false })
    .eq('service_id', contact.service_id)
    .eq('funeral_home_id', ctx.funeralHomeId)
  if (clearErr) return { error: clearErr.message }

  const { error: setErr } = await ctx.serviceRole
    .from('service_contacts')
    .update({ is_primary: true })
    .eq('id', contactId)
    .eq('funeral_home_id', ctx.funeralHomeId)
  if (setErr) return { error: setErr.message }

  return {}
}

export async function deleteContact(
  contactId: string,
): Promise<{ promotedId?: string; error?: string }> {
  const ctx = await getActionContext()
  if (!ctx) return { error: 'Not authenticated.' }

  const { data: contact } = await ctx.serviceRole
    .from('service_contacts')
    .select('id, service_id, is_primary')
    .eq('id', contactId)
    .eq('funeral_home_id', ctx.funeralHomeId)
    .maybeSingle()
  if (!contact) return { error: 'Contact not found.' }

  const { error: delErr } = await ctx.serviceRole
    .from('service_contacts')
    .delete()
    .eq('id', contactId)
    .eq('funeral_home_id', ctx.funeralHomeId)
  if (delErr) return { error: delErr.message }

  // If the primary was removed, promote the oldest remaining contact.
  if (contact.is_primary) {
    const { data: next } = await ctx.serviceRole
      .from('service_contacts')
      .select('id')
      .eq('service_id', contact.service_id)
      .eq('funeral_home_id', ctx.funeralHomeId)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()
    if (next) {
      await ctx.serviceRole
        .from('service_contacts')
        .update({ is_primary: true })
        .eq('id', next.id)
        .eq('funeral_home_id', ctx.funeralHomeId)
      return { promotedId: next.id }
    }
  }

  return {}
}
