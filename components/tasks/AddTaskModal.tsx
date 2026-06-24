'use client'

import { useState, useEffect } from 'react'
import { addTaskToService } from '@/app/services/task-actions'
import { logActivity } from '@/lib/utils/activity'
import type { TaskWithProfile, Profile } from '@/lib/types'

export const TASK_CATEGORIES = [
  'Merchandise', 'Cemetery', 'Print', 'Communication',
  'Legal', 'Arrangements', 'Facility', 'Military', 'Other',
]

interface AddTaskModalProps {
  serviceId:      string
  funeralHomeId?: string
  actorId?:       string
  actorName?:     string
  open:           boolean
  onClose:        () => void
  onAdded:        (task: TaskWithProfile) => void
}

export function AddTaskModal({
  serviceId, funeralHomeId, actorId, actorName,
  open, onClose, onAdded,
}: AddTaskModalProps) {
  const [title,            setTitle]            = useState('')
  const [category,         setCategory]         = useState(TASK_CATEGORIES[0])
  const [confirmationHint, setConfirmationHint] = useState('')
  const [daysBefore,       setDaysBefore]       = useState('1')   // string while editing; parsed on submit
  const [assignedToId,     setAssignedToId]     = useState('')
  const [profiles,         setProfiles]         = useState<Pick<Profile, 'id' | 'full_name'>[]>([])
  const [loading,          setLoading]          = useState(false)
  const [error,            setError]            = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    fetch('/api/profiles/active')
      .then(r => r.json())
      .then(d => setProfiles(d.profiles ?? []))
      .catch(() => {})
  }, [open])

  function reset() {
    setTitle(''); setCategory(TASK_CATEGORIES[0])
    setConfirmationHint(''); setDaysBefore('1')
    setAssignedToId(''); setError(null)
  }

  function handleClose() { reset(); onClose() }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setLoading(true); setError(null)

    const parsed  = parseInt(daysBefore, 10)
    const dueDays = Number.isNaN(parsed) ? 0 : Math.min(60, Math.max(0, parsed))

    const result = await addTaskToService(serviceId, {
      title:             title.trim(),
      category,
      confirmation_hint: '',
      due_days_before:   dueDays,
      assigned_to_id:    assignedToId || null,
    })

    setLoading(false)

    if (result.error) { setError(result.error); return }

    if (funeralHomeId && actorId && actorName) {
      logActivity({
        funeral_home_id: funeralHomeId,
        service_id:      serviceId,
        task_id:         result.data?.id,
        actor_id:        actorId,
        actor_name:      actorName,
        action_type:     'task_added',
        description:     `Task "${title.trim()}" added`,
      })
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
        <div className="flex items-center justify-between px-6 py-5 border-b flex-shrink-0" style={{ borderColor: '#E2E8F0' }}>
          <h2 className="text-base font-semibold" style={{ color: '#0F172A' }}>Add Task</h2>
          <button onClick={handleClose} className="text-xl leading-none hover:opacity-60 transition" style={{ color: '#94A3B8' }} aria-label="Close">×</button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: '#0F172A' }}>
              Task title <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input type="text" required value={title} onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Flowers ordered" style={inputStyle} />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: '#0F172A' }}>
              Category <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <select value={category} onChange={e => setCategory(e.target.value)} style={inputStyle}>
              {TASK_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: '#0F172A' }}>
              Due (days before service) <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={daysBefore}
              onChange={e =>
                // strip non-digits and leading zeros; allow empty while editing
                setDaysBefore(e.target.value.replace(/\D/g, '').replace(/^0+(?=\d)/, ''))
              }
              onBlur={() => {
                const n = parseInt(daysBefore, 10)
                const v = Number.isNaN(n) ? 0 : Math.min(60, Math.max(0, n))
                setDaysBefore(String(v))
              }}
              style={inputStyle}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: '#0F172A' }}>Assign to</label>
            <select value={assignedToId} onChange={e => setAssignedToId(e.target.value)} style={inputStyle}>
              <option value="">— Unassigned —</option>
              {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
            </select>
          </div>

          {error && (
            <div className="rounded-lg border px-4 py-3 text-sm"
              style={{ backgroundColor: '#FEF2F2', borderColor: '#FECACA', color: '#991B1B' }}>
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2 border-t" style={{ borderColor: '#E2E8F0' }}>
            <button type="button" onClick={handleClose}
              className="rounded-lg border px-4 py-2 text-sm font-medium transition hover:bg-gray-50"
              style={{ borderColor: '#E2E8F0', color: '#475569' }}>
              Cancel
            </button>
            <button type="submit" disabled={loading || !title.trim()}
              className="rounded-lg px-4 py-2 text-sm font-semibold transition hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: '#0A2540', color: '#F4C95D' }}>
              {loading ? 'Adding…' : 'Add task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', borderRadius: 8, border: '1px solid #E2E8F0',
  padding: '10px 12px', fontSize: 14, color: '#0F172A', outline: 'none', backgroundColor: '#FFFFFF',
}
