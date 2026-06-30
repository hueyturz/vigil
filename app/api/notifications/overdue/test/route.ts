import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { daysUntil } from '@/lib/utils/date-helpers'

// ⚠️ TEMPORARY DIAGNOSTIC — UNAUTHENTICATED. Runs the same data pipeline as the
// daily overdue-SMS cron (/api/notifications/overdue) but sends NOTHING; it only
// returns aggregate counts so you can verify the pipeline before trusting the cron.
// Returns no phone numbers or personal names. Remove (or add auth) once verified.

type Timing = 'overdue' | 'today' | 'tomorrow'

export async function GET() {
  const db = createServiceRoleClient()

  // Same query the cron uses: not-started tasks on active services, all homes.
  const { data: rawTasks, error: taskErr } = await db
    .from('tasks')
    .select(`
      id, title, due_days_before, funeral_home_id, service_id, assigned_to_id,
      services!inner ( id, deceased_name, service_date, status )
    `)
    .eq('status', 'not-started')
    .eq('services.status', 'active')

  if (taskErr) return NextResponse.json({ ok: false, stage: 'tasks', error: taskErr.message }, { status: 500 })

  // Per-home tallies of relevant (overdue / today / tomorrow) tasks.
  const taskTally = new Map<string, { overdue: number; today: number; tomorrow: number }>()
  let withoutServiceDate = 0
  for (const task of rawTasks ?? []) {
    const raw = task.services as unknown
    const svc = (Array.isArray(raw) ? raw[0] : raw) as { service_date: string | null } | null
    if (!svc || !svc.service_date) { withoutServiceDate++; continue }

    const dueIn = daysUntil(svc.service_date) - task.due_days_before
    let timing: Timing | null = null
    if (dueIn < 0) timing = 'overdue'
    else if (dueIn === 0) timing = 'today'
    else if (dueIn === 1) timing = 'tomorrow'
    if (!timing) continue

    const t = taskTally.get(task.funeral_home_id) ?? { overdue: 0, today: 0, tomorrow: 0 }
    t[timing]++
    taskTally.set(task.funeral_home_id, t)
  }

  // Active users + phone presence, per home.
  const { data: profiles, error: profErr } = await db
    .from('profiles')
    .select('id, role, phone, funeral_home_id')
    .eq('is_active', true)
  if (profErr) return NextResponse.json({ ok: false, stage: 'profiles', error: profErr.message }, { status: 500 })

  const userTally = new Map<string, { activeUsers: number; usersWithPhone: number }>()
  for (const u of profiles ?? []) {
    const t = userTally.get(u.funeral_home_id) ?? { activeUsers: 0, usersWithPhone: 0 }
    t.activeUsers++
    if (u.phone && String(u.phone).trim()) t.usersWithPhone++
    userTally.set(u.funeral_home_id, t)
  }

  // Home names for readability.
  const homeIds = Array.from(new Set([...Array.from(taskTally.keys()), ...Array.from(userTally.keys())]))
  const namesById = new Map<string, string>()
  if (homeIds.length > 0) {
    const { data: homes } = await db.from('funeral_homes').select('id, name').in('id', homeIds)
    for (const h of homes ?? []) namesById.set(h.id, h.name)
  }

  const byFuneralHome = homeIds
    .map(id => {
      const tasks = taskTally.get(id) ?? { overdue: 0, today: 0, tomorrow: 0 }
      const users = userTally.get(id) ?? { activeUsers: 0, usersWithPhone: 0 }
      return {
        funeralHomeId:  id,
        name:           namesById.get(id) ?? '(unknown)',
        activeUsers:    users.activeUsers,
        usersWithPhone: users.usersWithPhone,
        overdue:        tasks.overdue,
        today:          tasks.today,
        tomorrow:       tasks.tomorrow,
      }
    })
    .sort((a, b) => b.overdue - a.overdue || a.name.localeCompare(b.name))

  const totals = {
    funeralHomes:   homeIds.length,
    activeUsers:    (profiles ?? []).length,
    usersWithPhone: (profiles ?? []).filter(u => u.phone && String(u.phone).trim()).length,
    relevantTasks: {
      overdue:  byFuneralHome.reduce((s, h) => s + h.overdue, 0),
      today:    byFuneralHome.reduce((s, h) => s + h.today, 0),
      tomorrow: byFuneralHome.reduce((s, h) => s + h.tomorrow, 0),
    },
    notStartedTasksScanned: (rawTasks ?? []).length,
    tasksWithoutServiceDate: withoutServiceDate,
  }

  return NextResponse.json({
    ok: true,
    note: 'Diagnostic only — no SMS sent. Unauthenticated; remove or secure after verifying.',
    generatedAtUtc: new Date().toISOString(),
    totals,
    byFuneralHome,
  })
}
