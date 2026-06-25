'use server'

import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { isSuperadmin } from '@/lib/utils/superadmin'
import { sendSMS, normalizePhone } from '@/lib/utils/sms'

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
    await serviceRole.from('sms_log').update({ status: 'failed' }).eq('id', smsLogId)
    return { error: 'Recipient has no phone number on file.' }
  }

  try {
    await sendSMS(normalizePhone(recipient.phone), row.message)
    await serviceRole.from('sms_log').update({ status: 'sent' }).eq('id', smsLogId)
    return {}
  } catch (err) {
    await serviceRole.from('sms_log').update({ status: 'failed' }).eq('id', smsLogId)
    return { error: err instanceof Error ? err.message : 'Send failed.' }
  }
}
