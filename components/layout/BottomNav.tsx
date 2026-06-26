'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSearch } from '@/components/search/SearchProvider'
import type { Profile } from '@/lib/types'

interface BottomNavProps {
  profile: Pick<Profile, 'role'>
}

const GOLD = '#F4C95D'
const MUTED = 'rgba(248,245,240,0.55)'

type IconProps = { color: string; strong: boolean }

const NAV: { href: string; label: string; roles: string[]; Icon: (p: IconProps) => JSX.Element }[] = [
  { href: '/dashboard', label: 'Dashboard', roles: ['owner', 'fd'],          Icon: HouseIcon     },
  { href: '/my-tasks',  label: 'My Tasks',  roles: ['staff'],                Icon: ListCheckIcon },
  { href: '/tasks',     label: 'Tasks',     roles: ['owner', 'fd'],          Icon: ClipboardIcon },
  { href: '/services',  label: 'Services',  roles: ['owner', 'fd'],          Icon: FolderIcon    },
  { href: '/settings',  label: 'Settings',  roles: ['owner', 'fd', 'staff'], Icon: GearIcon      },
]

export function BottomNav({ profile }: BottomNavProps) {
  const pathname = usePathname()
  const { open } = useSearch()
  const items = NAV.filter(item => item.roles.includes(profile.role))

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden flex items-stretch border-t border-[rgba(248,245,240,0.08)] bg-[#0A2540]"
      style={{
        // 64px (h-16) of icon area + the iOS home-indicator inset below it
        minHeight: 'calc(4rem + env(safe-area-inset-bottom))',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {items.map(item => {
        const active = pathname.startsWith(item.href)
        const color  = active ? GOLD : MUTED
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-label={item.label}
            className="flex flex-1 items-center justify-center transition-opacity active:opacity-70"
          >
            <item.Icon color={color} strong={active} />
          </Link>
        )
      })}

      {/* Search — opens the command palette */}
      <button
        type="button"
        onClick={open}
        aria-label="Search"
        className="flex flex-1 items-center justify-center transition-opacity active:opacity-70"
      >
        <SearchIcon color={MUTED} strong={false} />
      </button>
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

function SearchIcon(p: IconProps) {
  return (
    <svg {...svgProps(p)}>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
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

function GearIcon(p: IconProps) {
  return (
    <svg {...svgProps(p)}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </svg>
  )
}
