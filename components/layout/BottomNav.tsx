'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/types'

interface BottomNavProps {
  profile: Pick<Profile, 'role'>
}

export function BottomNav({ profile }: BottomNavProps) {
  const pathname = usePathname()
  const router   = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const isStaff  = profile.role === 'staff'
  const mainHref = isStaff ? '/my-tasks' : '/dashboard'
  const mainLabel = isStaff ? 'My Tasks' : 'Dashboard'
  const mainActive = pathname.startsWith(mainHref)

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 md:hidden border-t flex items-stretch"
      style={{ backgroundColor: '#0F172A', borderColor: '#1E293B', height: 60, zIndex: 40 }}
    >
      <Link
        href={mainHref}
        className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-xs font-medium"
        style={{ color: mainActive ? '#FFFFFF' : '#94A3B8' }}
      >
        {isStaff ? <ListCheckIcon /> : <GridIcon />}
        {mainLabel}
      </Link>

      {profile.role === 'owner' && (
        <Link
          href="/settings/users"
          className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-xs font-medium"
          style={{ color: pathname.startsWith('/settings') ? '#FFFFFF' : '#94A3B8' }}
        >
          <UsersIcon />
          Users
        </Link>
      )}

      <button
        onClick={handleSignOut}
        className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-xs font-medium"
        style={{ color: '#94A3B8' }}
      >
        <SignOutIcon />
        Sign Out
      </button>
    </nav>
  )
}

function GridIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </svg>
  )
}

function ListCheckIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 11 12 14 22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  )
}

function UsersIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function SignOutIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}
