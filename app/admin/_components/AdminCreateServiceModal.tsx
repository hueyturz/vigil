'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { createServiceForFuneralHome } from '@/app/admin/actions'

const SERVICE_TYPES = [
  { value: '',            label: 'No type (no tasks generated)' },
  { value: 'full-burial', label: 'Full Burial' },
  { value: 'graveside',   label: 'Graveside' },
  { value: 'cremation',   label: 'Cremation' },
  { value: 'military',    label: 'Military Honors' },
]

const inputStyle: React.CSSProperties = {
  width: '100%', borderRadius: 8, border: '1px solid #E2E8F0', padding: '8px 12px',
  fontSize: 14, color: '#0F172A', backgroundColor: '#FFFFFF', outline: 'none',
}

export function AdminCreateServiceModal({ funeralHomeId }: { funeralHomeId: string }) {
  const router = useRouter()
  const [open, setOpen]                 = useState(false)
  const [deceasedName, setDeceasedName] = useState('')
  const [familyName, setFamilyName]     = useState('')
  const [serviceType, setServiceType]   = useState('')
  const [serviceDate, setServiceDate]   = useState('')
  const [location, setLocation]         = useState('')
  const [busy, setBusy]                 = useState(false)

  function reset() {
    setDeceasedName(''); setFamilyName(''); setServiceType(''); setServiceDate(''); setLocation('')
  }

  async function submit() {
    setBusy(true)
    const r = await createServiceForFuneralHome(funeralHomeId, {
      family_name:   familyName,
      deceased_name: deceasedName,
      service_type:  serviceType || null,
      service_date:  serviceDate || null,
      location:      location || null,
    })
    setBusy(false)
    if (r.error) { toast.error(r.error); return }
    toast.success('Service created')
    reset(); setOpen(false); router.refresh()
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="rounded-lg px-3 py-1.5 text-sm font-semibold" style={{ backgroundColor: '#0A2540', color: '#F4C95D' }}>
        Create Service
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(15,23,42,0.5)' }} onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}>
          <div className="w-full max-w-md rounded-2xl p-6" style={{ backgroundColor: '#FFFFFF' }}>
            <h3 className="text-base font-semibold mb-4" style={{ color: '#0F172A' }}>Create service on behalf of this funeral home</h3>
            <div className="space-y-3">
              <input value={deceasedName} onChange={e => setDeceasedName(e.target.value)} placeholder="Deceased name *" style={inputStyle} />
              <input value={familyName} onChange={e => setFamilyName(e.target.value)} placeholder="Family name (optional)" style={inputStyle} />
              <select value={serviceType} onChange={e => setServiceType(e.target.value)} style={inputStyle}>
                {SERVICE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <input type="date" value={serviceDate} onChange={e => setServiceDate(e.target.value)} style={inputStyle} />
              <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Location (optional)" style={inputStyle} />
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg border px-3 py-2 text-sm font-medium" style={{ borderColor: '#E2E8F0', color: '#475569' }}>Cancel</button>
              <button type="button" onClick={submit} disabled={busy || !deceasedName.trim()} className="rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-50" style={{ backgroundColor: '#0A2540', color: '#F4C95D' }}>
                {busy ? 'Creating…' : 'Create service'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
