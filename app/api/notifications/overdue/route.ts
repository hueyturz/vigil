import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { sendAndLogSms } from '@/lib/utils/sms'
import { formatDate, daysUntil } from '@/lib/utils/date-helpers'

// Daily cron. Every fire sends the reminder to all eligible users (no per-user
// timezone/preferred-hour gate) — i.e. anyone with a phone and in-scope overdue
// tasks gets the digest each time the cron runs.

type Timing = 'overdue' | 'today' | 'tomorrow'

const TIMING_LABEL: Record<Timing, string> = {
  overdue:  'overdue',
  today:    'due today',
  tomorrow: 'due tomorrow',
}
const TIMING_ORDER: Record<Timing, number> = { overdue: 0, today: 1, tomorrow: 2 }

interface ReminderTask {
  title:         string
  serviceId:     string
  serviceName:   string
  serviceDate:   string | null
  assignedToId:  string | null
  funeralHomeId: string
  timing:        Timing
}

function buildReminderMessage(tasks: ReminderTask[]): string {
  const groups = new Map<string, { name: string; date: string | null; items: ReminderTask[] }>()
  for (const t of tasks) {
    if (!groups.has(t.serviceId)) groups.set(t.serviceId, { name: t.serviceName, date: t.serviceDate, items: [] })
    groups.get(t.serviceId)!.items.push(t)
  }
  for (const g of Array.from(groups.values())) g.items.sort((a, b) => TIMING_ORDER[a.timing] - TIMING_ORDER[b.timing])

  const fmtDate = (d: string | null) => (d ? formatDate(d) : 'date TBD')
  const bullets = (items: ReminderTask[]) => {
    const shown = items.slice(0, 5).map(t => `• ${t.title} (${TIMING_LABEL[t.timing]})`)
    if (items.length > 5) shown.push(`and ${items.length - 5} more — view at getvigilight.com`)
    return shown.join('\n')
  }
  const STOP = 'Txt STOP to opt out.'

  if (groups.size === 1) {
    const g = Array.from(groups.values())[0]
    const n = g.items.length
    return `Vigilight: ${n} task${n !== 1 ? 's' : ''} need attention for ${g.name} service (${fmtDate(g.date)}):\n${bullets(g.items)}\n${STOP}`
  }

  const blocks = Array.from(groups.values()).map(g => `${g.name} (${fmtDate(g.date)}):\n${bullets(g.items)}`)
  return `Vigilight: Tasks need attention across ${groups.size} services:\n\n${blocks.join('\n\n')}\n\n${STOP}`
}

// Vercel native crons fire a GET; QStash schedules can POST. Accept both (they
// share one handler) so the daily reminder runs regardless of the trigger — and
// we never 405 a legitimate cron invocation.
export async function GET(request: NextRequest)  { return handle(request) }
export async function POST(request: NextRequest) { return handle(request) }

// Sentry Cron Monitor (dead-man switch): withMonitor sends in_progress at start
// and ok/error at end, so a run that never happens (Vercel cron dropped, secret
// drift → 401) or throws mid-way alerts in Sentry after the check-in margin.
// The monitorConfig below upserts the monitor automatically on first check-in —
// no manual dashboard step required (it can also be created/tuned in the Sentry
// dashboard under Crons; keep the slug in sync with SENTRY_CRON_MONITOR_SLUG).
const MONITOR_SLUG = process.env.SENTRY_CRON_MONITOR_SLUG ?? 'overdue-sms-cron'

async function handle(request: NextRequest) {
  // Auth: accept QStash's native bearer token, or the CRON_SECRET
  // (Bearer or x-cron-secret header) as a fallback for manual testing.
  const cronSecret   = process.env.CRON_SECRET
  const qstashToken  = process.env.QSTASH_TOKEN
  const headerSecret = request.headers.get('x-cron-secret')
  const bearer       = request.headers.get('authorization')
  const authorized =
    (!!cronSecret  && (headerSecret === cronSecret || bearer === `Bearer ${cronSecret}`)) ||
    (!!qstashToken && bearer === `Bearer ${qstashToken}`)
  // Auth check BEFORE the monitor check-in: unauthorized probes must not report
  // "ok" and mask a dead cron.
  if (!authorized) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

  try {
    return await Sentry.withMonitor(
      MONITOR_SLUG,
      () => runOverdueReminders(),
      {
        schedule:      { type: 'crontab', value: '0 14 * * *' }, // keep in sync with vercel.json
        checkinMargin: 30, // minutes late before Sentry flags a missed run
        maxRuntime:    10, // minutes before an in_progress run is flagged errored
        timezone:      'Etc/UTC',
      },
    )
  } catch (err) {
    // withMonitor has already recorded the errored check-in; report + respond.
    Sentry.captureException(err, { tags: { cron: MONITOR_SLUG } })
    console.error('[overdue-cron] fatal:', err)
    return NextResponse.json({ error: 'Internal error.' }, { status: 500 })
  }
}

async function runOverdueReminders(): Promise<NextResponse> {
  const db = createServiceRoleClient()

  // Not-started tasks on active services, with service + assignment info.
  const { data: rawTasks, error } = await db
    .from('tasks')
    .select(`
      id, title, due_days_before, funeral_home_id, service_id, assigned_to_id,
      services!inner ( id, deceased_name, service_date, status )
    `)
    .eq('status', 'not-started')
    .eq('services.status', 'active')

  // Throw (not a handled 500) so the monitor check-in records an errored run.
  if (error) throw new Error(`overdue-cron task fetch failed: ${error.message}`)

  // Classify each task's timing; keep only overdue / due today / due tomorrow.
  const enriched: ReminderTask[] = []
  for (const task of rawTasks ?? []) {
    const raw = task.services as unknown
    const svc = (Array.isArray(raw) ? raw[0] : raw) as
      | { id: string; deceased_name: string; service_date: string | null }
      | null
    if (!svc || !svc.service_date) continue

    const dueIn = daysUntil(svc.service_date) - task.due_days_before
    let timing: Timing | null = null
    if (dueIn < 0) timing = 'overdue'
    else if (dueIn === 0) timing = 'today'
    else if (dueIn === 1) timing = 'tomorrow'
    if (!timing) continue

    enriched.push({
      title:         task.title,
      serviceId:     task.service_id,
      serviceName:   svc.deceased_name,
      serviceDate:   svc.service_date,
      assignedToId:  task.assigned_to_id ?? null,
      funeralHomeId: task.funeral_home_id,
      timing,
    })
  }

  // Active users + their preferences.
  const { data: profiles } = await db
    .from('profiles')
    .select('id, role, phone, funeral_home_id')
    .eq('is_active', true)
  const { data: allPrefs } = await db.from('notification_preferences').select('*')
  const prefsByUser = new Map((allPrefs ?? []).map(p => [p.user_id, p]))

  const sent: string[]   = []
  const failed: string[] = []
  const skipped = { noTasks: 0, noPhone: 0 }

  for (const user of profiles ?? []) {
    const p = prefsByUser.get(user.id)
    if (!user.phone) { skipped.noPhone++; continue }

    const myOverdue    = p ? !!p.sms_my_tasks_overdue : true
    const staffOverdue = p ? !!p.sms_staff_tasks_overdue : false
    const approaching  = p ? !!p.sms_task_approaching_deadline : false
    const isManager    = user.role === 'owner' || user.role === 'fd'

    const userTasks = enriched.filter(t => {
      if (t.funeralHomeId !== user.funeral_home_id) return false

      const own         = t.assignedToId === user.id
      const unassigned  = t.assignedToId === null
      const someoneElse = !own && !unassigned

      // Routing: which tasks fall into this user's notification scope.
      const inScope =
        own ||
        (unassigned && isManager && myOverdue) ||
        (someoneElse && isManager && staffOverdue)
      if (!inScope) return false

      // Timing gate.
      if (t.timing === 'tomorrow') return approaching      // approaching-deadline opt-in
      if (own) return myOverdue                            // own overdue/today
      return true                                          // unassigned/staff already gated above
    })

    if (userTasks.length === 0) { skipped.noTasks++; continue }

    const ok = await sendAndLogSms(db, {
      funeralHomeId: user.funeral_home_id,
      serviceId:     null,
      taskId:        null,
      recipientId:   user.id,
      phone:         user.phone,
      message:       buildReminderMessage(userTasks),
    })
    if (ok) sent.push(user.id)
    else failed.push(user.id)
  }

  // Surface per-recipient send failures (previously only visible as sms_log rows).
  // One aggregated event per run — the per-row detail (error_message) is in sms_log.
  if (failed.length > 0) {
    Sentry.captureMessage(`[overdue-cron] ${failed.length} SMS send(s) failed`, {
      level: 'error',
      extra: { failedUserIds: failed, sentCount: sent.length, skipped },
    })
  }

  return NextResponse.json({
    sent:    sent.length,
    failed:  failed.length,
    skipped,
    runAtUtc: new Date().toISOString(),
  })
}
