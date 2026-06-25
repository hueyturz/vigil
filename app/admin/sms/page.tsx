import { createServiceRoleClient } from '@/lib/supabase/server'
import { timeAgo } from '@/lib/utils/admin'
import type { SmsStatus } from '@/lib/types'
import { ResendSmsButton } from '@/app/admin/_components/ResendSmsButton'

// SMS body length → estimated Twilio segments (GSM-7: 160 single, 153 multipart).
function estimateSegments(message: string): number {
  const len = message.length
  if (len <= 160) return 1
  return Math.ceil(len / 153)
}

const inputStyle: React.CSSProperties = {
  borderRadius: 8, border: '1px solid #E2E8F0', padding: '7px 10px', fontSize: 13, color: '#0F172A', backgroundColor: '#FFFFFF',
}

export default async function PlatformSmsPage({
  searchParams,
}: {
  searchParams: { status?: string; fh?: string; from?: string; to?: string }
}) {
  const db = createServiceRoleClient()

  const status = (searchParams.status ?? 'all') as SmsStatus | 'all'
  const fh     = searchParams.fh ?? ''
  const from   = searchParams.from ?? ''
  const to     = searchParams.to ?? ''

  // Start of today (server local) for the summary stats.
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
  const todayIso = todayStart.toISOString()

  // Build the filtered table query.
  let rowsQuery = db
    .from('sms_log')
    .select('id, funeral_home_id, recipient_id, message, status, error_message, created_at')
    .order('created_at', { ascending: false })
    .limit(200)
  if (status !== 'all') rowsQuery = rowsQuery.eq('status', status)
  if (fh)   rowsQuery = rowsQuery.eq('funeral_home_id', fh)
  if (from) rowsQuery = rowsQuery.gte('created_at', from)
  if (to)   rowsQuery = rowsQuery.lte('created_at', `${to}T23:59:59`)

  const [
    { data: rows },
    { data: homes },
    { data: profiles },
    { count: sentToday },
    { count: failedToday },
  ] = await Promise.all([
    rowsQuery,
    db.from('funeral_homes').select('id, name').order('name'),
    db.from('profiles').select('id, phone, full_name'),
    db.from('sms_log').select('id', { count: 'exact', head: true }).eq('status', 'sent').gte('created_at', todayIso),
    db.from('sms_log').select('id', { count: 'exact', head: true }).eq('status', 'failed').gte('created_at', todayIso),
  ])

  const homeName = new Map((homes ?? []).map(h => [h.id, h.name]))
  const phoneById = new Map((profiles ?? []).map(p => [p.id, p.phone as string | null]))
  const nameById = new Map((profiles ?? []).map(p => [p.id, p.full_name as string]))

  const sent = sentToday ?? 0
  const failed = failedToday ?? 0
  const deliveryToday = sent + failed > 0 ? Math.round((sent / (sent + failed)) * 100) : 0

  return (
    <div className="px-6 py-8 md:px-10 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: '#0F172A' }}>SMS Logs</h1>
        <p className="mt-1 text-sm" style={{ color: '#475569' }}>All messages across every funeral home</p>
      </div>

      {/* Today summary */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <Stat label="Sent today" value={sent} />
        <Stat label="Failed today" value={failed} danger={failed > 0} />
        <Stat label="Delivery today" value={sent + failed > 0 ? `${deliveryToday}%` : '—'} />
      </div>

      {/* Filters */}
      <form method="GET" className="flex flex-wrap items-end gap-3 mb-5">
        <label className="flex flex-col gap-1 text-xs font-medium" style={{ color: '#475569' }}>
          Status
          <select name="status" defaultValue={status} style={inputStyle}>
            {['all', 'sent', 'failed', 'pending'].map(s => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium" style={{ color: '#475569' }}>
          Funeral home
          <select name="fh" defaultValue={fh} style={inputStyle}>
            <option value="">All</option>
            {(homes ?? []).map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium" style={{ color: '#475569' }}>
          From
          <input type="date" name="from" defaultValue={from} style={inputStyle} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium" style={{ color: '#475569' }}>
          To
          <input type="date" name="to" defaultValue={to} style={inputStyle} />
        </label>
        <button type="submit" className="rounded-lg px-4 py-2 text-sm font-semibold" style={{ backgroundColor: '#0A2540', color: '#F4C95D' }}>Apply</button>
      </form>

      {/* Table */}
      <div className="rounded-xl border overflow-x-auto" style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }}>
        <table className="w-full text-sm whitespace-nowrap">
          <thead><tr style={{ backgroundColor: '#F8FAFC' }}>
            {['Funeral home', 'Recipient', 'Message', 'Status', 'Error', 'Sent', 'Segs', 'Action'].map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: '#94A3B8' }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {(rows ?? []).length === 0 && <tr><td colSpan={8} className="px-4 py-10 text-center" style={{ color: '#94A3B8' }}>No messages match these filters.</td></tr>}
            {(rows ?? []).map(s => {
              const st = s.status as SmsStatus
              const badge = { sent: { bg: '#ECFDF5', color: '#15803D' }, failed: { bg: '#FEF2F2', color: '#991B1B' }, pending: { bg: '#FFFBEB', color: '#92400E' } }[st]
              return (
                <tr key={s.id} className="border-t" style={{ borderColor: '#E2E8F0' }}>
                  <td className="px-4 py-3" style={{ color: '#0F172A' }}>{homeName.get(s.funeral_home_id) ?? 'Unknown'}</td>
                  <td className="px-4 py-3" style={{ color: '#475569' }}>
                    <div>{phoneById.get(s.recipient_id) ?? '—'}</div>
                    <div className="text-xs" style={{ color: '#94A3B8' }}>{nameById.get(s.recipient_id) ?? ''}</div>
                  </td>
                  <td className="px-4 py-3 max-w-xs truncate" style={{ color: '#475569' }}>{s.message}</td>
                  <td className="px-4 py-3"><span className="rounded-full px-2 py-0.5 text-xs font-semibold capitalize" style={{ backgroundColor: badge.bg, color: badge.color }}>{st}</span></td>
                  <td className="px-4 py-3 max-w-[200px] truncate" style={{ color: st === 'failed' ? '#991B1B' : '#94A3B8' }} title={s.error_message ?? ''}>{st === 'failed' ? (s.error_message ?? '—') : '—'}</td>
                  <td className="px-4 py-3" style={{ color: '#475569' }}>{timeAgo(s.created_at)}</td>
                  <td className="px-4 py-3 text-center" style={{ color: '#475569' }}>{estimateSegments(s.message)}</td>
                  <td className="px-4 py-3">{st === 'failed' ? <ResendSmsButton smsLogId={s.id} /> : null}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs" style={{ color: '#94A3B8' }}>Showing up to 200 most recent matching messages. Segments are estimated from message length.</p>
    </div>
  )
}

function Stat({ label, value, danger }: { label: string; value: string | number; danger?: boolean }) {
  return (
    <div className="rounded-xl border p-4" style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }}>
      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#94A3B8' }}>{label}</p>
      <p className="mt-1.5 text-2xl font-bold" style={{ color: danger ? '#EF4444' : '#0F172A' }}>{value}</p>
    </div>
  )
}
