import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createServiceRoleClient } from '@/lib/supabase/server'

type CookieEntry = { name: string; value: string; options: Record<string, unknown> }

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const cookieStore = cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet: CookieEntry[]) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options as Parameters<typeof cookieStore.set>[2])
              )
            } catch {}
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        // Use service role so profile fetch is not blocked by RLS session context
        const db = createServiceRoleClient()
        const { data: profile } = await db
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        const destination = profile?.role === 'staff' ? '/my-tasks' : '/dashboard'
        return NextResponse.redirect(`${origin}${destination}`)
      }
    }
  }

  // Code missing or exchange failed — send back to login
  return NextResponse.redirect(`${origin}/login`)
}
