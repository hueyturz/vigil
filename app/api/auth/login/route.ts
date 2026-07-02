import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { rateLimit, clientIp } from '@/lib/rate-limit'

type CookieEntry = { name: string; value: string; options: Record<string, unknown> }

export async function POST(request: NextRequest) {
  // Brute-force guard: 5 attempts / 15 min per IP (audit C3).
  const { success: allowed } = await rateLimit('login', clientIp(request.headers))
  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many login attempts. Try again in 15 minutes.' },
      { status: 429 },
    )
  }

  const { email, password } = await request.json()

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 })
  }

  // Capture the session cookies that Supabase writes during sign-in
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

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error || !data.user) {
    return NextResponse.json(
      { error: error?.message ?? 'Invalid credentials.' },
      { status: 401 }
    )
  }

  // Determine role-based redirect via service role (bypasses RLS)
  const db = createServiceRoleClient()
  const { data: profile } = await db
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .single()

  const destination = profile?.role === 'staff' ? '/my-tasks' : '/dashboard'

  // Build JSON response and copy session cookies from supabaseResponse into it.
  // The browser will set these cookies when it receives the response, so the very
  // next navigation to /dashboard will carry them.
  const json = NextResponse.json({ destination })
  supabaseResponse.cookies.getAll().forEach(cookie => {
    json.cookies.set(cookie.name, cookie.value, cookie)
  })

  return json
}
