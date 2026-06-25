import { cookies } from 'next/headers'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { isSuperadmin } from '@/lib/utils/superadmin'
import type { Role } from '@/lib/types'

export const IMPERSONATION_COOKIE = 'impersonation_context'

export interface ActiveProfile {
  userId: string
  profile: {
    id: string
    full_name: string
    role: Role
    funeral_home_id: string
    is_active: boolean
  }
  // Non-null only when a superadmin is impersonating a funeral home.
  impersonating: { id: string; name: string } | null
  actorName: string
}

/**
 * The effective profile for the current request. For a normal user this is their
 * own profile. For a superadmin with the impersonation cookie set, the
 * funeral_home_id is overridden to the impersonated home and the role is elevated
 * to 'owner' so they see the full tenant. The cookie is honored ONLY after
 * re-verifying superadmin via the service role — a normal user cannot forge it.
 */
export async function getActiveProfile(): Promise<ActiveProfile | null> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null

  const db = createServiceRoleClient()
  const { data: profile } = await db
    .from('profiles')
    .select('id, full_name, role, funeral_home_id, is_active')
    .eq('id', session.user.id)
    .single()
  if (!profile) return null

  const impersonationId = cookies().get(IMPERSONATION_COOKIE)?.value
  if (impersonationId) {
    const superadmin = await isSuperadmin(db, session.user.id, session.user.email ?? null)
    if (superadmin) {
      const { data: home } = await db
        .from('funeral_homes')
        .select('id, name')
        .eq('id', impersonationId)
        .maybeSingle()
      if (home) {
        return {
          userId: session.user.id,
          profile: { ...profile, funeral_home_id: home.id, role: 'owner', is_active: true },
          impersonating: { id: home.id, name: home.name },
          actorName: profile.full_name,
        }
      }
    }
  }

  return { userId: session.user.id, profile, impersonating: null, actorName: profile.full_name }
}

// Audit display name for activity_log: notes superadmin impersonation when active.
export function auditActorName(ctx: ActiveProfile): string {
  return ctx.impersonating
    ? `[Admin: ${ctx.actorName}] on behalf of ${ctx.impersonating.name}`
    : ctx.actorName
}

// Standardized context for write server actions. Returns the EFFECTIVE tenant
// (impersonated home when a superadmin is impersonating, else the user's own),
// the real acting user id, and an audit name. null = not authenticated.
export async function getActionContext() {
  const ctx = await getActiveProfile()
  if (!ctx) return null
  return {
    serviceRole:   createServiceRoleClient(),
    userId:        ctx.userId,
    funeralHomeId: ctx.profile.funeral_home_id,
    role:          ctx.profile.role,
    fullName:      ctx.profile.full_name,
    auditName:     auditActorName(ctx),
    impersonating: !!ctx.impersonating,
  }
}

/** Banner info for AppShell: the impersonated home (superadmin-only), or null. */
export async function getImpersonationBanner(): Promise<{ id: string; name: string } | null> {
  const impersonationId = cookies().get(IMPERSONATION_COOKIE)?.value
  if (!impersonationId) return null

  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return null

  const db = createServiceRoleClient()
  const superadmin = await isSuperadmin(db, session.user.id, session.user.email ?? null)
  if (!superadmin) return null

  const { data: home } = await db
    .from('funeral_homes')
    .select('id, name')
    .eq('id', impersonationId)
    .maybeSingle()
  return home ? { id: home.id, name: home.name } : null
}
