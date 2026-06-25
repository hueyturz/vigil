import Link from 'next/link'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { relativeJoined, timeAgo, completionColor } from '@/lib/utils/admin'

// Flag accounts whose most recent login is more than 30 days old.
const STALE_LOGIN_MS = 30 * 86_400_000
function isStaleLogin(iso: string): boolean {
  return Date.now() - new Date(iso).getTime() > STALE_LOGIN_MS
}

export default async function FuneralHomesPage({
  searchParams,
}: {
  searchParams: { q?: string }
}) {
  const db = createServiceRoleClient()
  const q = (searchParams.q ?? '').trim().toLowerCase()

  const [
    { data: homes },
    { data: profiles },
    { data: services },
    { data: sms },
    { data: activity },
    { data: { users: authUsers } },
  ] = await Promise.all([
    db.from('funeral_homes').select('id, name, address, created_at'),
    db.from('profiles').select('id, full_name, role, funeral_home_id'),
    db.from('services').select('funeral_home_id, status'),
    db.from('sms_log').select('funeral_home_id, status'),
    db.from('activity_log').select('funeral_home_id, created_at'),
    db.auth.admin.listUsers({ perPage: 1000 }),
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
    }
  })

  if (q) rows = rows.filter(r => r.name.toLowerCase().includes(q))
  rows.sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div className="px-6 py-8 md:px-10 max-w-6xl">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#0F172A' }}>Funeral Homes</h1>
          <p className="mt-1 text-sm" style={{ color: '#475569' }}>{rows.length} {rows.length === 1 ? 'account' : 'accounts'}</p>
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

      <div className="rounded-xl border overflow-x-auto" style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }}>
        <table className="w-full text-sm whitespace-nowrap">
          <thead>
            <tr style={{ backgroundColor: '#F8FAFC' }}>
              <Th>Funeral home</Th><Th>Owner</Th><Th>Location</Th>
              <Th className="text-center">Users</Th><Th className="text-center">Active</Th>
              <Th className="text-center">SMS</Th><Th className="text-center">Delivery</Th>
              <Th>Created</Th><Th>Last activity</Th><Th>Last login</Th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={10} className="px-4 py-10 text-center" style={{ color: '#94A3B8' }}>No matching funeral homes.</td></tr>
            )}
            {rows.map(r => (
              <tr key={r.id} className="border-t hover:bg-gray-50 transition" style={{ borderColor: '#E2E8F0' }}>
                <td className="px-4 py-3 font-medium" style={{ color: '#0F172A' }}>
                  <Link href={`/admin/funeral-homes/${r.id}`} className="hover:underline">{r.name}</Link>
                </td>
                <td className="px-4 py-3" style={{ color: '#475569' }}>{r.ownerName}</td>
                <td className="px-4 py-3 max-w-[180px] truncate" style={{ color: '#475569' }}>{r.address ?? '—'}</td>
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
