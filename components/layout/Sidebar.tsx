'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/types'

interface SidebarProps {
  profile: Pick<Profile, 'full_name' | 'role'>
  redAlert?: boolean   // true when ≥1 service is status=red
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

export function Sidebar({ profile, redAlert = false }: SidebarProps) {
  const pathname = usePathname()
  const router   = useRouter()

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
      <div className="px-6 py-5 border-b flex items-center gap-2" style={{ borderColor: 'rgba(248,245,240,0.08)' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/vigilight-appicon.svg" alt="Vigilight" width={28} height={28} />
        <span className="text-xl font-bold tracking-tight" style={{ color: '#F4C95D' }}>Vigilight</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
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
