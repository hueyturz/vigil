import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServiceRoleClient } from '@/lib/supabase/server'
import {
  getAdminSession,
  daysSince,
  relativeJoined,
  timeAgo,
  completionColor,
  ACTION_LABELS,
  actionColor,
} from '@/lib/utils/admin'

type AccountStatus = 'New' | 'Active' | 'Stale'

const STATUS_STYLE: Record<AccountStatus, { bg: string; color: string }> = {
  New:    { bg: '#EFF6FF', color: '#2563EB' },
  Active: { bg: '#ECFDF5', color: '#4A7C8C' },
  Stale:  { bg: '#FFFBEB', color: '#F59E0B' },
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function AdminPage() {
  // Gate: must be logged in AND on the admin allow-list — otherwise 404.
  if (!(await getAdminSession())) notFound()

  const db = createServiceRoleClient()

  // Cross-tenant reads (service role bypasses RLS).
  const [
    { data: homes },
    { data: services },
    { data: tasks },
    { data: owners },
    { data: { users: authUsers } },
    { data: activity },
  ] = await Promise.all([
    db.from('funeral_homes').select('id, name, created_at'),
    db.from('services').select('funeral_home_id, status, created_at'),
    db.from('tasks').select('funeral_home_id, status'),
    db.from('profiles').select('id, full_name, funeral_home_id').eq('role', 'owner'),
    db.auth.admin.listUsers({ perPage: 1000 }),
    db.from('activity_log')
      .select('id, actor_name, description, action_type, created_at, funeral_home_id')
      .order('created_at', { ascending: false })
      .limit(30),
  ])

  const emailById: Record<string, string> = {}
  for (const au of authUsers ?? []) emailById[au.id] = au.email ?? ''

  const homeNameById: Record<string, string> = {}
  for (const h of homes ?? []) homeNameById[h.id] = h.name

  const recentActivity = (activity ?? []).map(a => ({
    ...a,
    homeName: homeNameById[a.funeral_home_id] ?? 'Unknown',
  }))

  const now = Date.now()

  const accounts = (homes ?? []).map(home => {
    const homeServices = (services ?? []).filter(s => s.funeral_home_id === home.id)
    const homeTasks    = (tasks ?? []).filter(t => t.funeral_home_id === home.id)
    const owner        = (owners ?? []).find(o => o.funeral_home_id === home.id) ?? null

    const totalServices  = homeServices.length
    const activeServices = homeServices.filter(s => s.status === 'active').length
    const totalTasks     = homeTasks.length
    const confirmedTasks = homeTasks.filter(t => t.status === 'complete').length
    const completionRate = totalTasks > 0 ? Math.round((confirmedTasks / totalTasks) * 100) : 0
    const days           = daysSince(home.created_at)

    const hasRecentService = homeServices.some(
      s => now - new Date(s.created_at).getTime() <= 30 * 86_400_000
    )

    const status: AccountStatus =
      days <= 7          ? 'New'
      : hasRecentService ? 'Active'
      : 'Stale'

    return {
      id:           home.id,
      name:         home.name,
      created_at:   home.created_at,
      ownerName:    owner?.full_name ?? '—',
      ownerEmail:   owner ? (emailById[owner.id] ?? '—') : '—',
      totalServices,
      activeServices,
      totalTasks,
      confirmedTasks,
      completionRate,
      status,
    }
  })

  // Newest first.
  accounts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  // Top-line stats.
  const totalHomes          = accounts.length
  const totalActiveServices = accounts.reduce((sum, a) => sum + a.activeServices, 0)
  const totalConfirmedTasks = accounts.reduce((sum, a) => sum + a.confirmedTasks, 0)

  return (
    <div className="min-h-screen px-4 py-8 md:px-10" style={{ backgroundColor: '#F8F5F0' }}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold" style={{ color: '#4A7C8C' }}>Vigilight Admin</h1>
          <p className="mt-1 text-sm" style={{ color: '#475569' }}>
            All customer accounts · internal use only
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <StatCard label="Funeral homes"        value={totalHomes} />
          <StatCard label="Active services"       value={totalActiveServices} />
          <StatCard label="Tasks confirmed"       value={totalConfirmedTasks} />
        </div>

        {/* Accounts table */}
        <div
          className="rounded-xl border overflow-hidden"
          style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: '#F7F8FA' }}>
                  <Th>Funeral home</Th>
                  <Th>Owner</Th>
                  <Th>Joined</Th>
                  <Th className="text-center">Active services</Th>
                  <Th className="text-center">Completion</Th>
                  <Th className="text-center">Status</Th>
                  <Th className="text-right">Account</Th>
                </tr>
              </thead>
              <tbody>
                {accounts.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center" style={{ color: '#94A3B8' }}>
                      No funeral homes yet.
                    </td>
                  </tr>
                )}
                {accounts.map(a => (
                  <tr key={a.id} className="border-t" style={{ borderColor: '#E2E8F0' }}>
                    <td className="px-4 py-3 font-medium" style={{ color: '#0F172A' }}>{a.name}</td>
                    <td className="px-4 py-3">
                      <div style={{ color: '#0F172A' }}>{a.ownerName}</div>
                      <div className="text-xs" style={{ color: '#475569' }}>{a.ownerEmail}</div>
                    </td>
                    <td className="px-4 py-3" style={{ color: '#475569' }}>{relativeJoined(a.created_at)}</td>
                    <td className="px-4 py-3 text-center" style={{ color: '#0F172A' }}>{a.activeServices}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-semibold" style={{ color: completionColor(a.completionRate) }}>
                        {a.completionRate}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className="inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold"
                        style={{ backgroundColor: STATUS_STYLE[a.status].bg, color: STATUS_STYLE[a.status].color }}
                      >
                        {a.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/impersonate/${a.id}`}
                        className="inline-block rounded-lg border px-3 py-1.5 text-xs font-semibold transition hover:opacity-80"
                        style={{ borderColor: '#4A7C8C', color: '#4A7C8C' }}
                      >
                        View Account →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent activity */}
        <div className="mt-10">
          <h2 className="text-lg font-bold mb-4" style={{ color: '#0F172A' }}>Recent Activity</h2>

          <div
            className="rounded-xl border p-6"
            style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }}
          >
            {recentActivity.length === 0 ? (
              <p className="text-sm text-center py-6" style={{ color: '#94A3B8' }}>
                No activity recorded yet.
              </p>
            ) : (
              <div className="space-y-5">
                {recentActivity.map(entry => (
                  <div key={entry.id} className="flex gap-3 items-start">
                    {/* Action icon */}
                    <div
                      className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-0.5"
                      style={{ backgroundColor: `${actionColor(entry.action_type)}18` }}
                    >
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: actionColor(entry.action_type) }} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className="inline-block rounded-full border px-2 py-0.5 text-xs font-medium"
                          style={{ borderColor: '#4A7C8C', color: '#4A7C8C' }}
                        >
                          {entry.homeName}
                        </span>
                        <p className="text-sm" style={{ color: '#0F172A' }}>
                          <span className="font-medium">{entry.actor_name}</span>
                          {' — '}
                          {entry.description}
                        </p>
                      </div>
                      <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>
                        {ACTION_LABELS[entry.action_type] ?? entry.action_type} · {timeAgo(entry.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Small presentational helpers ────────────────────────────────────────────────

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border p-5" style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }}>
      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#94A3B8' }}>{label}</p>
      <p className="mt-1.5 text-3xl font-bold" style={{ color: '#0F172A' }}>{value}</p>
    </div>
  )
}

function Th({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide ${className}`}
      style={{ color: '#94A3B8' }}
    >
      {children}
    </th>
  )
}
