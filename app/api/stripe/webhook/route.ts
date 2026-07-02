import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import type Stripe from 'stripe'
import { getStripe } from '@/lib/stripe'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { syncSubscriptionToDb } from '@/lib/billing/sync-subscription'

// Stripe webhook — the single sync point for all subscription state changes.
//
// One-time setup (Stripe Dashboard → Developers → Webhooks):
//   endpoint  https://<domain>/api/stripe/webhook
//   events    checkout.session.completed, customer.subscription.created,
//             customer.subscription.updated, customer.subscription.deleted,
//             invoice.paid, invoice.payment_failed,
//             customer.subscription.trial_will_end
//   then set STRIPE_WEBHOOK_SECRET (whsec_...) in Vercel.
//
// Security: this route is PUBLIC (middleware allows /api/stripe/*) — Stripe has
// no session cookie. Authentication is the signature check below; nothing runs
// before constructEvent succeeds.

export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) {
    Sentry.captureMessage('[stripe-webhook] STRIPE_WEBHOOK_SECRET is not set', { level: 'error' })
    return NextResponse.json({ error: 'Webhook not configured.' }, { status: 500 })
  }

  // Signature verification requires the RAW body — read as text before any parsing.
  const rawBody   = await request.text()
  const signature = request.headers.get('stripe-signature')

  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(rawBody, signature ?? '', secret)
  } catch (err) {
    Sentry.captureException(err, { tags: { route: 'stripe-webhook', stage: 'signature' } })
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 400 })
  }

  const db = createServiceRoleClient()

  // Idempotency: claim the event id before processing. ignoreDuplicates + select
  // returns no rows when another delivery already claimed it → ack and stop.
  const { data: claimed, error: claimErr } = await db
    .from('stripe_events')
    .upsert({ id: event.id, type: event.type }, { onConflict: 'id', ignoreDuplicates: true })
    .select('id')
  if (claimErr) {
    // Can't guarantee idempotency — fail the delivery so Stripe retries later.
    Sentry.captureException(new Error(claimErr.message), { tags: { route: 'stripe-webhook', stage: 'dedup' } })
    return NextResponse.json({ error: 'Event store unavailable.' }, { status: 500 })
  }
  if (!claimed || claimed.length === 0) {
    return NextResponse.json({ received: true, duplicate: true })
  }

  // Process. Handler errors are captured and ACKed with 200 — Stripe retries on
  // non-200, and retrying a partially-applied handler risks double effects; we
  // investigate via Sentry instead.
  let funeralHomeId: string | null = null
  try {
    funeralHomeId = await handleEvent(event, db)
  } catch (err) {
    Sentry.captureException(err, {
      tags:  { route: 'stripe-webhook', stage: 'handler', eventType: event.type },
      extra: { eventId: event.id, funeralHomeId },
    })
    console.error(`[stripe-webhook] handler error for ${event.type}:`, err)
  }

  // Tie the event record to the tenant once known (best-effort).
  if (funeralHomeId) {
    await db.from('stripe_events').update({ funeral_home_id: funeralHomeId }).eq('id', event.id)
  }

  return NextResponse.json({ received: true })
}

type Db = ReturnType<typeof createServiceRoleClient>

async function resolveHomeByCustomer(db: Db, customer: unknown): Promise<string | null> {
  const customerId = typeof customer === 'string' ? customer : (customer as { id?: string } | null)?.id
  if (!customerId) return null
  const { data } = await db.from('funeral_homes').select('id').eq('stripe_customer_id', customerId).maybeSingle()
  return data?.id ?? null
}

async function logBillingActivity(db: Db, funeralHomeId: string, description: string) {
  await db.from('activity_log').insert({
    funeral_home_id: funeralHomeId,
    service_id:      null,
    task_id:         null,
    actor_id:        null,
    actor_name:      'Stripe',
    action_type:     'billing_event',
    description,
    metadata:        null,
  })
}

// Returns the funeral_home_id the event applied to (for stripe_events linkage).
async function handleEvent(event: Stripe.Event, db: Db): Promise<string | null> {
  switch (event.type) {
    // Self-serve checkout (future) — the session carries customer + subscription.
    case 'checkout.session.completed': {
      const session = event.data.object
      const subId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id
      if (!subId) return resolveHomeByCustomer(db, session.customer)
      const sub = await getStripe().subscriptions.retrieve(subId)
      return syncSubscriptionToDb(sub)
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      // deleted arrives with status 'canceled' — the shared sync maps it.
      return syncSubscriptionToDb(event.data.object)
    }

    case 'invoice.paid': {
      const invoice = event.data.object
      const homeId = await resolveHomeByCustomer(db, invoice.customer)
      if (!homeId) return null
      const periodEnd = invoice.lines?.data?.[0]?.period?.end ?? null
      const { error } = await db
        .from('funeral_homes')
        .update({
          subscription_status: 'active',
          ...(periodEnd ? { current_period_end: new Date(periodEnd * 1000).toISOString() } : {}),
        })
        .eq('id', homeId)
      if (error) throw new Error(`invoice.paid update failed: ${error.message}`)
      return homeId
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object
      const homeId = await resolveHomeByCustomer(db, invoice.customer)
      if (!homeId) return null
      const { error } = await db
        .from('funeral_homes')
        .update({ subscription_status: 'past_due' })
        .eq('id', homeId)
      if (error) throw new Error(`invoice.payment_failed update failed: ${error.message}`)
      await logBillingActivity(db, homeId, 'Payment failed for subscription renewal.')
      return homeId
    }

    case 'customer.subscription.trial_will_end': {
      // Stripe fires this ~3 days before trial end.
      const sub = event.data.object
      const homeId = await syncSubscriptionToDb(sub)
      if (homeId) {
        await logBillingActivity(db, homeId, 'Trial ends in 3 days.')
        // TODO(dunning): trigger a "trial ending — add a payment method" email here.
      }
      return homeId
    }

    default:
      // Unhandled event type (endpoint subscribed to more than we process) — ack.
      return null
  }
}
