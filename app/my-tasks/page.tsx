import { redirect } from 'next/navigation'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/layout/AppShell'
import { Badge } from '@/components/ui/Badge'
import { TaskRow } from '@/components/tasks/TaskRow'
import { computeServiceStatus } from '@/lib/utils/service-status'
import { formatDate } from '@/lib/utils/date-helpers'
import type { TaskWithProfile } from '@/lib/types'

export default async function MyTasksPage() {
  const supabase = createClient()

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const db = createServiceRoleClient()

  const { data: profile } = await db
    .from('profiles')
    .select('id, full_name, role, funeral_home_id')
    .eq('id', session.user.id)
    .single()

  if (!profile) redirect('/login')

  // Only staff use this page; fd/owner go to /dashboard
  if (profile.role !== 'staff') redirect('/dashboard')

  // Fetch active services where this user is the assigned staff
  const { data: servicesRaw } = await db
    .from('services')
    .select(`
      *,
      tasks (
        *,
        completed_by:profiles!tasks_completed_by_id_fkey (id, full_name),
        assigned_to:profiles!tasks_assigned_to_id_fkey  (id, full_name)
      )
    `)
    .eq('assigned_staff_id', session.user.id)
    .eq('status', 'active')
    .order('service_date', { ascending: true })

  // Also fetch active services that have tasks directly assigned to this user
  const { data: directTaskServicesRaw } = await db
    .from('services')
    .select(`
      *,
      tasks!inner (
        *,
        completed_by:profiles!tasks_completed_by_id_fkey (id, full_name),
        assigned_to:profiles!tasks_assigned_to_id_fkey  (id, full_name)
      )
    `)
    .eq('tasks.assigned_to_id', session.user.id)
    .neq('assigned_staff_id', session.user.id)
    .eq('status', 'active')
    .order('service_date', { ascending: true })

  // Merge and deduplicate by service id
  const allServicesRaw = [...(servicesRaw ?? []), ...(directTaskServicesRaw ?? [])]
  const seenIds = new Set<string>()
  const deduped = allServicesRaw.filter(s => {
    if (seenIds.has(s.id)) return false
    seenIds.add(s.id)
    return true
  })

  const services = deduped.map(s => ({
    ...s,
    tasks: ((s.tasks ?? []) as TaskWithProfile[]).map(t => ({
      ...t,
      completed_by: t.completed_by ?? null,
      assigned_to:  t.assigned_to  ?? null,
    })),
  }))

  return (
    <AppShell profile={profile}>
      <div className="px-4 py-4 md:px-8 md:py-8 max-w-3xl mx-auto">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold" style={{ color: '#0F172A' }}>My Tasks</h1>
          <p className="text-sm mt-0.5" style={{ color: '#475569' }}>{profile.full_name}</p>
        </div>

        {services.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center rounded-xl border py-20 text-center"
            style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }}
          >
            <p className="text-sm font-medium" style={{ color: '#0F172A' }}>No assigned services</p>
            <p className="mt-1 text-sm" style={{ color: '#475569' }}>
              You have no active services assigned to you.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {services.map(service => {
              const tasks = service.tasks as TaskWithProfile[]
              const sortedTasks = [...tasks].sort((a, b) => a.sort_order - b.sort_order)
              const pending   = sortedTasks.filter(t => t.status !== 'complete')
              const completed = sortedTasks.filter(t => t.status === 'complete')
              const status    = computeServiceStatus(tasks, service.service_date ?? '')

              return (
                <div key={service.id}>
                  {/* Service header */}
                  <div
                    className="rounded-xl border p-5 mb-4"
                    style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2
                          className="font-serif text-xl font-bold"
                          style={{ color: '#0F172A' }}
                        >
                          {service.deceased_name}
                        </h2>
                        <div
                          className="flex flex-wrap gap-3 mt-1 text-sm"
                          style={{ color: '#475569' }}
                        >
                          {service.service_date && <span>{formatDate(service.service_date)}</span>}
                          {service.service_date && service.location && <span>·</span>}
                          {service.location && <span>{service.location}</span>}
                        </div>
                      </div>
                      <Badge status={status} />
                    </div>
                  </div>

                  {/* Pending tasks */}
                  {pending.length > 0 && (
                    <div className="mb-4">
                      <p
                        className="text-xs font-semibold uppercase tracking-wider mb-2"
                        style={{ color: '#94A3B8' }}
                      >
                        Pending — {pending.length}
                      </p>
                      <div className="space-y-2">
                        {pending.map(task => (
                          <TaskRow
                            key={task.id}
                            task={task}
                            serviceDate={service.service_date ?? ''}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Completed tasks */}
                  {completed.length > 0 && (
                    <div>
                      <p
                        className="text-xs font-semibold uppercase tracking-wider mb-2"
                        style={{ color: '#94A3B8' }}
                      >
                        Completed — {completed.length}
                      </p>
                      <div className="space-y-2">
                        {completed.map(task => (
                          <TaskRow
                            key={task.id}
                            task={task}
                            serviceDate={service.service_date ?? ''}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </AppShell>
  )
}
