import Link from 'next/link'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { relativeJoined, timeAgo } from '@/lib/utils/admin'
import { ResendSmsButton } from './_components/ResendSmsButton'

// Access is gated by middleware + the admin layout (superadmin only).
export default async function AdminOverviewPage() {
  const db = createServiceRoleClient()

  const results = await Promise.all([
    db.from('funeral_homes').select('id, name, created_at'),
    db.from('profiles').select('id, full_name, role, funeral_home_id'),
    db.from('services').select('funeral_home_id'),
    db.from('profiles').select('id', { count: 'exact', head: true }).eq('is_active', true),
    db.from('services').select('id', { count: 'exact', head: true }),
    db.from('sms_log').select('id', { count: 'exact', head: true }).eq('status', 'sent'),
    db.from('sms_log').select('id', { count: 'exact', head: true }).eq('status', 'failed'),
    db.from('tasks').select('id', { count: 'exact', head: true }).eq('status', 'complete'),
    db.from('sms_log')
      .select('id, recipient_id, funeral_home_id, message, created_at')
      .eq('status', 'failed')
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  // Throw on any query error (audit H4) so error.tsx renders — never a
  // zeros-everywhere admin overview masquerading as healthy.
  const firstError = results.find(r => r.error)?.error
  if (firstError) throw new Error(`Failed to load admin overview: ${firstError.message}`)

  const [
    { data: homes },
    { data: profiles },
    { data: services },
    { count: activeUsers },
    { count: totalServices },
    { count: smsSent },
    { count: smsFailed },
    { count: tasksConfirmed },
    { data: failedSms },
  ] = results

  const homeName = new Map((homes ?? []).map(h => [h.id, h.name]))
  const profileName = new Map((profiles ?? []).map(p => [p.id, p.full_name]))

  const sent = smsSent ?? 0
  const failed = smsFailed ?? 0
  const deliveryRate = sent + failed > 0 ? Math.round((sent / (sent + failed)) * 100) : 0

  // Recent signups: last 10 homes with per-home user + service counts.
  const userCountByHome = new Map<string, number>()
  for (const p of profiles ?? []) userCountByHome.set(p.funeral_home_id, (userCountByHome.get(p.funeral_home_id) ?? 0) + 1)
  const serviceCountByHome = new Map<string, number>()
  for (const s of services ?? []) serviceCountByHome.set(s.funeral_home_id, (serviceCountByHome.get(s.funeral_home_id) ?? 0) + 1)
  const ownerByHome = new Map<string, string>()
  for (const p of profiles ?? []) if (p.role === 'owner') ownerByHome.set(p.funeral_home_id, p.full_name)

  const recentSignups = [...(homes ?? [])]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 10)

  const METRICS = [
    { label: 'Funeral homes',  value: (homes ?? []).length },
    { label: 'Active users',   value: activeUsers ?? 0 },
    { label: 'Services',       value: totalServices ?? 0 },
    { label: 'SMS sent',       value: sent },
    { label: 'SMS delivery',   value: `${deliveryRate}%` },
    { label: 'Tasks confirmed', value: tasksConfirmed ?? 0 },
  ]

  return (
    <div className="px-6 py-8 md:px-10 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold" style={{ color: '#0F172A' }}>Overview</h1>
        <p className="mt-1 text-sm" style={{ color: '#475569' }}>Platform-wide operations · internal use only</p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-10">
        {METRICS.map(m => (
          <div key={m.label} className="rounded-xl border p-4" style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }}>
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#94A3B8' }}>{m.label}</p>
            <p className="mt-1.5 text-2xl font-bold" style={{ color: '#0F172A' }}>{m.value}</p>
          </div>
        ))}
      </div>

      {/* Recent signups */}
      <h2 className="text-lg font-bold mb-3" style={{ color: '#0F172A' }}>Recent signups</h2>
      <div className="rounded-xl border overflow-hidden mb-10" style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: '#F8FAFC' }}>
              <Th>Funeral home</Th><Th>Owner</Th><Th className="text-center">Users</Th>
              <Th className="text-center">Services</Th><Th>Created</Th>
            </tr>
          </thead>
          <tbody>
            {recentSignups.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-10 text-center" style={{ color: '#94A3B8' }}>No funeral homes yet.</td></tr>
            )}
            {recentSignups.map(h => (
              <tr key={h.id} className="border-t hover:bg-gray-50 transition" style={{ borderColor: '#E2E8F0' }}>
                <td className="px-4 py-3 font-medium" style={{ color: '#0F172A' }}>
                  <Link href={`/admin/funeral-homes/${h.id}`} className="hover:underline">{h.name}</Link>
                </td>
                <td className="px-4 py-3" style={{ color: '#475569' }}>{ownerByHome.get(h.id) ?? '—'}</td>
                <td className="px-4 py-3 text-center" style={{ color: '#0F172A' }}>{userCountByHome.get(h.id) ?? 0}</td>
                <td className="px-4 py-3 text-center" style={{ color: '#0F172A' }}>{serviceCountByHome.get(h.id) ?? 0}</td>
                <td className="px-4 py-3" style={{ color: '#475569' }}>{relativeJoined(h.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Recent failed SMS */}
      <h2 className="text-lg font-bold mb-3" style={{ color: '#0F172A' }}>Recent failed SMS</h2>
      <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: '#F8FAFC' }}>
              <Th>Funeral home</Th><Th>Recipient</Th><Th>Message</Th><Th>Failed</Th><Th className="text-right">Action</Th>
            </tr>
          </thead>
          <tbody>
            {(failedSms ?? []).length === 0 && (
              <tr><td colSpan={5} className="px-4 py-10 text-center" style={{ color: '#94A3B8' }}>No failed messages.</td></tr>
            )}
            {(failedSms ?? []).map(s => (
              <tr key={s.id} className="border-t" style={{ borderColor: '#E2E8F0' }}>
                <td className="px-4 py-3" style={{ color: '#0F172A' }}>{homeName.get(s.funeral_home_id) ?? 'Unknown'}</td>
                <td className="px-4 py-3" style={{ color: '#475569' }}>{profileName.get(s.recipient_id) ?? '—'}</td>
                <td className="px-4 py-3 max-w-xs truncate" style={{ color: '#475569' }}>{s.message}</td>
                <td className="px-4 py-3" style={{ color: '#475569' }}>{timeAgo(s.created_at)}</td>
                <td className="px-4 py-3 text-right"><ResendSmsButton smsLogId={s.id} /></td>
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
