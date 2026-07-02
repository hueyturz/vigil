import { ManageBillingButton } from './ManageBillingButton'
import type { Role } from '@/lib/types'

// Full-page billing wall shown instead of app content when the tenant is
// suspended or canceled (session 6). Owners get a Reactivate CTA into the
// Stripe Customer Portal; staff are pointed at their owner.
export function BillingWall({ status, role }: { status: 'suspended' | 'canceled'; role: Role }) {
  const heading = status === 'canceled' ? 'Your subscription has ended' : 'Your account is suspended'
  const body = status === 'canceled'
    ? 'Reactivate your subscription to regain access to your services, tasks, and records.'
    : 'Payment is required to restore access. Your data is safe and will be right here when you return.'

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-16">
      <div
        className="w-full max-w-md rounded-2xl border p-8 text-center"
        style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }}
      >
        <div
          className="mx-auto mb-4 flex items-center justify-center rounded-full"
          style={{ width: 48, height: 48, backgroundColor: '#FEF2F2' }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" />
          </svg>
        </div>
        <h1 className="text-xl font-bold" style={{ color: '#0F172A' }}>{heading}</h1>
        <p className="mt-2 text-sm" style={{ color: '#475569' }}>{body}</p>

        <div className="mt-6">
          {role === 'owner' ? (
            <ManageBillingButton label="Reactivate" />
          ) : (
            <p className="text-sm font-medium" style={{ color: '#0A2540' }}>
              Ask your funeral home&rsquo;s owner to update billing.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
