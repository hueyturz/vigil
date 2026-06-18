'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { createService } from '@/app/services/actions'
import type { ServiceType } from '@/lib/types'

const CreateServiceSchema = z.object({
  family_name:   z.string().min(1, 'Family name is required.'),
  deceased_name: z.string().min(1, 'Deceased name is required.'),
})

type FieldErrors = Partial<Record<'family_name' | 'deceased_name', string>>

const TASK_COUNTS: Record<ServiceType, number> = {
  'full-burial': 14,
  'graveside':   10,
  'cremation':   9,
  'military':    14,
}

const SERVICE_TYPE_OPTIONS: { value: ServiceType; label: string }[] = [
  { value: 'full-burial', label: 'Full Burial'    },
  { value: 'graveside',   label: 'Graveside Only'  },
  { value: 'cremation',   label: 'Cremation'       },
  { value: 'military',    label: 'Military Honors' },
]

interface StaffOption { id: string; full_name: string }
interface CreateServiceModalProps { open: boolean; onClose: () => void }

export function CreateServiceModal({ open, onClose }: CreateServiceModalProps) {
  const [familyName,      setFamilyName]      = useState('')
  const [deceasedName,    setDeceasedName]     = useState('')
  const [serviceType,     setServiceType]      = useState<ServiceType | ''>('')
  const [serviceDate,     setServiceDate]      = useState('')
  const [location,        setLocation]         = useState('')
  const [assignedStaffId, setAssignedStaffId]  = useState('')
  const [contactName,     setContactName]      = useState('')
  const [contactPhone,    setContactPhone]     = useState('')
  const [contactEmail,    setContactEmail]     = useState('')
  const [staffOptions,    setStaffOptions]     = useState<StaffOption[]>([])
  const [loading,         setLoading]          = useState(false)
  const [error,           setError]            = useState<string | null>(null)
  const [fieldErrors,     setFieldErrors]      = useState<FieldErrors>({})
  const [mounted,         setMounted]          = useState(false)

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
    setServiceType('')
    setServiceDate('')
    setLocation('')
    setAssignedStaffId('')
    setContactName('')
    setContactPhone('')
    setContactEmail('')
    setError(null)
    setFieldErrors({})
  }

  function handleClose() { reset(); onClose() }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setFieldErrors({})

    const validation = CreateServiceSchema.safeParse({
      family_name:   familyName.trim(),
      deceased_name: deceasedName.trim(),
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
      service_type:      serviceType ? (serviceType as ServiceType) : null,
      service_date:      serviceDate || null,
      location:          location.trim() || null,
      assigned_staff_id: assignedStaffId || null,
      contact_name:      contactName.trim()  || null,
      contact_phone:     contactPhone.trim() || null,
      contact_email:     contactEmail.trim() || null,
    })
    setLoading(false)

    if (result.error) { setError(result.error); return }
    handleClose()
  }

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    const scrollY = window.scrollY
    document.body.style.position = 'fixed'
    document.body.style.top = `-${scrollY}px`
    document.body.style.width = '100%'
    return () => {
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.width = ''
      window.scrollTo(0, scrollY)
    }
  }, [])

  if (!open || !mounted) return null

  const taskCount = serviceType ? TASK_COUNTS[serviceType as ServiceType] : null

  return createPortal(
    <div
      className="fixed inset-0 z-50 overflow-y-auto overflow-x-hidden bg-black/50"
      onClick={e => { if (e.target === e.currentTarget) handleClose() }}
    >
      <div
        className="relative mx-auto my-8 w-full max-w-lg rounded-xl shadow-xl"
        style={{ backgroundColor: '#FFFFFF' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-5 border-b flex-shrink-0"
          style={{ borderColor: '#E2E8F0' }}
        >
          <h2 className="text-lg font-semibold" style={{ color: '#0F172A' }}>New Service</h2>
          <button
            onClick={handleClose}
            className="text-xl leading-none hover:opacity-60 transition"
            style={{ color: '#94A3B8' }}
            aria-label="Close"
          >×</button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
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

          <ModalField label="Service Type">
            <select
              value={serviceType}
              onChange={e => setServiceType(e.target.value as ServiceType | '')}
              style={inputStyle}
            >
              <option value="">Select service type (optional)</option>
              {SERVICE_TYPE_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </ModalField>

          {/* Task count preview */}
          <p className="text-xs -mt-1" style={{ color: taskCount ? '#0D6E68' : '#94A3B8' }}>
            {taskCount
              ? `${taskCount} tasks will be auto-generated`
              : 'Select a service type to preview tasks'}
          </p>

          <ModalField label="Service Date">
            <input
              type="date"
              value={serviceDate}
              onChange={e => setServiceDate(e.target.value)}
              placeholder="To be determined"
              style={inputStyle}
            />
          </ModalField>

          <ModalField label="Location">
            <input
              type="text"
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="To be determined"
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

          <div className="pt-2 border-t" style={{ borderColor: '#F1F5F9' }}>
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#94A3B8' }}>
              Family Contact (optional)
            </p>
            <div className="space-y-3">
              <ModalField label="Contact Name">
                <input
                  type="text"
                  value={contactName}
                  onChange={e => setContactName(e.target.value)}
                  placeholder="Primary contact name"
                  style={inputStyle}
                />
              </ModalField>
              <ModalField label="Phone">
                <input
                  type="tel"
                  value={contactPhone}
                  onChange={e => setContactPhone(e.target.value)}
                  placeholder="e.g. (555) 123-4567"
                  style={inputStyle}
                />
              </ModalField>
              <ModalField label="Email">
                <input
                  type="email"
                  value={contactEmail}
                  onChange={e => setContactEmail(e.target.value)}
                  placeholder="contact@example.com"
                  style={inputStyle}
                />
              </ModalField>
            </div>
          </div>

          {error && (
            <div
              className="rounded-lg border px-4 py-3 text-sm"
              style={{ backgroundColor: '#FEF2F2', borderColor: '#FECACA', color: '#991B1B' }}
            >
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2 border-t mt-2" style={{ borderColor: '#E2E8F0' }}>
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
              {loading
                ? 'Creating…'
                : serviceType
                  ? 'Create Service & Generate Tasks'
                  : 'Create Service'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}

function ModalField({
  label, required, error, children,
}: {
  label: string; required?: boolean; error?: string; children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5" style={{ color: '#0F172A' }}>
        {label}
        {required && <span style={{ color: '#EF4444' }}> *</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs" style={{ color: '#EF4444' }}>{error}</p>}
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
