import { NextResponse } from 'next/server'
import { sendEmail } from '@/lib/utils/email'
import { demoRequestEmail } from '@/lib/utils/email-templates'
import { rateLimit, clientIp } from '@/lib/rate-limit'

export async function POST(request: Request) {
  try {
    // Spam guard: 3 demo requests / hour per IP (audit C3). Log throttled hits
    // so a real prospect stuck behind a shared IP is still discoverable.
    const ip = clientIp(request.headers)
    const { success: allowed } = await rateLimit('demo', ip)
    if (!allowed) {
      console.warn('[demo-request] rate-limited attempt from', ip)
      return NextResponse.json(
        { error: 'Too many requests — please try again in an hour, or email hello@getvigilight.com.' },
        { status: 429 },
      )
    }

    const body = await request.json().catch(() => ({}))

    const name        = String(body.name ?? '').trim()
    const funeralHome = String(body.funeral_home ?? '').trim()
    const email       = String(body.email ?? '').trim()
    const phone       = String(body.phone ?? '').trim()
    const staffCount  = String(body.staff_count ?? '').trim()
    const referral    = String(body.referral ?? '').trim()

    if (!name || !funeralHome || !email || !phone) {
      return NextResponse.json({ error: 'Please fill in all required fields.' }, { status: 400 })
    }

    const submittedAt =
      new Date().toLocaleString('en-US', {
        timeZone: 'America/Denver',
        dateStyle: 'medium',
        timeStyle: 'short',
      }) + ' MT'

    const { subject, html } = demoRequestEmail({
      name,
      funeralHome,
      email,
      phone,
      staffCount: staffCount || '—',
      referral:   referral   || '—',
      submittedAt,
    })

    const result = await sendEmail({ to: 'houston@getvigilight.com', subject, html })

    if (!result.success) {
      return NextResponse.json({ error: result.error ?? 'Failed to send request.' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
