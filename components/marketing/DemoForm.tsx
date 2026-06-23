'use client'

import { useState } from 'react'
import { formatPhoneInput } from '@/lib/utils/phone'

interface FormState {
  name:          string
  funeral_home:  string
  email:         string
  phone:         string
  staff_count:   string
  referral:      string
}

const EMPTY: FormState = {
  name: '', funeral_home: '', email: '', phone: '', staff_count: '', referral: '',
}

const inputClass =
  'w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-[#4A7C8C]'
const inputStyle = { borderColor: '#E2E8F0', color: '#0F172A' } as const

export function DemoForm() {
  const [form,    setForm]    = useState<FormState>(EMPTY)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)
  const [done,    setDone]    = useState(false)

  function update<K extends keyof FormState>(key: K, value: string) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!form.name.trim() || !form.funeral_home.trim() || !form.email.trim() || !form.phone.trim()) {
      setError('Please fill in all required fields.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setError('Please enter a valid email address.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/demo-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong. Please try again.')
        return
      }
      setDone(true)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-8 text-center">
        <div className="mx-auto w-14 h-14 rounded-full flex items-center justify-center bg-green-100 text-green-600 mb-4">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h3 className="text-xl font-bold mb-2" style={{ color: '#0F172A' }}>We&apos;ll be in touch soon!</h3>
        <p className="text-sm" style={{ color: '#475569' }}>
          Expect a response within a few hours during business hours (MT).
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-8 space-y-5">
      <Field label="Full Name" required>
        <input
          type="text" value={form.name} onChange={e => update('name', e.target.value)}
          placeholder="Sarah Mitchell" className={inputClass} style={inputStyle}
        />
      </Field>

      <Field label="Funeral Home Name" required>
        <input
          type="text" value={form.funeral_home} onChange={e => update('funeral_home', e.target.value)}
          placeholder="Mitchell Family Mortuary" className={inputClass} style={inputStyle}
        />
      </Field>

      <Field label="Email" required>
        <input
          type="email" value={form.email} onChange={e => update('email', e.target.value)}
          placeholder="sarah@mitchellfuneralhome.com" className={inputClass} style={inputStyle}
        />
      </Field>

      <Field label="Phone" required>
        <input
          type="tel" value={form.phone}
          onChange={e => update('phone', formatPhoneInput(e.target.value))}
          placeholder="(555) 123-4567" className={inputClass} style={inputStyle}
        />
      </Field>

      <Field label="Number of Staff">
        <select
          value={form.staff_count} onChange={e => update('staff_count', e.target.value)}
          className={inputClass} style={inputStyle}
        >
          <option value="" disabled>Select...</option>
          <option value="Just me">Just me</option>
          <option value="2-3 staff">2-3 staff</option>
          <option value="4-6 staff">4-6 staff</option>
          <option value="7+ staff">7+ staff</option>
        </select>
      </Field>

      <Field label="How did you hear about us?">
        <input
          type="text" value={form.referral} onChange={e => update('referral', e.target.value)}
          placeholder="Google, referral, etc." className={inputClass} style={inputStyle}
        />
      </Field>

      {error && (
        <div className="rounded-lg border px-4 py-3 text-sm" style={{ backgroundColor: '#FEF2F2', borderColor: '#FECACA', color: '#991B1B' }}>
          {error}
        </div>
      )}

      <button
        type="submit" disabled={loading}
        className="w-full bg-[#E8B923] text-[#0A2540] font-semibold py-4 rounded-full text-lg hover:opacity-90 transition-opacity disabled:opacity-60"
      >
        {loading ? 'Sending…' : 'Request Demo →'}
      </button>
    </form>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5" style={{ color: '#0F172A' }}>
        {label}{required && <span style={{ color: '#EF4444' }}> *</span>}
      </label>
      {children}
    </div>
  )
}
