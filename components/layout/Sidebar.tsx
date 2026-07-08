'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useSearch } from '@/components/search/SearchProvider'
import type { Profile } from '@/lib/types'

interface SidebarProps {
  profile: Pick<Profile, 'full_name' | 'role'>
  redAlert?: boolean   // true when ≥1 service is status=red
}

const NAV = [
  { label: 'Dashboard', href: '/dashboard', roles: ['owner', 'fd'] },
  { label: 'My Tasks',  href: '/my-tasks',  roles: ['staff'] },
  { label: 'Tasks',     href: '/tasks',     roles: ['owner', 'fd'] },
  { label: 'Services',  href: '/services',  roles: ['owner', 'fd'] },
  { label: 'Settings',  href: '/settings',  roles: ['owner', 'fd', 'staff'] },
]

export function Sidebar({ profile, redAlert = false }: SidebarProps) {
  const pathname = usePathname()
  const router   = useRouter()
  const { open } = useSearch()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const visibleNav = NAV.filter(item => item.roles.includes(profile.role))

  return (
    <aside
      className="hidden md:flex h-screen w-[220px] flex-shrink-0 flex-col"
      style={{ backgroundColor: '#0A2540' }}
    >
      {/* Logo */}
      <div className="px-6 py-5 border-b flex" style={{ borderColor: 'rgba(248,245,240,0.08)', alignItems: 'center', gap: 8 }}>
        {/* mark inverted to white for the dark sidebar (brightness(0) invert(1)) */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/vigilight-mark.svg" alt="" style={{ height: 44, width: 44, filter: 'brightness(0) invert(1)' }} />
        <span className="text-xl font-bold tracking-tight" style={{ color: '#F4C95D' }}>Vigilight</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {/* Search trigger — opens the command palette (also bound to ⌘K) */}
        <button
          type="button"
          onClick={open}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition hover:bg-[rgba(244,201,93,0.08)]"
          style={{ color: 'rgba(248,245,240,0.55)' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <span>Search</span>
          <kbd className="ml-auto rounded px-1.5 py-0.5 text-[11px] font-medium" style={{ backgroundColor: 'rgba(248,245,240,0.1)', color: 'rgba(248,245,240,0.5)' }}>⌘K</kbd>
        </button>

        {visibleNav.map(item => {
          const active = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition"
              style={{
                backgroundColor: active ? 'rgba(244,201,93,0.12)' : 'transparent',
                color: active ? '#F4C95D' : 'rgba(248,245,240,0.55)',
              }}
            >
              {item.label}
            </Link>
          )
        })}

        {/* Re-open the first-run welcome slideshow (owner/fd have the dashboard). */}
        {profile.role !== 'staff' && (
          <Link
            href="/dashboard?welcome=1"
            className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition hover:bg-[rgba(244,201,93,0.08)]"
            style={{ color: 'rgba(248,245,240,0.55)' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            Getting started
          </Link>
        )}
      </nav>

      {/* User info + sign out */}
      <div className="px-4 py-4 border-t" style={{ borderColor: 'rgba(248,245,240,0.08)' }}>
        <p className="text-xs font-medium text-white truncate">{profile.full_name}</p>
        <p className="text-xs capitalize mt-0.5" style={{ color: 'rgba(248,245,240,0.55)' }}>
          {profile.role === 'fd' ? 'Funeral Director' : profile.role}
        </p>
        <button
          onClick={handleSignOut}
          className="mt-3 text-xs hover:text-white transition"
          style={{ color: 'rgba(248,245,240,0.55)' }}
        >
          Sign out →
        </button>
      </div>
    </aside>
  )
}
