import { redirect, notFound } from 'next/navigation'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/utils/date-helpers'
import type { TaskWithProfile } from '@/lib/types'

export default async function PrintServicePage({
  params,
}: {
  params: { id: string }
}) {
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

  const { data: service } = await db
    .from('services')
    .select('*')
    .eq('id', params.id)
    .eq('funeral_home_id', profile.funeral_home_id)
    .single()

  if (!service) notFound()

  const { data: tasksRaw } = await db
    .from('tasks')
    .select(`
      *,
      completed_by:profiles!tasks_completed_by_id_fkey (id, full_name),
      assigned_to:profiles!tasks_assigned_to_id_fkey  (id, full_name)
    `)
    .eq('service_id', params.id)
    .order('sort_order', { ascending: true })

  const tasks: TaskWithProfile[] = (tasksRaw ?? []).map(t => ({
    ...t,
    completed_by: t.completed_by ?? null,
    assigned_to:  t.assigned_to  ?? null,
  }))

  // Group by category
  const categoryOrder: string[] = []
  const groups: Record<string, TaskWithProfile[]> = {}
  for (const task of tasks) {
    if (!groups[task.category]) { categoryOrder.push(task.category); groups[task.category] = [] }
    groups[task.category].push(task)
  }

  const completed = tasks.filter(t => t.status === 'complete').length
  const total     = tasks.length

  return (
    <html>
      <head>
        <title>{service.family_name} Family — Service Checklist</title>
        <meta name="robots" content="noindex" />
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 13px; color: #1e293b; background: #fff; padding: 32px; }
          @media print {
            body { padding: 0; }
            .no-print { display: none !important; }
            @page { margin: 20mm; }
          }
          h1 { font-size: 22px; font-weight: 700; margin-bottom: 2px; }
          .meta { color: #64748b; margin-bottom: 4px; font-size: 12px; }
          .divider { border: none; border-top: 1px solid #e2e8f0; margin: 16px 0; }
          .category-header { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #94a3b8; margin: 20px 0 8px; }
          .task-row { display: flex; align-items: flex-start; gap: 10px; padding: 8px 0; border-bottom: 1px solid #f1f5f9; }
          .task-row:last-child { border-bottom: none; }
          .checkbox { flex-shrink: 0; width: 16px; height: 16px; border: 1.5px solid #cbd5e1; border-radius: 4px; margin-top: 1px; display: flex; align-items: center; justify-content: center; background: #fff; }
          .checkbox.checked { background: #0d6e68; border-color: #0d6e68; }
          .checkmark { color: #fff; font-size: 11px; line-height: 1; }
          .task-title { flex: 1; font-size: 13px; color: #0f172a; }
          .task-title.done { color: #94a3b8; text-decoration: line-through; }
          .task-meta { font-size: 11px; color: #94a3b8; margin-top: 2px; }
          .summary { display: inline-block; background: #f0fdfa; color: #0d6e68; border-radius: 999px; padding: 2px 10px; font-size: 12px; font-weight: 600; margin-left: 8px; }
          .print-btn { display: inline-block; margin-top: 24px; padding: 8px 20px; background: #0d6e68; color: #fff; border: none; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; }
        `}</style>
      </head>
      <body>
        <h1>{/family/i.test(service.family_name) ? service.family_name : `${service.family_name} Family`}</h1>
        <p className="meta">{service.deceased_name}</p>
        {service.service_date && (
          <p className="meta">{formatDate(service.service_date)}{service.location ? ` · ${service.location}` : ''}</p>
        )}
        <p className="meta" style={{ marginTop: 6 }}>
          Task progress:
          <span className="summary">{completed}/{total} confirmed</span>
        </p>

        <hr className="divider" />

        {categoryOrder.map(category => {
          const catTasks = groups[category]
          return (
            <div key={category}>
              <p className="category-header">
                {category} — {catTasks.filter(t => t.status === 'complete').length}/{catTasks.length}
              </p>
              <div>
                {catTasks.map(task => (
                  <div key={task.id} className="task-row">
                    <div className={`checkbox${task.status === 'complete' ? ' checked' : ''}`}>
                      {task.status === 'complete' && <span className="checkmark">✓</span>}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div className={`task-title${task.status === 'complete' ? ' done' : ''}`}>
                        {task.title}
                      </div>
                      {task.status === 'complete' && task.confirmation_value && (
                        <div className="task-meta">
                          {task.confirmation_value}
                          {task.completed_by?.full_name && ` · ${task.completed_by.full_name}`}
                        </div>
                      )}
                      {task.assigned_to?.full_name && task.status !== 'complete' && (
                        <div className="task-meta">Assigned: {task.assigned_to.full_name}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}

        <div className="no-print">
          <button className="print-btn" onClick={() => window.print()}>Print</button>
        </div>
      </body>
    </html>
  )
}
