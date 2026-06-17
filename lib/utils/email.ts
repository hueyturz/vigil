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
  console.log('[sendEmail] RESEND_API_KEY present:', !!process.env.RESEND_API_KEY)
  console.log('[sendEmail] to:', opts.to, '| subject:', opts.subject)
  try {
    const { data, error } = await resend.emails.send({
      from:    'Vigil <onboarding@resend.dev>',
      to:      opts.to,
      subject: opts.subject,
      html:    opts.html,
    })
    console.log('[sendEmail] Resend response:', { id: data?.id ?? null, error: error ?? null })
    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.log('[sendEmail] caught exception:', msg)
    return { success: false, error: msg }
  }
}
