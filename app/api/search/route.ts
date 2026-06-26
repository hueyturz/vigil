import { NextRequest, NextResponse } from 'next/server'
import { getActiveProfile } from '@/lib/utils/impersonation'
import { createServiceRoleClient } from '@/lib/supabase/server'

const EMPTY = { services: [], tasks: [], contacts: [] }

// Pull the embedded service name off a PostgREST relation (object or array).
function svcName(row: { service?: unknown }): string {
  const s = Array.isArray(row.service) ? row.service[0] : row.service
  return (s as { deceased_name?: string } | null)?.deceased_name ?? ''
}

export async function GET(request: NextRequest) {
  // Auth + tenant scope (impersonation-aware). Returns 401 JSON rather than a
  // redirect — this is a fetch-consumed API, and middleware already gates pages.
  const ctx = await getActiveProfile()
  if (!ctx) return NextResponse.json({ error: 'Unauthorized.', ...EMPTY }, { status: 401 })

  const raw = (request.nextUrl.searchParams.get('q') ?? '').trim()
  // Strip characters that would break PostgREST's or()/ilike filter grammar.
  const q = raw.replace(/[%,()\\*]/g, ' ').trim()
  if (q.length < 2) return NextResponse.json(EMPTY)

  const db    = createServiceRoleClient()
  const fhId  = ctx.profile.funeral_home_id
  const like  = `%${q}%`

  const [servicesRes, tasksRes, contactsRes] = await Promise.all([
    db
      .from('services')
      .select('id, deceased_name, service_type, service_date, status')
      .eq('funeral_home_id', fhId)
      .or(`deceased_name.ilike.${like},service_type.ilike.${like},location.ilike.${like}`)
      .limit(5),
    db
      .from('tasks')
      .select('id, title, category, service_id, service:services(deceased_name)')
      .eq('funeral_home_id', fhId)
      .or(`title.ilike.${like},notes.ilike.${like}`)
      .limit(5),
    db
      .from('service_contacts')
      .select('id, name, service_id, service:services(deceased_name)')
      .eq('funeral_home_id', fhId)
      .or(`name.ilike.${like},phone.ilike.${like}`)
      .limit(5),
  ])

  return NextResponse.json({
    services: (servicesRes.data ?? []).map(s => ({
      id:            s.id,
      deceased_name: s.deceased_name,
      service_type:  s.service_type,
      service_date:  s.service_date,
      status:        s.status,
    })),
    tasks: (tasksRes.data ?? []).map(t => ({
      id:                    t.id,
      title:                 t.title,
      category:              t.category,
      service_id:            t.service_id,
      service_deceased_name: svcName(t),
    })),
    contacts: (contactsRes.data ?? []).map(c => ({
      id:                    c.id,
      name:                  c.name,
      service_id:            c.service_id,
      service_deceased_name: svcName(c),
    })),
  })
}
