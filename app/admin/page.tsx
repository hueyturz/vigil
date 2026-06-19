import { notFound } from 'next/navigation'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'

// Hardcoded allow-list. Anyone else gets a 404 (route existence stays hidden).
const ADMIN_EMAILS = ['hueyturz@gmail.com']

// ── Helpers ─────────────────────────────────────────────────────────────────────

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
}

function relativeJoined(iso: string): string {
  const days = daysSince(iso)
  if (days <= 0)  return 'today'
  if (days === 1) return 'yesterday'
  if (days < 30)  return `${days} days ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months} month${months !== 1 ? 's' : ''} ago`
  const years = Math.floor(days / 365)
  return `${years} year${years !== 1 ? 's' : ''} ago`
}

function completionColor(pct: number): string {
  if (pct > 70) return '#0D6E68'
  if (pct >= 30) return '#F59E0B'
  return '#EF4444'
}

type AccountStatus = 'New' | 'Active' | 'Stale'

const STATUS_STYLE: Record<AccountStatus, { bg: string; color: string }> = {
  New:    { bg: '#EFF6FF', color: '#2563EB' },
  Active: { bg: '#ECFDF5', color: '#0D6E68' },
  Stale:  { bg: '#FFFBEB', color: '#F59E0B' },
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function AdminPage() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()

  // Gate: must be logged in AND on the admin allow-list — otherwise 404.
  const email = session?.user.email?.toLowerCase() ?? null
  if (!email || !ADMIN_EMAILS.map(e => e.toLowerCase()).includes(email)) {
    notFound()
  }

  const db = createServiceRoleClient()

  // Cross-tenant reads (service role bypasses RLS).
  const [
    { data: homes },
    { data: services },
    { data: tasks },
    { data: owners },
    { data: { users: authUsers } },
  ] = await Promise.all([
    db.from('funeral_homes').select('id, name, created_at'),
    db.from('services').select('funeral_home_id, status, created_at'),
    db.from('tasks').select('funeral_home_id, status'),
    db.from('profiles').select('id, full_name, funeral_home_id').eq('role', 'owner'),
    db.auth.admin.listUsers({ perPage: 1000 }),
  ])

  const emailById: Record<string, string> = {}
  for (const au of authUsers ?? []) emailById[au.id] = au.email ?? ''

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
    <div className="min-h-screen px-4 py-8 md:px-10" style={{ backgroundColor: '#F7F8FA' }}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold" style={{ color: '#0D6E68' }}>Vigil Admin</h1>
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
                </tr>
              </thead>
              <tbody>
                {accounts.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center" style={{ color: '#94A3B8' }}>
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
                  </tr>
                ))}
              </tbody>
            </table>
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
