'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { updateService } from '@/app/services/actions'
import { createClient } from '@/lib/supabase/client'
import type { Service, ServiceType } from '@/lib/types'

const SERVICE_TYPE_OPTIONS: { value: ServiceType; label: string }[] = [
  { value: 'full-burial', label: 'Full Burial'    },
  { value: 'graveside',   label: 'Graveside Only'  },
  { value: 'cremation',   label: 'Cremation'       },
  { value: 'military',    label: 'Military Honors' },
]

interface StaffOption { id: string; full_name: string }

interface EditServiceModalProps {
  service: Pick<Service,
    'id' | 'family_name' | 'deceased_name' | 'service_type' | 'service_date' |
    'location' | 'assigned_staff_id'
  >
  open:    boolean
  onClose: () => void
}

export function EditServiceModal({ service, open, onClose }: EditServiceModalProps) {
  const router = useRouter()

  const [deceasedName,    setDeceasedName]     = useState(service.deceased_name)
  const [serviceType,     setServiceType]      = useState<ServiceType | ''>(service.service_type ?? '')
  const [serviceDate,     setServiceDate]      = useState(service.service_date ?? '')
  const [location,        setLocation]         = useState(service.location ?? '')
  const [assignedStaffId, setAssignedStaffId]  = useState(service.assigned_staff_id ?? '')
  const [staffOptions,    setStaffOptions]     = useState<StaffOption[]>([])
  const [loading,         setLoading]          = useState(false)
  const [error,           setError]            = useState<string | null>(null)
  const [mounted,         setMounted]          = useState(false)

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

  useEffect(() => {
    if (!open) return
    const supabase = createClient()
    supabase
      .from('profiles')
      .select('id, full_name')
      .eq('is_active', true)
      .in('role', ['owner', 'fd', 'staff'])
      .order('full_name')
      .then(({ data }) => setStaffOptions(data ?? []))
  }, [open])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!deceasedName.trim()) return
    setLoading(true); setError(null)

    const result = await updateService(service.id, {
      family_name:       deceasedName.trim(),
      deceased_name:     deceasedName.trim(),
      service_type:      serviceType ? (serviceType as ServiceType) : null,
      service_date:      serviceDate || null,
      location:          location.trim() || null,
      assigned_staff_id: assignedStaffId || null,
    })

    setLoading(false)
    if (result.error) { setError(result.error); return }
    toast.success('Service saved')
    router.refresh()
    onClose()
  }

  if (!open || !mounted) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 overflow-y-auto overflow-x-hidden bg-black/50"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="relative mx-auto my-8 w-full max-w-lg rounded-xl shadow-xl min-w-0 overflow-x-hidden"
        style={{ backgroundColor: '#FFFFFF' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b flex-shrink-0" style={{ borderColor: '#E2E8F0' }}>
          <h2 className="text-lg font-semibold" style={{ color: '#0F172A' }}>Edit Service</h2>
          <button onClick={onClose} className="text-xl leading-none hover:opacity-60 transition" style={{ color: '#94A3B8' }} aria-label="Close">×</button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <Field label="Deceased Name" required>
            <input type="text" required value={deceasedName} onChange={e => setDeceasedName(e.target.value)} style={inputStyle} />
          </Field>

          <Field label="Service Type">
            <select value={serviceType} onChange={e => setServiceType(e.target.value as ServiceType | '')} style={inputStyle}>
              <option value="">No type set</option>
              {SERVICE_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>

          <Field label="Service Date">
            <input type="date" value={serviceDate} onChange={e => setServiceDate(e.target.value)} style={inputStyle} />
          </Field>

          <Field label="Location">
            <input type="text" value={location} onChange={e => setLocation(e.target.value)} placeholder="To be determined" style={inputStyle} />
          </Field>

          <Field label="Assign to Staff">
            <select value={assignedStaffId} onChange={e => setAssignedStaffId(e.target.value)} style={inputStyle}>
              <option value="">— Unassigned —</option>
              {staffOptions.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
            </select>
          </Field>

          {error && (
            <div className="rounded-lg border px-4 py-3 text-sm" style={{ backgroundColor: '#FEF2F2', borderColor: '#FECACA', color: '#991B1B' }}>
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2 border-t" style={{ borderColor: '#E2E8F0' }}>
            <button type="button" onClick={onClose}
              className="rounded-lg border px-4 py-2 text-sm font-medium transition hover:bg-gray-50"
              style={{ borderColor: '#E2E8F0', color: '#475569' }}>
              Cancel
            </button>
            <button type="submit" disabled={loading || !deceasedName.trim()}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
              style={{ backgroundColor: '#0D6E68' }}>
              {loading ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5" style={{ color: '#0F172A' }}>
        {label}{required && <span style={{ color: '#EF4444' }}> *</span>}
      </label>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', borderRadius: 8, border: '1px solid #E2E8F0',
  padding: '10px 12px', fontSize: 14, color: '#0F172A', outline: 'none', backgroundColor: '#FFFFFF',
}
