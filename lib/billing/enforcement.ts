import type { SubscriptionStatus } from '@/lib/types'

// Billing enforcement state machine (battle plan session 6). Pure logic — the
// I/O (fetching the funeral_homes row) lives in getActiveProfile / AppShell.
//
//   none      → full access, no banner (admin-created accounts are trusted)
//   trialing  → full access; banner when < 7 days of trial remain
//   active    → full access
//   past_due  → full access + banner; 7-day grace from current_period_end,
//               after which it degrades to suspended (read-only)
//   suspended → read-only + billing wall
//   canceled  → read-only + billing wall ("subscription has ended" copy)

export type BillingAccess = 'full' | 'readonly'

export interface BillingInputs {
  subscription_status: SubscriptionStatus | null
  trial_ends_at:       string | null
  current_period_end:  string | null
}

export interface BillingState {
  // Effective status after grace-period logic (past_due can degrade to suspended).
  status:        SubscriptionStatus
  access:        BillingAccess
  banner:        'trial_ending' | 'past_due' | null
  trialDaysLeft: number | null
}

const DAY_MS = 86_400_000
const PAST_DUE_GRACE_DAYS = 7
const TRIAL_BANNER_DAYS = 7

export function isSubscriptionActive(status: SubscriptionStatus): boolean {
  return status === 'none' || status === 'trialing' || status === 'active' || status === 'past_due'
}

export function resolveBillingState(home: BillingInputs | null, now: Date = new Date()): BillingState {
  const status = home?.subscription_status ?? 'none'

  switch (status) {
    case 'none':
    case 'active':
      return { status, access: 'full', banner: null, trialDaysLeft: null }

    case 'trialing': {
      const trialEnd = home?.trial_ends_at ? new Date(home.trial_ends_at) : null
      const daysLeft = trialEnd ? Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / DAY_MS)) : null
      return {
        status,
        access: 'full',
        banner: daysLeft !== null && daysLeft < TRIAL_BANNER_DAYS ? 'trial_ending' : null,
        trialDaysLeft: daysLeft,
      }
    }

    case 'past_due': {
      const periodEnd = home?.current_period_end ? new Date(home.current_period_end) : null
      const graceOver = periodEnd !== null && now.getTime() > periodEnd.getTime() + PAST_DUE_GRACE_DAYS * DAY_MS
      if (graceOver) {
        return { status: 'suspended', access: 'readonly', banner: null, trialDaysLeft: null }
      }
      return { status, access: 'full', banner: 'past_due', trialDaysLeft: null }
    }

    case 'suspended':
    case 'canceled':
      return { status, access: 'readonly', banner: null, trialDaysLeft: null }
  }
}
