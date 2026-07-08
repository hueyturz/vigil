'use server'

import { headers } from 'next/headers'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { rateLimit, clientIp } from '@/lib/rate-limit'

// TODO(billing): when self-serve Stripe checkout goes live, move tenant creation
// inside the checkout completion flow (see /api/stripe/webhook,
// checkout.session.completed) so account creation requires payment. Until then
// this action is public (audit C4) and guarded by rate limiting + honeypot.

// Abuse guard: 3 completions/hour per IP, plus a honeypot field (hidden input
// humans never fill; bots do).
async function onboardingGuard(honeypot?: string): Promise<string | null> {
  if (honeypot && honeypot.trim() !== '') {
    // Bot signature — fail with a generic message; no hint about the honeypot.
    return 'Something went wrong. Please try again.'
  }
  const ip = clientIp(headers())
  const { success } = await rateLimit('onboarding', ip)
  if (!success) return 'Too many signups from this network — please try again in an hour.'
  return null
}

export interface SignUpInput {
  fullName:        string
  funeralHomeName: string
  email:           string
  password:        string
  phone:           string
  smsConsent:      boolean
  website?:        string   // honeypot — real users never see or fill this field
}

// Single-step signup (onboarding redesign): creates the funeral home + owner
// account together and stores the owner's SMS phone. No card, no email
// verification — the caller signs the user in client-side and lands on /dashboard.
export async function signUp(input: SignUpInput): Promise<void> {
  const guardError = await onboardingGuard(input.website)
  if (guardError) throw new Error(guardError)

  const fullName        = input.fullName.trim()
  const funeralHomeName = input.funeralHomeName.trim()
  const email           = input.email.trim()
  const phone           = input.phone.trim()

  // Server-side validation (client validates too, but never trust the client).
  if (!fullName)        throw new Error('Please enter your full name.')
  if (!funeralHomeName) throw new Error('Please enter your funeral home name.')
  if (!email)           throw new Error('Please enter your email address.')
  if (input.password.length < 8) throw new Error('Password must be at least 8 characters.')
  // A phone is only stored with explicit consent (TCPA); block the mismatch.
  if (phone && !input.smsConsent) {
    throw new Error('Please agree to receive SMS notifications, or remove your phone number.')
  }

  const supabase = createServiceRoleClient()

  // 1. Funeral home.
  const { data: home, error: homeError } = await supabase
    .from('funeral_homes')
    .insert({ name: funeralHomeName })
    .select('id')
    .single()
  if (homeError || !home) throw new Error(homeError?.message ?? 'Could not create the funeral home.')

  // 2. Owner auth user. The handle_new_user trigger creates the profile row from
  //    this metadata. email_confirm: true → no verification email required.
  const { data: created, error: userError } = await supabase.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
    user_metadata: {
      full_name:       fullName,
      role:            'owner',
      funeral_home_id: home.id,
    },
  })
  if (userError || !created.user) {
    // Roll back the orphaned funeral home so a retry (e.g. duplicate email) is clean.
    await supabase.from('funeral_homes').delete().eq('id', home.id)
    throw new Error(userError?.message ?? 'Could not create your account.')
  }

  // 3. Store the owner's SMS phone on their profile (only with consent).
  if (phone && input.smsConsent) {
    const { error: phoneError } = await supabase
      .from('profiles')
      .update({ phone })
      .eq('id', created.user.id)
    // Non-fatal: the account exists and can add a phone later in Settings.
    if (phoneError) console.error('[signup] failed to store owner phone:', phoneError.message)
  }
}

// Flip has_seen_welcome so the first-run welcome slideshow only ever shows once.
// Called (fire-and-forget) when the modal mounts for a first-time user. Resolves
// the current user from the session cookie, so it can't be spoofed to touch
// another profile.
export async function markWelcomeSeen(): Promise<void> {
  const cookieClient = createClient()
  const { data: { user } } = await cookieClient.auth.getUser()
  if (!user) return

  const db = createServiceRoleClient()
  await db.from('profiles').update({ has_seen_welcome: true }).eq('id', user.id)
}
