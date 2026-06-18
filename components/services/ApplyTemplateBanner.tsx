'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { applyTemplateToService } from '@/app/services/actions'
import { AddTaskModal } from '@/components/tasks/AddTaskModal'
import type { ServiceType, TaskWithProfile } from '@/lib/types'

const SERVICE_TYPE_OPTIONS: { value: ServiceType; label: string }[] = [
  { value: 'full-burial', label: 'Full Burial'    },
  { value: 'graveside',   label: 'Graveside Only'  },
  { value: 'cremation',   label: 'Cremation'       },
  { value: 'military',    label: 'Military Honors' },
]

interface ApplyTemplateBannerProps {
  serviceId:     string
  funeralHomeId: string
  actorId:       string
  actorName:     string
}

export function ApplyTemplateBanner({ serviceId, funeralHomeId, actorId, actorName }: ApplyTemplateBannerProps) {
  const router = useRouter()
  const [selectedType, setSelectedType] = useState<ServiceType | ''>('')
  const [applying,     setApplying]     = useState(false)
  const [result,       setResult]       = useState<{ added: number; skipped: number } | null>(null)
  const [error,        setError]        = useState<string | null>(null)
  const [addOpen,      setAddOpen]      = useState(false)

  async function handleApply() {
    if (!selectedType) return
    setApplying(true)
    setError(null)
    setResult(null)

    const res = await applyTemplateToService(serviceId, selectedType as ServiceType)
    setApplying(false)

    if (res.error) {
      setError(res.error)
      return
    }

    setResult({ added: res.added, skipped: res.skipped })
    router.refresh()
  }

  function handleTaskAdded(_task: TaskWithProfile) {
    setAddOpen(false)
    router.refresh()
  }

  return (
    <>
      <div
        className="rounded-xl border px-5 py-4 mb-6"
        style={{ backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }}
      >
        <div className="flex items-start gap-3">
          <span className="text-lg flex-shrink-0 mt-0.5">📋</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold" style={{ color: '#92400E' }}>
              No template applied yet
            </p>
            <p className="text-xs mt-0.5 mb-3" style={{ color: '#B45309' }}>
              Select a service type to generate the task checklist for this arrangement.
            </p>

            <div className="flex flex-col sm:flex-row gap-2">
              <select
                value={selectedType}
                onChange={e => {
                  setSelectedType(e.target.value as ServiceType | '')
                  setResult(null)
                  setError(null)
                }}
                className="flex-1 rounded-lg border text-sm px-3 py-2 outline-none"
                style={{ borderColor: '#D97706', color: '#0F172A', backgroundColor: '#FFFFFF' }}
              >
                <option value="">Select service type…</option>
                {SERVICE_TYPE_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>

              <button
                type="button"
                onClick={handleApply}
                disabled={!selectedType || applying}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50 flex-shrink-0"
                style={{ backgroundColor: '#D97706' }}
              >
                {applying ? 'Applying…' : 'Apply Template'}
              </button>
            </div>

            {result && (
              <p className="mt-2 text-xs font-medium" style={{ color: '#15803D' }}>
                ✓ Added {result.added} task{result.added !== 1 ? 's' : ''}
                {result.skipped > 0 ? `, skipped ${result.skipped} (already existed)` : ''}
              </p>
            )}

            {error && (
              <p className="mt-2 text-xs font-medium" style={{ color: '#991B1B' }}>{error}</p>
            )}

            <div className="mt-3 pt-3 border-t" style={{ borderColor: '#FDE68A' }}>
              <button
                type="button"
                onClick={() => setAddOpen(true)}
                className="text-sm font-medium transition hover:opacity-70"
                style={{ color: '#92400E' }}
              >
                + Add task manually instead
              </button>
            </div>
          </div>
        </div>
      </div>

      <AddTaskModal
        serviceId={serviceId}
        funeralHomeId={funeralHomeId}
        actorId={actorId}
        actorName={actorName}
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdded={handleTaskAdded}
      />
    </>
  )
}
