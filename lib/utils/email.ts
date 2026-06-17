import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export interface SendEmailOptions {
  to: string
  subject: string
  html: string
}

export interface SendEmailResult {
  success: boolean
  error?: string
}

export async function sendEmail(opts: SendEmailOptions): Promise<SendEmailResult> {
  try {
    const { error } = await resend.emails.send({
      from:    'Vigil <onboarding@resend.dev>',
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
