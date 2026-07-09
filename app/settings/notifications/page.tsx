import { redirect } from 'next/navigation'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/layout/AppShell'
import { NotificationsPanel, type Prefs } from './NotificationsPanel'

const DEFAULTS: Prefs = {
  critical_email:      true,
  critical_sms:        false,
  standard_email:      true,
  standard_sms:        false,
  informational_email: false,
  informational_sms:   false,
  overdue_email:       true,
  overdue_sms:         false,
  // SMS reminder preferences
  sms_task_assigned:               true,
  sms_task_completed_on_my_service: false,
  sms_my_tasks_overdue:            true,
  sms_staff_tasks_overdue:         false,
  sms_task_approaching_deadline:   false,
  sms_new_service_created:         false,
  // Email reminder preferences (mirror the SMS reminder defaults)
  email_task_assigned:               true,
  email_task_completed_on_my_service: false,
  email_my_tasks_overdue:            true,
  email_staff_tasks_overdue:         false,
  email_task_approaching_deadline:   false,
  email_new_service_created:         false,
  preferred_sms_hour:              8,
  timezone:                        'America/Denver',
}

export default async function NotificationsPage() {
  const supabase    = createClient()
  const serviceRole = createServiceRoleClient()

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const { data: profile } = await serviceRole
    .from('profiles')
    .select('id, full_name, role, funeral_home_id')
    .eq('id', session.user.id)
    .single()

  if (!profile) redirect('/login')

  // Throw on error (audit H4 convention): a swallowed failure here rendered
  // DEFAULT toggles over the user's real saved prefs — pressing Save would then
  // silently clobber their actual preferences.
  const { data: prefs, error: prefsErr } = await serviceRole
    .from('notification_preferences')
    .select('*')
    .eq('user_id', session.user.id)
    .maybeSingle()
  if (prefsErr) throw new Error(`Failed to load notification preferences: ${prefsErr.message}`)

  // Merge saved prefs over defaults so columns missing pre-migration fall back.
  const initial: Prefs = prefs
    ? {
        critical_email:                   prefs.critical_email,
        critical_sms:                     prefs.critical_sms,
        standard_email:                   prefs.standard_email,
        standard_sms:                     prefs.standard_sms,
        informational_email:              prefs.informational_email,
        informational_sms:                prefs.informational_sms,
        overdue_email:                    prefs.overdue_email,
        overdue_sms:                      prefs.overdue_sms,
        sms_task_assigned:                prefs.sms_task_assigned               ?? DEFAULTS.sms_task_assigned,
        sms_task_completed_on_my_service: prefs.sms_task_completed_on_my_service ?? DEFAULTS.sms_task_completed_on_my_service,
        sms_my_tasks_overdue:             prefs.sms_my_tasks_overdue            ?? DEFAULTS.sms_my_tasks_overdue,
        sms_staff_tasks_overdue:          prefs.sms_staff_tasks_overdue         ?? DEFAULTS.sms_staff_tasks_overdue,
        sms_task_approaching_deadline:    prefs.sms_task_approaching_deadline   ?? DEFAULTS.sms_task_approaching_deadline,
        sms_new_service_created:          prefs.sms_new_service_created         ?? DEFAULTS.sms_new_service_created,
        email_task_assigned:                prefs.email_task_assigned                ?? DEFAULTS.email_task_assigned,
        email_task_completed_on_my_service: prefs.email_task_completed_on_my_service ?? DEFAULTS.email_task_completed_on_my_service,
        email_my_tasks_overdue:             prefs.email_my_tasks_overdue             ?? DEFAULTS.email_my_tasks_overdue,
        email_staff_tasks_overdue:          prefs.email_staff_tasks_overdue          ?? DEFAULTS.email_staff_tasks_overdue,
        email_task_approaching_deadline:    prefs.email_task_approaching_deadline    ?? DEFAULTS.email_task_approaching_deadline,
        email_new_service_created:          prefs.email_new_service_created          ?? DEFAULTS.email_new_service_created,
        preferred_sms_hour:               prefs.preferred_sms_hour              ?? DEFAULTS.preferred_sms_hour,
        timezone:                         prefs.timezone                        ?? DEFAULTS.timezone,
      }
    : DEFAULTS

  const isManager = profile.role === 'owner' || profile.role === 'fd'

  return (
    <AppShell profile={profile}>
      <div className="px-4 py-4 md:px-8 md:py-8 max-w-2xl mx-auto">
        <NotificationsPanel initial={initial} isManager={isManager} />
      </div>
    </AppShell>
  )
}
