import { describe, it, expect } from 'vitest'
import { resolveBillingState, isSubscriptionActive } from './enforcement'

// Billing enforcement state machine (session 6). NOW is fixed so grace-period
// and trial-countdown math is deterministic.
const NOW = new Date('2026-07-02T12:00:00Z')
const days = (n: number) => new Date(NOW.getTime() + n * 86_400_000).toISOString()

describe('resolveBillingState', () => {
  it('none → full access, no banner (admin-created accounts trusted)', () => {
    const s = resolveBillingState({ subscription_status: 'none', trial_ends_at: null, current_period_end: null }, NOW)
    expect(s).toEqual({ status: 'none', access: 'full', banner: null, trialDaysLeft: null })
  })

  it('null row (pre-billing tenant) behaves like none', () => {
    const s = resolveBillingState(null, NOW)
    expect(s.status).toBe('none')
    expect(s.access).toBe('full')
  })

  it('active → full access, no banner', () => {
    const s = resolveBillingState({ subscription_status: 'active', trial_ends_at: null, current_period_end: days(20) }, NOW)
    expect(s).toEqual({ status: 'active', access: 'full', banner: null, trialDaysLeft: null })
  })

  it('trialing with 10 days left → full access, no banner yet', () => {
    const s = resolveBillingState({ subscription_status: 'trialing', trial_ends_at: days(10), current_period_end: null }, NOW)
    expect(s.access).toBe('full')
    expect(s.banner).toBeNull()
    expect(s.trialDaysLeft).toBe(10)
  })

  it('trialing with 3 days left → banner with countdown', () => {
    const s = resolveBillingState({ subscription_status: 'trialing', trial_ends_at: days(3), current_period_end: null }, NOW)
    expect(s.banner).toBe('trial_ending')
    expect(s.trialDaysLeft).toBe(3)
    expect(s.access).toBe('full')
  })

  it('past_due inside the 7-day grace → full access + banner', () => {
    const s = resolveBillingState({ subscription_status: 'past_due', trial_ends_at: null, current_period_end: days(-3) }, NOW)
    expect(s.status).toBe('past_due')
    expect(s.access).toBe('full')
    expect(s.banner).toBe('past_due')
  })

  it('past_due beyond the 7-day grace → degrades to suspended (read-only)', () => {
    const s = resolveBillingState({ subscription_status: 'past_due', trial_ends_at: null, current_period_end: days(-8) }, NOW)
    expect(s.status).toBe('suspended')
    expect(s.access).toBe('readonly')
    expect(s.banner).toBeNull()
  })

  it('past_due with no period end → stays in grace (never silently suspends)', () => {
    const s = resolveBillingState({ subscription_status: 'past_due', trial_ends_at: null, current_period_end: null }, NOW)
    expect(s.status).toBe('past_due')
    expect(s.access).toBe('full')
  })

  it('suspended → read-only', () => {
    const s = resolveBillingState({ subscription_status: 'suspended', trial_ends_at: null, current_period_end: null }, NOW)
    expect(s.access).toBe('readonly')
  })

  it('canceled → read-only', () => {
    const s = resolveBillingState({ subscription_status: 'canceled', trial_ends_at: null, current_period_end: null }, NOW)
    expect(s.access).toBe('readonly')
    expect(s.status).toBe('canceled')
  })
})

describe('isSubscriptionActive', () => {
  it('true for none/trialing/active/past_due, false for suspended/canceled', () => {
    expect(isSubscriptionActive('none')).toBe(true)
    expect(isSubscriptionActive('trialing')).toBe(true)
    expect(isSubscriptionActive('active')).toBe(true)
    expect(isSubscriptionActive('past_due')).toBe(true)
    expect(isSubscriptionActive('suspended')).toBe(false)
    expect(isSubscriptionActive('canceled')).toBe(false)
  })
})
