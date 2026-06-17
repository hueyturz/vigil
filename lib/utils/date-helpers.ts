/**
 * Days from today until a given ISO date string (floor, whole days).
 * Negative means the date is in the past.
 */
export function daysUntil(isoDate: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(isoDate + 'T00:00:00')
  return Math.floor((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

/** e.g. "June 14, 2026" */
export function formatDate(isoDate: string): string {
  return new Date(isoDate + 'T00:00:00').toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/** e.g. "Jun 14, 2026, 2:30 PM" */
export function formatDateTime(isoString: string): string {
  return new Date(isoString).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}
