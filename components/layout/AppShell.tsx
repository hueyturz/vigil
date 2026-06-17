import { Sidebar } from './Sidebar'
import { BottomNav } from './BottomNav'
import type { Profile } from '@/lib/types'
import type { ComputedStatus } from '@/lib/types'

interface AppShellProps {
  profile: Pick<Profile, 'full_name' | 'role'>
  redAlert?: boolean
  children: React.ReactNode
}

export function AppShell({ profile, redAlert = false, children }: AppShellProps) {
  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: '#F7F8FA' }}>
      {/* Sidebar hidden on mobile, visible on md+ */}
      <Sidebar profile={profile} redAlert={redAlert} />
      {/* Extra bottom padding on mobile leaves room for the fixed bottom nav */}
      <main className="flex-1 overflow-auto pb-16 md:pb-0">
        {children}
      </main>
      {/* Bottom nav visible on mobile only */}
      <BottomNav profile={profile} />
    </div>
  )
}
