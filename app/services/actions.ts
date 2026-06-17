'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import type { ServiceType } from '@/lib/types'

interface CreateServiceInput {
  family_name: string
  deceased_name: string
  service_type: ServiceType
  service_date: string
  location: string
  assigned_staff_id: string | null
}

export async function createService(input: CreateServiceInput): Promise<{ error?: string }> {
  const supabase      = createClient()
  const serviceRole   = createServiceRoleClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { data: profile } = await serviceRole
    .from('profiles')
    .select('funeral_home_id, role')
    .eq('id', user.id)
    .single()

  if (!profile) return { error: 'Profile not found.' }
  if (!['owner', 'fd'].includes(profile.role)) return { error: 'Insufficient permissions.' }

  // Insert service via service role (bypasses RLS so trigger can run cleanly)
  const { data: service, error: insertError } = await serviceRole
    .from('services')
    .insert({
      funeral_home_id:   profile.funeral_home_id,
      family_name:       input.family_name,
      deceased_name:     input.deceased_name,
      service_type:      input.service_type,
      service_date:      input.service_date,
      location:          input.location,
      assigned_staff_id: input.assigned_staff_id || null,
      created_by_id:     user.id,
      status:            'active',
    })
    .select('id')
    .single()

  if (insertError || !service) {
    return { error: insertError?.message ?? 'Failed to create service.' }
  }

  // Generate tasks from templates
  const { error: rpcError } = await serviceRole.rpc('generate_tasks_for_service', {
    p_service_id: service.id,
  })

  if (rpcError) {
    return { error: rpcError.message }
  }

  revalidatePath('/dashboard')
  return {}
}
