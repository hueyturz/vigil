import { redirect } from 'next/navigation'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { NotificationsPanel } from './NotificationsPanel'
import type { NotificationPreferences } from '@/lib/types'

const DEFAULTS: Pick<
  NotificationPreferences,
  | 'critical_email' | 'critical_sms'
  | 'standard_email' | 'standard_sms'
  | 'informational_email' | 'informational_sms'
  | 'overdue_email' | 'overdue_sms'
> = {
  critical_email:      true,
  critical_sms:        false,
  standard_email:      true,
  standard_sms:        false,
  informational_email: false,
  informational_sms:   false,
  overdue_email:       true,
  overdue_sms:         false,
}

export default async function NotificationsPage() {
  const supabase    = createClient()
  const serviceRole = createServiceRoleClient()

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const { data: prefs } = await serviceRole
    .from('notification_preferences')
    .select('*')
    .eq('user_id', session.user.id)
    .maybeSingle()

  const initial = prefs
    ? {
        critical_email:      prefs.critical_email,
        critical_sms:        prefs.critical_sms,
        standard_email:      prefs.standard_email,
        standard_sms:        prefs.standard_sms,
        informational_email: prefs.informational_email,
        informational_sms:   prefs.informational_sms,
        overdue_email:       prefs.overdue_email,
        overdue_sms:         prefs.overdue_sms,
      }
    : DEFAULTS

  return (
    <div className="p-4 md:p-8">
      <NotificationsPanel initial={initial} />
    </div>
  )
}
