// URL scrubbing for Sentry events (audit H1).
//
// Vigilight handles data about deceased people and grieving families. With
// sendDefaultPii off, the remaining leak vectors are URLs captured in events and
// fetch/navigation breadcrumbs:
//   • query strings — /api/search?q=John+Doe, /tasks?tag=..., ?filter=...
//   • path segments — all dynamic segments are UUIDs today, but scrub them to the
//     route pattern anyway so only /services/[id] (not the id) leaves the app.
// Pure functions, shared by the server, edge, and client Sentry configs.

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi

/** Strip query string + fragment, and collapse UUID path segments to [id]. */
export function scrubUrl(url: string): string {
  return url.split(/[?#]/)[0].replace(UUID_RE, '[id]')
}

// Minimal structural shapes (no index signatures — Sentry's ErrorEvent/Breadcrumb
// types don't carry one, so an indexed type here would break assignability).
interface BreadcrumbLike {
  data?: { url?: unknown; from?: unknown; to?: unknown }
}

interface EventLike {
  request?: { url?: unknown; query_string?: unknown }
  breadcrumbs?: BreadcrumbLike[]
}

/** Scrub a single breadcrumb in place (fetch/xhr/navigation URLs). */
export function scrubBreadcrumb<T extends BreadcrumbLike>(breadcrumb: T): T {
  const d = breadcrumb.data
  if (d) {
    if (typeof d.url === 'string')  d.url  = scrubUrl(d.url)
    if (typeof d.from === 'string') d.from = scrubUrl(d.from)
    if (typeof d.to === 'string')   d.to   = scrubUrl(d.to)
  }
  return breadcrumb
}

/** Scrub an outgoing event in place: request URL, query string, breadcrumbs. */
export function scrubEvent<T extends EventLike>(event: T): T {
  if (event.request) {
    if (typeof event.request.url === 'string') event.request.url = scrubUrl(event.request.url)
    if ('query_string' in event.request) delete event.request.query_string
  }
  if (Array.isArray(event.breadcrumbs)) {
    for (const b of event.breadcrumbs) scrubBreadcrumb(b)
  }
  return event
}
