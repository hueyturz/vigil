'use client'

import { useState } from 'react'
import { ConfirmTaskModal } from './ConfirmTaskModal'
import { formatDateTime } from '@/lib/utils/date-helpers'
import { isTaskOverdue } from '@/lib/utils/service-status'
import type { TaskWithProfile } from '@/lib/types'

interface TaskRowProps {
  task: TaskWithProfile
  serviceDate: string
  onTaskComplete?: (updated: TaskWithProfile) => void
}

export function TaskRow({ task: initialTask, serviceDate, onTaskComplete }: TaskRowProps) {
  const [task,        setTask]        = useState<TaskWithProfile>(initialTask)
  const [modalOpen,   setModalOpen]   = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)

  const overdue  = isTaskOverdue(task, serviceDate)
  const complete = task.status === 'complete'

  function handleSuccess(updatedTask: TaskWithProfile) {
    setTask(updatedTask)
    setModalOpen(false)
    onTaskComplete?.(updatedTask)
  }

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
          <p className="text-sm font-medium" style={{ color: '#0F172A' }}>{task.title}</p>

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
        </div>

        {/* Mark Complete button */}
        {!complete && (
          <button
            onClick={() => setModalOpen(true)}
            className="flex-shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90"
            style={{ backgroundColor: overdue ? '#EF4444' : '#0D6E68' }}
          >
            Mark Complete
          </button>
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

// ── Inline SVG icons ──────────────────────────────────────────────────────────

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
