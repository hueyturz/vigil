'use server'

import { createServiceRoleClient } from '@/lib/supabase/server'

export async function createFuneralHome(formData: {
  name: string
  address: string
}) {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from('funeral_homes')
    .insert({
      name: formData.name,
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
  phone: string
}) {
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase.auth.admin.createUser({
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

  // The handle_new_user trigger creates the profile row from the metadata above;
  // set the owner's personal phone on that profile so SMS notifications work.
  const userId = data.user?.id
  const phone = formData.phone.trim()
  if (userId && phone) {
    const { error: phoneError } = await supabase
      .from('profiles')
      .update({ phone })
      .eq('id', userId)
    if (phoneError) throw new Error(phoneError.message)
  }
}
