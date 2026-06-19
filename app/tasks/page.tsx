import { redirect } from 'next/navigation'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/layout/AppShell'
import { AllTasksView } from '@/components/tasks/AllTasksView'
import type { TaskWithProfile } from '@/lib/types'

export interface TaskForAllView extends TaskWithProfile {
  service: {
    id:            string
    deceased_name: string
    service_date:  string | null
  }
}

export interface StaffOption {
  id:        string
  full_name: string
}

export default async function TasksPage() {
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

  const isStaff = profile.role === 'staff'

  let query = db
    .from('tasks')
    .select(`
      id, title, status, priority, due_days_before, sort_order,
      funeral_home_id, service_id, notes, confirmation_hint,
      confirmation_value, completed_by_id, completed_at, created_at, assigned_to_id,
      completed_by:profiles!tasks_completed_by_id_fkey (id, full_name),
      assigned_to:profiles!tasks_assigned_to_id_fkey  (id, full_name),
      service:services!tasks_service_id_fkey (id, deceased_name, service_date, status)
    `)
    .eq('funeral_home_id', profile.funeral_home_id)
    .neq('status', 'complete')

  if (isStaff) {
    query = query.eq('assigned_to_id', session.user.id)
  }

  const { data: rawTasks } = await query

  const tasks: TaskForAllView[] = (rawTasks ?? [])
    .filter((t: any) => {
      const svc = Array.isArray(t.service) ? t.service[0] : t.service
      return svc?.status === 'active'
    })
    .map((t: any) => {
      const svc = Array.isArray(t.service) ? t.service[0] : t.service
      return {
        id:                t.id,
        service_id:        t.service_id,
        funeral_home_id:   t.funeral_home_id,
        title:             t.title,
        category:          '',
        confirmation_hint: t.confirmation_hint,
        due_days_before:   t.due_days_before,
        sort_order:        t.sort_order ?? 0,
        assigned_to_id:    t.assigned_to_id ?? null,
        status:            t.status,
        priority:          t.priority,
        notes:             t.notes,
        confirmation_value: t.confirmation_value ?? null,
        completed_by_id:   t.completed_by_id ?? null,
        completed_at:      t.completed_at ?? null,
        created_at:        t.created_at,
        completed_by:      Array.isArray(t.completed_by) ? (t.completed_by[0] ?? null) : (t.completed_by ?? null),
        assigned_to:       Array.isArray(t.assigned_to)  ? (t.assigned_to[0]  ?? null) : (t.assigned_to  ?? null),
        service: {
          id:            svc.id,
          deceased_name: svc.deceased_name,
          service_date:  svc.service_date ?? null,
        },
      }
    })

  let staffOptions: StaffOption[] = []
  if (!isStaff) {
    const { data: staff } = await db
      .from('profiles')
      .select('id, full_name')
      .eq('funeral_home_id', profile.funeral_home_id)
      .eq('is_active', true)
      .order('full_name')
    staffOptions = staff ?? []
  }

  return (
    <AppShell profile={profile}>
      <div className="px-4 py-4 md:px-8 md:py-8 max-w-5xl mx-auto">
        <AllTasksView
          tasks={tasks}
          staffOptions={staffOptions}
          isStaff={isStaff}
          funeralHomeId={profile.funeral_home_id}
          actorId={profile.id}
          actorName={profile.full_name}
        />
      </div>
    </AppShell>
  )
}
