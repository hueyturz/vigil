'use server'

import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import type { NotificationPreferences } from '@/lib/types'

export async function saveNotificationPreferences(
  input: Pick<
    NotificationPreferences,
    | 'critical_email' | 'critical_sms'
    | 'standard_email' | 'standard_sms'
    | 'informational_email' | 'informational_sms'
    | 'overdue_email' | 'overdue_sms'
    | 'sms_task_assigned' | 'sms_task_completed_on_my_service'
    | 'sms_my_tasks_overdue' | 'sms_staff_tasks_overdue'
    | 'sms_task_approaching_deadline' | 'sms_new_service_created'
    | 'preferred_sms_hour' | 'timezone'
  >
): Promise<{ error?: string }> {
  const supabase    = createClient()
  const serviceRole = createServiceRoleClient()

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { error: 'Not authenticated.' }

  const { data: profile } = await serviceRole
    .from('profiles')
    .select('funeral_home_id')
    .eq('id', session.user.id)
    .single()

  if (!profile) return { error: 'Profile not found.' }

  const { error } = await serviceRole
    .from('notification_preferences')
    .upsert(
      {
        user_id:         session.user.id,
        funeral_home_id: profile.funeral_home_id,
        ...input,
        updated_at:      new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )

  if (error) return { error: error.message }
  return {}
}
