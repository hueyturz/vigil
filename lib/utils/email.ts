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

// FROM address for all outbound email.
// PENDING DOMAIN VERIFICATION: once the getvigilight.com domain is verified in
// Resend, set RESEND_FROM_EMAIL (e.g. "Vigilight <noreply@getvigilight.com>") and
// this flips to the branded sender with no code change. Until then we fall back to
// Resend's shared onboarding@resend.dev sender — it sends without domain
// verification but shows an unbranded "from", which hurts deliverability/trust.
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? 'Vigilight <onboarding@resend.dev>'

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
