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
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: '#F8F5F0' }}>
      {/* Sidebar hidden on mobile, visible on md+ */}
      <Sidebar profile={profile} redAlert={redAlert} />
      {/* Bottom padding on mobile leaves room for the taller fixed bottom nav */}
      <main className="flex-1 overflow-auto [padding-bottom:calc(6rem_+_env(safe-area-inset-bottom))] md:pb-0">
        {children}
      </main>
      {/* Icons-only bottom nav, mobile only */}
      <BottomNav profile={profile} />
    </div>
  )
}
