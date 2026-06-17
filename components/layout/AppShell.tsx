import { Sidebar } from './Sidebar'
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
      <Sidebar profile={profile} redAlert={redAlert} />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
