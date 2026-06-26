import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getActiveProfile } from '@/lib/utils/impersonation'
import { AppShell } from '@/components/layout/AppShell'
import type { Role } from '@/lib/types'

interface Tile {
  href:  string
  title: string
  desc:  string
  roles: Role[]
  icon:  React.ReactNode
}

const TILES: Tile[] = [
  {
    href: '/settings/tags', title: 'Tags', desc: 'Create and manage task tags',
    roles: ['owner', 'fd'],
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82Z" /><circle cx="7" cy="7" r="1.2" />
      </svg>
    ),
  },
  {
    href: '/settings/templates', title: 'Templates', desc: 'Manage task templates by service type',
    roles: ['owner', 'fd'],
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="9" y1="21" x2="9" y2="9" />
      </svg>
    ),
  },
  {
    href: '/settings/notifications', title: 'Notifications', desc: 'Configure SMS and notification preferences',
    roles: ['owner', 'fd', 'staff'],
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    ),
  },
  {
    href: '/settings/users', title: 'Users', desc: 'Manage staff accounts and roles',
    roles: ['owner'],
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
]

export default async function SettingsPage() {
  const ctx = await getActiveProfile()
  if (!ctx) redirect('/login')
  const { profile } = ctx

  const tiles = TILES.filter(t => t.roles.includes(profile.role))

  return (
    <AppShell profile={profile}>
      <div className="px-4 py-4 md:px-8 md:py-8 max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold" style={{ color: '#0F172A' }}>Settings</h1>
          <p className="text-sm mt-0.5" style={{ color: '#475569' }}>Manage your funeral home’s configuration</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {tiles.map(tile => (
            <Link
              key={tile.href}
              href={tile.href}
              className="group flex items-start gap-4 rounded-xl border p-5 transition hover:shadow-md hover:-translate-y-0.5"
              style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }}
            >
              <span
                className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg transition"
                style={{ backgroundColor: '#F8F5F0', color: '#0A2540' }}
              >
                {tile.icon}
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-1.5">
                  <span className="text-base font-semibold" style={{ color: '#0F172A' }}>{tile.title}</span>
                  <span className="transition group-hover:translate-x-0.5" style={{ color: '#E8B923' }}>→</span>
                </span>
                <span className="mt-0.5 block text-sm" style={{ color: '#475569' }}>{tile.desc}</span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  )
}
