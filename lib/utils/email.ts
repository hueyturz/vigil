import { Resend } from 'resend'

export interface SendEmailOptions {
  to: string
  subject: string
  html: string
}

export interface SendEmailResult {
  success: boolean
  error?: string
}

// FROM address for all outbound email (audit H9). RESEND_FROM_EMAIL must be a
// Resend-verified sender (e.g. "Vigilight <noreply@getvigilight.com>"). The
// fallback is deliberately an INVALID domain so a misconfigured deploy fails
// visibly (email_log rows go 'failed' + Sentry events) instead of silently
// sending from Resend's shared onboarding@resend.dev sandbox domain, which
// funeral-home IT departments will flag as spam.
if (!process.env.RESEND_FROM_EMAIL) {
  console.warn(
    '[email] RESEND_FROM_EMAIL is not set — outbound email will use an invalid sender and FAIL. ' +
    'Verify the domain in Resend and set RESEND_FROM_EMAIL (see .env.example).',
  )
}
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? 'Vigilight <noreply@unconfigured.vigilight>'

export async function sendEmail(opts: SendEmailOptions): Promise<SendEmailResult> {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const { error } = await resend.emails.send({
      from:    FROM_EMAIL,
      to:      opts.to,
      subject: opts.subject,
      html:    opts.html,
    })
    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}
