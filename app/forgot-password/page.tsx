'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const [error,   setError]   = useState<string | null>(null)
  const [sent,    setSent]    = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const email    = formData.get('email') as string

    const supabase = createClient()
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`,
    })

    setLoading(false)

    if (resetError) {
      setError(resetError.message)
      return
    }

    setSent(true)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#F7F8FA' }}>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold" style={{ color: '#0D6E68' }}>Vauter</h1>
          <p className="mt-2 text-sm" style={{ color: '#475569' }}>
            Reset your password
          </p>
        </div>

        <div
          className="rounded-xl shadow-sm border p-8"
          style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }}
        >
          {sent ? (
            <div
              className="rounded-lg border px-4 py-3 text-sm"
              style={{ backgroundColor: '#ECFDF5', borderColor: '#A7F3D0', color: '#065F46' }}
            >
              Check your email for a reset link.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium mb-1.5"
                  style={{ color: '#0F172A' }}
                >
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none"
                  style={{ borderColor: '#E2E8F0', color: '#0F172A' }}
                  placeholder="you@example.com"
                />
              </div>

              {error && (
                <div
                  className="rounded-lg border px-4 py-3 text-sm"
                  style={{ backgroundColor: '#FEF2F2', borderColor: '#FECACA', color: '#991B1B' }}
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
                style={{ backgroundColor: '#0D6E68' }}
              >
                {loading ? 'Sending…' : 'Send Reset Link'}
              </button>
            </form>
          )}
        </div>

        <p className="text-center mt-6 text-sm" style={{ color: '#475569' }}>
          Remembered your password?{' '}
          <Link href="/login" className="font-medium hover:underline" style={{ color: '#0D6E68' }}>
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
