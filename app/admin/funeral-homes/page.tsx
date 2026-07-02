import Link from 'next/link'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { relativeJoined, timeAgo, completionColor, listAllAuthUsers } from '@/lib/utils/admin'
import { formatDate } from '@/lib/utils/date-helpers'

// Flag accounts whose most recent login is more than 30 days old.
const STALE_LOGIN_MS = 30 * 86_400_000
function isStaleLogin(iso: string): boolean {
  return Date.now() - new Date(iso).getTime() > STALE_LOGIN_MS
}

const BILLING_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  trialing:  { label: 'Trialing',   bg: '#FFFBEB', color: '#92400E' },
  active:    { label: 'Active',     bg: '#ECFDF5', color: '#15803D' },
  past_due:  { label: 'Past due',   bg: '#FEF2F2', color: '#991B1B' },
  canceled:  { label: 'Canceled',   bg: '#F1F5F9', color: '#475569' },
  suspended: { label: 'Suspended',  bg: '#FEF2F2', color: '#991B1B' },
  none:      { label: 'No billing', bg: '#F1F5F9', color: '#64748B' },
}
const BILLING_FILTERS = ['all', 'active', 'trialing', 'past_due', 'suspended', 'canceled', 'none'] as const

export default async function FuneralHomesPage({
  searchParams,
}: {
  searchParams: { q?: string; status?: string; page?: string }
}) {
  const db = createServiceRoleClient()
  const q = (searchParams.q ?? '').trim().toLowerCase()
  const statusFilter = (searchParams.status ?? 'all') as (typeof BILLING_FILTERS)[number]

  const [
    { data: homes },
    { data: profiles },
    { data: services },
    { data: sms },
    { data: activity },
    authUsers,
  ] = await Promise.all([
    db.from('funeral_homes').select('id, name, address, created_at, subscription_status, trial_ends_at, current_period_end'),
    db.from('profiles').select('id, full_name, role, funeral_home_id'),
    db.from('services').select('funeral_home_id, status'),
    db.from('sms_log').select('funeral_home_id, status'),
    db.from('activity_log').select('funeral_home_id, created_at'),
    listAllAuthUsers(db),
  ])

  // Most recent login (auth.users.last_sign_in_at) per user, for the "Last login"
  // per-home aggregate below.
  const lastLoginByUser = new Map((authUsers ?? []).map(u => [u.id, u.last_sign_in_at ?? null]))

  // Per-home aggregates.
  const ownerByHome = new Map<string, string>()
  const usersByHome = new Map<string, number>()
  const lastLoginByHome = new Map<string, string>()
  for (const p of profiles ?? []) {
    usersByHome.set(p.funeral_home_id, (usersByHome.get(p.funeral_home_id) ?? 0) + 1)
    if (p.role === 'owner') ownerByHome.set(p.funeral_home_id, p.full_name)
    const login = lastLoginByUser.get(p.id)
    if (login) {
      const cur = lastLoginByHome.get(p.funeral_home_id)
      if (!cur || login > cur) lastLoginByHome.set(p.funeral_home_id, login)
    }
  }
  const activeSvcByHome = new Map<string, number>()
  for (const s of services ?? []) {
    if (s.status === 'active') activeSvcByHome.set(s.funeral_home_id, (activeSvcByHome.get(s.funeral_home_id) ?? 0) + 1)
  }
  const smsSentByHome = new Map<string, number>()
  const smsFailedByHome = new Map<string, number>()
  for (const m of sms ?? []) {
    if (m.status === 'sent')   smsSentByHome.set(m.funeral_home_id, (smsSentByHome.get(m.funeral_home_id) ?? 0) + 1)
    if (m.status === 'failed') smsFailedByHome.set(m.funeral_home_id, (smsFailedByHome.get(m.funeral_home_id) ?? 0) + 1)
  }
  const lastActivityByHome = new Map<string, string>()
  for (const a of activity ?? []) {
    const cur = lastActivityByHome.get(a.funeral_home_id)
    if (!cur || a.created_at > cur) lastActivityByHome.set(a.funeral_home_id, a.created_at)
  }

  let rows = (homes ?? []).map(h => {
    const sent = smsSentByHome.get(h.id) ?? 0
    const failed = smsFailedByHome.get(h.id) ?? 0
    return {
      id: h.id,
      name: h.name,
      address: h.address as string | null,
      ownerName: ownerByHome.get(h.id) ?? '—',
      users: usersByHome.get(h.id) ?? 0,
      activeServices: activeSvcByHome.get(h.id) ?? 0,
      smsSent: sent,
      deliveryRate: sent + failed > 0 ? Math.round((sent / (sent + failed)) * 100) : 0,
      createdAt: h.created_at,
      lastActivity: lastActivityByHome.get(h.id) ?? null,
      lastLogin: lastLoginByHome.get(h.id) ?? null,
      subscriptionStatus: (h.subscription_status as string | null) ?? 'none',
      trialEndsAt:        h.trial_ends_at as string | null,
      currentPeriodEnd:   h.current_period_end as string | null,
    }
  })

  if (q) rows = rows.filter(r => r.name.toLowerCase().includes(q))
  if (statusFilter !== 'all') rows = rows.filter(r => r.subscriptionStatus === statusFilter)
  rows.sort((a, b) => a.name.localeCompare(b.name))

  // Pagination (session 10 #5): 20 homes per page.
  const PAGE_SIZE  = 20
  const totalRows  = rows.length
  const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE))
  const page       = Math.min(Math.max(1, parseInt(searchParams.page ?? '1', 10) || 1), totalPages)
  rows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const pageHref = (n: number) =>
    `/admin/funeral-homes?status=${statusFilter}&page=${n}${searchParams.q ? `&q=${encodeURIComponent(searchParams.q)}` : ''}`

  return (
    <div className="px-6 py-8 md:px-10 max-w-6xl">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#0F172A' }}>Funeral Homes</h1>
          <p className="mt-1 text-sm" style={{ color: '#475569' }}>{totalRows} {totalRows === 1 ? 'account' : 'accounts'}</p>
        </div>
        <form method="GET" className="flex gap-2">
          <input
            type="text"
            name="q"
            defaultValue={searchParams.q ?? ''}
            placeholder="Search by name…"
            className="rounded-lg border px-3 py-2 text-sm outline-none"
            style={{ borderColor: '#E2E8F0', color: '#0F172A', backgroundColor: '#FFFFFF' }}
          />
          <button type="submit" className="rounded-lg px-3 py-2 text-sm font-semibold" style={{ backgroundColor: '#0A2540', color: '#F4C95D' }}>Search</button>
        </form>
      </div>

      {/* Billing status filter */}
      <div className="flex gap-1.5 mb-4 flex-wrap">
        {BILLING_FILTERS.map(f => (
          <Link
            key={f}
            href={`/admin/funeral-homes?status=${f}${searchParams.q ? `&q=${encodeURIComponent(searchParams.q)}` : ''}`}
            className="rounded-lg border px-2.5 py-1 text-xs font-semibold capitalize"
            style={statusFilter === f
              ? { backgroundColor: '#0A2540', color: '#F4C95D', borderColor: '#0A2540' }
              : { borderColor: '#E2E8F0', color: '#475569' }}
          >
            {f === 'all' ? 'All' : (BILLING_BADGE[f]?.label ?? f)}
          </Link>
        ))}
      </div>

      <div className="rounded-xl border overflow-x-auto" style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }}>
        <table className="w-full text-sm whitespace-nowrap">
          <thead>
            <tr style={{ backgroundColor: '#F8FAFC' }}>
              <Th>Funeral home</Th><Th>Owner</Th><Th>Location</Th>
              <Th>Billing</Th><Th>Trial ends</Th><Th>Period end</Th>
              <Th className="text-center">Users</Th><Th className="text-center">Active</Th>
              <Th className="text-center">SMS</Th><Th className="text-center">Delivery</Th>
              <Th>Created</Th><Th>Last activity</Th><Th>Last login</Th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={13} className="px-4 py-10 text-center" style={{ color: '#94A3B8' }}>No matching funeral homes.</td></tr>
            )}
            {rows.map(r => (
              <tr key={r.id} className="border-t hover:bg-gray-50 transition" style={{ borderColor: '#E2E8F0' }}>
                <td className="px-4 py-3 font-medium" style={{ color: '#0F172A' }}>
                  <Link href={`/admin/funeral-homes/${r.id}`} className="hover:underline">{r.name}</Link>
                </td>
                <td className="px-4 py-3" style={{ color: '#475569' }}>{r.ownerName}</td>
                <td className="px-4 py-3 max-w-[180px] truncate" style={{ color: '#475569' }}>{r.address ?? '—'}</td>
                <td className="px-4 py-3">
                  {(() => { const b = BILLING_BADGE[r.subscriptionStatus] ?? BILLING_BADGE.none
                    return <span className="rounded-full px-2 py-0.5 text-xs font-semibold" style={{ backgroundColor: b.bg, color: b.color }}>{b.label}</span> })()}
                </td>
                <td className="px-4 py-3" style={{ color: '#475569' }}>{r.trialEndsAt ? formatDate(r.trialEndsAt.slice(0, 10)) : '—'}</td>
                <td className="px-4 py-3" style={{ color: '#475569' }}>{r.currentPeriodEnd ? formatDate(r.currentPeriodEnd.slice(0, 10)) : '—'}</td>
                <td className="px-4 py-3 text-center" style={{ color: '#0F172A' }}>{r.users}</td>
                <td className="px-4 py-3 text-center" style={{ color: '#0F172A' }}>{r.activeServices}</td>
                <td className="px-4 py-3 text-center" style={{ color: '#0F172A' }}>{r.smsSent}</td>
                <td className="px-4 py-3 text-center font-semibold" style={{ color: completionColor(r.deliveryRate) }}>{r.smsSent + (smsFailedByHome.get(r.id) ?? 0) > 0 ? `${r.deliveryRate}%` : '—'}</td>
                <td className="px-4 py-3" style={{ color: '#475569' }}>{relativeJoined(r.createdAt)}</td>
                <td className="px-4 py-3" style={{ color: '#475569' }}>{r.lastActivity ? timeAgo(r.lastActivity) : '—'}</td>
                <td className="px-4 py-3" style={{ color: r.lastLogin ? (isStaleLogin(r.lastLogin) ? '#EF4444' : '#475569') : '#94A3B8' }}>
                  {r.lastLogin ? timeAgo(r.lastLogin) : 'Never'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm" style={{ color: '#475569' }}>
          {page > 1
            ? <Link href={pageHref(page - 1)} className="rounded-lg border px-3 py-1.5 font-medium" style={{ borderColor: '#E2E8F0' }}>← Previous</Link>
            : <span />}
          <span>Page {page} of {totalPages}</span>
          {page < totalPages
            ? <Link href={pageHref(page + 1)} className="rounded-lg border px-3 py-1.5 font-medium" style={{ borderColor: '#E2E8F0' }}>Next →</Link>
            : <span />}
        </div>
      )}
    </div>
  )
}

function Th({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide ${className}`} style={{ color: '#94A3B8' }}>
      {children}
    </th>
  )
}
