'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/types'

interface MobileHeaderProps {
  profile: Pick<Profile, 'full_name' | 'role'>
}

const NAV = [
  { label: 'Dashboard',     href: '/dashboard',               roles: ['owner', 'fd'] },
  { label: 'My Tasks',      href: '/my-tasks',                roles: ['staff'] },
  { label: 'Tasks',         href: '/tasks',                   roles: ['owner', 'fd'] },
  { label: 'Services',      href: '/services',                roles: ['owner', 'fd'] },
  { label: 'Templates',     href: '/settings/templates',      roles: ['owner', 'fd'] },
  { label: 'Notifications', href: '/settings/notifications',  roles: ['owner', 'fd', 'staff'] },
  { label: 'Users',         href: '/settings/users',          roles: ['owner'] },
]

const TEAL = '#0D6E68'

export function MobileHeader({ profile }: MobileHeaderProps) {
  const [open, setOpen]  = useState(false)
  const pathname = usePathname()
  const router   = useRouter()

  async function handleSignOut() {
    setOpen(false)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const visibleNav = NAV.filter(item => item.roles.includes(profile.role))

  return (
    <>
      {/* Fixed top bar — mobile only */}
      <header
        className="fixed top-0 left-0 right-0 z-50 md:hidden flex items-center justify-between border-b bg-white px-4 shadow-sm"
        style={{ height: 56 }}
      >
        <span className="text-xl font-bold tracking-tight" style={{ color: TEAL }}>
          Vigil
        </span>
        <button
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="flex h-10 w-10 items-center justify-center -mr-2"
          style={{ color: '#0F172A' }}
        >
          <HamburgerIcon />
        </button>
      </header>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/50 md:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Slide-out drawer */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-[280px] flex flex-col bg-white shadow-xl transition-transform duration-200 md:hidden ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between border-b px-5" style={{ height: 56 }}>
          <span className="text-xl font-bold tracking-tight" style={{ color: TEAL }}>
            Vigil
          </span>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="flex h-10 w-10 items-center justify-center -mr-2"
            style={{ color: '#0F172A' }}
          >
            <CloseIcon />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-auto px-3 py-4 space-y-1">
          {visibleNav.map(item => {
            const active = pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition"
                style={{
                  backgroundColor: active ? TEAL : 'transparent',
                  color: active ? '#FFFFFF' : '#334155',
                }}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* User info + sign out */}
        <div className="border-t px-5 py-4">
          <p className="text-sm font-medium truncate" style={{ color: '#0F172A' }}>
            {profile.full_name}
          </p>
          <p className="text-xs capitalize mt-0.5" style={{ color: '#64748B' }}>
            {profile.role === 'fd' ? 'Funeral Director' : profile.role}
          </p>
          <button
            onClick={handleSignOut}
            className="mt-3 text-sm font-medium transition"
            style={{ color: TEAL }}
          >
            Sign out →
          </button>
        </div>
      </aside>
    </>
  )
}

function HamburgerIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}
