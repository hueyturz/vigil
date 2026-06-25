'use server'

import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { isSuperadmin } from '@/lib/utils/superadmin'
import { sendSMS, normalizePhone } from '@/lib/utils/sms'
import type { Role } from '@/lib/types'

const VALID_ROLES: Role[] = ['owner', 'fd', 'staff']

// Every admin action must verify the caller is a superadmin before doing anything.
// Returns the service-role client + caller id on success, or an error.
async function requireSuperadmin() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { error: 'Not authenticated.' as string }
  const serviceRole = createServiceRoleClient()
  const ok = await isSuperadmin(serviceRole, session.user.id, session.user.email ?? null)
  if (!ok) return { error: 'Forbidden.' as string }
  return { serviceRole, userId: session.user.id }
}

// Resend a logged SMS using its stored message + recipient, updating its status.
export async function retrySms(smsLogId: string): Promise<{ error?: string }> {
  const auth = await requireSuperadmin()
  if ('error' in auth) return { error: auth.error }
  const { serviceRole } = auth

  const { data: row } = await serviceRole
    .from('sms_log')
    .select('id, message, recipient_id')
    .eq('id', smsLogId)
    .single()
  if (!row) return { error: 'SMS log not found.' }

  const { data: recipient } = await serviceRole
    .from('profiles')
    .select('phone')
    .eq('id', row.recipient_id)
    .maybeSingle()

  if (!recipient?.phone) {
    const message = 'Recipient has no phone number on file.'
    await serviceRole.from('sms_log').update({ status: 'failed', error_message: message }).eq('id', smsLogId)
    return { error: message }
  }

  try {
    await sendSMS(normalizePhone(recipient.phone), row.message)
    await serviceRole.from('sms_log').update({ status: 'sent', error_message: null }).eq('id', smsLogId)
    return {}
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Send failed.'
    await serviceRole.from('sms_log').update({ status: 'failed', error_message: message }).eq('id', smsLogId)
    return { error: message }
  }
}

// ── User management ─────────────────────────────────────────────────────────────

export async function updateUserRole(userId: string, role: Role): Promise<{ error?: string }> {
  const auth = await requireSuperadmin()
  if ('error' in auth) return { error: auth.error }
  if (!VALID_ROLES.includes(role)) return { error: 'Invalid role.' }
  const { error } = await auth.serviceRole.from('profiles').update({ role }).eq('id', userId)
  return error ? { error: error.message } : {}
}

export async function updateUserPhone(userId: string, phone: string): Promise<{ error?: string }> {
  const auth = await requireSuperadmin()
  if ('error' in auth) return { error: auth.error }
  const { error } = await auth.serviceRole
    .from('profiles')
    .update({ phone: phone.trim() || null })
    .eq('id', userId)
  return error ? { error: error.message } : {}
}

export async function deactivateUser(userId: string): Promise<{ error?: string }> {
  const auth = await requireSuperadmin()
  if ('error' in auth) return { error: auth.error }
  const { error } = await auth.serviceRole.from('profiles').update({ is_active: false }).eq('id', userId)
  return error ? { error: error.message } : {}
}

export async function reactivateUser(userId: string): Promise<{ error?: string }> {
  const auth = await requireSuperadmin()
  if ('error' in auth) return { error: auth.error }
  const { error } = await auth.serviceRole.from('profiles').update({ is_active: true }).eq('id', userId)
  return error ? { error: error.message } : {}
}

export async function sendPasswordReset(userId: string): Promise<{ error?: string }> {
  const auth = await requireSuperadmin()
  if ('error' in auth) return { error: auth.error }
  const { data: authData } = await auth.serviceRole.auth.admin.getUserById(userId)
  const email = authData?.user?.email
  if (!email) return { error: 'User has no email on file.' }
  const { error } = await auth.serviceRole.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`,
  })
  return error ? { error: error.message } : {}
}

export async function inviteUser(
  funeralHomeId: string,
  email: string,
  role: Role,
  name: string,
): Promise<{ error?: string }> {
  const auth = await requireSuperadmin()
  if ('error' in auth) return { error: auth.error }
  if (!VALID_ROLES.includes(role)) return { error: 'Invalid role.' }
  if (!email.trim() || !name.trim()) return { error: 'Name and email are required.' }

  const { error } = await auth.serviceRole.auth.admin.inviteUserByEmail(email.trim(), {
    data: { full_name: name.trim(), role, funeral_home_id: funeralHomeId },
  })
  return error ? { error: error.message } : {}
}

// ── Services ────────────────────────────────────────────────────────────────────

export async function createServiceForFuneralHome(
  funeralHomeId: string,
  serviceData: {
    family_name:   string
    deceased_name: string
    service_type:  string | null
    service_date:  string | null
    location:      string | null
  },
): Promise<{ data?: { id: string }; error?: string }> {
  const auth = await requireSuperadmin()
  if ('error' in auth) return { error: auth.error }
  const { serviceRole, userId } = auth

  if (!serviceData.deceased_name.trim()) return { error: 'Deceased name is required.' }

  const { data: service, error } = await serviceRole
    .from('services')
    .insert({
      funeral_home_id: funeralHomeId,
      family_name:     serviceData.family_name.trim() || serviceData.deceased_name.trim(),
      deceased_name:   serviceData.deceased_name.trim(),
      service_type:    serviceData.service_type || null,
      service_date:    serviceData.service_date || null,
      location:        serviceData.location?.trim() || null,
      created_by_id:   userId,
      status:          'active',
    })
    .select('id')
    .single()

  if (error || !service) return { error: error?.message ?? 'Failed to create service.' }

  if (serviceData.service_type) {
    const { error: rpcError } = await serviceRole.rpc('generate_tasks_for_service', { p_service_id: service.id })
    if (rpcError) return { error: rpcError.message }
  }

  return { data: { id: service.id } }
}

// ── Funeral home account controls ───────────────────────────────────────────────

export async function suspendFuneralHome(funeralHomeId: string): Promise<{ error?: string }> {
  const auth = await requireSuperadmin()
  if ('error' in auth) return { error: auth.error }
  const { error } = await auth.serviceRole
    .from('profiles')
    .update({ is_active: false })
    .eq('funeral_home_id', funeralHomeId)
  return error ? { error: error.message } : {}
}

// Hard delete with cascade. IRREVERSIBLE. Tears down child rows in dependency
// order, removes each member's auth user, then the funeral home itself.
export async function deleteFuneralHome(funeralHomeId: string): Promise<{ error?: string }> {
  const auth = await requireSuperadmin()
  if ('error' in auth) return { error: auth.error }
  const { serviceRole } = auth

  try {
    // Service-scoped children first (these also have ON DELETE CASCADE to services,
    // but we delete by funeral_home_id explicitly to be safe).
    const { data: svcRows } = await serviceRole.from('services').select('id').eq('funeral_home_id', funeralHomeId)
    const serviceIds = (svcRows ?? []).map(s => s.id)
    if (serviceIds.length > 0) {
      await serviceRole.from('task_subtasks').delete().in('service_id', serviceIds)
    }

    // Tables that carry funeral_home_id.
    for (const table of [
      'task_subtasks', 'tasks', 'service_notes', 'service_contacts', 'intake_sessions',
      'services', 'sms_log', 'email_log', 'activity_log', 'notification_preferences',
    ]) {
      await serviceRole.from(table).delete().eq('funeral_home_id', funeralHomeId)
    }

    // Members: remove auth users, then profiles.
    const { data: members } = await serviceRole.from('profiles').select('id').eq('funeral_home_id', funeralHomeId)
    for (const m of members ?? []) {
      await serviceRole.auth.admin.deleteUser(m.id)
    }
    await serviceRole.from('profiles').delete().eq('funeral_home_id', funeralHomeId)

    // Finally the funeral home row.
    const { error } = await serviceRole.from('funeral_homes').delete().eq('id', funeralHomeId)
    if (error) return { error: error.message }
    return {}
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Delete failed.' }
  }
}
