'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { createFuneralHome, createOwnerAccount } from './actions'

type Step = 1 | 2

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [funeralHomeId, setFuneralHomeId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Step 1 fields
  const [homeName, setHomeName] = useState('')
  const [homeAddress, setHomeAddress] = useState('')
  // Honeypot — hidden from humans; bots that auto-fill it are rejected server-side.
  const [website, setWebsite] = useState('')

  // Step 2 fields
  const [fullName, setFullName] = useState('')
  const [ownerPhone, setOwnerPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  async function handleStep1(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const id = await createFuneralHome({ name: homeName, address: homeAddress, website })
      setFuneralHomeId(id)
      setStep(2)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  async function handleStep2(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (!funeralHomeId) {
      setError('Funeral home ID missing — please restart.')
      return
    }

    setLoading(true)

    try {
      await createOwnerAccount({ email, password, fullName, funeralHomeId, phone: ownerPhone, website })

      // Sign in immediately after account creation
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
            Set up your funeral home account
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <StepDot active={step === 1} done={step > 1} label="Funeral Home" />
          <div className="h-px w-8" style={{ backgroundColor: step > 1 ? '#4A7C8C' : '#E2E8F0' }} />
          <StepDot active={step === 2} done={false} label="Owner Account" />
        </div>

        <div
          className="rounded-xl shadow-sm border p-6 sm:p-8"
          style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }}
        >
          {step === 1 ? (
            <form onSubmit={handleStep1} className="space-y-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide mb-4" style={{ color: '#94A3B8' }}>
                  Step 1 of 2 — Funeral Home Details
                </p>
              </div>

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
                id="homeName"
                label="Funeral Home Name"
                required
                value={homeName}
                onChange={setHomeName}
                placeholder="Henderson Funeral Home"
              />
              <Field
                id="homeAddress"
                label="Address"
                value={homeAddress}
                onChange={setHomeAddress}
                placeholder="123 Main St, Springfield, IL"
              />

              {error && <ErrorBox message={error} />}

              <button
                type="submit"
                disabled={loading || !homeName.trim()}
                className="w-full rounded-lg py-2.5 text-sm font-semibold transition hover:opacity-90 disabled:opacity-60"
                style={{ backgroundColor: '#0A2540', color: '#F4C95D' }}
              >
                {loading ? 'Saving…' : 'Continue →'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleStep2} className="space-y-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide mb-4" style={{ color: '#94A3B8' }}>
                  Step 2 of 2 — Owner Account
                </p>
              </div>

              <Field
                id="fullName"
                label="Your Full Name"
                required
                value={fullName}
                onChange={setFullName}
                placeholder="Jane Smith"
              />
              <Field
                id="email"
                label="Email Address"
                type="email"
                required
                value={email}
                onChange={setEmail}
                placeholder="jane@hendersonfh.com"
              />
              <Field
                id="ownerPhone"
                label="Your mobile number"
                type="tel"
                value={ownerPhone}
                onChange={setOwnerPhone}
                placeholder="(555) 000-0000"
                hint={
                  <>
                    <p className="mt-1.5 text-xs leading-relaxed" style={{ color: '#94A3B8' }}>
                      Used to send you SMS task reminders and notifications. You can update
                      this later in Settings.
                    </p>
                    <p className="mt-1.5 text-xs leading-relaxed" style={{ color: '#94A3B8' }}>
                      By providing your phone number, you consent to receive{' '}
                      <Link
                        href="/sms-policy"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium hover:underline"
                        style={{ color: '#4A7C8C' }}
                      >
                        SMS
                      </Link>{' '}
                      task reminders and service notifications from Vigilight. Message and
                      data rates may apply. Reply STOP to unsubscribe.
                    </p>
                  </>
                }
              />
              <Field
                id="password"
                label="Password"
                type="password"
                required
                value={password}
                onChange={setPassword}
                placeholder="Min. 8 characters"
              />
              <Field
                id="confirmPassword"
                label="Confirm Password"
                type="password"
                required
                value={confirmPassword}
                onChange={setConfirmPassword}
                placeholder="Repeat password"
              />

              {error && <ErrorBox message={error} />}

              <button
                type="submit"
                disabled={loading || !fullName.trim() || !email.trim() || !password}
                className="w-full rounded-lg py-2.5 text-sm font-semibold transition hover:opacity-90 disabled:opacity-60"
                style={{ backgroundColor: '#0A2540', color: '#F4C95D' }}
              >
                {loading ? 'Creating account…' : 'Create account & sign in'}
              </button>
            </form>
          )}
        </div>

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

function StepDot({ active, done, label }: { active: boolean; done: boolean; label: string }) {
  const bg = done ? '#4A7C8C' : active ? '#4A7C8C' : '#E2E8F0'
  const textColor = done || active ? '#FFFFFF' : '#94A3B8'
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
        style={{ backgroundColor: bg, color: textColor }}
      >
        {done ? '✓' : active ? '●' : '○'}
      </div>
      <span className="text-xs" style={{ color: active ? '#0F172A' : '#94A3B8' }}>
        {label}
      </span>
    </div>
  )
}

function Field({
  id,
  label,
  type = 'text',
  required = false,
  value,
  onChange,
  placeholder,
  hint,
}: {
  id: string
  label: string
  type?: string
  required?: boolean
  value: string
  onChange: (v: string) => void
  placeholder?: string
  hint?: React.ReactNode
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
