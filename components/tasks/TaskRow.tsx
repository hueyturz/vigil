'use client'

import { useState, useEffect, useRef } from 'react'
import { ConfirmTaskModal } from './ConfirmTaskModal'
import { formatDateTime } from '@/lib/utils/date-helpers'
import { isTaskOverdue } from '@/lib/utils/service-status'
import { deleteServiceTask, updateServiceTask, updateTaskNotes, reassignTask } from '@/app/services/task-actions'
import { logActivity } from '@/lib/utils/activity'
import type { Priority, TaskWithProfile, Profile } from '@/lib/types'

interface TaskRowProps {
  task:            TaskWithProfile
  serviceDate:     string
  serviceId?:      string
  funeralHomeId?:  string
  actorId?:        string
  actorName?:      string
  onTaskComplete?: (updated: TaskWithProfile) => void
  onTaskDelete?:   (taskId: string) => void
  onTaskUpdate?:   (updated: TaskWithProfile) => void
}

// ── Due-date urgency label ─────────────────────────────────────────────────────

function dueDateLabel(
  serviceDate: string,
  dueDaysBefore: number,
): { text: string; color: string } | null {
  if (!serviceDate) return null
  const today   = new Date(); today.setHours(0, 0, 0, 0)
  const svc     = new Date(serviceDate + 'T00:00:00')
  const due     = new Date(svc); due.setDate(svc.getDate() - dueDaysBefore)
  const diffMs  = due.getTime() - today.getTime()
  const days    = Math.round(diffMs / (1000 * 60 * 60 * 24))

  if (dueDaysBefore === 0) return { text: 'Due day of service', color: '#F59E0B' }
  if (days < 0)  return { text: `Overdue by ${Math.abs(days)} day${Math.abs(days) !== 1 ? 's' : ''}`, color: '#EF4444' }
  if (days === 0) return { text: 'Due today',     color: '#F59E0B' }
  if (days === 1) return { text: 'Due tomorrow',  color: '#F59E0B' }
  return { text: `Due in ${days} days`, color: '#94A3B8' }
}

// ── Assignee chip ─────────────────────────────────────────────────────────────

function AssigneeChip({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .map(w => w[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase()
  return (
    <span className="inline-flex items-center gap-1 text-xs mt-0.5">
      <span
        className="inline-flex items-center justify-center rounded-full text-white font-semibold flex-shrink-0"
        style={{ width: 16, height: 16, fontSize: 9, backgroundColor: '#0D6E68' }}
      >
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
    fetch('/api/profiles/active')
      .then(r => r.json())
      .then(d => setProfiles(d.profiles ?? []))
      .catch(() => {})
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
    <div
      ref={ref}
      className="absolute right-0 top-full mt-1 z-30 rounded-lg border shadow-lg py-1 min-w-[180px]"
      style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }}
    >
      <p className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide" style={{ color: '#94A3B8' }}>
        Assign to
      </p>
      <button
        type="button"
        disabled={saving}
        onClick={() => handleSelect(null)}
        className="flex items-center w-full px-3 py-2 text-sm text-left transition hover:bg-gray-50"
        style={{ color: currentAssignee ? '#EF4444' : '#94A3B8' }}
      >
        — Unassigned
      </button>
      {profiles.map(p => (
        <button
          key={p.id}
          type="button"
          disabled={saving}
          onClick={() => handleSelect(p)}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left transition hover:bg-gray-50"
          style={{ color: '#0F172A' }}
        >
          <span
            className="inline-flex items-center justify-center rounded-full text-white font-semibold flex-shrink-0"
            style={{ width: 20, height: 20, fontSize: 10, backgroundColor: '#0D6E68' }}
          >
            {p.full_name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
          </span>
          {p.full_name}
        </button>
      ))}
    </div>
  )
}

// ── TaskRow ───────────────────────────────────────────────────────────────────

export function TaskRow({
  task: initialTask,
  serviceDate,
  serviceId,
  funeralHomeId,
  actorId,
  actorName,
  onTaskComplete,
  onTaskDelete,
  onTaskUpdate,
}: TaskRowProps) {
  const [task,           setTask]           = useState<TaskWithProfile>(initialTask)
  const [modalOpen,      setModalOpen]      = useState(false)
  const [detailsOpen,    setDetailsOpen]    = useState(false)
  const [menuOpen,       setMenuOpen]       = useState(false)
  const [assignOpen,     setAssignOpen]     = useState(false)
  const [editMode,       setEditMode]       = useState(false)
  const [editTitle,      setEditTitle]      = useState(task.title)
  const [editHint,       setEditHint]       = useState(task.confirmation_hint)
  const [editNotesMode,  setEditNotesMode]  = useState(false)
  const [editNotes,      setEditNotes]      = useState(task.notes ?? '')
  const [confirmDel,     setConfirmDel]     = useState(false)
  const [saving,         setSaving]         = useState(false)
  const [savingNotes,    setSavingNotes]    = useState(false)
  const [deleting,       setDeleting]       = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const overdue  = isTaskOverdue(task, serviceDate)
  const complete = task.status === 'complete'

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
    if (!editTitle.trim() || !editHint.trim()) return
    setSaving(true)
    const result = await updateServiceTask(task.id, {
      title:             editTitle.trim(),
      confirmation_hint: editHint.trim(),
    })
    setSaving(false)
    if (result.error) return
    const updated: TaskWithProfile = { ...task, title: editTitle.trim(), confirmation_hint: editHint.trim() }
    setTask(updated)
    onTaskUpdate?.(updated)
    if (funeralHomeId && actorId && actorName) {
      logActivity({
        funeral_home_id: funeralHomeId,
        service_id:      serviceId,
        task_id:         task.id,
        actor_id:        actorId,
        actor_name:      actorName,
        action_type:     'task_edited',
        description:     `Task "${editTitle.trim()}" edited`,
      })
    }
    setEditMode(false)
  }

  async function handleSaveNotes() {
    setSavingNotes(true)
    const result = await updateTaskNotes(task.id, editNotes.trim() || null)
    setSavingNotes(false)
    if (result.error) return
    const updated: TaskWithProfile = { ...task, notes: editNotes.trim() || null }
    setTask(updated)
    onTaskUpdate?.(updated)
    setEditNotesMode(false)
  }

  async function handleDelete() {
    setDeleting(true)
    const result = await deleteServiceTask(task.id)
    setDeleting(false)
    if (!result.error) {
      if (funeralHomeId && actorId && actorName) {
        logActivity({
          funeral_home_id: funeralHomeId,
          service_id:      serviceId,
          task_id:         task.id,
          actor_id:        actorId,
          actor_name:      actorName,
          action_type:     'task_deleted',
          description:     `Task "${task.title}" deleted`,
        })
      }
      onTaskDelete?.(task.id)
    }
  }

  const urgency = complete ? null : dueDateLabel(serviceDate, task.due_days_before)

  // ── Edit notes mode ────────────────────────────────────────────────────────
  if (editNotesMode) {
    return (
      <div className="rounded-lg border p-4 space-y-3" style={{ backgroundColor: '#FAFAFA', borderColor: '#CBD5E1' }}>
        <p className="text-sm font-medium" style={{ color: '#0F172A' }}>{task.title}</p>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: '#475569' }}>Notes</label>
          <textarea
            autoFocus
            value={editNotes}
            onChange={e => setEditNotes(e.target.value)}
            rows={3}
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none resize-none"
            style={{ borderColor: '#E2E8F0', color: '#0F172A', backgroundColor: '#FFFFFF' }}
            placeholder="Add notes…"
          />
        </div>
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={() => { setEditNotesMode(false); setEditNotes(task.notes ?? '') }}
            className="rounded-lg border px-3 py-1.5 text-xs font-medium transition hover:bg-gray-50"
            style={{ borderColor: '#E2E8F0', color: '#475569' }}>
            Cancel
          </button>
          <button type="button" onClick={handleSaveNotes} disabled={savingNotes}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
            style={{ backgroundColor: '#0D6E68' }}>
            {savingNotes ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    )
  }

  // ── Edit mode ──────────────────────────────────────────────────────────────
  if (editMode) {
    return (
      <div className="rounded-lg border p-4 space-y-3" style={{ backgroundColor: '#FAFAFA', borderColor: '#CBD5E1' }}>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: '#475569' }}>Task title</label>
          <input autoFocus type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
            style={{ borderColor: '#E2E8F0', color: '#0F172A', backgroundColor: '#FFFFFF' }} />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: '#475569' }}>Confirmation hint</label>
          <input type="text" value={editHint} onChange={e => setEditHint(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
            style={{ borderColor: '#E2E8F0', color: '#0F172A', backgroundColor: '#FFFFFF' }} />
        </div>
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={() => { setEditMode(false); setEditTitle(task.title); setEditHint(task.confirmation_hint) }}
            className="rounded-lg border px-3 py-1.5 text-xs font-medium transition hover:bg-gray-50"
            style={{ borderColor: '#E2E8F0', color: '#475569' }}>
            Cancel
          </button>
          <button type="button" onClick={handleSave} disabled={saving || !editTitle.trim() || !editHint.trim()}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
            style={{ backgroundColor: '#0D6E68' }}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    )
  }

  // ── Delete confirmation ────────────────────────────────────────────────────
  if (confirmDel) {
    return (
      <div className="rounded-lg border p-4" style={{ backgroundColor: '#FEF2F2', borderColor: '#FECACA' }}>
        <p className="text-sm font-medium mb-3" style={{ color: '#991B1B' }}>
          Delete &ldquo;{task.title}&rdquo;? This cannot be undone.
        </p>
        <div className="flex gap-2">
          <button type="button" onClick={() => setConfirmDel(false)}
            className="rounded-lg border px-3 py-1.5 text-xs font-medium transition hover:bg-gray-50"
            style={{ borderColor: '#E2E8F0', color: '#475569' }}>
            Cancel
          </button>
          <button type="button" onClick={handleDelete} disabled={deleting}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
            style={{ backgroundColor: '#EF4444' }}>
            {deleting ? 'Deleting…' : 'Delete task'}
          </button>
        </div>
      </div>
    )
  }

  // ── Normal view ───────────────────────────────────────────────────────────
  return (
    <>
      <div
        className="flex items-start gap-3 rounded-lg border p-4"
        style={{
          backgroundColor: '#FFFFFF',
          borderColor: complete ? '#A7F3D0' : overdue ? '#FECACA' : '#E2E8F0',
        }}
      >
        {/* Status icon */}
        <div className="mt-0.5 flex-shrink-0">
          {complete ? (
            <CheckCircleIcon color="#10B981" />
          ) : overdue ? (
            <AlertCircleIcon color="#EF4444" />
          ) : (
            <CircleIcon color="#94A3B8" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-1.5 min-w-0">
              <PriorityDot priority={task.priority} />
              <div className="min-w-0">
                <p className="text-sm font-medium" style={{ color: '#0F172A' }}>{task.title}</p>
                {task.notes && (
                  <p className="text-xs italic mt-0.5" style={{ color: '#94A3B8' }}>{task.notes}</p>
                )}
                {task.assigned_to && (
                  <AssigneeChip name={task.assigned_to.full_name} />
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              {/* Three-dot menu — not-started tasks only */}
              {!complete && (
                <div className="relative" ref={menuRef}>
                  <button
                    type="button"
                    onClick={() => setMenuOpen(o => !o)}
                    className="flex items-center justify-center w-7 h-7 rounded-md transition hover:opacity-60"
                    style={{ color: '#94A3B8' }}
                    aria-label="Task options"
                  >
                    <DotsIcon />
                  </button>

                  {menuOpen && (
                    <div
                      className="absolute right-0 top-full mt-1 z-20 rounded-lg border shadow-lg py-1 min-w-[160px]"
                      style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }}
                    >
                      <button
                        type="button"
                        onClick={() => { setMenuOpen(false); setEditMode(true); setEditTitle(task.title); setEditHint(task.confirmation_hint) }}
                        className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-left transition hover:bg-gray-50"
                        style={{ color: '#0F172A' }}
                      >
                        <PencilIcon />
                        Edit task
                      </button>
                      <button
                        type="button"
                        onClick={() => { setMenuOpen(false); setEditNotesMode(true); setEditNotes(task.notes ?? '') }}
                        className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-left transition hover:bg-gray-50"
                        style={{ color: '#0F172A' }}
                      >
                        <NotesIcon />
                        Edit notes
                      </button>
                      <button
                        type="button"
                        onClick={() => { setMenuOpen(false); setAssignOpen(true) }}
                        className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-left transition hover:bg-gray-50"
                        style={{ color: '#0F172A' }}
                      >
                        <PersonIcon />
                        {task.assigned_to ? 'Reassign' : 'Assign'}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setMenuOpen(false); setConfirmDel(true) }}
                        className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-left transition hover:bg-red-50"
                        style={{ color: '#EF4444' }}
                      >
                        <TrashIcon />
                        Delete task
                      </button>
                    </div>
                  )}

                  {/* Assign dropdown — separate from menu */}
                  {assignOpen && funeralHomeId && actorId && actorName && (
                    <AssignDropdown
                      taskId={task.id}
                      funeralHomeId={funeralHomeId}
                      actorId={actorId}
                      actorName={actorName}
                      currentAssignee={task.assigned_to_id}
                      taskTitle={task.title}
                      onAssigned={profile => {
                        const updated: TaskWithProfile = {
                          ...task,
                          assigned_to_id: profile?.id ?? null,
                          assigned_to:    profile ?? null,
                        }
                        setTask(updated)
                        onTaskUpdate?.(updated)
                      }}
                      onClose={() => setAssignOpen(false)}
                    />
                  )}
                </div>
              )}

              {/* Mark Complete */}
              {!complete && (
                <button
                  type="button"
                  onClick={() => setModalOpen(true)}
                  className="hidden md:block rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90"
                  style={{ backgroundColor: overdue ? '#EF4444' : '#0D6E68' }}
                >
                  Mark Complete
                </button>
              )}
            </div>
          </div>

          {complete ? (
            <div className="mt-1 space-y-1">
              <p className="text-xs" style={{ color: '#065F46' }}>
                Confirmed by {task.completed_by?.full_name ?? 'unknown'}
                {task.completed_at && (
                  <span style={{ color: '#94A3B8' }}> · {formatDateTime(task.completed_at)}</span>
                )}
              </p>
              {task.confirmation_value && (
                <div>
                  <button type="button" onClick={() => setDetailsOpen(o => !o)}
                    className="text-xs font-medium hover:underline" style={{ color: '#0D6E68' }}>
                    {detailsOpen ? 'Hide details ▲' : 'Show details ▼'}
                  </button>
                  {detailsOpen && (
                    <p className="mt-1 text-xs rounded-md px-3 py-2"
                      style={{ backgroundColor: '#ECFDF5', color: '#065F46' }}>
                      {task.confirmation_value}
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="mt-1">
              {urgency && (
                <p className="text-xs font-medium" style={{ color: urgency.color }}>
                  {urgency.text}
                </p>
              )}
            </div>
          )}

          {!complete && (
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="mt-2 md:hidden w-full rounded-lg py-2 text-xs font-semibold text-white transition hover:opacity-90"
              style={{ backgroundColor: overdue ? '#EF4444' : '#0D6E68' }}
            >
              Mark Complete
            </button>
          )}
        </div>
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
    <span
      className="inline-block flex-shrink-0 rounded-full mt-1.5"
      style={{ width: 8, height: 8, backgroundColor: PRIORITY_COLORS[priority] ?? '#94A3B8' }}
      title={priority}
    />
  )
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function CheckCircleIcon({ color }: { color: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><polyline points="9 12 11 14 15 10" />
    </svg>
  )
}
function AlertCircleIcon({ color }: { color: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  )
}
function CircleIcon({ color }: { color: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
    </svg>
  )
}
function DotsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="5" cy="12" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="19" cy="12" r="1.5" />
    </svg>
  )
}
function PencilIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}
function NotesIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  )
}
function PersonIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  )
}
function TrashIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" /><path d="M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  )
}
