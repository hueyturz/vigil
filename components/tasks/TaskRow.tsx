'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { ConfirmTaskModal } from './ConfirmTaskModal'
import { formatDateTime } from '@/lib/utils/date-helpers'
import { isTaskOverdue } from '@/lib/utils/service-status'
import { deleteServiceTask, updateServiceTask, updateTaskNotes, reassignTask } from '@/app/services/task-actions'
import { logActivity } from '@/lib/utils/activity'
import { createClient } from '@/lib/supabase/client'
import type { Priority, TaskWithProfile, TaskSubtask, Profile } from '@/lib/types'

interface TaskRowProps {
  task:            TaskWithProfile
  serviceDate:     string
  serviceId?:      string
  serviceName?:    string
  funeralHomeId?:  string
  actorId?:        string
  actorName?:      string
  onTaskComplete?: (updated: TaskWithProfile) => void
  onTaskDelete?:   (taskId: string) => void
  onTaskUpdate?:   (updated: TaskWithProfile) => void
}

// ── Due-date urgency label ─────────────────────────────────────────────────────

function dueDateLabel(serviceDate: string, dueDaysBefore: number): { text: string; color: string } | null {
  if (!serviceDate) return null
  const today  = new Date(); today.setHours(0, 0, 0, 0)
  const svc    = new Date(serviceDate + 'T00:00:00')
  const due    = new Date(svc); due.setDate(svc.getDate() - dueDaysBefore)
  const days   = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  if (dueDaysBefore === 0) return { text: 'Due day of service', color: '#F59E0B' }
  if (days < 0)  return { text: `Overdue by ${Math.abs(days)} day${Math.abs(days) !== 1 ? 's' : ''}`, color: '#EF4444' }
  if (days === 0) return { text: 'Due today',    color: '#F59E0B' }
  if (days === 1) return { text: 'Due tomorrow', color: '#F59E0B' }
  return { text: `Due in ${days} days`, color: '#94A3B8' }
}

// ── Assignee chip ──────────────────────────────────────────────────────────────

function AssigneeChip({ name }: { name: string }) {
  const initials = name.split(' ').map(w => w[0] ?? '').slice(0, 2).join('').toUpperCase()
  return (
    <span className="inline-flex items-center gap-1.5 text-xs">
      <span className="inline-flex items-center justify-center rounded-full text-white font-semibold flex-shrink-0"
        style={{ width: 18, height: 18, fontSize: 9, backgroundColor: '#4A7C8C' }}>
        {initials}
      </span>
      <span style={{ color: '#64748B' }}>{name}</span>
    </span>
  )
}

// ── Assign dropdown ────────────────────────────────────────────────────────────

function AssignDropdown({
  taskId, funeralHomeId, actorId, actorName, currentAssignee, taskTitle,
  onAssigned, onClose,
}: {
  taskId: string; funeralHomeId: string; actorId: string; actorName: string
  currentAssignee: string | null; taskTitle: string
  onAssigned: (profile: Pick<Profile, 'id' | 'full_name'> | null) => void
  onClose: () => void
}) {
  const [profiles, setProfiles] = useState<Pick<Profile, 'id' | 'full_name'>[]>([])
  const [saving,   setSaving]   = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/profiles/active').then(r => r.json()).then(d => setProfiles(d.profiles ?? [])).catch(() => {})
  }, [])

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [onClose])

  async function handleSelect(profile: Pick<Profile, 'id' | 'full_name'> | null) {
    setSaving(true)
    const result = await reassignTask(taskId, profile?.id ?? null)
    setSaving(false)
    if (!result.error) {
      if (profile) {
        toast.success(`Assigned to ${profile.full_name}`)
        logActivity({
          funeral_home_id: funeralHomeId,
          task_id:         taskId,
          actor_id:        actorId,
          actor_name:      actorName,
          action_type:     'task_assigned',
          description:     `Task "${taskTitle}" assigned to ${profile.full_name}`,
          metadata:        { assignee_name: profile.full_name },
        })
      }
      onAssigned(profile)
      onClose()
    }
  }

  return (
    <div ref={ref}
      className="absolute right-0 top-full mt-1 z-30 rounded-lg border shadow-lg py-1 min-w-[180px]"
      style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }}>
      <p className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide" style={{ color: '#94A3B8' }}>Assign to</p>
      <button type="button" disabled={saving} onClick={() => handleSelect(null)}
        className="flex items-center w-full px-3 py-2 text-sm text-left transition hover:bg-gray-50"
        style={{ color: currentAssignee ? '#EF4444' : '#94A3B8' }}>
        — Unassigned
      </button>
      {profiles.map(p => (
        <button key={p.id} type="button" disabled={saving} onClick={() => handleSelect(p)}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left transition hover:bg-gray-50"
          style={{ color: '#0F172A' }}>
          <span className="inline-flex items-center justify-center rounded-full text-white font-semibold flex-shrink-0"
            style={{ width: 20, height: 20, fontSize: 10, backgroundColor: '#4A7C8C' }}>
            {p.full_name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
          </span>
          {p.full_name}
        </button>
      ))}
    </div>
  )
}

// ── Subtasks panel ─────────────────────────────────────────────────────────────

function SubtasksPanel({ taskId, funeralHomeId }: { taskId: string; funeralHomeId: string }) {
  const [subtasks,        setSubtasks]        = useState<TaskSubtask[]>([])
  const [loading,         setLoading]         = useState(true)
  const [newTitle,        setNewTitle]        = useState('')
  const [addingStep,      setAddingStep]      = useState(false)
  const [editingId,       setEditingId]       = useState<string | null>(null)
  const [editingTitle,    setEditingTitle]    = useState('')
  const [hoveredId,       setHoveredId]       = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('task_subtasks')
      .select('*')
      .eq('task_id', taskId)
      .order('sort_order', { ascending: true })
      .then(({ data, error }) => {
        if (error) console.error('[subtask fetch]', error.message)
        setSubtasks((data ?? []) as TaskSubtask[])
        setLoading(false)
      })
  }, [taskId])

  async function toggleComplete(id: string, current: boolean) {
    const supabase = createClient()
    const { error } = await supabase.from('task_subtasks').update({ is_complete: !current }).eq('id', id)
    if (error) { console.error('[subtask toggle]', error.message); return }
    setSubtasks(prev => prev.map(s => s.id === id ? { ...s, is_complete: !current } : s))
    if (!current) toast.success('Step completed')
  }

  async function saveTitle(id: string) {
    const trimmed = editingTitle.trim()
    if (!trimmed) { setEditingId(null); return }
    const supabase = createClient()
    const { error } = await supabase.from('task_subtasks').update({ title: trimmed }).eq('id', id)
    if (!error) setSubtasks(prev => prev.map(s => s.id === id ? { ...s, title: trimmed } : s))
    setEditingId(null)
  }

  async function deleteSubtask(id: string) {
    const supabase = createClient()
    const { error } = await supabase.from('task_subtasks').delete().eq('id', id)
    if (!error) setSubtasks(prev => prev.filter(s => s.id !== id))
  }

  async function addStep() {
    const trimmed = newTitle.trim()
    if (!trimmed) return
    setAddingStep(true)
    const supabase = createClient()
    const nextOrder = subtasks.length > 0 ? Math.max(...subtasks.map(s => s.sort_order)) + 1 : 0
    const { data, error } = await supabase
      .from('task_subtasks')
      .insert({ task_id: taskId, funeral_home_id: funeralHomeId, title: trimmed, sort_order: nextOrder })
      .select('*')
      .single()
    setAddingStep(false)
    if (error) {
      console.error('[subtask insert]', error.message, error.details, error.hint)
      toast.error('Failed to add step')
      return
    }
    if (data) {
      setSubtasks(prev => [...prev, data as TaskSubtask])
      setNewTitle('')
      toast.success('Step added')
    }
  }

  if (loading) {
    return <div className="h-4 flex items-center"><span className="text-xs" style={{ color: '#94A3B8' }}>Loading steps…</span></div>
  }

  return (
    <div className="space-y-1">
      {subtasks.map(s => (
        <div key={s.id}
          className="flex items-center gap-2 group rounded-md px-1 py-0.5"
          onMouseEnter={() => setHoveredId(s.id)}
          onMouseLeave={() => setHoveredId(null)}>
          <button type="button" onClick={() => toggleComplete(s.id, s.is_complete)}
            className="flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center transition"
            style={{
              borderColor:     s.is_complete ? '#4A7C8C' : '#CBD5E1',
              backgroundColor: s.is_complete ? '#4A7C8C' : '#FFFFFF',
            }}>
            {s.is_complete && (
              <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
                <polyline points="2 6 5 9 10 3" />
              </svg>
            )}
          </button>

          {editingId === s.id ? (
            <input
              autoFocus
              type="text"
              value={editingTitle}
              onChange={e => setEditingTitle(e.target.value)}
              onBlur={() => saveTitle(s.id)}
              onKeyDown={e => { if (e.key === 'Enter') saveTitle(s.id); if (e.key === 'Escape') setEditingId(null) }}
              className="flex-1 text-xs rounded border px-1.5 py-0.5 outline-none"
              style={{ borderColor: '#E2E8F0', color: '#0F172A' }}
            />
          ) : (
            <span
              className="flex-1 text-xs cursor-pointer select-none"
              style={{ color: s.is_complete ? '#94A3B8' : '#0F172A', textDecoration: s.is_complete ? 'line-through' : 'none' }}
              onClick={() => { setEditingId(s.id); setEditingTitle(s.title) }}>
              {s.title}
            </span>
          )}

          {hoveredId === s.id && editingId !== s.id && (
            <button type="button" onClick={() => deleteSubtask(s.id)}
              className="flex-shrink-0 opacity-40 hover:opacity-100 transition"
              style={{ color: '#EF4444' }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6M14 11v6" />
              </svg>
            </button>
          )}
        </div>
      ))}

      {/* Add step */}
      <div className="flex items-center gap-2 mt-1">
        <div className="flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center" style={{ borderColor: '#E2E8F0' }} />
        <input
          type="text"
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') addStep() }}
          placeholder="+ Add step"
          className="flex-1 text-xs outline-none bg-transparent"
          style={{ color: '#94A3B8' }}
          disabled={addingStep}
        />
        {newTitle.trim() && (
          <button type="button" onClick={addStep} disabled={addingStep}
            className="text-xs font-semibold transition hover:opacity-70"
            style={{ color: '#4A7C8C' }}>
            {addingStep ? '…' : '+'}
          </button>
        )}
      </div>
    </div>
  )
}

// ── TaskRow ────────────────────────────────────────────────────────────────────

export function TaskRow({
  task: initialTask,
  serviceDate,
  serviceId,
  serviceName,
  funeralHomeId,
  actorId,
  actorName,
  onTaskComplete,
  onTaskDelete,
  onTaskUpdate,
}: TaskRowProps) {
  const [task,         setTask]         = useState<TaskWithProfile>(initialTask)
  const [modalOpen,    setModalOpen]    = useState(false)
  const [detailsOpen,  setDetailsOpen]  = useState(false)
  const [menuOpen,     setMenuOpen]     = useState(false)
  const [assignOpen,   setAssignOpen]   = useState(false)
  const [editMode,     setEditMode]     = useState(false)
  const [editTitle,    setEditTitle]    = useState(task.title)
  const [editHint,     setEditHint]     = useState(task.confirmation_hint)
  const [editNotes,    setEditNotes]    = useState(task.notes ?? '')
  const [confirmDel,   setConfirmDel]   = useState(false)
  const [saving,       setSaving]       = useState(false)
  const [savingNotes,  setSavingNotes]  = useState(false)
  const [deleting,     setDeleting]     = useState(false)
  const [expanded,     setExpanded]     = useState(false)
  const [mounted,      setMounted]      = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Date-derived UI (overdue state, relative labels, formatted timestamps) must
  // only render after mount — computing them during SSR/hydration produces
  // different values server vs client (timezone + clock), causing hydration
  // errors (#418/#422/#425). Before mount we render the neutral, deterministic
  // state so the server HTML and first client render match exactly.
  const overdue  = mounted ? isTaskOverdue(task, serviceDate) : false
  const complete = task.status === 'complete'

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!menuOpen) return
    function handleOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [menuOpen])

  function handleSuccess(updatedTask: TaskWithProfile) {
    setTask(updatedTask)
    setModalOpen(false)
    onTaskComplete?.(updatedTask)
  }

  async function handleSave() {
    if (!editTitle.trim()) return
    setSaving(true)
    const result = await updateServiceTask(task.id, { title: editTitle.trim(), confirmation_hint: task.confirmation_hint })
    setSaving(false)
    if (result.error) return
    const updated: TaskWithProfile = { ...task, title: editTitle.trim() }
    setTask(updated)
    onTaskUpdate?.(updated)
    if (funeralHomeId && actorId && actorName) {
      logActivity({ funeral_home_id: funeralHomeId, service_id: serviceId, task_id: task.id, actor_id: actorId, actor_name: actorName, action_type: 'task_edited', description: `Task "${editTitle.trim()}" edited` })
    }
    setEditMode(false)
  }

  async function handleBlurNotes() {
    if (editNotes === (task.notes ?? '')) return
    setSavingNotes(true)
    const result = await updateTaskNotes(task.id, editNotes.trim() || null)
    setSavingNotes(false)
    if (result.error) return
    const updated: TaskWithProfile = { ...task, notes: editNotes.trim() || null }
    setTask(updated)
    onTaskUpdate?.(updated)
    toast.success('Notes saved')
  }

  async function handleDelete() {
    setDeleting(true)
    const result = await deleteServiceTask(task.id)
    setDeleting(false)
    if (!result.error) {
      if (funeralHomeId && actorId && actorName) {
        logActivity({ funeral_home_id: funeralHomeId, service_id: serviceId, task_id: task.id, actor_id: actorId, actor_name: actorName, action_type: 'task_deleted', description: `Task "${task.title}" deleted` })
      }
      onTaskDelete?.(task.id)
    }
  }

  const urgency = (!complete && mounted) ? dueDateLabel(serviceDate, task.due_days_before) : null

  // ── Edit mode ────────────────────────────────────────────────────────────────
  if (editMode) {
    return (
      <div className="rounded-lg border p-4 space-y-3" style={{ backgroundColor: '#FAFAFA', borderColor: '#CBD5E1' }}>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: '#475569' }}>Task title</label>
          <input autoFocus type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
            style={{ borderColor: '#E2E8F0', color: '#0F172A', backgroundColor: '#FFFFFF' }} />
        </div>
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={() => { setEditMode(false); setEditTitle(task.title) }}
            className="rounded-lg border px-3 py-1.5 text-xs font-medium transition hover:bg-gray-50"
            style={{ borderColor: '#E2E8F0', color: '#475569' }}>Cancel</button>
          <button type="button" onClick={handleSave} disabled={saving || !editTitle.trim()}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
            style={{ backgroundColor: '#4A7C8C' }}>{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    )
  }

  // ── Delete confirmation ──────────────────────────────────────────────────────
  if (confirmDel) {
    return (
      <div className="rounded-lg border p-4" style={{ backgroundColor: '#FEF2F2', borderColor: '#FECACA' }}>
        <p className="text-sm font-medium mb-3" style={{ color: '#991B1B' }}>
          Delete &ldquo;{task.title}&rdquo;? This cannot be undone.
        </p>
        <div className="flex gap-2">
          <button type="button" onClick={() => setConfirmDel(false)}
            className="rounded-lg border px-3 py-1.5 text-xs font-medium transition hover:bg-gray-50"
            style={{ borderColor: '#E2E8F0', color: '#475569' }}>Cancel</button>
          <button type="button" onClick={handleDelete} disabled={deleting}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
            style={{ backgroundColor: '#EF4444' }}>{deleting ? 'Deleting…' : 'Delete task'}</button>
        </div>
      </div>
    )
  }

  // ── Normal / accordion view ──────────────────────────────────────────────────
  return (
    <>
      <div
        className="rounded-lg border overflow-hidden"
        style={{
          backgroundColor: '#FFFFFF',
          borderColor: complete ? '#A7F3D0' : overdue ? '#FECACA' : '#E2E8F0',
        }}
      >
        {/* Collapsed row */}
        <div
          className="flex items-start gap-3 p-4 cursor-pointer select-none"
          onClick={() => setExpanded(o => !o)}
        >
          {/* Status circle */}
          <div className="mt-0.5 flex-shrink-0">
            {complete ? <CheckCircleIcon color="#10B981" /> : overdue ? <AlertCircleIcon color="#EF4444" /> : <CircleIcon color="#94A3B8" />}
          </div>

          {/* Title + urgency */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <PriorityDot priority={task.priority} />
              <p className="text-sm font-medium truncate min-w-0" style={{ color: '#0F172A' }}>{task.title}</p>
            </div>
            {serviceName && (
              serviceId ? (
                <Link
                  href={`/services/${serviceId}`}
                  onClick={e => e.stopPropagation()}
                  className="inline-block text-xs font-medium mt-0.5 hover:underline"
                  style={{ color: '#5A8C88' }}
                >
                  {serviceName}
                </Link>
              ) : (
                <p className="text-xs font-medium mt-0.5" style={{ color: '#5A8C88' }}>{serviceName}</p>
              )
            )}
            {!complete && urgency && (
              <p className="text-xs font-medium mt-0.5" style={{ color: urgency.color }}>{urgency.text}</p>
            )}
            {complete && (
              <p className="text-xs mt-0.5" style={{ color: '#065F46' }}>
                Confirmed by {task.completed_by?.full_name ?? 'unknown'}
                {mounted && task.completed_at && <span style={{ color: '#94A3B8' }}> · {formatDateTime(task.completed_at)}</span>}
              </p>
            )}
          </div>

          {/* Chevron */}
          <svg
            width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="#94A3B8" strokeWidth="2.5" strokeLinecap="round"
            className="flex-shrink-0 mt-1 transition-transform"
            style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>

          {/* Three-dot menu */}
          {!complete && (
            <div className="relative flex-shrink-0" ref={menuRef} onClick={e => e.stopPropagation()}>
              <button type="button" onClick={() => setMenuOpen(o => !o)}
                className="flex items-center justify-center w-7 h-7 rounded-md transition hover:opacity-60"
                style={{ color: '#94A3B8' }} aria-label="Task options">
                <DotsIcon />
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-full mt-1 z-20 rounded-lg border shadow-lg py-1 min-w-[160px]"
                  style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }}>
                  <button type="button"
                    onClick={() => { setMenuOpen(false); setEditMode(true); setEditTitle(task.title) }}
                    className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-left transition hover:bg-gray-50"
                    style={{ color: '#0F172A' }}>
                    <PencilIcon /> Edit task
                  </button>
                  <button type="button"
                    onClick={() => { setMenuOpen(false); setAssignOpen(true) }}
                    className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-left transition hover:bg-gray-50"
                    style={{ color: '#0F172A' }}>
                    <PersonIcon /> {task.assigned_to ? 'Reassign' : 'Assign'}
                  </button>
                  <button type="button"
                    onClick={() => { setMenuOpen(false); setConfirmDel(true) }}
                    className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-left transition hover:bg-red-50"
                    style={{ color: '#EF4444' }}>
                    <TrashIcon /> Delete task
                  </button>
                </div>
              )}

              {assignOpen && funeralHomeId && actorId && actorName && (
                <AssignDropdown
                  taskId={task.id} funeralHomeId={funeralHomeId} actorId={actorId} actorName={actorName}
                  currentAssignee={task.assigned_to_id} taskTitle={task.title}
                  onAssigned={profile => {
                    const updated: TaskWithProfile = { ...task, assigned_to_id: profile?.id ?? null, assigned_to: profile ?? null }
                    setTask(updated); onTaskUpdate?.(updated)
                  }}
                  onClose={() => setAssignOpen(false)}
                />
              )}
            </div>
          )}

          {/* Mark Complete */}
          {!complete && (
            <div onClick={e => e.stopPropagation()} className="flex-shrink-0">
              <button type="button" onClick={() => setModalOpen(true)}
                className="hidden md:block rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90"
                style={{ backgroundColor: overdue ? '#EF4444' : '#4A7C8C' }}>
                Mark Complete
              </button>
            </div>
          )}
        </div>

        {/* Expanded panel */}
        {expanded && (
          <div className="border-t px-4 pb-4 pt-3 space-y-4" style={{ borderColor: '#F1F5F9' }}>

            {/* Confirmation value (if complete) */}
            {complete && task.confirmation_value && (
              <div>
                <p className="text-xs font-medium mb-0.5" style={{ color: '#94A3B8' }}>Confirmation detail:</p>
                <p className="text-sm rounded-md px-3 py-2" style={{ backgroundColor: '#ECFDF5', color: '#065F46' }}>
                  {task.confirmation_value}
                </p>
              </div>
            )}

            {/* Notes */}
            <div>
              <p className="text-xs font-medium mb-1" style={{ color: '#94A3B8' }}>Notes</p>
              <div className="relative">
                <textarea
                  value={editNotes}
                  onChange={e => setEditNotes(e.target.value)}
                  onBlur={handleBlurNotes}
                  rows={2}
                  placeholder="Add notes…"
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none resize-none"
                  style={{ borderColor: '#E2E8F0', color: '#0F172A', backgroundColor: '#FAFAFA', lineHeight: 1.6 }}
                />
                {savingNotes && (
                  <span className="absolute bottom-2 right-2 text-xs" style={{ color: '#94A3B8' }}>Saving…</span>
                )}
              </div>
            </div>

            {/* Assignee */}
            {task.assigned_to && (
              <div>
                <p className="text-xs font-medium mb-1" style={{ color: '#94A3B8' }}>Assigned to</p>
                <AssigneeChip name={task.assigned_to.full_name} />
              </div>
            )}

            {/* Steps */}
            {funeralHomeId && (
              <div>
                <p className="text-xs font-medium mb-2" style={{ color: '#94A3B8' }}>Steps</p>
                <SubtasksPanel taskId={task.id} funeralHomeId={funeralHomeId} />
              </div>
            )}

            {/* Mobile mark complete */}
            {!complete && (
              <button type="button" onClick={() => setModalOpen(true)}
                className="md:hidden w-full rounded-lg py-2 text-xs font-semibold text-white transition hover:opacity-90"
                style={{ backgroundColor: overdue ? '#EF4444' : '#4A7C8C' }}>
                Mark Complete
              </button>
            )}
          </div>
        )}
      </div>

      <ConfirmTaskModal
        task={task}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={handleSuccess}
      />
    </>
  )
}

// ── Priority dot ──────────────────────────────────────────────────────────────

const PRIORITY_COLORS: Record<Priority, string> = {
  critical:      '#EF4444',
  standard:      '#F59E0B',
  informational: '#94A3B8',
}

function PriorityDot({ priority }: { priority: Priority }) {
  return (
    <span className="inline-block flex-shrink-0 rounded-full mt-1.5"
      style={{ width: 8, height: 8, backgroundColor: PRIORITY_COLORS[priority] ?? '#94A3B8' }}
      title={priority} />
  )
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function CheckCircleIcon({ color }: { color: string }) {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="9 12 11 14 15 10" /></svg>
}
function AlertCircleIcon({ color }: { color: string }) {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
}
function CircleIcon({ color }: { color: string }) {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"><circle cx="12" cy="12" r="10" /></svg>
}
function DotsIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="19" cy="12" r="1.5" /></svg>
}
function PencilIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
}
function PersonIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
}
function TrashIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>
}
