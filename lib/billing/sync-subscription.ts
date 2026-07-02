import type Stripe from 'stripe'
import { createServiceRoleClient } from '@/lib/supabase/server'
import type { SubscriptionStatus } from '@/lib/types'

// Map Stripe subscription statuses onto Vigilight's state machine.
// paused: our trials are created with missing_payment_method:'pause', so a trial
// that ends without a card lands here — treat as suspended (no access).
// Unknown/new Stripe statuses default to past_due (soft-degraded: full access
// with a billing banner per session 6) rather than hard-locking a paying tenant.
const STATUS_MAP: Record<string, SubscriptionStatus> = {
  trialing:            'trialing',
  active:              'active',
  past_due:            'past_due',
  canceled:            'canceled',
  unpaid:              'suspended',
  paused:              'suspended',
  incomplete:          'past_due',
  incomplete_expired:  'canceled',
}

export function mapStripeStatus(stripeStatus: string): SubscriptionStatus {
  return STATUS_MAP[stripeStatus] ?? 'past_due'
}

// Upsert a Stripe Subscription's state onto the owning funeral_homes row.
// Resolution order: stripe_customer_id match, then metadata.funeral_home_id
// (set on both customer and subscription at creation time).
// Returns the funeral_home_id (for event logging) or null if unresolvable.
export async function syncSubscriptionToDb(subscription: Stripe.Subscription): Promise<string | null> {
  const db = createServiceRoleClient()

  const customerId = typeof subscription.customer === 'string'
    ? subscription.customer
    : subscription.customer.id

  let funeralHomeId: string | null = null
  const { data: byCustomer } = await db
    .from('funeral_homes')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle()
  if (byCustomer) {
    funeralHomeId = byCustomer.id
  } else if (subscription.metadata?.funeral_home_id) {
    const { data: byMeta } = await db
      .from('funeral_homes')
      .select('id')
      .eq('id', subscription.metadata.funeral_home_id)
      .maybeSingle()
    if (byMeta) funeralHomeId = byMeta.id
  }
  if (!funeralHomeId) return null

  // API 2025-03-31+ (basil): current_period_end and the price interval live on
  // the subscription item, not the subscription.
  const item      = subscription.items?.data?.[0]
  const periodEnd = item?.current_period_end ?? null
  const interval  = item?.price?.recurring?.interval ?? null

  const { error } = await db
    .from('funeral_homes')
    .update({
      stripe_customer_id:     customerId,
      stripe_subscription_id: subscription.id,
      subscription_status:    mapStripeStatus(subscription.status),
      billing_interval:       interval === 'month' || interval === 'year' ? interval : null,
      trial_ends_at:          subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
      current_period_end:     periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    })
    .eq('id', funeralHomeId)
  if (error) throw new Error(`syncSubscriptionToDb failed for ${funeralHomeId}: ${error.message}`)

  return funeralHomeId
}
