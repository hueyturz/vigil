import * as Sentry from '@sentry/nextjs'
import { getStripe } from '@/lib/stripe'
import { createServiceRoleClient } from '@/lib/supabase/server'

// Look up the funeral home's Stripe customer, creating it on first use.
// The customer carries the home's name and the owner's email (funeral_homes has
// no email column — the active owner is the billing contact).
// Idempotency-keyed on the funeral home id so a retried call can't create
// duplicate customers in Stripe.
export async function getOrCreateStripeCustomer(funeralHomeId: string): Promise<string> {
  const db = createServiceRoleClient()

  try {
    const { data: home, error: homeErr } = await db
      .from('funeral_homes')
      .select('id, name, stripe_customer_id')
      .eq('id', funeralHomeId)
      .single()
    if (homeErr || !home) throw new Error(`Funeral home not found: ${homeErr?.message ?? funeralHomeId}`)
    if (home.stripe_customer_id) return home.stripe_customer_id

    // Billing contact: the active owner's auth email (best-effort).
    let ownerEmail: string | undefined
    const { data: owner } = await db
      .from('profiles')
      .select('id')
      .eq('funeral_home_id', funeralHomeId)
      .eq('role', 'owner')
      .eq('is_active', true)
      .limit(1)
      .maybeSingle()
    if (owner) {
      const { data: authData } = await db.auth.admin.getUserById(owner.id)
      ownerEmail = authData?.user?.email ?? undefined
    }

    const stripe = getStripe()
    const customer = await stripe.customers.create(
      {
        name:  home.name,
        email: ownerEmail,
        metadata: { funeral_home_id: funeralHomeId },
      },
      { idempotencyKey: `customer-create-${funeralHomeId}` },
    )

    const { error: updateErr } = await db
      .from('funeral_homes')
      .update({ stripe_customer_id: customer.id })
      .eq('id', funeralHomeId)
    if (updateErr) {
      // Customer exists in Stripe but the id didn't persist — surface loudly;
      // the idempotency key makes a retry safe (same customer comes back).
      throw new Error(`Stripe customer ${customer.id} created but failed to persist: ${updateErr.message}`)
    }

    return customer.id
  } catch (err) {
    Sentry.captureException(err, {
      tags:  { domain: 'billing', op: 'getOrCreateStripeCustomer' },
      extra: { funeralHomeId },
    })
    throw err
  }
}
