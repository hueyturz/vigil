'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import type { Role } from '@/lib/types'

const InviteSchema = z.object({
  email:     z.string().email('Invalid email address.'),
  full_name: z.string().min(2, 'Name must be at least 2 characters.'),
  role:      z.enum(['fd', 'staff'], { errorMap: () => ({ message: 'Role must be fd or staff.' }) }),
  phone:     z.string().optional(),
})

// ── Invite a new user ─────────────────────────────────────────────────────────

export async function inviteUser(formData: FormData): Promise<{ error?: string }> {
  const supabase    = createClient()
  const serviceRole = createServiceRoleClient()

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { error: 'Not authenticated.' }

  const { data: profile } = await serviceRole
    .from('profiles')
    .select('funeral_home_id, role')
    .eq('id', session.user.id)
    .single()

  if (!profile || profile.role !== 'owner') return { error: 'Insufficient permissions.' }

  const raw = {
    email:     formData.get('email')     as string,
    full_name: formData.get('full_name') as string,
    role:      formData.get('role')      as string,
    phone:     (formData.get('phone') as string | null) ?? undefined,
  }

  const parsed = InviteSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  const { email, full_name, role, phone } = parsed.data

  // inviteUserByEmail sends a magic-link email and creates an auth.users row.
  // Metadata is picked up by the handle_new_user trigger to create the profile.
  const { error: inviteError } = await serviceRole.auth.admin.inviteUserByEmail(email, {
    data: {
      full_name,
      role,
      funeral_home_id: profile.funeral_home_id,
      phone: phone ?? null,
    },
  })

  if (inviteError) return { error: inviteError.message }

  revalidatePath('/settings/users')
  return {}
}

// ── Update a user's role ──────────────────────────────────────────────────────

export async function updateUserRole(
  targetUserId: string,
  newRole: Role,
): Promise<{ error?: string }> {
  const supabase    = createClient()
  const serviceRole = createServiceRoleClient()

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { error: 'Not authenticated.' }

  const { data: profile } = await serviceRole
    .from('profiles')
    .select('funeral_home_id, role')
    .eq('id', session.user.id)
    .single()

  if (!profile || profile.role !== 'owner') return { error: 'Insufficient permissions.' }
  if (targetUserId === session.user.id) return { error: 'You cannot change your own role.' }

  // Confirm target belongs to same funeral home
  const { data: target } = await serviceRole
    .from('profiles')
    .select('funeral_home_id')
    .eq('id', targetUserId)
    .eq('funeral_home_id', profile.funeral_home_id)
    .single()

  if (!target) return { error: 'User not found.' }

  const { error } = await serviceRole
    .from('profiles')
    .update({ role: newRole })
    .eq('id', targetUserId)

  if (error) return { error: error.message }

  revalidatePath('/settings/users')
  return {}
}

// ── Update your own profile ───────────────────────────────────────────────────

const OwnProfileSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters.'),
  phone:     z.string().optional(),
})

export async function updateOwnProfile(formData: FormData): Promise<{ error?: string }> {
  const supabase    = createClient()
  const serviceRole = createServiceRoleClient()

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { error: 'Not authenticated.' }

  const raw = {
    full_name: formData.get('full_name') as string,
    phone:     (formData.get('phone') as string | null) ?? undefined,
  }

  const parsed = OwnProfileSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  const { full_name, phone } = parsed.data

  // Any authenticated user may edit their own profile, regardless of role.
  const { error } = await serviceRole
    .from('profiles')
    .update({ full_name: full_name.trim(), phone: phone?.trim() ? phone.trim() : null })
    .eq('id', session.user.id)

  if (error) return { error: error.message }

  revalidatePath('/settings/users')
  return {}
}

// ── Deactivate / reactivate a user ───────────────────────────────────────────

export async function setUserActive(
  targetUserId: string,
  isActive: boolean,
): Promise<{ error?: string }> {
  const supabase    = createClient()
  const serviceRole = createServiceRoleClient()

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { error: 'Not authenticated.' }

  const { data: profile } = await serviceRole
    .from('profiles')
    .select('funeral_home_id, role')
    .eq('id', session.user.id)
    .single()

  if (!profile || profile.role !== 'owner') return { error: 'Insufficient permissions.' }
  if (targetUserId === session.user.id) return { error: 'You cannot deactivate yourself.' }

  const { data: target } = await serviceRole
    .from('profiles')
    .select('funeral_home_id')
    .eq('id', targetUserId)
    .eq('funeral_home_id', profile.funeral_home_id)
    .single()

  if (!target) return { error: 'User not found.' }

  const { error } = await serviceRole
    .from('profiles')
    .update({ is_active: isActive })
    .eq('id', targetUserId)

  if (error) return { error: error.message }

  revalidatePath('/settings/users')
  return {}
}
