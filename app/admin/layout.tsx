import { redirect } from 'next/navigation'
import Link from 'next/link'
import { cookies } from 'next/headers'
import { getSuperadminSession } from '@/lib/utils/admin'
import { createServiceRoleClient } from '@/lib/supabase/server'

const NAV = [
  { href: '/admin',               label: 'Overview'      },
  { href: '/admin/funeral-homes', label: 'Funeral Homes' },
  { href: '/admin/sms',           label: 'SMS Logs'      },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Defense-in-depth: middleware already gates /admin, but verify here too.
  const session = await getSuperadminSession()
  if (!session) redirect('/dashboard?error=admin_only')

  const serviceRole = createServiceRoleClient()
  const { data: profile } = await serviceRole
    .from('profiles')
    .select('full_name')
    .eq('id', session.user.id)
    .maybeSingle()

  // Impersonation banner (cookie wired in a later phase; inert until then).
  const impersonationId = cookies().get('impersonation_context')?.value
  let impersonatingName: string | null = null
  if (impersonationId) {
    const { data } = await serviceRole
      .from('funeral_homes')
      .select('name')
      .eq('id', impersonationId)
      .maybeSingle()
    impersonatingName = data?.name ?? null
  }

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: '#F8F5F0' }}>
      {/* Sidebar */}
      <aside className="hidden md:flex w-[230px] flex-shrink-0 flex-col" style={{ backgroundColor: '#0A2540' }}>
        <div className="px-6 py-5 border-b" style={{ borderColor: 'rgba(248,245,240,0.08)' }}>
          <span className="block text-xl font-bold tracking-tight" style={{ color: '#F4C95D' }}>Vigilight Admin</span>
          <span
            className="mt-2 inline-block rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
            style={{ backgroundColor: 'rgba(244,201,93,0.15)', color: '#F4C95D' }}
          >
            Admin Mode
          </span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(n => (
            <Link
              key={n.href}
              href={n.href}
              className="block rounded-lg px-3 py-2.5 text-sm font-medium transition hover:bg-[rgba(248,245,240,0.06)]"
              style={{ color: 'rgba(248,245,240,0.75)' }}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="px-4 py-4 border-t" style={{ borderColor: 'rgba(248,245,240,0.08)' }}>
          <p className="text-xs font-medium text-white truncate">{profile?.full_name ?? 'Superadmin'}</p>
          <Link href="/dashboard" className="mt-2 inline-block text-xs transition hover:text-white" style={{ color: 'rgba(248,245,240,0.55)' }}>
            ← Back to app
          </Link>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex-1 min-w-0 flex flex-col">
        {impersonatingName && (
          <div className="flex items-center justify-between gap-3 px-6 py-2.5" style={{ backgroundColor: '#F4C95D', color: '#0A2540' }}>
            <span className="text-sm font-semibold">Viewing as {impersonatingName}</span>
            <Link href="/admin" className="rounded-md px-3 py-1 text-xs font-bold" style={{ backgroundColor: '#0A2540', color: '#F4C95D' }}>
              Exit Impersonation
            </Link>
          </div>
        )}
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  )
}
