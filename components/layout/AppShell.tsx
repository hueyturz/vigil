import { Sidebar } from './Sidebar'
import { BottomNav } from './BottomNav'
import { getImpersonationBanner } from '@/lib/utils/impersonation'
import { exitImpersonation } from '@/app/admin/impersonation-actions'
import type { Profile } from '@/lib/types'

interface AppShellProps {
  profile: Pick<Profile, 'full_name' | 'role'>
  redAlert?: boolean
  children: React.ReactNode
}

export async function AppShell({ profile, redAlert = false, children }: AppShellProps) {
  const impersonating = await getImpersonationBanner()

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: '#F8F5F0' }}>
      {/* Sidebar hidden on mobile, visible on md+ */}
      <Sidebar profile={profile} redAlert={redAlert} />

      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {impersonating && (
          <div className="flex items-center justify-between gap-3 px-4 py-2 flex-shrink-0" style={{ backgroundColor: '#F4C95D', color: '#0A2540' }}>
            <span className="text-sm truncate">
              <span className="font-bold">Impersonating {impersonating.name}</span>
              <span className="hidden sm:inline font-medium"> — writes are scoped to {impersonating.name} (superadmin)</span>
            </span>
            <form action={exitImpersonation}>
              <button type="submit" className="flex-shrink-0 rounded-md px-3 py-1 text-xs font-bold" style={{ backgroundColor: '#0A2540', color: '#F4C95D' }}>
                Exit Impersonation
              </button>
            </form>
          </div>
        )}

        {/* Bottom padding on mobile leaves room for the taller fixed bottom nav */}
        <main className="flex-1 overflow-auto [padding-bottom:calc(6rem_+_env(safe-area-inset-bottom))] md:pb-0">
          {children}
        </main>
      </div>

      {/* Icons-only bottom nav, mobile only */}
      <BottomNav profile={profile} />
    </div>
  )
}
