import { Sidebar } from './Sidebar'
import { BottomNav } from './BottomNav'
import { SearchProvider } from '@/components/search/SearchProvider'
import { BillingWall } from '@/components/billing/BillingWall'
import { getImpersonationBanner, getBillingForShell } from '@/lib/utils/impersonation'
import { exitImpersonation } from '@/app/admin/impersonation-actions'
import type { Profile } from '@/lib/types'

interface AppShellProps {
  profile: Pick<Profile, 'full_name' | 'role'>
  redAlert?: boolean
  children: React.ReactNode
}

export async function AppShell({ profile, redAlert = false, children }: AppShellProps) {
  const impersonating = await getImpersonationBanner()
  const shellBilling  = await getBillingForShell()
  const billing       = shellBilling?.billing ?? null

  // Suspension wall (session 6): suspended/canceled tenants see the wall instead
  // of app content. Suppressed during superadmin impersonation so suspended
  // tenants can be troubleshot. Server-side — this is not a client redirect.
  const walled =
    billing !== null &&
    billing.access === 'readonly' &&
    !(shellBilling?.impersonating ?? false)

  return (
    <SearchProvider>
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

        {/* Billing banners (trial ending / payment past due) */}
        {!walled && billing?.banner === 'trial_ending' && (
          <div className="flex items-center justify-between gap-3 px-4 py-2 flex-shrink-0" style={{ backgroundColor: '#FFFBEB', color: '#92400E' }}>
            <span className="text-sm font-medium truncate">
              Trial ends {billing.trialDaysLeft === 0 ? 'today' : `in ${billing.trialDaysLeft} day${billing.trialDaysLeft !== 1 ? 's' : ''}`} — add a payment method to keep access.
            </span>
            {profile.role === 'owner' && (
              <a href="/settings/billing" className="flex-shrink-0 rounded-md px-3 py-1 text-xs font-bold" style={{ backgroundColor: '#92400E', color: '#FFFBEB' }}>
                Billing
              </a>
            )}
          </div>
        )}
        {!walled && billing?.banner === 'past_due' && (
          <div className="flex items-center justify-between gap-3 px-4 py-2 flex-shrink-0" style={{ backgroundColor: '#FEF2F2', color: '#991B1B' }}>
            <span className="text-sm font-semibold truncate">
              Payment failed — update your billing to avoid interruption.
            </span>
            {profile.role === 'owner' && (
              <a href="/settings/billing" className="flex-shrink-0 rounded-md px-3 py-1 text-xs font-bold" style={{ backgroundColor: '#991B1B', color: '#FEF2F2' }}>
                Update billing
              </a>
            )}
          </div>
        )}

        {/* Bottom padding on mobile leaves room for the taller fixed bottom nav.
            NOTE: main must stay block layout — making it a flex column turns page
            wrappers (max-w-* mx-auto) into flex items whose auto margins absorb
            space instead of stretching, shrinking all page content. The wall
            centers itself via min-h-full instead. */}
        <main className="flex-1 overflow-auto [padding-bottom:calc(6rem_+_env(safe-area-inset-bottom))] md:pb-0">
          {walled ? (
            <BillingWall
              status={billing!.status === 'canceled' ? 'canceled' : 'suspended'}
              role={profile.role}
            />
          ) : (
            children
          )}
        </main>
      </div>

      {/* Icons-only bottom nav, mobile only */}
      <BottomNav profile={profile} />
    </div>
    </SearchProvider>
  )
}
