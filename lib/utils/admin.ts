import { createClient } from '@/lib/supabase/server'

// Hardcoded allow-list. Anyone else gets a 404 (route existence stays hidden).
export const ADMIN_EMAILS = ['hueyturz@gmail.com']

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false
  return ADMIN_EMAILS.map(e => e.toLowerCase()).includes(email.toLowerCase())
}

/**
 * Returns the current session if the logged-in user is an admin, otherwise null.
 * Callers should notFound() when this returns null so the route stays hidden.
 */
export async function getAdminSession() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!isAdminEmail(session?.user.email)) return null
  return session
}

// ── Shared time / formatting helpers ─────────────────────────────────────────────

export function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
}

export function relativeJoined(iso: string): string {
  const days = daysSince(iso)
  if (days <= 0)  return 'today'
  if (days === 1) return 'yesterday'
  if (days < 30)  return `${days} days ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months} month${months !== 1 ? 's' : ''} ago`
  const years = Math.floor(days / 365)
  return `${years} year${years !== 1 ? 's' : ''} ago`
}

/** Fine-grained relative time for activity feeds ("2 minutes ago", "3 hours ago"). */
export function timeAgo(iso: string): string {
  const diffSec = Math.round((Date.now() - new Date(iso).getTime()) / 1000)
  if (diffSec < 60) return 'just now'
  const diffMin = Math.round(diffSec / 60)
  if (diffMin < 60) return `${diffMin} minute${diffMin !== 1 ? 's' : ''} ago`
  const diffHr = Math.round(diffMin / 60)
  if (diffHr < 24) return `${diffHr} hour${diffHr !== 1 ? 's' : ''} ago`
  const diffDay = Math.round(diffHr / 24)
  if (diffDay < 30) return `${diffDay} day${diffDay !== 1 ? 's' : ''} ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function completionColor(pct: number): string {
  if (pct > 70) return '#4A7C8C'
  if (pct >= 30) return '#F59E0B'
  return '#EF4444'
}

// ── Activity action metadata (mirrors components/services/ActivityLog.tsx) ───────

export const ACTION_LABELS: Record<string, string> = {
  task_completed:   'Task confirmed',
  task_assigned:    'Task assigned',
  task_added:       'Task added',
  task_deleted:     'Task deleted',
  task_edited:      'Task edited',
  notes_updated:    'Notes updated',
  contact_updated:  'Contact updated',
  service_completed:'Service completed',
  service_reopened: 'Service reopened',
}

export function actionColor(action: string): string {
  return action === 'service_completed' ? '#4A7C8C'
    : action === 'service_reopened'  ? '#475569'
    : action === 'task_completed'    ? '#4A7C8C'
    : action === 'task_deleted'      ? '#EF4444'
    : '#64748B'
}
