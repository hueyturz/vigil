'use client'

import { useState } from 'react'
import Link from 'next/link'

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

    // Sign in via API route — the server sets session cookies directly in the
    // HTTP response, so they're guaranteed to be present on the next navigation.
    const res = await fetch('/api/auth/login', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, password }),
    })

    const json = await res.json()

    if (!res.ok) {
      setError(json.error ?? 'Sign in failed.')
      setLoading(false)
      return
    }

    // Cookies are now set in the browser by the server response.
    // Full-page navigation so the middleware sees them on the very first request.
    window.location.href = json.destination
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#F7F8FA' }}>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold" style={{ color: '#0D6E68' }}>Vauter</h1>
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
              <div className="mt-1.5 text-right">
                <Link
                  href="/forgot-password"
                  className="text-xs font-medium hover:underline"
                  style={{ color: '#0D6E68' }}
                >
                  Forgot password?
                </Link>
              </div>
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
