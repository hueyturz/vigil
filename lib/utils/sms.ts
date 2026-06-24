import twilio from 'twilio'
import type { SupabaseClient } from '@supabase/supabase-js'

export function buildSmsMessage({
  completedByName,
  taskTitle,
  familyName,
  serviceDate,
  confirmationValue,
}: {
  completedByName: string
  taskTitle: string
  familyName: string
  serviceDate: string
  confirmationValue: string
}): string {
  const detail = confirmationValue.slice(0, 80)
  return `${completedByName} confirmed '${taskTitle}' for the ${familyName} service (${serviceDate}). Detail: ${detail}`
}

// Normalize a free-text phone number to E.164 for Twilio.
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) return '+1' + digits
  if (digits.length === 11 && digits.startsWith('1')) return '+' + digits
  return '+' + digits
}

export async function sendSMS(to: string, message: string): Promise<void> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken  = process.env.TWILIO_AUTH_TOKEN
  const fromNumber = process.env.TWILIO_FROM_NUMBER

  if (!accountSid || !authToken || !fromNumber) {
    console.error('[sms] Missing Twilio env vars')
    return
  }

  const client = twilio(accountSid, authToken)
  await client.messages.create({
    from: fromNumber,
    to,
    body: message,
  })
}

// Insert a pending sms_log row, send via Twilio, then mark sent/failed.
// Best-effort: never throws — returns true on success, false otherwise.
// serviceId may be null (e.g. a daily reminder summary spanning services).
export async function sendAndLogSms(
  db: SupabaseClient,
  args: {
    funeralHomeId: string
    serviceId:     string | null
    taskId:        string | null
    recipientId:   string
    phone:         string | null
    message:       string
  },
): Promise<boolean> {
  const { data: row } = await db
    .from('sms_log')
    .insert({
      funeral_home_id: args.funeralHomeId,
      service_id:      args.serviceId,
      task_id:         args.taskId,
      recipient_id:    args.recipientId,
      message:         args.message,
      status:          'pending',
    })
    .select('id')
    .single()

  if (!row) return false

  try {
    if (!args.phone) throw new Error('Recipient has no phone number on file.')
    await sendSMS(normalizePhone(args.phone), args.message)
    await db.from('sms_log').update({ status: 'sent' }).eq('id', row.id)
    return true
  } catch (err) {
    console.error('[sms] send failed:', err instanceof Error ? err.message : err)
    await db.from('sms_log').update({ status: 'failed' }).eq('id', row.id)
    return false
  }
}
