'use server'

import { createServiceRoleClient } from '@/lib/supabase/server'

export async function createFuneralHome(formData: {
  name: string
  phone: string
  address: string
}) {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from('funeral_homes')
    .insert({
      name: formData.name,
      phone: formData.phone || null,
      address: formData.address || null,
    })
    .select('id')
    .single()

  if (error) throw new Error(error.message)
  return data.id as string
}

export async function createOwnerAccount(formData: {
  email: string
  password: string
  fullName: string
  funeralHomeId: string
}) {
  const supabase = createServiceRoleClient()

  const { error } = await supabase.auth.admin.createUser({
    email: formData.email,
    password: formData.password,
    email_confirm: true,
    user_metadata: {
      full_name: formData.fullName,
      role: 'owner',
      funeral_home_id: formData.funeralHomeId,
    },
  })

  if (error) throw new Error(error.message)
}
