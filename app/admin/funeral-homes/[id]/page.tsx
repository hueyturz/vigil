import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { formatDate, daysUntil } from '@/lib/utils/date-helpers'
import { timeAgo, ACTION_LABELS, completionColor, listAllAuthUsers } from '@/lib/utils/admin'
import type { AdminUser, Role, SmsStatus } from '@/lib/types'
import { AdminUsersTable } from '@/app/admin/_components/AdminUsersTable'
import { AdminCreateServiceModal } from '@/app/admin/_components/AdminCreateServiceModal'
import { DangerZone } from '@/app/admin/_components/DangerZone'
import { startImpersonation } from '@/app/admin/impersonation-actions'
import { ActivateBillingButton } from '@/app/admin/_components/ActivateBillingButton'
import { ResendSmsButton } from '@/app/admin/_components/ResendSmsButton'

const SERVICE_TYPE_LABEL: Record<string, string> = {
  'full-burial': 'Full Burial', 'graveside': 'Graveside', 'cremation': 'Cremation', 'military': 'Military Honors',
}
const SERVICE_STATUS_STYLE: Record<string, { label: string; bg: string; color: string }> = {
  active:    { label: 'Active',    bg: '#FFFBEB', color: '#92400E' },
  completed: { label: 'Completed', bg: '#ECFDF5', color: '#15803D' },
  archived:  { label: 'Archived',  bg: '#F1F5F9', color: '#475569' },
}
// A message is a success once Twilio confirms send/delivery (migration 038
// delivery receipts flip 'sent' → 'delivered'); a failure covers both the
// carrier-reject 'failed' and the not-delivered 'undelivered' terminal states.
const SMS_SUCCESS = new Set<string>(['sent', 'delivered'])
const SMS_FAILURE = new Set<string>(['failed', 'undelivered'])
export default async function FuneralHomeDetailPage({
  params, searchParams,
}: {
  params: { id: string }
  searchParams: { sms?: string }
}) {
  const db = createServiceRoleClient()
  const fhId = params.id

  const { data: home } = await db
    .from('funeral_homes')
    .select('id, name, address, created_at, subscription_status, stripe_subscription_id')
    .eq('id', fhId)
    .single()
  if (!home) notFound()

  const [
    profilesRes,
    authUsers,
    servicesRes,
    tasksRes,
    smsRes,
    activityRes,
    billingActivityRes,
  ] = await Promise.all([
    db.from('profiles').select('id, full_name, role, phone, is_active').eq('funeral_home_id', fhId),
    listAllAuthUsers(db),
    db.from('services').select('id, family_name, deceased_name, service_type, service_date, status, created_at').eq('funeral_home_id', fhId),
    db.from('tasks').select('id, service_id, status, due_days_before').eq('funeral_home_id', fhId),
    db.from('sms_log').select('id, recipient_id, status, message, created_at').eq('funeral_home_id', fhId).order('created_at', { ascending: false }).limit(200),
    // General activity excludes billing events — they get their own section below.
    db.from('activity_log').select('id, actor_name, description, action_type, created_at').eq('funeral_home_id', fhId).neq('action_type', 'billing_event').order('created_at', { ascending: false }).limit(20),
    // Billing events, superadmin-only (filtered out of every customer feed).
    db.from('activity_log').select('id, actor_name, description, created_at').eq('funeral_home_id', fhId).eq('action_type', 'billing_event').order('created_at', { ascending: false }).limit(20),
  ])

  // Throw on any query error (audit H4) so error.tsx renders — never a
  // silently-empty detail page. (listAllAuthUsers throws on its own.)
  const firstError = [profilesRes, servicesRes, tasksRes, smsRes, activityRes, billingActivityRes].find(r => r.error)?.error
  if (firstError) throw new Error(`Failed to load funeral home detail: ${firstError.message}`)

  const { data: profiles }        = profilesRes
  const { data: services }        = servicesRes
  const { data: tasks }           = tasksRes
  const { data: sms }             = smsRes
  const { data: activity }        = activityRes
  const { data: billingActivity } = billingActivityRes

  const authById = new Map((authUsers ?? []).map(u => [u.id, u]))
  const profileName = new Map((profiles ?? []).map(p => [p.id, p.full_name]))

  // Users (AdminUser[]).
  const users: AdminUser[] = (profiles ?? []).map(p => ({
    id: p.id,
    funeralHomeId: fhId,
    fullName: p.full_name,
    email: authById.get(p.id)?.email ?? '—',
    role: p.role as Role,
    phone: p.phone,
    isActive: p.is_active,
    lastLoginAt: authById.get(p.id)?.last_sign_in_at ?? null,
  }))
  const owner = users.find(u => u.role === 'owner')
  const lastLogin = users.reduce<string | null>((acc, u) => (u.lastLoginAt && (!acc || u.lastLoginAt > acc) ? u.lastLoginAt : acc), null)

  // Service-scoped maps.
  const serviceDateById = new Map((services ?? []).map(s => [s.id, s.service_date as string | null]))
  const progressByService = new Map<string, { done: number; total: number }>()
  for (const t of tasks ?? []) {
    const p = progressByService.get(t.service_id) ?? { done: 0, total: 0 }
    p.total++
    if (t.status === 'complete') p.done++
    progressByService.set(t.service_id, p)
  }

  // Metrics.
  const activeServices = (services ?? []).filter(s => s.status === 'active').length
  const totalServices  = (services ?? []).length
  const tasksConfirmed = (tasks ?? []).filter(t => t.status === 'complete').length
  const tasksOverdue   = (tasks ?? []).filter(t => {
    const sd = serviceDateById.get(t.service_id)
    return t.status === 'not-started' && !!sd && daysUntil(sd) < t.due_days_before
  }).length
  const smsSent   = (sms ?? []).filter(s => SMS_SUCCESS.has(s.status)).length
  const smsFailed = (sms ?? []).filter(s => SMS_FAILURE.has(s.status)).length
  const deliveryRate = smsSent + smsFailed > 0 ? Math.round((smsSent / (smsSent + smsFailed)) * 100) : 0

  // 30-day sparklines (oldest → newest).
  const DAYS = 30
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const dayIndex = (iso: string) => {
    const d = new Date(iso); d.setHours(0, 0, 0, 0)
    return Math.floor((today.getTime() - d.getTime()) / 86_400_000)
  }
  const svcSeries = new Array(DAYS).fill(0)
  for (const s of services ?? []) { const i = dayIndex(s.created_at); if (i >= 0 && i < DAYS) svcSeries[DAYS - 1 - i]++ }
  const smsSeries = new Array(DAYS).fill(0)
  for (const s of sms ?? []) { if (SMS_SUCCESS.has(s.status)) { const i = dayIndex(s.created_at); if (i >= 0 && i < DAYS) smsSeries[DAYS - 1 - i]++ } }

  // SMS log filter + slice.
  const smsFilter = (searchParams.sms ?? 'all') as SmsStatus | 'all'
  const smsRows = (sms ?? []).filter(s => smsFilter === 'all' || s.status === smsFilter).slice(0, 50)

  const metrics = [
    { label: 'Active services', value: activeServices },
    { label: 'Total services',  value: totalServices },
    { label: 'Tasks confirmed', value: tasksConfirmed },
    { label: 'Tasks overdue',   value: tasksOverdue, danger: tasksOverdue > 0 },
    { label: 'SMS sent',        value: smsSent },
    { label: 'SMS delivery',    value: smsSent + smsFailed > 0 ? `${deliveryRate}%` : '—' },
    { label: 'Users',           value: users.length },
    { label: 'Last login',      value: lastLogin ? timeAgo(lastLogin) : '—' },
  ]

  return (
    <div className="px-6 py-8 md:px-10 max-w-6xl">
      {/* Header */}
      <div className="mb-2"><Link href="/admin/funeral-homes" className="text-sm hover:underline" style={{ color: '#4A7C8C' }}>← All funeral homes</Link></div>
      <div className="flex items-start justify-between gap-4 mb-8 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#0F172A' }}>{home.name}</h1>
          <p className="text-sm mt-1" style={{ color: '#475569' }}>{home.address ?? 'No address'} · created {formatDate(home.created_at)}</p>
          <p className="text-sm mt-0.5" style={{ color: '#475569' }}>
            Owner: <span className="font-medium" style={{ color: '#0F172A' }}>{owner?.fullName ?? '—'}</span> · {owner?.email ?? '—'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <ActivateBillingButton
            funeralHomeId={fhId}
            subscriptionStatus={home.subscription_status ?? null}
            hasSubscription={!!home.stripe_subscription_id}
          />
          <form action={startImpersonation}>
            <input type="hidden" name="funeralHomeId" value={fhId} />
            <button type="submit" className="rounded-lg px-3 py-1.5 text-sm font-semibold" style={{ backgroundColor: '#0A2540', color: '#F4C95D' }}>Impersonate</button>
          </form>
          <DangerZone funeralHomeId={fhId} funeralHomeName={home.name} />
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {metrics.map(m => (
          <div key={m.label} className="rounded-xl border p-4" style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }}>
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#94A3B8' }}>{m.label}</p>
            <p className="mt-1.5 text-2xl font-bold" style={{ color: 'danger' in m && m.danger ? '#EF4444' : '#0F172A' }}>{m.value}</p>
          </div>
        ))}
      </div>

      {/* Sparklines */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
        <SparkCard title="Services created · last 30 days" data={svcSeries} color="#4A7C8C" />
        <SparkCard title="SMS sent · last 30 days" data={smsSeries} color="#0A2540" />
      </div>

      {/* Users */}
      <div className="mb-10">
        <AdminUsersTable users={users} funeralHomeId={fhId} />
      </div>

      {/* Services */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold" style={{ color: '#0F172A' }}>Services</h2>
          <AdminCreateServiceModal funeralHomeId={fhId} />
        </div>
        <div className="rounded-xl border overflow-x-auto" style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }}>
          <table className="w-full text-sm whitespace-nowrap">
            <thead><tr style={{ backgroundColor: '#F8FAFC' }}>
              {['Family', 'Type', 'Service date', 'Progress', 'Status', 'Created'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: '#94A3B8' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {(services ?? []).length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center" style={{ color: '#94A3B8' }}>No services.</td></tr>}
              {(services ?? []).map(s => {
                const prog = progressByService.get(s.id) ?? { done: 0, total: 0 }
                const pct = prog.total > 0 ? Math.round((prog.done / prog.total) * 100) : 0
                const st = SERVICE_STATUS_STYLE[s.status] ?? SERVICE_STATUS_STYLE.active
                return (
                  <tr key={s.id} className="border-t" style={{ borderColor: '#E2E8F0' }}>
                    <td className="px-4 py-3 font-medium" style={{ color: '#0F172A' }}>{s.deceased_name}</td>
                    <td className="px-4 py-3" style={{ color: '#475569' }}>{s.service_type ? (SERVICE_TYPE_LABEL[s.service_type] ?? s.service_type) : '—'}</td>
                    <td className="px-4 py-3" style={{ color: '#475569' }}>{s.service_date ? formatDate(s.service_date) : 'TBD'}</td>
                    <td className="px-4 py-3" style={{ color: completionColor(pct) }}>{prog.done}/{prog.total} ({pct}%)</td>
                    <td className="px-4 py-3"><span className="rounded-full px-2 py-0.5 text-xs font-semibold" style={{ backgroundColor: st.bg, color: st.color }}>{st.label}</span></td>
                    <td className="px-4 py-3" style={{ color: '#475569' }}>{formatDate(s.created_at)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Activity */}
      <div className="mb-10">
        <h2 className="text-lg font-bold mb-3" style={{ color: '#0F172A' }}>Recent activity</h2>
        <div className="rounded-xl border p-5" style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }}>
          {(activity ?? []).length === 0 ? (
            <p className="text-sm text-center py-4" style={{ color: '#94A3B8' }}>No activity yet.</p>
          ) : (
            <div className="space-y-3">
              {(activity ?? []).map(a => (
                <div key={a.id} className="flex items-start gap-2 text-sm">
                  <span className="font-medium" style={{ color: '#0F172A' }}>{a.actor_name}</span>
                  <span style={{ color: '#475569' }}>{a.description}</span>
                  <span className="ml-auto text-xs flex-shrink-0" style={{ color: '#94A3B8' }}>
                    {ACTION_LABELS[a.action_type] ?? a.action_type} · {timeAgo(a.created_at)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Billing activity — superadmin-only; hidden from all customer feeds. */}
      <div className="mb-10">
        <h2 className="text-lg font-bold mb-3" style={{ color: '#0F172A' }}>Billing activity</h2>
        <div className="rounded-xl border p-5" style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }}>
          {(billingActivity ?? []).length === 0 ? (
            <p className="text-sm text-center py-4" style={{ color: '#94A3B8' }}>No billing events yet.</p>
          ) : (
            <div className="space-y-3">
              {(billingActivity ?? []).map(a => (
                <div key={a.id} className="flex items-start gap-2 text-sm">
                  <span className="flex-shrink-0 mt-1.5 rounded-full" style={{ width: 7, height: 7, backgroundColor: '#8B5CF6' }} />
                  <span style={{ color: '#475569' }}>{a.description}</span>
                  <span className="ml-auto text-xs flex-shrink-0" style={{ color: '#94A3B8' }}>
                    {timeAgo(a.created_at)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* SMS log */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold" style={{ color: '#0F172A' }}>SMS log</h2>
          <div className="flex gap-1.5">
            {(['all', 'sent', 'failed', 'pending'] as const).map(f => (
              <Link key={f} href={`/admin/funeral-homes/${fhId}?sms=${f}`}
                className="rounded-lg border px-2.5 py-1 text-xs font-semibold capitalize"
                style={smsFilter === f ? { backgroundColor: '#0A2540', color: '#F4C95D', borderColor: '#0A2540' } : { borderColor: '#E2E8F0', color: '#475569' }}>
                {f}
              </Link>
            ))}
          </div>
        </div>
        <div className="rounded-xl border overflow-x-auto" style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }}>
          <table className="w-full text-sm whitespace-nowrap">
            <thead><tr style={{ backgroundColor: '#F8FAFC' }}>
              {['Recipient', 'Message', 'Status', 'Sent', 'Action'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: '#94A3B8' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {smsRows.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center" style={{ color: '#94A3B8' }}>No messages.</td></tr>}
              {smsRows.map(s => (
                <tr key={s.id} className="border-t" style={{ borderColor: '#E2E8F0' }}>
                  <td className="px-4 py-3" style={{ color: '#0F172A' }}>{profileName.get(s.recipient_id) ?? '—'}</td>
                  <td className="px-4 py-3 max-w-xs truncate" style={{ color: '#475569' }}>{s.message}</td>
                  <td className="px-4 py-3"><SmsStatusBadge status={s.status as SmsStatus} /></td>
                  <td className="px-4 py-3" style={{ color: '#475569' }}>{timeAgo(s.created_at)}</td>
                  <td className="px-4 py-3">{s.status === 'failed' ? <ResendSmsButton smsLogId={s.id} /> : null}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function SparkCard({ title, data, color }: { title: string; data: number[]; color: string }) {
  const w = 280, h = 48, max = Math.max(1, ...data)
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - (v / max) * (h - 4) - 2}`).join(' ')
  const total = data.reduce((a, b) => a + b, 0)
  return (
    <div className="rounded-xl border p-4" style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }}>
      <div className="flex items-baseline justify-between mb-2">
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#94A3B8' }}>{title}</p>
        <span className="text-sm font-bold" style={{ color: '#0F172A' }}>{total}</span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none">
        <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
    </div>
  )
}

function SmsStatusBadge({ status }: { status: SmsStatus }) {
  const style: Record<SmsStatus, { bg: string; color: string }> = {
    sent:        { bg: '#ECFDF5', color: '#15803D' },
    delivered:   { bg: '#ECFDF5', color: '#15803D' },
    failed:      { bg: '#FEF2F2', color: '#991B1B' },
    undelivered: { bg: '#FEF2F2', color: '#991B1B' },
    pending:     { bg: '#FFFBEB', color: '#92400E' },
    queued:      { bg: '#FFFBEB', color: '#92400E' },
    opted_out:   { bg: '#F1F5F9', color: '#475569' },
  }
  // Fallback keeps an unmapped/future status from crashing the whole page.
  const s = style[status] ?? { bg: '#F1F5F9', color: '#475569' }
  return <span className="rounded-full px-2 py-0.5 text-xs font-semibold capitalize" style={{ backgroundColor: s.bg, color: s.color }}>{status.replace('_', ' ')}</span>
}
