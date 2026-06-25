import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { isSuperadmin } from '@/lib/utils/superadmin'

type CookieEntry = { name: string; value: string; options: Record<string, unknown> }

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: CookieEntry[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(
              name,
              value,
              options as Parameters<typeof supabaseResponse.cookies.set>[2]
            )
          )
        },
      },
    }
  )

  // Use getUser() so the token is verified against the auth server and refreshed
  // when expired; the cookie adapter's setAll propagates the refreshed token.
  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  // /auth/* must be reachable without a session so the code-exchange can run.
  // Marketing routes (/, /pricing, /demo, /privacy, /terms, /sms-policy) are public to everyone.
  const isPublicPath =
    pathname === '/' ||
    pathname === '/pricing' ||
    pathname === '/demo' ||
    pathname === '/privacy' ||
    pathname === '/terms' ||
    pathname === '/sms-policy' ||
    pathname === '/sitemap.xml' ||
    pathname === '/robots.txt' ||
    pathname === '/login' ||
    pathname === '/onboarding' ||
    pathname === '/forgot-password' ||
    pathname === '/reset-password' ||
    pathname === '/accept-invite' ||
    pathname.startsWith('/auth/') ||
    pathname.startsWith('/api/auth/') ||
    pathname.startsWith('/api/demo-request')

  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // /admin/* is superadmin-only. Verify via the service-role client (not the
  // user's session) so a regular user can't bypass it. Non-superadmins → dashboard.
  if (user && pathname.startsWith('/admin')) {
    const serviceRole = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    )
    const ok = await isSuperadmin(serviceRole, user.id, user.email ?? null)
    if (!ok) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      url.searchParams.set('error', 'admin_only')
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
