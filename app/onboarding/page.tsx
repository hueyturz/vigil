'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { signUp } from './actions'

export default function OnboardingPage() {
  const router = useRouter()
  const [error, setError]     = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const [fullName, setFullName]         = useState('')
  const [funeralHomeName, setFuneralHomeName] = useState('')
  const [email, setEmail]               = useState('')
  const [password, setPassword]         = useState('')
  const [phone, setPhone]               = useState('')
  const [smsConsent, setSmsConsent]     = useState(false)
  // Honeypot — hidden from humans; bots that auto-fill it are rejected server-side.
  const [website, setWebsite]           = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (phone.trim() && !smsConsent) {
      setError('Please agree to receive SMS notifications, or remove your phone number.')
      return
    }

    setLoading(true)
    try {
      await signUp({ fullName, funeralHomeName, email, password, phone, smsConsent, website })

      // No email verification — sign in immediately and land on the dashboard.
      const supabase = createClient()
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) throw signInError

      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8" style={{ backgroundColor: '#F8F5F0' }}>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold" style={{ color: '#4A7C8C' }}>Vigilight</h1>
          <p className="mt-2 text-sm" style={{ color: '#475569' }}>
            Start your free trial — no credit card required
          </p>
        </div>

        <div
          className="rounded-xl shadow-sm border p-6 sm:p-8"
          style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }}
        >
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Honeypot — visually hidden, excluded from tab order; humans never fill it */}
            <input
              type="text"
              name="website"
              value={website}
              onChange={e => setWebsite(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              style={{ position: 'absolute', left: '-9999px', height: 0, width: 0, opacity: 0 }}
            />

            <Field
              id="fullName"
              label="Full Name"
              required
              value={fullName}
              onChange={setFullName}
              placeholder="Jane Smith"
              autoComplete="name"
            />
            <Field
              id="funeralHomeName"
              label="Funeral Home Name"
              required
              value={funeralHomeName}
              onChange={setFuneralHomeName}
              placeholder="Henderson Funeral Home"
              autoComplete="organization"
            />
            <Field
              id="email"
              label="Email"
              type="email"
              required
              value={email}
              onChange={setEmail}
              placeholder="jane@hendersonfh.com"
              autoComplete="email"
            />
            <Field
              id="password"
              label="Password"
              type="password"
              required
              value={password}
              onChange={setPassword}
              placeholder="Min. 8 characters"
              autoComplete="new-password"
            />
            <Field
              id="phone"
              label="Phone Number"
              type="tel"
              value={phone}
              onChange={setPhone}
              placeholder="(555) 000-0000"
              autoComplete="tel"
              hint={
                <p className="mt-1.5 text-xs leading-relaxed" style={{ color: '#94A3B8' }}>
                  Used to send you SMS task reminders. You can update this later in Settings.
                </p>
              }
            />

            {/* SMS consent */}
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={smsConsent}
                onChange={e => setSmsConsent(e.target.checked)}
                className="mt-0.5 h-4 w-4 flex-shrink-0 rounded"
                style={{ accentColor: '#4A7C8C' }}
              />
              <span className="text-xs leading-relaxed" style={{ color: '#475569' }}>
                I agree to receive{' '}
                <Link
                  href="/sms-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium hover:underline"
                  style={{ color: '#4A7C8C' }}
                >
                  SMS
                </Link>{' '}
                task reminders and service notifications from Vigilight. Message and data
                rates may apply. Reply STOP to unsubscribe.
              </span>
            </label>

            {error && <ErrorBox message={error} />}

            <button
              type="submit"
              disabled={loading || !fullName.trim() || !funeralHomeName.trim() || !email.trim() || !password}
              className="w-full rounded-lg py-2.5 text-sm font-semibold transition hover:opacity-90 disabled:opacity-60"
              style={{ backgroundColor: '#0A2540', color: '#F4C95D' }}
            >
              {loading ? 'Creating your account…' : 'Start Free Trial'}
            </button>
          </form>
        </div>

        {/* Secondary: guided tour */}
        <p className="text-center mt-4 text-sm" style={{ color: '#475569' }}>
          Prefer a guided tour?{' '}
          <Link href="/demo" className="font-medium hover:underline" style={{ color: '#4A7C8C' }}>
            Book a demo →
          </Link>
        </p>

        <p className="text-center mt-6 text-sm" style={{ color: '#475569' }}>
          Already have an account?{' '}
          <Link href="/login" className="font-medium hover:underline" style={{ color: '#4A7C8C' }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Field({
  id,
  label,
  type = 'text',
  required = false,
  value,
  onChange,
  placeholder,
  hint,
  autoComplete,
}: {
  id: string
  label: string
  type?: string
  required?: boolean
  value: string
  onChange: (v: string) => void
  placeholder?: string
  hint?: React.ReactNode
  autoComplete?: string
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium mb-1.5" style={{ color: '#0F172A' }}>
        {label}
        {required && <span className="ml-0.5" style={{ color: '#EF4444' }}>*</span>}
      </label>
      <input
        id={id}
        type={type}
        required={required}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition focus:ring-2"
        style={{ borderColor: '#E2E8F0', color: '#0F172A' }}
      />
      {hint}
    </div>
  )
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div
      className="rounded-lg border px-4 py-3 text-sm"
      style={{ backgroundColor: '#FEF2F2', borderColor: '#FECACA', color: '#991B1B' }}
    >
      {message}
    </div>
  )
}
