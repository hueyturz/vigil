import Stripe from 'stripe'

// Singleton Stripe client. Server-only — STRIPE_SECRET_KEY must never reach the
// browser (no NEXT_PUBLIC_ prefix, no client imports of this module).
let client: Stripe | null = null

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY is not set — billing operations are unavailable.')
  }
  if (!client) client = new Stripe(key)
  return client
}
