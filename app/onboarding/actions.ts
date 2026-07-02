'use server'

import { headers } from 'next/headers'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { rateLimit, clientIp } from '@/lib/rate-limit'

// TODO(billing): when self-serve Stripe checkout goes live, move tenant creation
// inside the checkout completion flow (see /api/stripe/webhook,
// checkout.session.completed) so account creation requires payment. Until then
// these actions are public (audit C4) and guarded by rate limiting + honeypot.

// Abuse guard shared by both onboarding steps: 3 completions/hour per IP, and a
// honeypot field (hidden input humans never fill; bots do).
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

export async function createFuneralHome(formData: {
  name: string
  address: string
  website?: string   // honeypot — real users never see or fill this field
}) {
  const guardError = await onboardingGuard(formData.website)
  if (guardError) throw new Error(guardError)

  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from('funeral_homes')
    .insert({
      name: formData.name,
      address: formData.address || null,
    })
    .select('id')
    .single()

  if (error) throw new Error(error.message)
  return data.id as string
}

export async function createOwnerAccount(formData: {
  email: string
  password: string
  fullName: string
  funeralHomeId: string
  phone: string
  website?: string   // honeypot
}) {
  const guardError = await onboardingGuard(formData.website)
  if (guardError) throw new Error(guardError)

  const supabase = createServiceRoleClient()

  const { data, error } = await supabase.auth.admin.createUser({
    email: formData.email,
    password: formData.password,
    email_confirm: true,
    user_metadata: {
      full_name: formData.fullName,
      role: 'owner',
      funeral_home_id: formData.funeralHomeId,
    },
  })

  if (error) throw new Error(error.message)

  // The handle_new_user trigger creates the profile row from the metadata above;
  // set the owner's personal phone on that profile so SMS notifications work.
  const userId = data.user?.id
  const phone = formData.phone.trim()
  if (userId && phone) {
    const { error: phoneError } = await supabase
      .from('profiles')
      .update({ phone })
      .eq('id', userId)
    if (phoneError) throw new Error(phoneError.message)
  }
}
