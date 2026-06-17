'use client'

import { useState } from 'react'
import { addTaskToService } from '@/app/services/task-actions'
import type { TaskWithProfile } from '@/lib/types'

export const TASK_CATEGORIES = [
  'Merchandise', 'Cemetery', 'Print', 'Communication',
  'Legal', 'Arrangements', 'Facility', 'Military', 'Other',
]

interface AddTaskModalProps {
  serviceId: string
  open: boolean
  onClose: () => void
  onAdded: (task: TaskWithProfile) => void
}

export function AddTaskModal({ serviceId, open, onClose, onAdded }: AddTaskModalProps) {
  const [title,            setTitle]            = useState('')
  const [category,         setCategory]         = useState(TASK_CATEGORIES[0])
  const [confirmationHint, setConfirmationHint] = useState('')
  const [daysBefore,       setDaysBefore]       = useState(1)
  const [loading,          setLoading]          = useState(false)
  const [error,            setError]            = useState<string | null>(null)

  function reset() {
    setTitle('')
    setCategory(TASK_CATEGORIES[0])
    setConfirmationHint('')
    setDaysBefore(1)
    setError(null)
  }

  function handleClose() {
    reset()
    onClose()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !confirmationHint.trim()) return
    setLoading(true)
    setError(null)

    const result = await addTaskToService(serviceId, {
      title:             title.trim(),
      category,
      confirmation_hint: confirmationHint.trim(),
      due_days_before:   daysBefore,
    })

    setLoading(false)

    if (result.error) {
      setError(result.error)
      return
    }

    reset()
    onAdded(result.data!)
    onClose()
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
          <h2 className="text-base font-semibold" style={{ color: '#0F172A' }}>Add Task</h2>
          <button
            onClick={handleClose}
            className="text-xl leading-none hover:opacity-60 transition"
            style={{ color: '#94A3B8' }}
            aria-label="Close"
          >×</button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: '#0F172A' }}>
              Task title <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Flowers ordered"
              style={inputStyle}
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: '#0F172A' }}>
              Category <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              style={inputStyle}
            >
              {TASK_CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Confirmation hint */}
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: '#0F172A' }}>
              Confirmation hint <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input
              type="text"
              required
              value={confirmationHint}
              onChange={e => setConfirmationHint(e.target.value)}
              placeholder="e.g. Vendor name & order number"
              style={inputStyle}
            />
            <p className="mt-1 text-xs" style={{ color: '#94A3B8' }}>
              Shown to staff when they confirm this task.
            </p>
          </div>

          {/* Days before */}
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: '#0F172A' }}>
              Due (days before service) <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input
              type="number"
              required
              min={0}
              max={60}
              value={daysBefore}
              onChange={e => setDaysBefore(Number(e.target.value))}
              style={inputStyle}
            />
          </div>

          {error && (
            <div
              className="rounded-lg border px-4 py-3 text-sm"
              style={{ backgroundColor: '#FEF2F2', borderColor: '#FECACA', color: '#991B1B' }}
            >
              {error}
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
              disabled={loading || !title.trim() || !confirmationHint.trim()}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: '#0D6E68' }}
            >
              {loading ? 'Adding…' : 'Add task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  borderRadius: 8,
  border: '1px solid #E2E8F0',
  padding: '10px 12px',
  fontSize: 14,
  color: '#0F172A',
  outline: 'none',
  backgroundColor: '#FFFFFF',
}
