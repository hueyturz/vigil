import { redirect, notFound } from 'next/navigation'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/utils/date-helpers'
import { formatPhone } from '@/lib/utils/phone'
import type { TaskWithProfile, ServiceContact } from '@/lib/types'

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

  const { data: tasksRaw, error: tasksErr } = await db
    .from('tasks')
    .select(`
      *,
      completed_by:profiles!tasks_completed_by_id_fkey (id, full_name),
      assigned_to:profiles!tasks_assigned_to_id_fkey  (id, full_name)
    `)
    .eq('service_id', params.id)
    .order('sort_order', { ascending: true })
  // Throw (audit H4) so error.tsx renders — never a print view missing tasks.
  if (tasksErr) throw new Error(`Failed to load tasks: ${tasksErr.message}`)

  const tasks: TaskWithProfile[] = (tasksRaw ?? []).map(t => ({
    ...t,
    completed_by: t.completed_by ?? null,
    assigned_to:  t.assigned_to  ?? null,
  }))

  const { data: contactsRaw, error: contactsErr } = await db
    .from('service_contacts')
    .select('*')
    .eq('service_id', params.id)
    .order('is_primary', { ascending: false })
    .order('created_at', { ascending: true })
  // Throw (audit H4) so error.tsx renders — never a print view missing contacts.
  if (contactsErr) throw new Error(`Failed to load contacts: ${contactsErr.message}`)

  const contacts: ServiceContact[] = (contactsRaw ?? []) as ServiceContact[]

  const completed = tasks.filter(t => t.status === 'complete').length
  const total     = tasks.length

  return (
    <html>
      <head>
        <title>{service.deceased_name} — Service Checklist</title>
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
          .task-row { display: flex; align-items: flex-start; gap: 10px; padding: 8px 0; border-bottom: 1px solid #f1f5f9; }
          .task-row:last-child { border-bottom: none; }
          .checkbox { flex-shrink: 0; width: 16px; height: 16px; border: 1.5px solid #cbd5e1; border-radius: 4px; margin-top: 1px; display: flex; align-items: center; justify-content: center; background: #fff; }
          .checkbox.checked { background: #4A7C8C; border-color: #4A7C8C; }
          .checkmark { color: #fff; font-size: 11px; line-height: 1; }
          .task-title { flex: 1; font-size: 13px; color: #0f172a; }
          .task-title.done { color: #94a3b8; text-decoration: line-through; }
          .task-meta { font-size: 11px; color: #94a3b8; margin-top: 2px; }
          .summary { display: inline-block; background: #f0fdfa; color: #4A7C8C; border-radius: 999px; padding: 2px 10px; font-size: 12px; font-weight: 600; margin-left: 8px; }
          .contacts { margin-top: 12px; }
          .contact { margin-bottom: 8px; }
          .contact-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #94a3b8; }
          .contact-name { font-size: 13px; font-weight: 600; color: #0f172a; }
          .contact-detail { font-size: 12px; color: #475569; }
          .print-btn { display: inline-block; margin-top: 24px; padding: 8px 20px; background: #4A7C8C; color: #fff; border: none; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; }
        `}</style>
      </head>
      <body>
        <h1>{service.deceased_name}</h1>
        {service.service_date && (
          <p className="meta">{formatDate(service.service_date)}{service.location ? ` · ${service.location}` : ''}</p>
        )}
        <p className="meta" style={{ marginTop: 6 }}>
          Task progress:
          <span className="summary">{completed}/{total} confirmed</span>
        </p>

        {contacts.length > 0 && (
          <div className="contacts">
            {contacts.map(contact => (
              <div key={contact.id} className="contact">
                <div className="contact-label">
                  {contact.is_primary
                    ? 'Primary Contact'
                    : contact.relationship || 'Contact'}
                </div>
                <div className="contact-name">{contact.name}</div>
                <div className="contact-detail">
                  {[contact.phone ? formatPhone(contact.phone) : null, contact.email]
                    .filter(Boolean)
                    .join(' · ')}
                </div>
              </div>
            ))}
          </div>
        )}

        <hr className="divider" />

        <div>
          {tasks.map(task => (
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

        <div className="no-print">
          <button className="print-btn" onClick={() => window.print()}>Print</button>
        </div>
      </body>
    </html>
  )
}
