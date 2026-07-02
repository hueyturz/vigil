import { describe, it, expect } from 'vitest'
import { scrubUrl, scrubBreadcrumb, scrubEvent } from './sentry-scrub'

// Audit H1: URLs leaving for Sentry must not carry family PII — search terms and
// tag names live in query strings; record ids live in UUID path segments.

describe('scrubUrl', () => {
  it('strips query strings (search terms are PII)', () => {
    expect(scrubUrl('https://app.test/api/search?q=John+Doe')).toBe('https://app.test/api/search')
  })

  it('strips fragments', () => {
    expect(scrubUrl('https://app.test/pricing#faq')).toBe('https://app.test/pricing')
  })

  it('collapses UUID path segments to [id]', () => {
    expect(scrubUrl('https://app.test/services/20efebf5-88d6-48db-8fac-e31f98af7a6a')).toBe(
      'https://app.test/services/[id]',
    )
  })

  it('handles multiple UUIDs and query together', () => {
    expect(
      scrubUrl('/api/tasks/20efebf5-88d6-48db-8fac-e31f98af7a6a/tags/1a8b6a45-1aec-4c85-8f38-c2bb29f8a19d?x=1'),
    ).toBe('/api/tasks/[id]/tags/[id]')
  })

  it('leaves clean route-pattern URLs untouched', () => {
    expect(scrubUrl('https://app.test/dashboard')).toBe('https://app.test/dashboard')
  })
})

describe('scrubBreadcrumb', () => {
  it('scrubs fetch breadcrumb url and navigation from/to', () => {
    const b = scrubBreadcrumb({
      data: {
        url:  '/api/search?q=Jane%20Smith',
        from: '/services/20efebf5-88d6-48db-8fac-e31f98af7a6a?tab=tasks',
        to:   '/tasks?tag=Cremation',
      },
    })
    expect(b.data!.url).toBe('/api/search')
    expect(b.data!.from).toBe('/services/[id]')
    expect(b.data!.to).toBe('/tasks')
  })

  it('tolerates breadcrumbs without data', () => {
    expect(() => scrubBreadcrumb({})).not.toThrow()
  })
})

describe('scrubEvent', () => {
  it('scrubs request url, drops query_string, and scrubs breadcrumbs', () => {
    const e = scrubEvent({
      request: { url: 'https://app.test/services/20efebf5-88d6-48db-8fac-e31f98af7a6a?tab=notes', query_string: 'tab=notes' },
      breadcrumbs: [{ data: { url: '/api/search?q=Doe' } }],
    })
    expect(e.request!.url).toBe('https://app.test/services/[id]')
    expect('query_string' in e.request!).toBe(false)
    expect(e.breadcrumbs![0].data!.url).toBe('/api/search')
  })

  it('tolerates events with no request or breadcrumbs', () => {
    expect(() => scrubEvent({})).not.toThrow()
  })
})
