'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateServiceStatus } from '@/app/services/actions'
import { logActivity } from '@/lib/utils/activity'

interface ServiceCompletionFlowProps {
  serviceId:     string
  funeralHomeId: string
  actorId:       string
  actorName:     string
  serviceStatus: 'active' | 'completed'
  canManage:     boolean
}

export function ServiceCompletionFlow({
  serviceId, funeralHomeId, actorId, actorName, serviceStatus, canManage,
}: ServiceCompletionFlowProps) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState<string | null>(null)

  if (!canManage) return null

  const isCompleted = serviceStatus === 'completed'

  async function handleConfirm() {
    setLoading(true); setError(null)
    const newStatus = isCompleted ? 'active' : 'completed'
    const result = await updateServiceStatus(serviceId, newStatus)
    setLoading(false)
    if (result.error) { setError(result.error); setConfirming(false); return }
    logActivity({
      funeral_home_id: funeralHomeId,
      service_id:      serviceId,
      actor_id:        actorId,
      actor_name:      actorName,
      action_type:     isCompleted ? 'service_reopened' : 'service_completed',
      description:     isCompleted ? 'Service reopened' : 'Service marked as complete',
    })
    setConfirming(false)
    router.refresh()
  }

  return (
    <>
      {/* Completed banner */}
      {isCompleted && (
        <div
          className="flex items-center gap-3 rounded-xl border px-5 py-4 mb-6"
          style={{ backgroundColor: '#F0FDFA', borderColor: '#99F6E4' }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="#4A7C8C" strokeWidth="2.5" width="18" height="18">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <p className="text-sm font-medium" style={{ color: '#4A7C8C' }}>
            This service has been marked complete.
          </p>
        </div>
      )}

      {/* Action button */}
      <div className="flex justify-end">
        {isCompleted ? (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="rounded-lg border px-4 py-2 text-sm font-medium transition hover:bg-gray-50"
            style={{ borderColor: '#E2E8F0', color: '#475569' }}
          >
            Reopen Service
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="w-full md:w-auto rounded-lg px-4 py-2.5 text-sm font-semibold transition hover:opacity-90"
            style={{ backgroundColor: '#0A2540', color: '#F4C95D' }}
          >
            Mark Service Complete
          </button>
        )}
      </div>

      {error && (
        <p className="text-xs text-right mt-2" style={{ color: '#EF4444' }}>{error}</p>
      )}

      {/* Confirmation modal */}
      {confirming && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(15,23,42,0.5)' }}
        >
          <div
            className="w-full max-w-sm rounded-2xl shadow-xl p-6"
            style={{ backgroundColor: '#FFFFFF' }}
          >
            <h2 className="text-base font-semibold mb-2" style={{ color: '#0F172A' }}>
              {isCompleted ? 'Reopen Service?' : 'Mark Service Complete?'}
            </h2>
            <p className="text-sm mb-6" style={{ color: '#475569' }}>
              {isCompleted
                ? 'This will move the service back to active. You can complete it again at any time.'
                : 'This will mark the service as complete and move it out of the active view. You can reopen it at any time.'}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                disabled={loading}
                className="rounded-lg border px-4 py-2 text-sm font-medium transition hover:bg-gray-50 disabled:opacity-60"
                style={{ borderColor: '#E2E8F0', color: '#475569' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={loading}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
                style={{ backgroundColor: isCompleted ? '#475569' : '#4A7C8C' }}
              >
                {loading ? 'Saving…' : isCompleted ? 'Yes, Reopen' : 'Yes, Complete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
