'use client'

import { useState } from 'react'
import { saveNotificationPreferences } from './actions'
import type { NotificationPreferences } from '@/lib/types'

export type Prefs = Pick<
  NotificationPreferences,
  | 'critical_email' | 'critical_sms'
  | 'standard_email' | 'standard_sms'
  | 'informational_email' | 'informational_sms'
  | 'overdue_email' | 'overdue_sms'
  | 'sms_task_assigned' | 'sms_task_completed_on_my_service'
  | 'sms_my_tasks_overdue' | 'sms_staff_tasks_overdue'
  | 'sms_task_approaching_deadline' | 'sms_new_service_created'
  | 'email_task_assigned' | 'email_task_completed_on_my_service'
  | 'email_my_tasks_overdue' | 'email_staff_tasks_overdue'
  | 'email_task_approaching_deadline' | 'email_new_service_created'
  | 'preferred_sms_hour' | 'timezone'
>

// Keys whose value is a boolean (toggleable).
type BoolPrefKey = { [K in keyof Prefs]: Prefs[K] extends boolean ? K : never }[keyof Prefs]

const ROWS: { label: string; dot: string; emailKey: BoolPrefKey; smsKey: BoolPrefKey }[] = [
  { label: 'Critical tasks',      dot: '#EF4444', emailKey: 'critical_email',      smsKey: 'critical_sms'      },
  { label: 'Standard tasks',      dot: '#F59E0B', emailKey: 'standard_email',      smsKey: 'standard_sms'      },
  { label: 'Informational tasks', dot: '#94A3B8', emailKey: 'informational_email', smsKey: 'informational_sms' },
  { label: 'Overdue alerts',      dot: '#EF4444', emailKey: 'overdue_email',       smsKey: 'overdue_sms'       },
]

const SMS_TOGGLES: { key: BoolPrefKey; label: string; managerOnly?: boolean }[] = [
  { key: 'sms_task_assigned',                label: 'A task is assigned to me' },
  { key: 'sms_task_completed_on_my_service', label: 'A task is completed on my service' },
  { key: 'sms_my_tasks_overdue',             label: 'My tasks are overdue (daily reminder)' },
  { key: 'sms_staff_tasks_overdue',          label: 'Staff tasks are overdue (daily reminder)', managerOnly: true },
  { key: 'sms_task_approaching_deadline',    label: 'A task is due tomorrow' },
  { key: 'sms_new_service_created',          label: 'A new service is created', managerOnly: true },
]

// comingSoon (audit H6): these preferences save correctly but no email send path
// exists for them yet — shown disabled so users aren't misled into thinking they
// control live behavior. Only 'A task is assigned to me' sends email today.
const EMAIL_TOGGLES: { key: BoolPrefKey; label: string; managerOnly?: boolean; comingSoon?: boolean }[] = [
  { key: 'email_task_assigned',                label: 'A task is assigned to me' },
  { key: 'email_task_completed_on_my_service', label: 'A task is completed on my service', comingSoon: true },
  { key: 'email_my_tasks_overdue',             label: 'My tasks are overdue (daily reminder)', comingSoon: true },
  { key: 'email_staff_tasks_overdue',          label: 'Staff tasks are overdue (daily reminder)', managerOnly: true, comingSoon: true },
  { key: 'email_task_approaching_deadline',    label: 'A task is due tomorrow', comingSoon: true },
  { key: 'email_new_service_created',          label: 'A new service is created', managerOnly: true, comingSoon: true },
]

const REMINDER_HOURS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21]
function hourLabel(h: number): string {
  const ampm = h < 12 ? 'AM' : 'PM'
  const disp = h % 12 === 0 ? 12 : h % 12
  return `${disp} ${ampm}`
}

const TIMEZONES: { value: string; label: string }[] = [
  { value: 'America/New_York',    label: 'Eastern (New York)'    },
  { value: 'America/Chicago',     label: 'Central (Chicago)'     },
  { value: 'America/Denver',      label: 'Mountain (Denver)'     },
  { value: 'America/Los_Angeles', label: 'Pacific (Los Angeles)' },
  { value: 'America/Phoenix',     label: 'Arizona (Phoenix)'     },
  { value: 'Pacific/Honolulu',    label: 'Hawaii (Honolulu)'     },
  { value: 'America/Anchorage',   label: 'Alaska (Anchorage)'    },
]

const selectStyle: React.CSSProperties = {
  borderRadius: 8, border: '1px solid #E2E8F0', padding: '8px 12px',
  fontSize: 14, color: '#0F172A', outline: 'none', backgroundColor: '#FFFFFF',
}

export function NotificationsPanel({ initial, isManager }: { initial: Prefs; isManager: boolean }) {
  const [prefs,  setPrefs]  = useState<Prefs>(initial)
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)
  const [error,  setError]  = useState<string | null>(null)

  function toggle(key: BoolPrefKey) {
    setPrefs(p => ({ ...p, [key]: !p[key] }))
    setSaved(false)
  }

  function setField<K extends keyof Prefs>(key: K, value: Prefs[K]) {
    setPrefs(p => ({ ...p, [key]: value }))
    setSaved(false)
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    const result = await saveNotificationPreferences(prefs)
    setSaving(false)
    if (result.error) { setError(result.error); return }
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const smsToggles   = SMS_TOGGLES.filter(t => !t.managerOnly || isManager)
  const emailToggles = EMAIL_TOGGLES.filter(t => !t.managerOnly || isManager)

  return (
    <div>
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: '#0F172A' }}>Notifications</h1>
        <p className="text-sm mt-1" style={{ color: '#64748B' }}>
          Choose when Vigilight sends you email and SMS alerts.
        </p>
      </div>

      {/* Email / SMS priority table */}
      <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: 12 }}>
        {/* Column headers — desktop grid only; on mobile each row is a labeled card */}
        <div className="hidden sm:grid grid-cols-3 px-5 py-3 border-b" style={{ backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' }}>
          <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#64748B' }}>Notification type</span>
          <span className="text-xs font-semibold uppercase tracking-wide text-center" style={{ color: '#64748B' }}>Email</span>
          <span className="text-xs font-semibold uppercase tracking-wide text-center" style={{ color: '#64748B' }}>SMS</span>
        </div>
        {ROWS.map((row, i) => (
          <div key={row.label} className={`px-5 py-4${i < ROWS.length - 1 ? ' border-b' : ''}`} style={{ borderColor: '#E2E8F0' }}>
            {/* Desktop: 3-column grid */}
            <div className="hidden sm:grid grid-cols-3 items-center">
              <div className="flex items-center gap-2.5">
                <span className="flex-shrink-0 rounded-full" style={{ width: 8, height: 8, backgroundColor: row.dot, display: 'inline-block' }} />
                <span className="text-sm font-medium" style={{ color: '#0F172A' }}>{row.label}</span>
              </div>
              <div className="flex justify-center"><Toggle checked={prefs[row.emailKey]} onChange={() => toggle(row.emailKey)} /></div>
              <div className="flex justify-center"><Toggle checked={prefs[row.smsKey]} onChange={() => toggle(row.smsKey)} /></div>
            </div>
            {/* Mobile: stacked card — name on top, labeled toggles below */}
            <div className="sm:hidden">
              <div className="flex items-center gap-2.5">
                <span className="flex-shrink-0 rounded-full" style={{ width: 8, height: 8, backgroundColor: row.dot, display: 'inline-block' }} />
                <span className="text-sm font-medium" style={{ color: '#0F172A' }}>{row.label}</span>
              </div>
              <div className="mt-3 flex items-center gap-8 pl-[18px]">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#64748B' }}>Email</span>
                  <Toggle checked={prefs[row.emailKey]} onChange={() => toggle(row.emailKey)} />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#64748B' }}>SMS</span>
                  <Toggle checked={prefs[row.smsKey]} onChange={() => toggle(row.smsKey)} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Email preferences */}
      <h2 className="text-sm font-semibold uppercase tracking-wide mt-8 mb-3" style={{ color: '#64748B' }}>
        Email notifications
      </h2>
      <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: 12 }}>
        {emailToggles.map((row, i) => (
          <div
            key={row.key}
            title={row.comingSoon ? 'Coming soon — this email isn’t sent yet' : undefined}
            className={`flex items-center justify-between px-5 py-4${i < emailToggles.length - 1 ? ' border-b' : ''}`}
            style={{ borderColor: '#E2E8F0', opacity: row.comingSoon ? 0.55 : 1 }}
          >
            <span className="flex items-center gap-2 text-sm font-medium pr-4" style={{ color: '#0F172A' }}>
              {row.label}
              {row.comingSoon && (
                <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide" style={{ backgroundColor: '#F1F5F9', color: '#64748B' }}>
                  Coming soon
                </span>
              )}
            </span>
            <Toggle checked={prefs[row.key]} onChange={() => toggle(row.key)} disabled={row.comingSoon} />
          </div>
        ))}
      </div>

      {/* SMS preferences */}
      <h2 className="text-sm font-semibold uppercase tracking-wide mt-8 mb-3" style={{ color: '#64748B' }}>
        SMS notifications
      </h2>
      <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: 12 }}>
        {smsToggles.map((row, i) => (
          <div key={row.key} className={`flex items-center justify-between px-5 py-4${i < smsToggles.length - 1 ? ' border-b' : ''}`} style={{ borderColor: '#E2E8F0' }}>
            <span className="text-sm font-medium pr-4" style={{ color: '#0F172A' }}>{row.label}</span>
            <Toggle checked={prefs[row.key]} onChange={() => toggle(row.key)} />
          </div>
        ))}
      </div>

      {/* Reminder timing — disabled (audit H6): the per-user hour/timezone gate
          was removed from the daily cron (it now sends to everyone each run), so
          these selectors currently have no effect. Re-enable when per-timezone
          scheduling returns (requires an hourly trigger). */}
      <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide mt-8 mb-3" style={{ color: '#64748B' }}>
        Reminder timing
        <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide normal-case" style={{ backgroundColor: '#F1F5F9', color: '#64748B' }}>
          Coming soon
        </span>
      </h2>
      <div
        className="rounded-xl border p-5 space-y-4"
        title="Coming soon — daily reminders currently send on a fixed schedule"
        style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: 12, opacity: 0.55 }}
      >
        <div className="flex items-center justify-between gap-4">
          <label htmlFor="reminder-hour" className="text-sm font-medium" style={{ color: '#0F172A' }}>Daily reminder time</label>
          <select
            id="reminder-hour"
            value={prefs.preferred_sms_hour}
            disabled
            onChange={e => setField('preferred_sms_hour', Number(e.target.value))}
            style={{ ...selectStyle, cursor: 'not-allowed' }}
          >
            {REMINDER_HOURS.map(h => <option key={h} value={h}>{hourLabel(h)}</option>)}
          </select>
        </div>
        <div className="flex items-center justify-between gap-4">
          <label htmlFor="reminder-tz" className="text-sm font-medium" style={{ color: '#0F172A' }}>Timezone</label>
          <select
            id="reminder-tz"
            value={prefs.timezone}
            disabled
            onChange={e => setField('timezone', e.target.value)}
            style={{ ...selectStyle, cursor: 'not-allowed' }}
          >
            {TIMEZONES.map(tz => <option key={tz.value} value={tz.value}>{tz.label}</option>)}
          </select>
        </div>
      </div>

      <p className="mt-3 text-xs" style={{ color: '#94A3B8' }}>
        SMS is sent to the phone number on your profile.
      </p>

      {error && (
        <div className="mt-4 rounded-lg border px-4 py-3 text-sm" style={{ backgroundColor: '#FEF2F2', borderColor: '#FECACA', color: '#991B1B' }}>
          {error}
        </div>
      )}

      <div className="mt-6 flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg px-5 py-2.5 text-sm font-semibold transition hover:opacity-90 disabled:opacity-60"
          style={{ backgroundColor: '#0A2540', color: '#F4C95D' }}
        >
          {saving ? 'Saving…' : 'Save preferences'}
        </button>
        {saved && <span className="text-sm font-medium" style={{ color: '#15803D' }}>✓ Saved</span>}
      </div>
    </div>
  )
}

function Toggle({ checked, onChange, disabled = false }: { checked: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={disabled ? undefined : onChange}
      className="relative inline-flex h-5 w-9 flex-shrink-0 rounded-full transition-colors duration-200 focus:outline-none disabled:cursor-not-allowed"
      style={{ backgroundColor: checked ? '#4A7C8C' : '#CBD5E1', cursor: disabled ? 'not-allowed' : 'pointer' }}
    >
      <span
        className="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 mt-0.5"
        style={{ marginLeft: checked ? '18px' : '2px' }}
      />
    </button>
  )
}
