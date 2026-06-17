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
  { label: 'Dashboard', href: '/dashboard', roles: ['owner', 'fd'] },
  { label: 'My Tasks',  href: '/my-tasks',  roles: ['staff'] },
  { label: 'Users',     href: '/settings/users', roles: ['owner'] },
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
      style={{ backgroundColor: '#0F172A' }}
    >
      {/* Logo */}
      <div className="px-6 py-5 border-b" style={{ borderColor: '#1E293B' }}>
        <span className="text-xl font-bold tracking-tight text-white">Vigil</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {visibleNav.map(item => {
          const active = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition"
              style={{
                backgroundColor: active ? '#1E293B' : 'transparent',
                color: active ? '#FFFFFF' : '#94A3B8',
              }}
            >
              {item.label}
              {item.href === '/dashboard' && redAlert && (
                <span
                  className="flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ backgroundColor: '#EF4444' }}
                >
                  !
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* User info + sign out */}
      <div className="px-4 py-4 border-t" style={{ borderColor: '#1E293B' }}>
        <p className="text-xs font-medium text-white truncate">{profile.full_name}</p>
        <p className="text-xs capitalize mt-0.5" style={{ color: '#475569' }}>
          {profile.role === 'fd' ? 'Funeral Director' : profile.role}
        </p>
        <button
          onClick={handleSignOut}
          className="mt-3 text-xs hover:text-white transition"
          style={{ color: '#475569' }}
        >
          Sign out →
        </button>
      </div>
    </aside>
  )
}
