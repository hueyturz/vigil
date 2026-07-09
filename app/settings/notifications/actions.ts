'use server'

import { getActionContext } from '@/lib/utils/impersonation'
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
    | 'email_task_assigned' | 'email_task_completed_on_my_service'
    | 'email_my_tasks_overdue' | 'email_staff_tasks_overdue'
    | 'email_task_approaching_deadline' | 'email_new_service_created'
    | 'preferred_sms_hour' | 'timezone'
  >
): Promise<{ error?: string }> {
  // getActionContext = auth + tenant context + billing write gate (audit #4):
  // suspended/canceled tenants get null and cannot mutate preferences.
  const ctx = await getActionContext()
  if (!ctx) return { error: 'Not authenticated.' }

  // The hourly reminder cron matches on this hour — keep it inside the range
  // the UI offers (7 AM–9 PM) so a crafted call can't schedule 3 AM texts.
  if (!Number.isInteger(input.preferred_sms_hour) || input.preferred_sms_hour < 7 || input.preferred_sms_hour > 21) {
    return { error: 'Reminder time must be between 7 AM and 9 PM.' }
  }

  const { error } = await ctx.serviceRole
    .from('notification_preferences')
    .upsert(
      {
        user_id:         ctx.userId,
        funeral_home_id: ctx.funeralHomeId,
        ...input,
        updated_at:      new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )

  if (error) return { error: error.message }
  return {}
}
