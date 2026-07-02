'use server'

import { revalidatePath } from 'next/cache'
import * as Sentry from '@sentry/nextjs'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { isSuperadmin } from '@/lib/utils/superadmin'
import { sendSMS, normalizePhone } from '@/lib/utils/sms'
import { getStripe } from '@/lib/stripe'
import { getOrCreateStripeCustomer } from '@/lib/billing/customer'
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
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/accept-invite`,
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

// Hard delete. IRREVERSIBLE. Migration 029 puts ON DELETE CASCADE on every FK
// that references funeral_homes(id), so deleting the funeral home row tears down
// all of its child rows (services, tasks, sms_log, profiles, etc.) automatically.
export async function deleteFuneralHome(funeralHomeId: string): Promise<{ error?: string }> {
  const auth = await requireSuperadmin()
  if ('error' in auth) return { error: auth.error }
  const { serviceRole } = auth

  try {
    // Capture members BEFORE the delete — the cascade removes their profiles, and
    // their auth.users rows live in the auth schema (not reachable by an FK
    // cascade from funeral_homes), so they must be deleted explicitly afterward.
    const { data: members } = await serviceRole
      .from('profiles')
      .select('id')
      .eq('funeral_home_id', funeralHomeId)

    // Single delete — Postgres cascades all tenant data.
    const { error } = await serviceRole
      .from('funeral_homes')
      .delete()
      .eq('id', funeralHomeId)
    if (error) return { error: error.message }

    // Clean up the now-orphaned auth users.
    for (const m of members ?? []) {
      await serviceRole.auth.admin.deleteUser(m.id)
    }

    return {}
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Delete failed.' }
  }
}

// ── Billing ─────────────────────────────────────────────────────────────────────

// Activate billing for a demo-converted funeral home: create (or reuse) the
// Stripe customer, start a monthly subscription with a 14-day trial, and record
// the subscription state on the tenant row. Replaces the old "just create the
// account" manual workaround. Idempotency-keyed so a double-click can't create
// two subscriptions.
export async function activateBilling(funeralHomeId: string): Promise<{ error?: string }> {
  const auth = await requireSuperadmin()
  if ('error' in auth) return { error: auth.error }

  const priceId = process.env.STRIPE_PRICE_ID_MONTHLY
  if (!priceId) return { error: 'STRIPE_PRICE_ID_MONTHLY is not set — create the price in Stripe and set the env var.' }

  try {
    const { data: home } = await auth.serviceRole
      .from('funeral_homes')
      .select('id, subscription_status, stripe_subscription_id')
      .eq('id', funeralHomeId)
      .single()
    if (!home) return { error: 'Funeral home not found.' }
    if (home.stripe_subscription_id) {
      return { error: `Billing is already set up (status: ${home.subscription_status ?? 'unknown'}).` }
    }

    const customerId = await getOrCreateStripeCustomer(funeralHomeId)
    const stripe = getStripe()

    const sub = await stripe.subscriptions.create(
      {
        customer:          customerId,
        items:             [{ price: priceId }],
        trial_period_days: 14,
        payment_settings:  { save_default_payment_method: 'on_subscription' },
        // No card yet (demo-led activation): pause at trial end instead of
        // generating failed invoices until the owner adds a payment method.
        trial_settings:    { end_behavior: { missing_payment_method: 'pause' } },
        metadata:          { funeral_home_id: funeralHomeId },
      },
      { idempotencyKey: `sub-create-${funeralHomeId}` },
    )

    // API 2025-03-31+ moved current_period_end from the subscription to its items.
    const periodEnd = sub.items?.data?.[0]?.current_period_end ?? null

    const { error } = await auth.serviceRole
      .from('funeral_homes')
      .update({
        stripe_subscription_id: sub.id,
        subscription_status:    'trialing',
        billing_interval:       'month',
        trial_ends_at:          sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
        current_period_end:     periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      })
      .eq('id', funeralHomeId)
    if (error) return { error: `Subscription ${sub.id} created but failed to persist: ${error.message}` }

    revalidatePath(`/admin/funeral-homes/${funeralHomeId}`)
    return {}
  } catch (err) {
    Sentry.captureException(err, {
      tags:  { domain: 'billing', op: 'activateBilling' },
      extra: { funeralHomeId },
    })
    return { error: err instanceof Error ? err.message : 'Activation failed.' }
  }
}
