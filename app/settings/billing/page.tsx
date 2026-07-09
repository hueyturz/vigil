import { redirect } from 'next/navigation'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getActiveProfile } from '@/lib/utils/impersonation'
import { AppShell } from '@/components/layout/AppShell'
import { ManageBillingButton } from '@/components/billing/ManageBillingButton'
import { formatDate } from '@/lib/utils/date-helpers'

export const revalidate = 0

const STATUS_BADGE: Record<string, { bg: string; color: string }> = {
  trialing:  { bg: '#FFFBEB', color: '#92400E' },
  active:    { bg: '#ECFDF5', color: '#15803D' },
  past_due:  { bg: '#FEF2F2', color: '#991B1B' },
  canceled:  { bg: '#F1F5F9', color: '#475569' },
  suspended: { bg: '#FEF2F2', color: '#991B1B' },
  none:      { bg: '#F1F5F9', color: '#64748B' },
}

export default async function BillingPage() {
  const ctx = await getActiveProfile()
  if (!ctx) redirect('/login')
  const { profile } = ctx
  if (profile.role !== 'owner') redirect('/settings')

  const db = createServiceRoleClient()
  // Throw on error (audit H4 convention): a swallowed failure here showed a
  // paying owner "No billing set up" instead of an error page.
  const { data: home, error: homeErr } = await db
    .from('funeral_homes')
    .select('name, stripe_customer_id, subscription_status, billing_interval, trial_ends_at, current_period_end')
    .eq('id', profile.funeral_home_id)
    .maybeSingle()
  if (homeErr) throw new Error(`Failed to load billing details: ${homeErr.message}`)

  const status   = home?.subscription_status ?? 'none'
  const interval = home?.billing_interval ?? null
  const badge    = STATUS_BADGE[status] ?? STATUS_BADGE.none

  const price = interval === 'year' ? '$790/year ($66/mo)' : '$79/month'
  const statusLabel =
    status === 'trialing'  ? (home?.trial_ends_at ? `Trial — ends ${formatDate(home.trial_ends_at.slice(0, 10))}` : 'Trial') :
    status === 'active'    ? 'Active' :
    status === 'past_due'  ? 'Payment past due' :
    status === 'canceled'  ? 'Subscription ended' :
    status === 'suspended' ? 'Suspended' :
    'No billing set up'

  return (
    <AppShell profile={profile}>
      <div className="px-4 py-4 md:px-8 md:py-8 max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold" style={{ color: '#0F172A' }}>Billing</h1>
          <p className="text-sm mt-1" style={{ color: '#64748B' }}>
            Manage your Vigilight subscription
          </p>
        </div>

        <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }}>
          <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: '#E2E8F0' }}>
            <span className="text-sm font-medium" style={{ color: '#475569' }}>Plan</span>
            <span className="text-sm font-semibold" style={{ color: '#0F172A' }}>
              Vigilight {status === 'none' ? '—' : price}
            </span>
          </div>
          <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: '#E2E8F0' }}>
            <span className="text-sm font-medium" style={{ color: '#475569' }}>Status</span>
            <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ backgroundColor: badge.bg, color: badge.color }}>
              {statusLabel}
            </span>
          </div>
          <div className="flex items-center justify-between px-5 py-4" style={{ borderColor: '#E2E8F0' }}>
            <span className="text-sm font-medium" style={{ color: '#475569' }}>
              {status === 'trialing' ? 'First charge' : 'Renews'}
            </span>
            <span className="text-sm" style={{ color: '#0F172A' }}>
              {home?.current_period_end ? formatDate(home.current_period_end.slice(0, 10)) : '—'}
            </span>
          </div>
        </div>

        <div className="mt-6">
          {home?.stripe_customer_id ? (
            <>
              <ManageBillingButton />
              <p className="mt-2 text-xs" style={{ color: '#94A3B8' }}>
                Update your card, view invoices, switch between monthly and annual, or cancel — via the secure Stripe portal.
              </p>
            </>
          ) : (
            <p className="text-sm" style={{ color: '#475569' }}>
              Billing isn&rsquo;t set up for this account yet — contact support to get started.
            </p>
          )}
        </div>
      </div>
    </AppShell>
  )
}
