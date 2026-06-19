import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/utils/email'
import { taskOverdueEmail } from '@/lib/utils/email-templates'
import { formatDate, daysUntil } from '@/lib/utils/date-helpers'

export async function GET(request: NextRequest) {
  // Verify cron secret. Vercel's native cron sends `Authorization: Bearer
  // ${CRON_SECRET}` automatically; manual/external callers may use the custom
  // `x-cron-secret` header. Accept either.
  const cronSecret = process.env.CRON_SECRET
  const headerSecret = request.headers.get('x-cron-secret')
  const bearer = request.headers.get('authorization')
  const authorized =
    !!cronSecret &&
    (headerSecret === cronSecret || bearer === `Bearer ${cronSecret}`)
  if (!authorized) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const serviceRole = createServiceRoleClient()

  // Fetch all not-started tasks across active services with service info
  const { data: tasks, error } = await serviceRole
    .from('tasks')
    .select(`
      id,
      title,
      due_days_before,
      funeral_home_id,
      service_id,
      services!inner (
        id,
        deceased_name,
        service_date,
        location,
        status
      )
    `)
    .eq('status', 'not-started')
    .eq('services.status', 'active')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const today = new Date().toISOString().split('T')[0]
  const sent: string[]   = []
  const failed: string[] = []

  type ServiceRow = { id: string; deceased_name: string; service_date: string; location: string; status: string }

  for (const task of tasks ?? []) {
    const raw = task.services as unknown
    const service: ServiceRow | null = Array.isArray(raw) ? (raw[0] ?? null) : (raw as ServiceRow | null)

    if (!service) continue

    const days = daysUntil(service.service_date)

    // Overdue = days until service <= due_days_before
    if (days > task.due_days_before) continue

    // Get FD/owner for this funeral home
    const { data: recipient } = await serviceRole
      .from('profiles')
      .select('id, full_name')
      .eq('funeral_home_id', task.funeral_home_id)
      .in('role', ['owner', 'fd'])
      .eq('is_active', true)
      .limit(1)
      .single()

    if (!recipient) continue

    // Check recipient's overdue_email preference
    const { data: recipientPrefs } = await serviceRole
      .from('notification_preferences')
      .select('overdue_email')
      .eq('user_id', recipient.id)
      .maybeSingle()

    const emailEnabled = recipientPrefs ? recipientPrefs.overdue_email : true
    if (!emailEnabled) continue

    const { data: { user: recipientUser } } = await serviceRole.auth.admin.getUserById(recipient.id)
    const recipientEmail = recipientUser?.email
    if (!recipientEmail) continue

    const { subject, html } = taskOverdueEmail({
      taskTitle:        task.title,
      familyName:       service.deceased_name,
      serviceDate:      formatDate(service.service_date),
      daysUntilService: days,
      location:         service.location,
      serviceId:        service.id,
    })

    const result = await sendEmail({ to: recipientEmail, subject, html })

    await serviceRole.from('email_log').insert({
      funeral_home_id: task.funeral_home_id,
      service_id:      task.service_id,
      task_id:         task.id,
      recipient_id:    recipient.id,
      recipient_email: recipientEmail,
      subject,
      status:          result.success ? 'sent' : 'failed',
      error_message:   result.error ?? null,
    })

    if (result.success) {
      sent.push(`${task.title} (${service.deceased_name})`)
    } else {
      failed.push(`${task.title} (${service.deceased_name}): ${result.error}`)
    }
  }

  return NextResponse.json({
    sent:   sent.length,
    failed: failed.length,
    details: { sent, failed },
    runAt: today,
  })
}
