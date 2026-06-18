import { redirect } from 'next/navigation'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/layout/AppShell'
import { AllTasksView } from '@/components/tasks/AllTasksView'

export interface TaskForAllView {
  id:             string
  title:          string
  status:         string
  priority:       string
  due_days_before: number
  notes:          string | null
  confirmation_hint: string
  assigned_to: { id: string; full_name: string } | null
  service: {
    id:           string
    deceased_name: string
    service_date: string | null
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

  // Fetch active services with incomplete tasks
  let query = db
    .from('tasks')
    .select(`
      id, title, status, priority, due_days_before, notes, confirmation_hint,
      assigned_to:profiles!tasks_assigned_to_id_fkey (id, full_name),
      service:services!tasks_service_id_fkey (id, deceased_name, service_date)
    `)
    .eq('funeral_home_id', profile.funeral_home_id)
    .neq('status', 'complete')
    .eq('services.status', 'active')

  // Staff see only tasks assigned to them
  if (isStaff) {
    query = query.eq('assigned_to_id', session.user.id)
  }

  const { data: rawTasks } = await query

  // Filter out tasks whose service is null (inactive/archived services)
  const tasks: TaskForAllView[] = (rawTasks ?? [])
    .filter((t: any) => t.service !== null)
    .map((t: any) => ({
      id:               t.id,
      title:            t.title,
      status:           t.status,
      priority:         t.priority,
      due_days_before:  t.due_days_before,
      notes:            t.notes,
      confirmation_hint: t.confirmation_hint,
      assigned_to:      Array.isArray(t.assigned_to) ? (t.assigned_to[0] ?? null) : (t.assigned_to ?? null),
      service:          Array.isArray(t.service) ? t.service[0] : t.service,
    }))

  // Fetch active staff for the assignee filter (fd/owner only)
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
        <AllTasksView tasks={tasks} staffOptions={staffOptions} isStaff={isStaff} />
      </div>
    </AppShell>
  )
}
