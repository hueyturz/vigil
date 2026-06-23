'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const [error,   setError]   = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const formData = new FormData(e.currentTarget)
    const password = formData.get('password')         as string
    const confirm  = formData.get('confirm_password') as string

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)

    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    // Full-page navigation so the middleware sees the refreshed session cookies.
    window.location.href = '/dashboard'
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#F7F8FA' }}>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold" style={{ color: '#4A7C8C' }}>Vigilight</h1>
          <p className="mt-2 text-sm" style={{ color: '#475569' }}>
            Choose a new password
          </p>
        </div>

        <div
          className="rounded-xl shadow-sm border p-8"
          style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }}
        >
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium mb-1.5"
                style={{ color: '#0F172A' }}
              >
                New password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none"
                style={{ borderColor: '#E2E8F0', color: '#0F172A' }}
                placeholder="At least 8 characters"
              />
            </div>

            <div>
              <label
                htmlFor="confirm_password"
                className="block text-sm font-medium mb-1.5"
                style={{ color: '#0F172A' }}
              >
                Confirm password
              </label>
              <input
                id="confirm_password"
                name="confirm_password"
                type="password"
                autoComplete="new-password"
                required
                className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none"
                style={{ borderColor: '#E2E8F0', color: '#0F172A' }}
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
              style={{ backgroundColor: '#4A7C8C' }}
            >
              {loading ? 'Updating…' : 'Update password'}
            </button>
          </form>
        </div>

        <p className="text-center mt-6 text-sm" style={{ color: '#475569' }}>
          <Link href="/login" className="font-medium hover:underline" style={{ color: '#4A7C8C' }}>
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
