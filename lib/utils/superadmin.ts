import type { SupabaseClient } from '@supabase/supabase-js'

// Transitional email allow-list. is_superadmin (migration 027) is the source of
// truth; this list is a fallback so platform access works before the migration
// runs and as a break-glass. Edge-safe: no next/headers imports here.
export const ADMIN_EMAILS = ['hueyturz@gmail.com']

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false
  return ADMIN_EMAILS.map(e => e.toLowerCase()).includes(email.toLowerCase())
}

// True if the user is a platform superadmin. Pass a SERVICE-ROLE client so the
// is_superadmin read isn't subject to the user's own RLS / session.
export async function isSuperadmin(
  db: SupabaseClient,
  userId: string,
  email: string | null,
): Promise<boolean> {
  if (isAdminEmail(email)) return true
  const { data } = await db
    .from('profiles')
    .select('is_superadmin')
    .eq('id', userId)
    .maybeSingle()
  return !!data?.is_superadmin
}
