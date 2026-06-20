'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { Profile } from '@/lib/types'

interface BottomNavProps {
  profile: Pick<Profile, 'role'>
}

const TEAL = '#0D6E68'
const GRAY = '#94A3B8'

type IconProps = { color: string; strong: boolean }

const NAV: { href: string; label: string; roles: string[]; Icon: (p: IconProps) => JSX.Element }[] = [
  { href: '/dashboard',              label: 'Dashboard',     roles: ['owner', 'fd'],          Icon: HouseIcon     },
  { href: '/my-tasks',               label: 'My Tasks',      roles: ['staff'],                Icon: ListCheckIcon },
  { href: '/tasks',                  label: 'Tasks',         roles: ['owner', 'fd'],          Icon: ClipboardIcon },
  { href: '/services',               label: 'Services',      roles: ['owner', 'fd'],          Icon: FolderIcon    },
  { href: '/settings/templates',     label: 'Templates',     roles: ['owner', 'fd'],          Icon: TemplateIcon  },
  { href: '/settings/notifications', label: 'Notifications', roles: ['owner', 'fd', 'staff'], Icon: BellIcon      },
  { href: '/settings/users',         label: 'Users',         roles: ['owner'],                Icon: UsersIcon     },
]

export function BottomNav({ profile }: BottomNavProps) {
  const pathname = usePathname()
  const items = NAV.filter(item => item.roles.includes(profile.role))

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden flex items-stretch border-t border-gray-200 bg-white"
      style={{ height: 60 }}
    >
      {items.map(item => {
        const active = pathname.startsWith(item.href)
        const color  = active ? TEAL : GRAY
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-label={item.label}
            className="flex flex-1 items-center justify-center"
          >
            <item.Icon color={color} strong={active} />
          </Link>
        )
      })}
    </nav>
  )
}

// ── Icons (24px, stroke = currentColor via `color`; active = bolder stroke) ──────

function svgProps({ color, strong }: IconProps) {
  return {
    width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none',
    stroke: color, strokeWidth: strong ? 2.4 : 1.9,
    strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
  }
}

function HouseIcon(p: IconProps) {
  return (
    <svg {...svgProps(p)}>
      <path d="M3 9.5 12 3l9 6.5" />
      <path d="M5 10v10h14V10" />
      <path d="M9 20v-6h6v6" />
    </svg>
  )
}

function ListCheckIcon(p: IconProps) {
  return (
    <svg {...svgProps(p)}>
      <polyline points="9 11 12 14 22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  )
}

function ClipboardIcon(p: IconProps) {
  return (
    <svg {...svgProps(p)}>
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" ry="1" />
      <line x1="9" y1="12" x2="15" y2="12" />
      <line x1="9" y1="16" x2="13" y2="16" />
    </svg>
  )
}

function FolderIcon(p: IconProps) {
  return (
    <svg {...svgProps(p)}>
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  )
}

function TemplateIcon(p: IconProps) {
  return (
    <svg {...svgProps(p)}>
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="9" y1="21" x2="9" y2="9" />
    </svg>
  )
}

function BellIcon(p: IconProps) {
  return (
    <svg {...svgProps(p)}>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}

function UsersIcon(p: IconProps) {
  return (
    <svg {...svgProps(p)}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}
