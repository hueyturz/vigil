'use client'

import { useState } from 'react'
import { updateServiceNotes } from '@/app/services/actions'
import { logActivity } from '@/lib/utils/activity'

interface CaseNotesProps {
  serviceId:     string
  funeralHomeId: string
  actorId:       string
  actorName:     string
  initialNotes:  string | null
}

function relativeTime(date: Date): string {
  const diffSec = Math.round((Date.now() - date.getTime()) / 1000)
  if (diffSec < 10)  return 'just now'
  if (diffSec < 60)  return `${diffSec}s ago`
  const diffMin = Math.round(diffSec / 60)
  if (diffMin < 60)  return `${diffMin}m ago`
  const diffHr = Math.round(diffMin / 60)
  if (diffHr  < 24)  return `${diffHr}h ago`
  return `${Math.round(diffHr / 24)}d ago`
}

export function CaseNotes({ serviceId, funeralHomeId, actorId, actorName, initialNotes }: CaseNotesProps) {
  const [notes,     setNotes]     = useState(initialNotes ?? '')
  const [saving,    setSaving]    = useState(false)
  const [savedAt,   setSavedAt]   = useState<Date | null>(null)
  const [error,     setError]     = useState<string | null>(null)

  async function handleSave() {
    setSaving(true); setError(null)
    const result = await updateServiceNotes(serviceId, notes.trim() || null)
    setSaving(false)
    if (result.error) { setError(result.error); return }
    setSavedAt(new Date())
    logActivity({
      funeral_home_id: funeralHomeId,
      service_id:      serviceId,
      actor_id:        actorId,
      actor_name:      actorName,
      action_type:     'notes_updated',
      description:     'Case notes updated',
    })
  }

  return (
    <div
      className="rounded-xl border p-5"
      style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }}
    >
      <h2 className="text-sm font-semibold mb-3" style={{ color: '#0F172A' }}>Case Notes</h2>
      <textarea
        value={notes}
        onChange={e => setNotes(e.target.value)}
        rows={5}
        className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none resize-none"
        style={{ borderColor: '#E2E8F0', color: '#0F172A', backgroundColor: '#FAFAFA', lineHeight: 1.7 }}
        placeholder="Add internal notes about this case…"
      />
      {error && (
        <p className="text-xs mt-1" style={{ color: '#EF4444' }}>{error}</p>
      )}
      <div className="flex items-center justify-between mt-2">
        {savedAt ? (
          <p className="text-xs" style={{ color: '#94A3B8' }}>
            Last saved {relativeTime(savedAt)}
          </p>
        ) : <span />}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
          style={{ backgroundColor: '#0D6E68' }}
        >
          {saving ? 'Saving…' : 'Save Notes'}
        </button>
      </div>
    </div>
  )
}
