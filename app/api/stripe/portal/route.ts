import { NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { getStripe } from '@/lib/stripe'
import { getActiveProfile } from '@/lib/utils/impersonation'
import { createServiceRoleClient } from '@/lib/supabase/server'

// POST /api/stripe/portal — create a Stripe Customer Portal session for the
// caller's funeral home and return its URL. Owner-only: the portal exposes card
// update, invoice history, cancel, and monthly↔annual switching.
//
// NOTE: deliberately uses getActiveProfile() (NOT getActionContext()) — a
// suspended tenant's owner MUST be able to reach the portal to reactivate;
// getActionContext fails closed on read-only billing states.
export async function POST() {
  const ctx = await getActiveProfile()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  if (ctx.profile.role !== 'owner') {
    return NextResponse.json({ error: 'Only the owner can manage billing.' }, { status: 403 })
  }

  const db = createServiceRoleClient()
  const { data: home } = await db
    .from('funeral_homes')
    .select('stripe_customer_id')
    .eq('id', ctx.profile.funeral_home_id)
    .maybeSingle()

  if (!home?.stripe_customer_id) {
    return NextResponse.json(
      { error: 'Billing is not set up for this account yet — contact support.' },
      { status: 400 },
    )
  }

  try {
    const session = await getStripe().billingPortal.sessions.create({
      customer:   home.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/settings/billing`,
    })
    return NextResponse.json({ url: session.url })
  } catch (err) {
    Sentry.captureException(err, {
      tags:  { route: 'stripe-portal' },
      extra: { funeralHomeId: ctx.profile.funeral_home_id },
    })
    return NextResponse.json({ error: 'Could not open the billing portal.' }, { status: 500 })
  }
}
