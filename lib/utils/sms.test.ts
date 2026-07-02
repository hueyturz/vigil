import { describe, it, expect } from 'vitest'
import { normalizePhone, buildSmsMessage } from './sms'

// Regression tests pinning the SMS utility contract. Written as part of the
// 2026-07 production audit — the `it.todo` entries document KNOWN GAPS found in
// the audit; when those are fixed, convert the todos into real assertions.

describe('normalizePhone', () => {
  it('normalizes a bare 10-digit US number to E.164', () => {
    expect(normalizePhone('8015551234')).toBe('+18015551234')
  })

  it('normalizes a formatted US number', () => {
    expect(normalizePhone('(801) 555-1234')).toBe('+18015551234')
  })

  it('normalizes an 11-digit number with leading 1', () => {
    expect(normalizePhone('1-801-555-1234')).toBe('+18015551234')
  })

  it('passes through an already-E.164 US number', () => {
    expect(normalizePhone('+1 801 555 1234')).toBe('+18015551234')
  })

  // AUDIT GAP (High): invalid inputs are NOT rejected — 5 digits, 0 digits, or
  // garbage all produce a "+"-prefixed string that Twilio will reject at send
  // time with no feedback loop to the user who owns the bad phone number.
  // These assertions PIN the current permissive behavior so a future fix is a
  // conscious, test-visible change (they should start failing when validation
  // is added — then invert them).
  it('currently accepts a 5-digit number (documents audit gap — should throw once validated)', () => {
    expect(normalizePhone('12345')).toBe('+12345')
  })

  it('currently accepts an empty string (documents audit gap — should throw once validated)', () => {
    expect(normalizePhone('')).toBe('+')
  })

  it.todo('rejects numbers with fewer than 10 digits (fix: length validation in normalizePhone)')
  it.todo('rejects numbers with more than 15 digits (E.164 max)')
})

describe('buildSmsMessage', () => {
  const base = {
    completedByName: 'Jane Smith',
    taskTitle: 'Order casket',
    familyName: 'Henderson',
    serviceDate: 'June 14, 2026',
  }

  it('includes the completer, task, family, and date', () => {
    const msg = buildSmsMessage({ ...base, confirmationValue: 'Confirmed with vendor #123' })
    expect(msg).toContain('Jane Smith')
    expect(msg).toContain("'Order casket'")
    expect(msg).toContain('Henderson')
    expect(msg).toContain('June 14, 2026')
  })

  it('truncates the confirmation detail to 80 characters', () => {
    const long = 'x'.repeat(200)
    const msg = buildSmsMessage({ ...base, confirmationValue: long })
    expect(msg).toContain('x'.repeat(80))
    expect(msg).not.toContain('x'.repeat(81))
  })
})

// AUDIT GAP (High): sendSMS() returns void (does NOT throw) when Twilio env vars
// are missing — so sendAndLogSms marks the sms_log row 'sent' even though nothing
// was sent. A misconfigured deploy silently "succeeds" at every SMS.
// Fix: throw from sendSMS when env vars are missing; then add a test asserting
// sendAndLogSms marks the row 'failed' in that case.
describe('sendSMS env-var handling (documented audit gap)', () => {
  it.todo('throws (rather than silently returning) when TWILIO_* env vars are missing')
})
