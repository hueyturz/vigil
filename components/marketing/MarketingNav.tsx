'use client'

import { useState } from 'react'
import Link from 'next/link'

const NAV_LINKS = [
  { label: 'Features', href: '/#features' },
  { label: 'Pricing',  href: '/pricing'   },
  { label: 'Demo',     href: '/demo'      },
]

export function MarketingNav() {
  const [open, setOpen] = useState(false)

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 bg-white border-b shadow-sm"
      style={{ borderColor: '#E2E8F0' }}
    >
      <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
        {/* Wordmark */}
        <Link href="/" className="flex items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {/* height set via inline style (not the attr) so it beats Tailwind preflight's `img { height: auto }` */}
          <img src="/vigilight-lockup.svg" alt="Vigilight" height={32} style={{ height: 32, width: 'auto' }} />
        </Link>

        {/* Center nav — desktop only */}
        <nav className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right actions — desktop only */}
        <div className="hidden md:flex items-center gap-4">
          <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
            Log in
          </Link>
          <Link
            href="/demo"
            className="bg-[#E8B923] text-[#0A2540] text-sm px-4 py-2 rounded-full hover:opacity-90 transition"
          >
            Start Free Trial
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          aria-label={open ? 'Close menu' : 'Open menu'}
          className="md:hidden flex h-10 w-10 -mr-2 items-center justify-center text-gray-700"
        >
          {open ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <div className="md:hidden border-t bg-white" style={{ borderColor: '#E2E8F0' }}>
          <nav className="flex flex-col px-6 py-3">
            {NAV_LINKS.map(link => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="py-3 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="py-3 text-sm text-gray-600 hover:text-gray-900 transition-colors border-t"
              style={{ borderColor: '#E2E8F0' }}
            >
              Log in
            </Link>
            <Link
              href="/demo"
              onClick={() => setOpen(false)}
              className="mt-3 mb-1 bg-[#E8B923] text-[#0A2540] text-sm px-4 py-2 rounded-full text-center hover:opacity-90 transition"
            >
              Start Free Trial
            </Link>
          </nav>
        </div>
      )}
    </header>
  )
}
