'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { isSuperadmin } from '@/lib/utils/superadmin'
import { IMPERSONATION_COOKIE } from '@/lib/utils/impersonation'

async function assertSuperadmin(): Promise<boolean> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return false
  return isSuperadmin(createServiceRoleClient(), session.user.id, session.user.email ?? null)
}

export async function startImpersonation(formData: FormData) {
  if (!(await assertSuperadmin())) redirect('/dashboard?error=admin_only')

  const funeralHomeId = String(formData.get('funeralHomeId') ?? '')
  if (!funeralHomeId) redirect('/admin')

  cookies().set(IMPERSONATION_COOKIE, funeralHomeId, {
    httpOnly: true,
    sameSite: 'lax',
    secure:   process.env.NODE_ENV === 'production',
    path:     '/',
    maxAge:   60 * 60 * 4, // 4 hours
  })

  redirect('/dashboard')
}

export async function exitImpersonation() {
  cookies().delete(IMPERSONATION_COOKIE)
  redirect('/admin')
}
