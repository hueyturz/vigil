'use client'

import { useState } from 'react'
import { CreateServiceModal } from './CreateServiceModal'

export function DashboardHeader() {
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#0F172A' }}>Dashboard</h1>
          <p className="text-sm mt-0.5" style={{ color: '#475569' }}>
            Active services across your funeral home
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
          style={{ backgroundColor: '#0D6E68' }}
        >
          + New Service
        </button>
      </div>

      <CreateServiceModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </>
  )
}
