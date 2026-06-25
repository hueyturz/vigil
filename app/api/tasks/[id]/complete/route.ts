import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getActionContext } from '@/lib/utils/impersonation'
import { buildSmsMessage, sendSMS, normalizePhone, sendAndLogSms } from '@/lib/utils/sms'
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
  try {
    return await handleComplete(request, params)
  } catch (err) {
    // Catch synchronous throws (e.g. missing env vars crashing client init)
    // so the function always returns a response instead of a silent status 0.
    console.error('[tasks/complete] fatal error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error.' },
      { status: 500 }
    )
  }
}

async function handleComplete(
  request: NextRequest,
  params: { id: string }
) {
  // Fail loudly with a real message if required server env vars are missing,
  // rather than letting the Supabase client throw an opaque sync error.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    console.error('[tasks/complete] missing NEXT_PUBLIC_SUPABASE_URL')
    return NextResponse.json({ error: 'Server misconfigured: missing Supabase URL.' }, { status: 500 })
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('[tasks/complete] missing SUPABASE_SERVICE_ROLE_KEY')
    return NextResponse.json({ error: 'Server misconfigured: missing service role key.' }, { status: 500 })
  }

  const ctx = await getActionContext()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  const serviceRole = ctx.serviceRole
  // Effective tenant + real acting user (impersonation-aware). actor_id stays the
  // real admin; actor_name in the activity log uses the audit form (see below).
  const profile = { id: ctx.userId, full_name: ctx.fullName, funeral_home_id: ctx.funeralHomeId, role: ctx.role }

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
    .select('*, services(id, deceased_name, service_date, location, assigned_staff_id)')
    .eq('id', params.id)
    .eq('funeral_home_id', profile.funeral_home_id)
    .single()

  if (!task) return NextResponse.json({ error: 'Task not found.' }, { status: 404 })

  const { data: updatedTask, error: updateError } = await serviceRole
    .from('tasks')
    .update({
      status:             'complete',
      confirmation_value,
      completed_by_id:    ctx.userId,
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
    .maybeSingle()

  const service = task.services as {
    id: string; deceased_name: string; service_date: string; location: string; assigned_staff_id: string | null
  } | null

  try {
    if (recipient && service) {
      const taskPriority = (task.priority ?? 'standard') as 'critical' | 'standard' | 'informational'

      // Fetch recipient's notification preferences
      const { data: recipientPrefs } = await serviceRole
        .from('notification_preferences')
        .select('*')
        .eq('user_id', recipient.id)
        .maybeSingle()

      const emailEnabled = recipientPrefs
        ? recipientPrefs[`${taskPriority}_email` as keyof typeof recipientPrefs] as boolean
        : true  // default: send email if no prefs saved

      const smsEnabled = recipientPrefs
        ? recipientPrefs[`${taskPriority}_sms` as keyof typeof recipientPrefs] as boolean
        : false

      // SMS via Twilio: log a pending row, send, then mark sent/failed.
      // A send failure must never break task completion.
      if (smsEnabled) {
        const smsMessage = buildSmsMessage({
          completedByName:   profile.full_name,
          taskTitle:         task.title,
          familyName:        service.deceased_name,
          serviceDate:       service.service_date,
          confirmationValue: confirmation_value,
        })

        const { data: smsRow } = await serviceRole
          .from('sms_log')
          .insert({
            funeral_home_id: profile.funeral_home_id,
            service_id:      task.service_id,
            task_id:         task.id,
            recipient_id:    recipient.id,
            message:         smsMessage,
            status:          'pending',
          })
          .select('id')
          .single()

        if (smsRow) {
          try {
            if (!recipient.phone) throw new Error('Recipient has no phone number on file.')
            const normalizedPhone = normalizePhone(recipient.phone)
            await sendSMS(normalizedPhone, smsMessage)
            await serviceRole.from('sms_log').update({ status: 'sent' }).eq('id', smsRow.id)
          } catch (smsErr) {
            console.error('[sms] send failed:', smsErr instanceof Error ? smsErr.message : smsErr)
            await serviceRole.from('sms_log').update({ status: 'failed' }).eq('id', smsRow.id)
          }
        }
      }

      if (emailEnabled) {
        const { data: authData } = await serviceRole.auth.admin.getUserById(recipient.id)
        const recipientEmail = authData?.user?.email

        if (recipientEmail) {
          const { subject, html } = taskConfirmedEmail({
            taskTitle:         task.title,
            familyName:        service.deceased_name,
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
    }
  } catch (notifyErr) {
    console.error('[notifications] error — continuing to activity log:', notifyErr)
  }

  // "Task completed on my service" SMS — notify users who opted in and either
  // own the funeral home (owner/fd) or are the staff assigned to this service.
  // Never notifies the person who just confirmed the task. Best-effort.
  try {
    if (service) {
      const { data: members } = await serviceRole
        .from('profiles')
        .select('id, phone, role')
        .eq('funeral_home_id', profile.funeral_home_id)
        .eq('is_active', true)

      const memberIds = (members ?? []).map(m => m.id)
      if (memberIds.length > 0) {
        const { data: prefRows } = await serviceRole
          .from('notification_preferences')
          .select('user_id, sms_task_completed_on_my_service')
          .in('user_id', memberIds)

        const optedIn = new Set(
          (prefRows ?? []).filter(p => p.sms_task_completed_on_my_service).map(p => p.user_id)
        )
        const message = `Vigilight: ${profile.full_name} confirmed '${task.title}' for the ${service.deceased_name} service (${formatDate(service.service_date)}). Txt STOP to opt out.`

        for (const m of members ?? []) {
          if (m.id === ctx.userId) continue                      // not the confirmer
          if (!optedIn.has(m.id) || !m.phone) continue
          const ownsOrAssigned =
            m.role === 'owner' || m.role === 'fd' || m.id === service.assigned_staff_id
          if (!ownsOrAssigned) continue

          await sendAndLogSms(serviceRole, {
            funeralHomeId: profile.funeral_home_id,
            serviceId:     service.id,
            taskId:        task.id,
            recipientId:   m.id,
            phone:         m.phone,
            message,
          })
        }
      }
    }
  } catch (smsErr) {
    console.error('[task-completed-sms] error:', smsErr instanceof Error ? smsErr.message : smsErr)
  }

  // Activity log (use service role — no browser session in API route)
  try {
    const { error: activityError } = await serviceRole.from('activity_log').insert({
      funeral_home_id: profile.funeral_home_id,
      service_id:      task.service_id,
      task_id:         task.id,
      actor_id:        profile.id,
      actor_name:      ctx.auditName,
      action_type:     'task_completed',
      description:     `Task "${task.title}" confirmed`,
      metadata:        { confirmation_value },
    })
    if (activityError) {
      console.error('[activity_log] insert failed:', activityError.message, activityError.code, activityError.details)
    }
  } catch (activityErr) {
    console.error('[activity_log] unexpected error:', activityErr)
  }

  return NextResponse.json({ task: updatedTask })
}
