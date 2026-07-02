import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import type { User } from '@supabase/supabase-js'
import { ADMIN_EMAILS, isAdminEmail, isSuperadmin } from '@/lib/utils/superadmin'

export { ADMIN_EMAILS, isAdminEmail }

/**
 * All auth users, iterated page-by-page (session 10 #5). listUsers({perPage:1000})
 * silently truncated at 1000 users; this walks pages up to maxPages (safety cap —
 * 10k users is far beyond current scale; raise when the platform grows).
 */
export async function listAllAuthUsers(
  db: ReturnType<typeof createServiceRoleClient>,
  maxPages = 10,
) {
  const all: User[] = []
  for (let page = 1; page <= maxPages; page++) {
    const { data } = await db.auth.admin.listUsers({ page, perPage: 1000 })
    const users = data?.users ?? []
    all.push(...users)
    if (users.length < 1000) break
  }
  return all
}

/**
 * Returns the current session if the logged-in user is a platform superadmin
 * (is_superadmin column, or the email allow-list fallback), otherwise null.
 * The is_superadmin read uses the service-role client, not the user's session.
 */
export async function getSuperadminSession() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null
  const serviceRole = createServiceRoleClient()
  const ok = await isSuperadmin(serviceRole, session.user.id, session.user.email ?? null)
  return ok ? session : null
}

/** @deprecated use getSuperadminSession — kept for existing callers. */
export const getAdminSession = getSuperadminSession

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
