import * as Sentry from '@sentry/nextjs'
import type { SupabaseClient } from '@supabase/supabase-js'
import { sendEmail } from './email'

export interface EmailNotifyArgs {
  funeralHomeId:  string
  serviceId:      string | null
  taskId:         string | null
  recipientId:    string
  recipientEmail: string
  subject:        string
  html:           string
  stage:          string   // Sentry tag, e.g. 'task-completed', 'overdue-cron'
}

// Send one notification email, log it to email_log, and report failures to
// Sentry. Best-effort: never throws — returns true on success. Mirrors
// sendAndLogSms so the two channels behave identically (audit C5/H8).
export async function sendAndLogEmail(db: SupabaseClient, args: EmailNotifyArgs): Promise<boolean> {
  try {
    const result = await sendEmail({ to: args.recipientEmail, subject: args.subject, html: args.html })

    await db.from('email_log').insert({
      funeral_home_id: args.funeralHomeId,
      service_id:      args.serviceId,
      task_id:         args.taskId,
      recipient_id:    args.recipientId,
      recipient_email: args.recipientEmail,
      subject:         args.subject,
      status:          result.success ? 'sent' : 'failed',
      error_message:   result.error ?? null,
    })

    if (!result.success) {
      Sentry.captureMessage(`[${args.stage}] email failed`, {
        level: 'error',
        tags:  { channel: 'email', stage: args.stage },
        extra: { recipientId: args.recipientId, funeralHomeId: args.funeralHomeId, error: result.error },
      })
    }
    return result.success
  } catch (err) {
    Sentry.captureException(err, {
      tags:  { channel: 'email', stage: args.stage },
      extra: { recipientId: args.recipientId, funeralHomeId: args.funeralHomeId },
    })
    console.error(`[${args.stage}] email error:`, err instanceof Error ? err.message : err)
    return false
  }
}
