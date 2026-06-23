'use client'

import { useEffect, useState } from 'react'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import type { TaskWithProfile } from '@/lib/types'

const schema = z.object({
  confirmation_value: z
    .string()
    .min(10, 'Must be at least 10 characters.'),
})

interface ConfirmTaskModalProps {
  task: TaskWithProfile
  open: boolean
  onClose: () => void
  onSuccess: (updatedTask: TaskWithProfile) => void
}

export function ConfirmTaskModal({ task, open, onClose, onSuccess }: ConfirmTaskModalProps) {
  const [confirmationValue, setConfirmationValue] = useState('')
  const [currentUserName,   setCurrentUserName]   = useState('')
  const [validationError,   setValidationError]   = useState<string | null>(null)
  const [submitError,       setSubmitError]        = useState<string | null>(null)
  const [loading,           setLoading]            = useState(false)

  // Read current user's full name from session metadata (set at signup, no DB query needed)
  useEffect(() => {
    if (!open) return
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      const name = user?.user_metadata?.full_name as string | undefined
      if (name) setCurrentUserName(name)
    })
  }, [open])

  function reset() {
    setConfirmationValue('')
    setValidationError(null)
    setSubmitError(null)
  }

  function handleClose() {
    reset()
    onClose()
  }

  function handleChange(value: string) {
    setConfirmationValue(value)
    const result = schema.safeParse({ confirmation_value: value })
    setValidationError(result.success ? null : result.error.errors[0].message)
  }

  const isValid = schema.safeParse({ confirmation_value: confirmationValue }).success

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isValid) return

    setSubmitError(null)
    setLoading(true)

    try {
      const res = await fetch(`/api/tasks/${task.id}/complete`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ confirmation_value: confirmationValue }),
      })

      const json = await res.json()

      if (!res.ok) {
        setSubmitError(json.error ?? 'Something went wrong.')
        setLoading(false)
        return
      }

      // Merge completed_by into the returned task so TaskRow re-renders correctly
      const updated: TaskWithProfile = {
        ...json.task,
        completed_by: json.task.completed_by ?? null,
        assigned_to:  task.assigned_to,
      }

      reset()
      onSuccess(updated)
    } catch {
      setSubmitError('Network error — please try again.')
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center md:justify-center md:p-4"
      style={{ backgroundColor: 'rgba(15,23,42,0.5)' }}
      onClick={e => { if (e.target === e.currentTarget) handleClose() }}
    >
      <div
        className="w-full h-full md:h-auto md:max-w-md md:rounded-2xl shadow-xl flex flex-col overflow-hidden"
        style={{ backgroundColor: '#FFFFFF' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-5 border-b flex-shrink-0"
          style={{ borderColor: '#E2E8F0' }}
        >
          <h2 className="text-base font-semibold" style={{ color: '#0F172A' }}>
            Confirm Task
          </h2>
          <button
            onClick={handleClose}
            className="text-xl leading-none hover:opacity-60 transition"
            style={{ color: '#94A3B8' }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
          {/* Task title (read-only) */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: '#94A3B8' }}>
              Task
            </p>
            <p className="text-sm font-medium" style={{ color: '#0F172A' }}>{task.title}</p>
          </div>

          {/* Confirmed by (read-only) */}
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: '#0F172A' }}>
              Confirmed by
            </label>
            <input
              type="text"
              readOnly
              value={currentUserName}
              className="w-full rounded-lg border px-3 py-2.5 text-sm"
              style={{
                borderColor:     '#E2E8F0',
                color:           '#475569',
                backgroundColor: '#F7F8FA',
                cursor:          'default',
              }}
            />
          </div>

          {/* Confirmation detail */}
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: '#0F172A' }}>
              Confirmation details
              <span style={{ color: '#EF4444' }}> *</span>
            </label>
            <textarea
              required
              rows={3}
              value={confirmationValue}
              onChange={e => handleChange(e.target.value)}
              placeholder="Enter confirmation details…"
              className="w-full rounded-lg border px-3 py-2.5 text-sm resize-none outline-none"
              style={{
                borderColor:     validationError && confirmationValue ? '#FECACA' : '#E2E8F0',
                color:           '#0F172A',
                backgroundColor: '#FFFFFF',
              }}
            />
            {validationError && confirmationValue && (
              <p className="text-xs mt-1" style={{ color: '#EF4444' }}>
                {validationError}
              </p>
            )}
          </div>

          {submitError && (
            <div
              className="rounded-lg border px-4 py-3 text-sm"
              style={{ backgroundColor: '#FEF2F2', borderColor: '#FECACA', color: '#991B1B' }}
            >
              {submitError}
            </div>
          )}

          {/* Footer */}
          <div
            className="flex justify-end gap-3 pt-2 border-t"
            style={{ borderColor: '#E2E8F0' }}
          >
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg border px-4 py-2 text-sm font-medium transition hover:bg-gray-50"
              style={{ borderColor: '#E2E8F0', color: '#475569' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isValid || loading}
              className="rounded-lg px-4 py-2 text-sm font-semibold transition hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: '#0A2540', color: '#F4C95D' }}
            >
              {loading ? 'Saving…' : 'Confirm task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
