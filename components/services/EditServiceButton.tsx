'use client'

import { useState } from 'react'
import { EditServiceModal } from './EditServiceModal'
import type { Service } from '@/lib/types'

type ServiceSlice = Pick<Service,
  'id' | 'family_name' | 'deceased_name' | 'service_type' | 'service_date' |
  'location' | 'assigned_staff_id' | 'contact_name' | 'contact_phone' | 'contact_email'
>

export function EditServiceButton({ service }: { service: ServiceSlice }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs font-medium hover:underline transition"
        style={{ color: '#94A3B8' }}
      >
        Edit Service
      </button>
      <EditServiceModal service={service} open={open} onClose={() => setOpen(false)} />
    </>
  )
}
