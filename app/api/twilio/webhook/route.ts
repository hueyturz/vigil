import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import twilio from 'twilio'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { normalizePhone } from '@/lib/utils/sms'

// Twilio inbound webhook (battle plan session 8, audit H2). Handles BOTH:
//   1. Inbound messages — STOP/START keyword opt-out sync (TCPA)
//   2. Delivery status callbacks — sms_log.status updates via twilio_sid
//
// One-time Twilio Console setup:
//   • Phone Numbers → your number → Messaging → "A Message Comes In":
//       [NEXT_PUBLIC_APP_URL]/api/twilio/webhook  (HTTP POST)
//   • Outbound statusCallback is already passed by sendSMS() in lib/utils/sms.ts
//     and points at this same route.
//
// Security: this route is PUBLIC in middleware (Twilio has no session cookie).
// Authentication is Twilio's request-signature validation below — nothing runs
// before the signature passes.

const STOP_WORDS  = new Set(['STOP', 'STOPALL', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT'])
const START_WORDS = new Set(['START', 'UNSTOP', 'YES'])

function twiml(message: string): NextResponse {
  return new NextResponse(
    `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${message}</Message></Response>`,
    { headers: { 'Content-Type': 'text/xml' } },
  )
}

export async function POST(request: NextRequest) {
  const authToken = process.env.TWILIO_AUTH_TOKEN
  if (!authToken) {
    Sentry.captureMessage('[twilio-webhook] TWILIO_AUTH_TOKEN is not set', { level: 'error' })
    return NextResponse.json({ error: 'Webhook not configured.' }, { status: 500 })
  }

  // Twilio posts application/x-www-form-urlencoded; the signature covers the
  // exact public URL + sorted POST params. Behind Vercel's proxy request.url can
  // differ from the public URL, so reconstruct it from NEXT_PUBLIC_APP_URL.
  const form = await request.formData()
  const params: Record<string, string> = {}
  form.forEach((value, key) => { params[key] = String(value) })

  const signature  = request.headers.get('x-twilio-signature') ?? ''
  const publicUrl  = `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/api/twilio/webhook`
  const valid = twilio.validateRequest(authToken, signature, publicUrl, params)
  if (!valid) {
    Sentry.captureMessage('[twilio-webhook] invalid signature', { level: 'warning' })
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 403 })
  }

  const db = createServiceRoleClient()

  try {
    // ── Delivery status callback (has MessageStatus, no inbound Body/From pair) ──
    if (params.MessageStatus && params.MessageSid) {
      const status = params.MessageStatus // queued|sent|delivered|failed|undelivered
      if (['queued', 'sent', 'delivered', 'failed', 'undelivered'].includes(status)) {
        const patch: Record<string, unknown> = { status }
        if (params.ErrorCode) patch.error_message = `Twilio error ${params.ErrorCode}`
        await db.from('sms_log').update(patch).eq('twilio_sid', params.MessageSid)
      }
      if (status === 'failed' || status === 'undelivered') {
        Sentry.captureMessage('[twilio-webhook] delivery failure', {
          level: 'error',
          extra: { messageSid: params.MessageSid, status, errorCode: params.ErrorCode ?? null },
        })
      }
      return new NextResponse(null, { status: 204 })
    }

    // ── Inbound message (STOP/START keywords) ────────────────────────────────────
    const body = (params.Body ?? '').trim().toUpperCase()
    const from = params.From ?? ''
    if (!body || !from) return new NextResponse(null, { status: 204 })

    const isStop  = STOP_WORDS.has(body)
    const isStart = START_WORDS.has(body)
    if (!isStop && !isStart) return twiml('Vigilight: reply STOP to unsubscribe or START to re-subscribe.')

    // Match the sender to a profile by phone. Stored formats vary, so compare
    // normalized E.164 values across the (small) set of profiles with phones.
    const { data: candidates } = await db
      .from('profiles')
      .select('id, phone, funeral_home_id, full_name')
      .not('phone', 'is', null)
    const fromNorm = normalizePhone(from)
    const profile = (candidates ?? []).find(p => {
      try { return p.phone && normalizePhone(p.phone) === fromNorm } catch { return false }
    })

    if (!profile) {
      // Unknown number — acknowledge without leaking whether it exists.
      return twiml(isStop
        ? 'You have been unsubscribed from Vigilight notifications.'
        : 'You have been re-subscribed to Vigilight notifications.')
    }

    await db
      .from('profiles')
      .update(isStop
        ? { sms_opted_out: true,  opted_out_at: new Date().toISOString() }
        : { sms_opted_out: false, opted_out_at: null })
      .eq('id', profile.id)

    await db.from('activity_log').insert({
      funeral_home_id: profile.funeral_home_id,
      service_id:      null,
      task_id:         null,
      actor_id:        profile.id,
      actor_name:      profile.full_name,
      action_type:     'sms_opt_out',
      description:     isStop ? 'Opted out of SMS notifications (texted STOP).' : 'Re-subscribed to SMS notifications (texted START).',
      metadata:        null,
    })

    return twiml(isStop
      ? 'You have been unsubscribed from Vigilight notifications.'
      : 'You have been re-subscribed to Vigilight notifications.')
  } catch (err) {
    Sentry.captureException(err, { tags: { route: 'twilio-webhook' } })
    console.error('[twilio-webhook] error:', err)
    // ACK so Twilio doesn't retry-storm; the failure is in Sentry.
    return new NextResponse(null, { status: 204 })
  }
}
