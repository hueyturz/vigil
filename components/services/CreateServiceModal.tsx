'use client'

import { useEffect, useState } from 'react'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { createService } from '@/app/services/actions'
import type { ServiceType } from '@/lib/types'

const CreateServiceSchema = z.object({
  family_name:   z.string().min(1, 'Family name is required.'),
  deceased_name: z.string().min(1, 'Deceased name is required.'),
  service_date:  z.string().min(1, 'Service date is required.'),
  location:      z.string().min(1, 'Location is required.'),
})

type FieldErrors = Partial<Record<keyof z.infer<typeof CreateServiceSchema>, string>>

// Task counts per service type — sourced from seed data, no DB call needed
const TASK_COUNTS: Record<ServiceType, number> = {
  'full-burial': 14,
  'graveside':   10,
  'cremation':   9,
  'military':    14,
}

const SERVICE_TYPE_OPTIONS: { value: ServiceType; label: string }[] = [
  { value: 'full-burial', label: 'Full Burial'     },
  { value: 'graveside',   label: 'Graveside'        },
  { value: 'cremation',   label: 'Cremation'        },
  { value: 'military',    label: 'Military Honors'  },
]

interface StaffOption {
  id: string
  full_name: string
}

interface CreateServiceModalProps {
  open: boolean
  onClose: () => void
}

export function CreateServiceModal({ open, onClose }: CreateServiceModalProps) {
  const [familyName,       setFamilyName]       = useState('')
  const [deceasedName,     setDeceasedName]      = useState('')
  const [serviceType,      setServiceType]       = useState<ServiceType>('full-burial')
  const [serviceDate,      setServiceDate]       = useState('')
  const [location,         setLocation]          = useState('')
  const [assignedStaffId,  setAssignedStaffId]   = useState('')
  const [staffOptions,     setStaffOptions]      = useState<StaffOption[]>([])
  const [loading,          setLoading]           = useState(false)
  const [error,            setError]             = useState<string | null>(null)
  const [fieldErrors,      setFieldErrors]       = useState<FieldErrors>({})

  const today = new Date().toISOString().split('T')[0]

  // Fetch staff list once when modal opens
  useEffect(() => {
    if (!open) return
    const supabase = createClient()
    supabase
      .from('profiles')
      .select('id, full_name')
      .eq('role', 'staff')
      .eq('is_active', true)
      .order('full_name')
      .then(({ data }) => setStaffOptions(data ?? []))
  }, [open])

  function reset() {
    setFamilyName('')
    setDeceasedName('')
    setServiceType('full-burial')
    setServiceDate('')
    setLocation('')
    setAssignedStaffId('')
    setError(null)
    setFieldErrors({})
  }

  function handleClose() {
    reset()
    onClose()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setFieldErrors({})

    const validation = CreateServiceSchema.safeParse({
      family_name:   familyName.trim(),
      deceased_name: deceasedName.trim(),
      service_date:  serviceDate,
      location:      location.trim(),
    })

    if (!validation.success) {
      const errs: FieldErrors = {}
      for (const issue of validation.error.errors) {
        const key = issue.path[0] as keyof FieldErrors
        if (!errs[key]) errs[key] = issue.message
      }
      setFieldErrors(errs)
      return
    }

    setLoading(true)

    const result = await createService({
      family_name:       familyName.trim(),
      deceased_name:     deceasedName.trim(),
      service_type:      serviceType,
      service_date:      serviceDate,
      location:          location.trim(),
      assigned_staff_id: assignedStaffId || null,
    })

    setLoading(false)

    if (result.error) {
      setError(result.error)
      return
    }

    handleClose()
  }

  if (!open) return null

  const taskCount = TASK_COUNTS[serviceType]

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(15,23,42,0.5)' }}
      onClick={e => { if (e.target === e.currentTarget) handleClose() }}
    >
      {/* Panel */}
      <div
        className="w-full max-w-lg rounded-2xl shadow-xl"
        style={{ backgroundColor: '#FFFFFF' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-5 border-b"
          style={{ borderColor: '#E2E8F0' }}
        >
          <h2 className="text-lg font-semibold" style={{ color: '#0F172A' }}>
            New Service
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <ModalField label="Family Name" required error={fieldErrors.family_name}>
            <input
              type="text"
              value={familyName}
              onChange={e => setFamilyName(e.target.value)}
              placeholder="Henderson"
              style={inputStyle}
            />
          </ModalField>

          <ModalField label="Deceased Full Name" required error={fieldErrors.deceased_name}>
            <input
              type="text"
              value={deceasedName}
              onChange={e => setDeceasedName(e.target.value)}
              placeholder="Robert J. Henderson"
              style={inputStyle}
            />
          </ModalField>

          <ModalField label="Service Type" required>
            <select
              required
              value={serviceType}
              onChange={e => setServiceType(e.target.value as ServiceType)}
              style={inputStyle}
            >
              {SERVICE_TYPE_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </ModalField>

          {/* Live task count preview */}
          <p className="text-xs -mt-1" style={{ color: '#0D6E68' }}>
            {taskCount} tasks will be auto-generated
          </p>

          <ModalField label="Service Date" required error={fieldErrors.service_date}>
            <input
              type="date"
              min={today}
              value={serviceDate}
              onChange={e => setServiceDate(e.target.value)}
              style={inputStyle}
            />
          </ModalField>

          <ModalField label="Location" required error={fieldErrors.location}>
            <input
              type="text"
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="Riverside Cemetery"
              style={inputStyle}
            />
          </ModalField>

          <ModalField label="Assign to Staff">
            <select
              value={assignedStaffId}
              onChange={e => setAssignedStaffId(e.target.value)}
              style={inputStyle}
            >
              <option value="">— Unassigned —</option>
              {staffOptions.map(s => (
                <option key={s.id} value={s.id}>{s.full_name}</option>
              ))}
            </select>
          </ModalField>

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
            className="flex justify-end gap-3 pt-2 border-t mt-2"
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
              disabled={loading}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
              style={{ backgroundColor: '#0D6E68' }}
            >
              {loading ? 'Creating…' : 'Create service'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ModalField({
  label,
  required,
  error,
  children,
}: {
  label: string
  required?: boolean
  error?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5" style={{ color: '#0F172A' }}>
        {label}
        {required && <span style={{ color: '#EF4444' }}> *</span>}
      </label>
      {children}
      {error && (
        <p className="mt-1 text-xs" style={{ color: '#EF4444' }}>{error}</p>
      )}
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
