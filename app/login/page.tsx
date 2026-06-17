'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [error,   setError]   = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const email    = formData.get('email')    as string
    const password = formData.get('password') as string

    const supabase = createClient()
    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password })

    if (signInError) {
      setError(signInError.message)
      setLoading(false)
      return
    }

    // Determine redirect based on role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user!.id)
      .single()

    // Full-page navigation ensures session cookies are flushed before the
    // middleware reads them — router.push (client-side nav) can race with
    // cookie commits on Vercel and land the user back on /login.
    const destination = profile?.role === 'staff' ? '/my-tasks' : '/dashboard'
    window.location.href = destination
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F7F8FA' }}>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold" style={{ color: '#0D6E68' }}>Vigil</h1>
          <p className="mt-2 text-sm" style={{ color: '#475569' }}>
            Sign in to your funeral home account
          </p>
        </div>

        <div
          className="rounded-xl shadow-sm border p-8"
          style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }}
        >
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
                autoComplete="current-password"
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
              style={{ backgroundColor: '#0D6E68' }}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="text-center mt-6 text-sm" style={{ color: '#475569' }}>
          Setting up a new funeral home?{' '}
          <Link href="/onboarding" className="font-medium hover:underline" style={{ color: '#0D6E68' }}>
            Get started
          </Link>
        </p>
      </div>
    </div>
  )
}
