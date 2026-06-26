import { NextRequest, NextResponse } from 'next/server'
import { getActiveProfile } from '@/lib/utils/impersonation'
import { createServiceRoleClient } from '@/lib/supabase/server'

const EMPTY = { services: [], tasks: [], contacts: [], tags: [] }

// Pull the embedded service name off a PostgREST relation (object or array).
function svcName(row: { service?: unknown }): string {
  const s = Array.isArray(row.service) ? row.service[0] : row.service
  return (s as { deceased_name?: string } | null)?.deceased_name ?? ''
}

export async function GET(request: NextRequest) {
  const ctx = await getActiveProfile()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized.', ...EMPTY }, { status: 401 })

  const raw     = (request.nextUrl.searchParams.get('q') ?? '').trim()
  const tagName = (request.nextUrl.searchParams.get('tag') ?? '').trim()
  const q       = raw.replace(/[%,()\\*]/g, ' ').trim()
  // Need either a 2+ char query or an explicit tag filter to do anything.
  if (q.length < 2 && !tagName) return NextResponse.json(EMPTY)

  const db   = createServiceRoleClient()
  const fhId = ctx.profile.funeral_home_id
  const like = `%${q}%`

  // When ?tag= is set, resolve the matching task ids up front.
  let taskIdsForTag: string[] | null = null
  if (tagName) {
    const { data: tagRows } = await db
      .from('tags').select('id').or(`is_default.eq.true,funeral_home_id.eq.${fhId}`).ilike('name', tagName)
    const tagIds = (tagRows ?? []).map(r => r.id)
    if (tagIds.length === 0) {
      taskIdsForTag = []
    } else {
      const { data: tt } = await db.from('task_tags').select('task_id').in('tag_id', tagIds)
      taskIdsForTag = Array.from(new Set((tt ?? []).map(r => r.task_id)))
    }
  }

  // Tasks: when filtering by tag, return tasks carrying that tag (ignore text);
  // otherwise text-match title/notes.
  async function loadTasks() {
    if (taskIdsForTag !== null) {
      if (taskIdsForTag.length === 0) return []
      const { data } = await db
        .from('tasks')
        .select('id, title, service_id, service:services(deceased_name)')
        .eq('funeral_home_id', fhId)
        .in('id', taskIdsForTag)
        .limit(5)
      return data ?? []
    }
    const { data } = await db
      .from('tasks')
      .select('id, title, service_id, service:services(deceased_name)')
      .eq('funeral_home_id', fhId)
      .or(`title.ilike.${like},notes.ilike.${like}`)
      .limit(5)
    return data ?? []
  }

  const canText = q.length >= 2

  const [tasksData, servicesRes, contactsRes, tagsRes] = await Promise.all([
    loadTasks(),
    canText
      ? db.from('services').select('id, deceased_name, service_type, service_date, status')
          .eq('funeral_home_id', fhId)
          .or(`deceased_name.ilike.${like},service_type.ilike.${like},location.ilike.${like}`).limit(5)
      : Promise.resolve({ data: [] as any[] }),
    canText
      ? db.from('service_contacts').select('id, name, service_id, service:services(deceased_name)')
          .eq('funeral_home_id', fhId)
          .or(`name.ilike.${like},phone.ilike.${like}`).limit(5)
      : Promise.resolve({ data: [] as any[] }),
    canText
      ? db.from('tags').select('id, name, color')
          .or(`is_default.eq.true,funeral_home_id.eq.${fhId}`)
          .ilike('name', like).order('name').limit(5)
      : Promise.resolve({ data: [] as any[] }),
  ])

  return NextResponse.json({
    services: (servicesRes.data ?? []).map((s: any) => ({
      id: s.id, deceased_name: s.deceased_name, service_type: s.service_type, service_date: s.service_date, status: s.status,
    })),
    tasks: (tasksData ?? []).map((t: any) => ({
      id: t.id, title: t.title, service_id: t.service_id, service_deceased_name: svcName(t),
    })),
    contacts: (contactsRes.data ?? []).map((c: any) => ({
      id: c.id, name: c.name, service_id: c.service_id, service_deceased_name: svcName(c),
    })),
    tags: (tagsRes.data ?? []).map((t: any) => ({ id: t.id, name: t.name, color: t.color })),
  })
}
