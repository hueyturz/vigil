'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { addServiceNote, deleteServiceNote } from '@/app/services/actions'
import { logActivity } from '@/lib/utils/activity'
import { NoteRecorder } from '@/components/intake/NoteRecorder'
import type { ServiceNote } from '@/lib/types'

interface CaseNotesProps {
  serviceId:     string
  funeralHomeId: string
  actorId:       string
  actorName:     string
  initialNotes:  ServiceNote[]
}

function formatNoteDate(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month:  'short',
    day:    'numeric',
    year:   'numeric',
    hour:   'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

export function CaseNotes({ serviceId, funeralHomeId, actorId, actorName, initialNotes }: CaseNotesProps) {
  // Newest first for display.
  const [notes,  setNotes]  = useState<ServiceNote[]>(
    [...initialNotes].sort((a, b) => b.created_at.localeCompare(a.created_at)),
  )
  const [draft,  setDraft]  = useState('')
  const [saving, setSaving] = useState(false)

  function prependNote(note: ServiceNote) {
    setNotes(prev => [note, ...prev])
    logActivity({
      funeral_home_id: funeralHomeId,
      service_id:      serviceId,
      actor_id:        actorId,
      actor_name:      actorName,
      action_type:     'notes_updated',
      description:     'Case note added',
    })
  }

  async function handleAdd() {
    const content = draft.trim()
    if (!content || saving) return
    setSaving(true)
    const result = await addServiceNote(serviceId, content)
    setSaving(false)
    if (result.error || !result.data) { toast.error(result.error || 'Failed to add note.'); return }
    prependNote(result.data)
    setDraft('')
    toast.success('Note added')
  }

  async function handleDelete(noteId: string) {
    const prev = notes
    setNotes(prevNotes => prevNotes.filter(n => n.id !== noteId))   // optimistic
    const result = await deleteServiceNote(noteId)
    if (result.error) { setNotes(prev); toast.error(result.error) }
  }

  return (
    <div className="space-y-4">
      {/* Voice note */}
      <NoteRecorder serviceId={serviceId} onSaved={prependNote} />

      {/* Manual composer */}
      <div className="rounded-xl border p-4" style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }}>
        <textarea
          value={draft}
          onChange={e => setDraft(e.target.value)}
          rows={3}
          className="w-full rounded-lg border px-3 py-2.5 text-sm outline-none resize-none"
          style={{ borderColor: '#E2E8F0', color: '#0F172A', backgroundColor: '#FAFAFA', lineHeight: 1.7 }}
          placeholder="Add an internal note about this case…"
        />
        <div className="flex justify-end mt-2">
          <button
            type="button"
            onClick={handleAdd}
            disabled={saving || !draft.trim()}
            className="rounded-lg px-4 py-2 text-sm font-semibold transition hover:opacity-90 disabled:opacity-60"
            style={{ backgroundColor: '#0A2540', color: '#F4C95D' }}
          >
            {saving ? 'Adding…' : 'Add Note'}
          </button>
        </div>
      </div>

      {/* Notes list */}
      {notes.length === 0 ? (
        <p className="text-sm text-center py-8" style={{ color: '#94A3B8' }}>
          No notes yet. Record or type one above.
        </p>
      ) : (
        <div className="space-y-3">
          {notes.map(note => (
            <div
              key={note.id}
              className="rounded-xl border p-4 group"
              style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm whitespace-pre-wrap flex-1 min-w-0" style={{ color: '#0F172A', lineHeight: 1.6 }}>
                  {note.content}
                </p>
                <button
                  type="button"
                  onClick={() => handleDelete(note.id)}
                  aria-label="Delete note"
                  className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition"
                  style={{ color: '#EF4444' }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    <path d="M10 11v6M14 11v6" />
                  </svg>
                </button>
              </div>
              <p className="text-xs mt-2" style={{ color: '#94A3B8' }}>
                {note.author_name} · {formatNoteDate(note.created_at)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
