'use client'

import { useState, useEffect, useRef } from 'react'
import { ConfirmTaskModal } from './ConfirmTaskModal'
import { formatDateTime } from '@/lib/utils/date-helpers'
import { isTaskOverdue } from '@/lib/utils/service-status'
import { deleteServiceTask, updateServiceTask } from '@/app/services/task-actions'
import type { TaskWithProfile } from '@/lib/types'

interface TaskRowProps {
  task: TaskWithProfile
  serviceDate: string
  onTaskComplete?: (updated: TaskWithProfile) => void
  onTaskDelete?: (taskId: string) => void
  onTaskUpdate?: (updated: TaskWithProfile) => void
}

export function TaskRow({
  task: initialTask,
  serviceDate,
  onTaskComplete,
  onTaskDelete,
  onTaskUpdate,
}: TaskRowProps) {
  const [task,        setTask]        = useState<TaskWithProfile>(initialTask)
  const [modalOpen,   setModalOpen]   = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [menuOpen,    setMenuOpen]    = useState(false)
  const [editMode,    setEditMode]    = useState(false)
  const [editTitle,   setEditTitle]   = useState(task.title)
  const [editHint,    setEditHint]    = useState(task.confirmation_hint)
  const [confirmDel,  setConfirmDel]  = useState(false)
  const [saving,      setSaving]      = useState(false)
  const [deleting,    setDeleting]    = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const overdue  = isTaskOverdue(task, serviceDate)
  const complete = task.status === 'complete'

  // Close dropdown on outside click
  useEffect(() => {
    if (!menuOpen) return
    function handleOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
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
    setEditMode(false)
  }

  async function handleDelete() {
    setDeleting(true)
    const result = await deleteServiceTask(task.id)
    setDeleting(false)
    if (!result.error) onTaskDelete?.(task.id)
  }

  // ── Edit mode ──────────────────────────────────────────────────────────────
  if (editMode) {
    return (
      <div
        className="rounded-lg border p-4 space-y-3"
        style={{ backgroundColor: '#FAFAFA', borderColor: '#CBD5E1' }}
      >
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: '#475569' }}>Task title</label>
          <input
            type="text"
            autoFocus
            value={editTitle}
            onChange={e => setEditTitle(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
            style={{ borderColor: '#E2E8F0', color: '#0F172A', backgroundColor: '#FFFFFF' }}
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: '#475569' }}>Confirmation hint</label>
          <input
            type="text"
            value={editHint}
            onChange={e => setEditHint(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
            style={{ borderColor: '#E2E8F0', color: '#0F172A', backgroundColor: '#FFFFFF' }}
          />
        </div>
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={() => { setEditMode(false); setEditTitle(task.title); setEditHint(task.confirmation_hint) }}
            className="rounded-lg border px-3 py-1.5 text-xs font-medium transition hover:bg-gray-50"
            style={{ borderColor: '#E2E8F0', color: '#475569' }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !editTitle.trim() || !editHint.trim()}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
            style={{ backgroundColor: '#0D6E68' }}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    )
  }

  // ── Delete confirmation ────────────────────────────────────────────────────
  if (confirmDel) {
    return (
      <div
        className="rounded-lg border p-4"
        style={{ backgroundColor: '#FEF2F2', borderColor: '#FECACA' }}
      >
        <p className="text-sm font-medium mb-3" style={{ color: '#991B1B' }}>
          Delete &ldquo;{task.title}&rdquo;? This cannot be undone.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setConfirmDel(false)}
            className="rounded-lg border px-3 py-1.5 text-xs font-medium transition hover:bg-gray-50"
            style={{ borderColor: '#E2E8F0', color: '#475569' }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
            style={{ backgroundColor: '#EF4444' }}
          >
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
            <p className="text-sm font-medium" style={{ color: '#0F172A' }}>{task.title}</p>

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
                      className="absolute right-0 top-full mt-1 z-20 rounded-lg border shadow-lg py-1 min-w-[140px]"
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
                        onClick={() => { setMenuOpen(false); setConfirmDel(true) }}
                        className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-left transition hover:bg-red-50"
                        style={{ color: '#EF4444' }}
                      >
                        <TrashIcon />
                        Delete task
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Mark Complete — inline on md+ */}
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
                  <button
                    type="button"
                    onClick={() => setDetailsOpen(o => !o)}
                    className="text-xs font-medium hover:underline"
                    style={{ color: '#0D6E68' }}
                  >
                    {detailsOpen ? 'Hide details ▲' : 'Show details ▼'}
                  </button>
                  {detailsOpen && (
                    <p
                      className="mt-1 text-xs rounded-md px-3 py-2"
                      style={{ backgroundColor: '#ECFDF5', color: '#065F46' }}
                    >
                      {task.confirmation_value}
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="mt-1">
              {overdue && (
                <p className="text-xs font-medium" style={{ color: '#EF4444' }}>
                  Overdue — needs immediate confirmation
                </p>
              )}
              <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>
                due {task.due_days_before}d before service
              </p>
            </div>
          )}

          {/* Mark Complete — full-width below content on mobile */}
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

// ── Icons ─────────────────────────────────────────────────────────────────────

function CheckCircleIcon({ color }: { color: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  )
}

function AlertCircleIcon({ color }: { color: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
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
      <circle cx="5" cy="12" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="19" cy="12" r="1.5" />
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

function TrashIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  )
}
