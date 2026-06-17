import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { buildSmsMessage } from '@/lib/utils/sms'
import { sendEmail } from '@/lib/utils/email'
import { taskConfirmedEmail } from '@/lib/utils/email-templates'
import { formatDateTime, formatDate } from '@/lib/utils/date-helpers'

const CompleteTaskSchema = z.object({
  confirmation_value: z.string().min(10, 'Confirmation detail must be at least 10 characters.'),
})

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase    = createClient()
  const serviceRole = createServiceRoleClient()

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

  const { data: profile } = await serviceRole
    .from('profiles')
    .select('id, full_name, funeral_home_id, role')
    .eq('id', session.user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Profile not found.' }, { status: 401 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 })
  }

  const parsed = CompleteTaskSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 422 })
  }

  const { confirmation_value } = parsed.data

  const { data: task } = await serviceRole
    .from('tasks')
    .select('*, services(id, family_name, service_date, location)')
    .eq('id', params.id)
    .eq('funeral_home_id', profile.funeral_home_id)
    .single()

  if (!task) return NextResponse.json({ error: 'Task not found.' }, { status: 404 })

  const { data: updatedTask, error: updateError } = await serviceRole
    .from('tasks')
    .update({
      status:             'complete',
      confirmation_value,
      completed_by_id:    session.user.id,
      completed_at:       new Date().toISOString(),
    })
    .eq('id', params.id)
    .select('*, completed_by:profiles!tasks_completed_by_id_fkey(id, full_name)')
    .single()

  if (updateError || !updatedTask) {
    return NextResponse.json({ error: updateError?.message ?? 'Update failed.' }, { status: 500 })
  }

  const { data: recipient } = await serviceRole
    .from('profiles')
    .select('id, full_name, phone')
    .eq('funeral_home_id', profile.funeral_home_id)
    .in('role', ['owner', 'fd'])
    .eq('is_active', true)
    .limit(1)
    .single()

  const service = task.services as {
    id: string; family_name: string; service_date: string; location: string
  } | null

  if (recipient && service) {
    // SMS log (Twilio stub — status stays 'pending' until wired)
    await serviceRole.from('sms_log').insert({
      funeral_home_id: profile.funeral_home_id,
      service_id:      task.service_id,
      task_id:         task.id,
      recipient_id:    recipient.id,
      message:         buildSmsMessage({
        completedByName:   profile.full_name,
        taskTitle:         task.title,
        familyName:        service.family_name,
        serviceDate:       service.service_date,
        confirmationValue: confirmation_value,
      }),
      status: 'pending',
    })

    const { data: authData } = await serviceRole.auth.admin.getUserById(recipient.id)
    const recipientEmail = authData?.user?.email

    if (recipientEmail) {
      const { subject, html } = taskConfirmedEmail({
        taskTitle:         task.title,
        familyName:        service.family_name,
        serviceDate:       formatDate(service.service_date),
        serviceId:         service.id,
        confirmedByName:   profile.full_name,
        confirmedAt:       formatDateTime(new Date().toISOString()),
        confirmationValue: confirmation_value,
      })

      const emailResult = await sendEmail({ to: recipientEmail, subject, html })

      await serviceRole.from('email_log').insert({
        funeral_home_id: profile.funeral_home_id,
        service_id:      task.service_id,
        task_id:         task.id,
        recipient_id:    recipient.id,
        recipient_email: recipientEmail,
        subject,
        status:          emailResult.success ? 'sent' : 'failed',
        error_message:   emailResult.error ?? null,
      })
    }
  }

  return NextResponse.json({ task: updatedTask })
}
