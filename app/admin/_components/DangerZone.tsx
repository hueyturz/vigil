'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { suspendFuneralHome, deleteFuneralHome } from '@/app/admin/actions'

type Mode = 'suspend' | 'delete' | null

export function DangerZone({ funeralHomeId, funeralHomeName }: { funeralHomeId: string; funeralHomeName: string }) {
  const [mode, setMode] = useState<Mode>(null)

  return (
    <>
      <button type="button" onClick={() => setMode('suspend')} className="rounded-lg border px-3 py-1.5 text-sm font-semibold transition hover:bg-amber-50" style={{ borderColor: '#F59E0B', color: '#B45309' }}>
        Suspend Account
      </button>
      <button type="button" onClick={() => setMode('delete')} className="rounded-lg border px-3 py-1.5 text-sm font-semibold transition hover:bg-red-50" style={{ borderColor: '#EF4444', color: '#991B1B' }}>
        Delete Account
      </button>

      {mode && (
        <ConfirmModal
          mode={mode}
          funeralHomeId={funeralHomeId}
          funeralHomeName={funeralHomeName}
          onClose={() => setMode(null)}
        />
      )}
    </>
  )
}

function ConfirmModal({
  mode, funeralHomeId, funeralHomeName, onClose,
}: {
  mode: 'suspend' | 'delete'; funeralHomeId: string; funeralHomeName: string; onClose: () => void
}) {
  const router = useRouter()
  const [typed, setTyped] = useState('')
  const [busy, setBusy]   = useState(false)
  const confirmed = typed.trim() === funeralHomeName
  const isDelete = mode === 'delete'

  async function run() {
    if (!confirmed) return
    setBusy(true)
    const r = isDelete ? await deleteFuneralHome(funeralHomeId) : await suspendFuneralHome(funeralHomeId)
    setBusy(false)
    if (r.error) { toast.error(r.error); return }
    toast.success(isDelete ? 'Funeral home deleted' : 'Funeral home suspended')
    if (isDelete) router.push('/admin/funeral-homes')
    else { onClose(); router.refresh() }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(15,23,42,0.5)' }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-md rounded-2xl p-6" style={{ backgroundColor: '#FFFFFF', borderTop: `4px solid ${isDelete ? '#EF4444' : '#F59E0B'}` }}>
        <h3 className="text-base font-semibold mb-2" style={{ color: '#0F172A' }}>
          {isDelete ? 'Delete' : 'Suspend'} {funeralHomeName}?
        </h3>
        <p className="text-sm mb-4" style={{ color: '#475569' }}>
          {isDelete
            ? 'This permanently deletes the funeral home, all its users, services, tasks, notes, and logs. This cannot be undone.'
            : 'This deactivates every user in this funeral home. They will be unable to sign in until reactivated.'}
        </p>
        <label className="block text-xs font-medium mb-1.5" style={{ color: '#475569' }}>
          Type <span className="font-bold" style={{ color: '#0F172A' }}>{funeralHomeName}</span> to confirm
        </label>
        <input
          value={typed}
          onChange={e => setTyped(e.target.value)}
          className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
          style={{ borderColor: '#E2E8F0', color: '#0F172A' }}
        />
        <div className="flex justify-end gap-2 mt-5">
          <button type="button" onClick={onClose} className="rounded-lg border px-3 py-2 text-sm font-medium" style={{ borderColor: '#E2E8F0', color: '#475569' }}>Cancel</button>
          <button
            type="button"
            onClick={run}
            disabled={!confirmed || busy}
            className="rounded-lg px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
            style={{ backgroundColor: isDelete ? '#EF4444' : '#F59E0B' }}
          >
            {busy ? 'Working…' : isDelete ? 'Delete permanently' : 'Suspend account'}
          </button>
        </div>
      </div>
    </div>
  )
}
