import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { buildSmsMessage, sendSMS } from '@/lib/utils/sms'

const CompleteTaskSchema = z.object({
  confirmation_value: z.string().min(10, 'Confirmation detail must be at least 10 characters.'),
})

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase    = createClient()
  const serviceRole = createServiceRoleClient()

  // Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

  const { data: profile } = await serviceRole
    .from('profiles')
    .select('id, full_name, funeral_home_id, role')
    .eq('id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Profile not found.' }, { status: 401 })

  // Validate payload
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 })
  }

  const parsed = CompleteTaskSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0].message },
      { status: 422 }
    )
  }

  const { confirmation_value } = parsed.data

  // Fetch the task via service role (anon client hits RLS and returns nothing server-side)
  const { data: task } = await serviceRole
    .from('tasks')
    .select('*, services(family_name, service_date)')
    .eq('id', params.id)
    .eq('funeral_home_id', profile.funeral_home_id)
    .single()

  if (!task) return NextResponse.json({ error: 'Task not found.' }, { status: 404 })

  // Update the task via service role to bypass RLS
  const { data: updatedTask, error: updateError } = await serviceRole
    .from('tasks')
    .update({
      status:             'complete',
      confirmation_value,
      completed_by_id:    user.id,
      completed_at:       new Date().toISOString(),
    })
    .eq('id', params.id)
    .select('*, completed_by:profiles!tasks_completed_by_id_fkey(id, full_name)')
    .single()

  if (updateError || !updatedTask) {
    return NextResponse.json({ error: updateError?.message ?? 'Update failed.' }, { status: 500 })
  }

  // Get an FD or owner for this funeral home to notify
  const { data: recipient } = await serviceRole
    .from('profiles')
    .select('id, full_name, phone')
    .eq('funeral_home_id', profile.funeral_home_id)
    .in('role', ['owner', 'fd'])
    .eq('is_active', true)
    .limit(1)
    .single()

  if (recipient) {
    const service = task.services as { family_name: string; service_date: string } | null
    const message = buildSmsMessage({
      completedByName:   profile.full_name,
      taskTitle:         task.title,
      familyName:        service?.family_name ?? '',
      serviceDate:       service?.service_date ?? '',
      confirmationValue: confirmation_value,
    })

    // Log the SMS — Twilio send is stubbed in v1
    await serviceRole.from('sms_log').insert({
      funeral_home_id: profile.funeral_home_id,
      service_id:      task.service_id,
      task_id:         task.id,
      recipient_id:    recipient.id,
      message,
      status:          'pending',
    })

    // await sendSMS(recipient.phone, message)  — Twilio stub
  }

  return NextResponse.json({ task: updatedTask })
}
