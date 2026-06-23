import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getAdminSession, completionColor } from '@/lib/utils/admin'
import { formatDate } from '@/lib/utils/date-helpers'

const SERVICE_TYPE_LABEL: Record<string, string> = {
  'full-burial': 'Full Burial',
  'graveside':   'Graveside',
  'cremation':   'Cremation',
  'military':    'Military Honors',
}

const SERVICE_STATUS_STYLE: Record<string, { label: string; bg: string; color: string }> = {
  active:    { label: 'In progress', bg: '#FFFBEB', color: '#F59E0B' },
  completed: { label: 'Completed',   bg: '#ECFDF5', color: '#4A7C8C' },
  archived:  { label: 'Archived',    bg: '#F1F5F9', color: '#475569' },
}

const ROLE_LABEL: Record<string, string> = {
  owner: 'Owner',
  fd:    'Funeral Director',
  staff: 'Staff',
}

export default async function ImpersonatePage({
  params,
}: {
  params: { funeralHomeId: string }
}) {
  // Same gate as /admin — 404 for non-admins so the route stays hidden.
  if (!(await getAdminSession())) notFound()

  const db = createServiceRoleClient()

  const { data: home } = await db
    .from('funeral_homes')
    .select('id, name')
    .eq('id', params.funeralHomeId)
    .single()

  if (!home) notFound()

  const [
    { data: services },
    { data: tasks },
    { data: profiles },
    { data: { users: authUsers } },
  ] = await Promise.all([
    db.from('services')
      .select('id, family_name, deceased_name, service_type, service_date, status')
      .eq('funeral_home_id', home.id)
      .order('service_date', { ascending: false }),
    db.from('tasks')
      .select('id, service_id, status')
      .eq('funeral_home_id', home.id),
    db.from('profiles')
      .select('id, full_name, role, is_active')
      .eq('funeral_home_id', home.id)
      .order('created_at', { ascending: true }),
    db.auth.admin.listUsers({ perPage: 1000 }),
  ])

  const emailById: Record<string, string> = {}
  for (const au of authUsers ?? []) emailById[au.id] = au.email ?? ''

  const allTasks       = tasks ?? []
  const totalTasks     = allTasks.length
  const confirmedTasks = allTasks.filter(t => t.status === 'complete').length
  const completionRate = totalTasks > 0 ? Math.round((confirmedTasks / totalTasks) * 100) : 0
  const activeServices = (services ?? []).filter(s => s.status === 'active').length

  // Per-service task counts.
  const taskCountsBySvc: Record<string, { total: number; confirmed: number }> = {}
  for (const t of allTasks) {
    const c = taskCountsBySvc[t.service_id] ?? { total: 0, confirmed: 0 }
    c.total += 1
    if (t.status === 'complete') c.confirmed += 1
    taskCountsBySvc[t.service_id] = c
  }

  return (
    <div className="min-h-screen px-4 py-8 md:px-10" style={{ backgroundColor: '#F8F5F0' }}>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <Link
          href="/admin"
          className="inline-block text-sm font-medium mb-4 hover:underline"
          style={{ color: '#4A7C8C' }}
        >
          ← Back to Admin
        </Link>

        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#94A3B8' }}>
            Viewing
          </p>
          <h1 className="text-2xl font-bold" style={{ color: '#0F172A' }}>{home.name}</h1>
          <p className="mt-1 text-sm" style={{ color: '#475569' }}>
            Read-only account view · internal use only
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard label="Active services" value={`${activeServices}`} />
          <StatCard label="Total tasks"     value={`${totalTasks}`} />
          <StatCard label="Confirmed"       value={`${confirmedTasks}`} />
          <StatCard label="Completion"      value={`${completionRate}%`} valueColor={completionColor(completionRate)} />
        </div>

        {/* Services */}
        <h2 className="text-lg font-bold mb-4" style={{ color: '#0F172A' }}>Services</h2>
        <div className="space-y-3 mb-10">
          {(services ?? []).length === 0 && (
            <div
              className="rounded-xl border p-6 text-sm text-center"
              style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', color: '#94A3B8' }}
            >
              No services yet.
            </div>
          )}
          {(services ?? []).map(s => {
            const counts = taskCountsBySvc[s.id] ?? { total: 0, confirmed: 0 }
            const statusStyle = SERVICE_STATUS_STYLE[s.status] ?? SERVICE_STATUS_STYLE.archived
            return (
              <div
                key={s.id}
                className="rounded-xl border p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }}
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold" style={{ color: '#0F172A' }}>{s.deceased_name}</p>
                  <p className="text-xs" style={{ color: '#475569' }}>{s.family_name} family</p>
                  <p className="mt-1 text-xs" style={{ color: '#94A3B8' }}>
                    {SERVICE_TYPE_LABEL[s.service_type] ?? s.service_type}
                    {s.service_date && <> · {formatDate(s.service_date)}</>}
                  </p>
                </div>

                <div className="flex items-center gap-4 flex-shrink-0">
                  <span className="text-xs" style={{ color: '#475569' }}>
                    {counts.confirmed}/{counts.total} confirmed
                  </span>
                  <span
                    className="inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold"
                    style={{ backgroundColor: statusStyle.bg, color: statusStyle.color }}
                  >
                    {statusStyle.label}
                  </span>
                  <Link
                    href={`/services/${s.id}`}
                    className="text-xs font-semibold hover:underline"
                    style={{ color: '#4A7C8C' }}
                  >
                    View →
                  </Link>
                </div>
              </div>
            )
          })}
        </div>

        {/* Staff */}
        <h2 className="text-lg font-bold mb-4" style={{ color: '#0F172A' }}>Staff</h2>
        <div
          className="rounded-xl border overflow-hidden"
          style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: '#F7F8FA' }}>
                  <Th>Name</Th>
                  <Th>Role</Th>
                  <Th>Email</Th>
                  <Th className="text-center">Status</Th>
                </tr>
              </thead>
              <tbody>
                {(profiles ?? []).length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center" style={{ color: '#94A3B8' }}>
                      No staff yet.
                    </td>
                  </tr>
                )}
                {(profiles ?? []).map(p => (
                  <tr key={p.id} className="border-t" style={{ borderColor: '#E2E8F0' }}>
                    <td className="px-4 py-3 font-medium" style={{ color: '#0F172A' }}>{p.full_name}</td>
                    <td className="px-4 py-3" style={{ color: '#475569' }}>{ROLE_LABEL[p.role] ?? p.role}</td>
                    <td className="px-4 py-3" style={{ color: '#475569' }}>{emailById[p.id] ?? '—'}</td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className="inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold"
                        style={
                          p.is_active
                            ? { backgroundColor: '#ECFDF5', color: '#4A7C8C' }
                            : { backgroundColor: '#F1F5F9', color: '#94A3B8' }
                        }
                      >
                        {p.is_active ? 'Active' : 'Inactive'}
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

// ── Presentational helpers ──────────────────────────────────────────────────────

function StatCard({ label, value, valueColor = '#0F172A' }: { label: string; value: string; valueColor?: string }) {
  return (
    <div className="rounded-xl border p-5" style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }}>
      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#94A3B8' }}>{label}</p>
      <p className="mt-1.5 text-3xl font-bold" style={{ color: valueColor }}>{value}</p>
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
