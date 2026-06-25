'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Status = 'checking' | 'ready' | 'invalid'

export default function AcceptInvitePage() {
  // The invite link lands here with a `?code=` that the browser Supabase client
  // auto-exchanges for a session (detectSessionInUrl). We wait for that session
  // before showing the password form.
  const [status,  setStatus]  = useState<Status>('checking')
  const [error,   setError]   = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    let active = true

    supabase.auth.getSession().then(({ data }) => {
      if (active && data.session) setStatus('ready')
    })

    // Fires SIGNED_IN once the code exchange completes.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active && session) setStatus('ready')
    })

    // If no session has shown up, the link is missing/expired/already used.
    const timer = setTimeout(() => {
      if (active) setStatus(s => (s === 'checking' ? 'invalid' : s))
    }, 5000)

    return () => {
      active = false
      sub.subscription.unsubscribe()
      clearTimeout(timer)
    }
  }, [])

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
    const { data: updated, error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    // Role-based destination, matching the login/callback convention:
    // staff land on /my-tasks, owner/fd on /dashboard.
    let destination = '/dashboard'
    if (updated.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', updated.user.id)
        .single()
      if (profile?.role === 'staff') destination = '/my-tasks'
    }

    // Full-page navigation so the middleware sees the refreshed session cookies.
    window.location.href = destination
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#F8F5F0' }}>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold" style={{ color: '#4A7C8C' }}>Welcome to Vigilight</h1>
          <p className="mt-2 text-sm" style={{ color: '#475569' }}>
            Set a password to finish setting up your account
          </p>
        </div>

        <div
          className="rounded-xl shadow-sm border p-8"
          style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }}
        >
          {status === 'checking' && (
            <p className="text-center text-sm py-6" style={{ color: '#475569' }}>
              Confirming your invitation…
            </p>
          )}

          {status === 'invalid' && (
            <div className="text-center py-2">
              <div
                className="rounded-lg border px-4 py-3 text-sm mb-4"
                style={{ backgroundColor: '#FEF2F2', borderColor: '#FECACA', color: '#991B1B' }}
              >
                This invitation link is invalid, expired, or has already been used.
              </div>
              <p className="text-sm" style={{ color: '#475569' }}>
                Ask your administrator to send a new invite, or{' '}
                <Link href="/login" className="font-medium hover:underline" style={{ color: '#4A7C8C' }}>
                  sign in
                </Link>
                .
              </p>
            </div>
          )}

          {status === 'ready' && (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium mb-1.5"
                  style={{ color: '#0F172A' }}
                >
                  Password
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
                className="w-full rounded-lg py-2.5 text-sm font-semibold transition hover:opacity-90 disabled:opacity-60"
                style={{ backgroundColor: '#0A2540', color: '#F4C95D' }}
              >
                {loading ? 'Setting up…' : 'Set password & continue'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
