'use client'

import { useState } from 'react'
import { saveNotificationPreferences } from './actions'
import type { NotificationPreferences } from '@/lib/types'

type Prefs = Pick<
  NotificationPreferences,
  | 'critical_email' | 'critical_sms'
  | 'standard_email' | 'standard_sms'
  | 'informational_email' | 'informational_sms'
  | 'overdue_email' | 'overdue_sms'
>

const ROWS: {
  label: string
  dot: string
  emailKey: keyof Prefs
  smsKey:   keyof Prefs
}[] = [
  { label: 'Critical tasks',      dot: '#EF4444', emailKey: 'critical_email',      smsKey: 'critical_sms'      },
  { label: 'Standard tasks',      dot: '#F59E0B', emailKey: 'standard_email',      smsKey: 'standard_sms'      },
  { label: 'Informational tasks', dot: '#94A3B8', emailKey: 'informational_email', smsKey: 'informational_sms' },
  { label: 'Overdue alerts',      dot: '#EF4444', emailKey: 'overdue_email',       smsKey: 'overdue_sms'       },
]

export function NotificationsPanel({ initial }: { initial: Prefs }) {
  const [prefs,  setPrefs]  = useState<Prefs>(initial)
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)
  const [error,  setError]  = useState<string | null>(null)

  function toggle(key: keyof Prefs) {
    setPrefs(p => ({ ...p, [key]: !p[key] }))
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

  return (
    <div>
      {/* Page header — matches other settings pages */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: '#0F172A' }}>Notifications</h1>
        <p className="text-sm mt-1" style={{ color: '#64748B' }}>
          Choose when Vigilight sends you email and SMS alerts.
        </p>
      </div>

      {/* Card */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: 12 }}
      >
        {/* Table header */}
        <div
          className="grid grid-cols-3 px-5 py-3 border-b"
          style={{ backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' }}
        >
          <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#64748B' }}>
            Notification type
          </span>
          <span className="text-xs font-semibold uppercase tracking-wide text-center" style={{ color: '#64748B' }}>
            Email
          </span>
          <span className="text-xs font-semibold uppercase tracking-wide text-center" style={{ color: '#64748B' }}>
            SMS
          </span>
        </div>

        {/* Rows */}
        {ROWS.map((row, i) => (
          <div
            key={row.label}
            className={`grid grid-cols-3 items-center px-5 py-4${i < ROWS.length - 1 ? ' border-b' : ''}`}
            style={{ borderColor: '#E2E8F0' }}
          >
            <div className="flex items-center gap-2.5">
              <span
                className="flex-shrink-0 rounded-full"
                style={{ width: 8, height: 8, backgroundColor: row.dot, display: 'inline-block' }}
              />
              <span className="text-sm font-medium" style={{ color: '#0F172A' }}>{row.label}</span>
            </div>
            <div className="flex justify-center">
              <Toggle checked={prefs[row.emailKey]} onChange={() => toggle(row.emailKey)} />
            </div>
            <div className="flex justify-center">
              <Toggle checked={prefs[row.smsKey]} onChange={() => toggle(row.smsKey)} />
            </div>
          </div>
        ))}
      </div>

      {/* SMS note */}
      <p className="mt-3 text-xs" style={{ color: '#94A3B8' }}>
        SMS notifications will activate once your phone number is verified.
      </p>

      {/* Error */}
      {error && (
        <div
          className="mt-4 rounded-lg border px-4 py-3 text-sm"
          style={{ backgroundColor: '#FEF2F2', borderColor: '#FECACA', color: '#991B1B' }}
        >
          {error}
        </div>
      )}

      {/* Save */}
      <div className="mt-6 flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
          style={{ backgroundColor: '#4A7C8C' }}
        >
          {saving ? 'Saving…' : 'Save preferences'}
        </button>
        {saved && (
          <span className="text-sm font-medium" style={{ color: '#15803D' }}>✓ Saved</span>
        )}
      </div>
    </div>
  )
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className="relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 focus:outline-none"
      style={{ backgroundColor: checked ? '#4A7C8C' : '#CBD5E1' }}
    >
      <span
        className="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 mt-0.5"
        style={{ marginLeft: checked ? '18px' : '2px' }}
      />
    </button>
  )
}
