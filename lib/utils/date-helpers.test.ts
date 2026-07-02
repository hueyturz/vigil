import { describe, it, expect } from 'vitest'
import { daysUntil, formatDate } from './date-helpers'

// Regression tests for the date math that drives overdue detection — the daily
// SMS cron classifies every task via `daysUntil(service_date) - due_days_before`
// (app/api/notifications/overdue/route.ts), so an off-by-one here means wrong
// "overdue"/"due today" texts to funeral homes.

function isoDaysFromToday(offset: number): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + offset)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

describe('daysUntil', () => {
  it('returns 0 for today', () => {
    expect(daysUntil(isoDaysFromToday(0))).toBe(0)
  })

  it('returns 1 for tomorrow', () => {
    expect(daysUntil(isoDaysFromToday(1))).toBe(1)
  })

  it('returns -1 for yesterday', () => {
    expect(daysUntil(isoDaysFromToday(-1))).toBe(-1)
  })

  it('returns 7 for a week out', () => {
    expect(daysUntil(isoDaysFromToday(7))).toBe(7)
  })

  it('handles month boundaries', () => {
    expect(daysUntil(isoDaysFromToday(45))).toBe(45)
  })

  // Cron timing classification contract (mirrors the overdue route):
  //   dueIn < 0 → overdue, === 0 → due today, === 1 → due tomorrow
  it('classifies task timing like the overdue cron does', () => {
    const serviceDate = isoDaysFromToday(3)
    expect(daysUntil(serviceDate) - 3).toBe(0)  // due day-of arithmetic: today
    expect(daysUntil(serviceDate) - 4).toBe(-1) // overdue
    expect(daysUntil(serviceDate) - 2).toBe(1)  // due tomorrow
  })

  // AUDIT NOTE (Medium): daysUntil computes in the SERVER's timezone (UTC on
  // Vercel), not the funeral home's. The daily cron fires 14:00 UTC (morning in
  // all US timezones, when local and UTC calendar dates agree), which masks the
  // skew — but any earlier-UTC trigger time could shift classifications by a day
  // for US homes. If the cron time changes, revisit this.
  it.todo('computes day boundaries in the funeral home timezone rather than server timezone')
})

describe('formatDate', () => {
  it('formats an ISO date as a long US date', () => {
    expect(formatDate('2026-06-14')).toBe('June 14, 2026')
  })
})
