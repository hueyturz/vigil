'use client'

import { useState, useRef, useEffect } from 'react'
import type { ExtractionData, Priority } from '@/lib/types'

interface ExtractionResultsProps {
  extraction:        ExtractionData
  durationSeconds:   number | null
  serviceId?:        string
  intakeSessionId?:  string
  onDone?:           () => void
}

interface ConfirmReview {
  taskTitle:       string
  notes:           string
  accepted:        boolean
  anxietyFlag:     boolean
  confidenceScore: number
}

interface NewTaskReview {
  title:             string
  category:          string
  confirmation_hint: string
  due_days_before:   number
  priority:          Priority
  notes:             string
  accepted:          boolean
  anxietyFlag:       boolean
  confidenceScore:   number
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return ''
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function ExtractionResults({
  extraction,
  durationSeconds,
  serviceId,
  intakeSessionId,
  onDone,
}: ExtractionResultsProps) {
  const readOnly = !serviceId || !intakeSessionId

  const [confirmations, setConfirmations] = useState<ConfirmReview[]>(() =>
    (extraction.task_confirmations ?? []).map(c => ({
      taskTitle:       c.task_title,
      notes:           c.confirmation_value ?? '',
      accepted:        true,
      anxietyFlag:     c.anxiety_flag,
      confidenceScore: c.confidence_score,
    }))
  )

  const [newTasks, setNewTasks] = useState<NewTaskReview[]>(() =>
    (extraction.new_tasks ?? []).map(t => ({
      title:             t.title,
      category:          t.category,
      confirmation_hint: t.confirmation_hint,
      due_days_before:   t.due_days_before,
      priority:          t.priority as Priority,
      notes:             t.extracted_detail ?? '',
      accepted:          true,
      anxietyFlag:       t.anxiety_flag,
      confidenceScore:   t.confidence_score,
    }))
  )

  const [saving,  setSaving]  = useState(false)
  const [saveErr, setSaveErr] = useState<string | null>(null)

  const meta  = extraction.case_metadata
  const notes = extraction.service_notes ?? []

  function toggleConfirmation(i: number) {
    setConfirmations(prev => {
      const next = [...prev]
      next[i] = { ...next[i], accepted: !next[i].accepted }
      return next
    })
  }

  function updateConfirmationNotes(i: number, value: string) {
    setConfirmations(prev => {
      const next = [...prev]
      next[i] = { ...next[i], notes: value }
      return next
    })
  }

  function toggleNewTask(i: number) {
    setNewTasks(prev => {
      const next = [...prev]
      next[i] = { ...next[i], accepted: !next[i].accepted }
      return next
    })
  }

  function updateNewTaskNotes(i: number, value: string) {
    setNewTasks(prev => {
      const next = [...prev]
      next[i] = { ...next[i], notes: value }
      return next
    })
  }

  function updateNewTaskPriority(i: number, value: Priority) {
    setNewTasks(prev => {
      const next = [...prev]
      next[i] = { ...next[i], priority: value }
      return next
    })
  }

  async function handleSave() {
    if (!serviceId || !intakeSessionId) return
    setSaving(true)
    setSaveErr(null)

    const payload = {
      intake_session_id: intakeSessionId,
      service_id:        serviceId,
      confirmations: confirmations
        .filter(c => c.accepted)
        .map(c => ({ task_title: c.taskTitle, notes: c.notes })),
      new_tasks: newTasks
        .filter(t => t.accepted)
        .map(t => ({
          title:             t.title,
          category:          t.category,
          confirmation_hint: t.confirmation_hint,
          due_days_before:   t.due_days_before,
          priority:          t.priority,
          notes:             t.notes,
        })),
      service_notes: extraction.service_notes ?? [],
    }

    try {
      const res = await fetch('/api/intake/save', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        setSaveErr(data.error ?? 'Save failed. Please try again.')
        setSaving(false)
        return
      }
    } catch {
      setSaveErr('Network error. Please try again.')
      setSaving(false)
      return
    }

    setSaving(false)
    onDone?.()
  }

  const hasContent = confirmations.length || newTasks.length || notes.length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold" style={{ color: '#0F172A' }}>Meeting Summary</h2>
        {durationSeconds != null && (
          <p className="text-sm mt-0.5" style={{ color: '#64748B' }}>
            Recording duration: {formatDuration(durationSeconds)}
          </p>
        )}
        {meta?.decedent_name && (
          <p className="text-sm mt-1" style={{ color: '#64748B' }}>
            Decedent: <span className="font-medium" style={{ color: '#0F172A' }}>{meta.decedent_name}</span>
          </p>
        )}
      </div>

      {!hasContent && (
        <div
          className="rounded-lg border px-4 py-8 text-center text-sm"
          style={{ borderColor: '#E2E8F0', color: '#94A3B8' }}
        >
          No actionable items were extracted from this recording.
        </div>
      )}

      {/* Task confirmations (updates to existing tasks) */}
      {confirmations.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold mb-3" style={{ color: '#475569' }}>
            Existing Tasks — {confirmations.length}
          </h3>
          <div className="space-y-3">
            {confirmations.map((c, i) => (
              <ReviewCard
                key={c.taskTitle}
                title={c.taskTitle}
                badge="Updates existing task"
                badgeColor="#4A7C8C"
                badgeBg="#F0FDFA"
                notes={c.notes}
                accepted={c.accepted}
                anxietyFlag={c.anxietyFlag}
                confidenceScore={c.confidenceScore}
                readOnly={readOnly}
                onToggle={() => toggleConfirmation(i)}
                onNotesChange={v => updateConfirmationNotes(i, v)}
              />
            ))}
          </div>
        </section>
      )}

      {/* New tasks */}
      {newTasks.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold mb-3" style={{ color: '#475569' }}>
            New Tasks — {newTasks.length}
          </h3>
          <div className="space-y-3">
            {newTasks.map((t, i) => (
              <ReviewCard
                key={t.title}
                title={t.title}
                badge="New task"
                badgeColor="#166534"
                badgeBg="#F0FDF4"
                notes={t.notes}
                accepted={t.accepted}
                anxietyFlag={t.anxietyFlag}
                confidenceScore={t.confidenceScore}
                readOnly={readOnly}
                onToggle={() => toggleNewTask(i)}
                onNotesChange={v => updateNewTaskNotes(i, v)}
                priority={t.priority}
                onPriorityChange={readOnly ? undefined : v => updateNewTaskPriority(i, v)}
                meta={`${t.category} · due ${t.due_days_before}d before service`}
              />
            ))}
          </div>
        </section>
      )}

      {/* Service notes (read-only) */}
      {notes.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold mb-3" style={{ color: '#475569' }}>
            Family Notes — {notes.length}
          </h3>
          <div className="space-y-2">
            {notes.map((n) => (
              <div
                key={n.note}
                className="rounded-lg border px-4 py-3"
                style={{ backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' }}
              >
                <p className="text-sm" style={{ color: '#0F172A' }}>{n.note}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Save error */}
      {saveErr && (
        <div
          className="rounded-lg border px-4 py-3 text-sm"
          style={{ backgroundColor: '#FEF2F2', borderColor: '#FECACA', color: '#991B1B' }}
        >
          {saveErr}
        </div>
      )}

      {/* Actions */}
      {!readOnly && (
        <div className="flex flex-col gap-2 pt-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="w-full rounded-xl py-3 text-sm font-semibold transition hover:opacity-90 disabled:opacity-60"
            style={{ backgroundColor: '#0A2540', color: '#F4C95D' }}
          >
            {saving ? 'Saving…' : 'Save to Service'}
          </button>
          <button
            type="button"
            onClick={onDone}
            disabled={saving}
            className="w-full rounded-xl py-3 text-sm font-semibold transition hover:opacity-70"
            style={{ color: '#94A3B8' }}
          >
            Discard All
          </button>
        </div>
      )}

      {readOnly && onDone && (
        <button
          type="button"
          onClick={onDone}
          className="w-full rounded-lg py-2.5 text-sm font-semibold transition hover:opacity-90"
          style={{ backgroundColor: '#0A2540', color: '#F4C95D' }}
        >
          Done
        </button>
      )}
    </div>
  )
}

// ── ReviewCard ────────────────────────────────────────────────────────────────

interface ReviewCardProps {
  title:            string
  badge:            string
  badgeColor:       string
  badgeBg:          string
  notes:            string
  accepted:         boolean
  anxietyFlag:      boolean
  confidenceScore:  number
  readOnly:         boolean
  onToggle:         () => void
  onNotesChange:    (v: string) => void
  priority?:        Priority
  onPriorityChange?: (v: Priority) => void
  meta?:            string
}

function ReviewCard({
  title, badge, badgeColor, badgeBg, notes, accepted,
  anxietyFlag, confidenceScore, readOnly,
  onToggle, onNotesChange,
  priority, onPriorityChange, meta,
}: ReviewCardProps) {
  const dim = !readOnly && !accepted
  const notesRef = useRef<HTMLTextAreaElement>(null)

  // Size the notes textarea to fit any pre-filled extracted detail on mount.
  useEffect(() => {
    const el = notesRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [])

  return (
    <div
      className="rounded-lg border px-4 py-3 transition"
      style={{
        backgroundColor: dim ? '#F8FAFC' : '#FFFFFF',
        borderColor:     dim ? '#E2E8F0' : (accepted ? '#CBD5E1' : '#E2E8F0'),
        opacity:         dim ? 0.6 : 1,
      }}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 mb-1">
            <span
              className="text-xs font-medium px-2 py-0.5 rounded-full"
              style={{ backgroundColor: badgeBg, color: badgeColor }}
            >
              {badge}
            </span>
            {anxietyFlag && (
              <span
                className="text-xs font-medium px-2 py-0.5 rounded-full"
                style={{ backgroundColor: '#FFFBEB', color: '#92400E' }}
              >
                ⚠ Needs verification
              </span>
            )}
          </div>
          <p className="text-sm font-medium" style={{ color: '#0F172A' }}>{title}</p>
          {meta && <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>{meta}</p>}
        </div>

        {/* Accept/reject toggle */}
        {!readOnly && (
          <button
            type="button"
            onClick={onToggle}
            className="flex-shrink-0 rounded-full w-8 h-8 flex items-center justify-center border transition"
            style={{
              backgroundColor: accepted ? '#4A7C8C' : '#FFFFFF',
              borderColor:     accepted ? '#4A7C8C' : '#CBD5E1',
              color:           accepted ? '#FFFFFF'  : '#94A3B8',
            }}
            title={accepted ? 'Accepted — click to reject' : 'Rejected — click to accept'}
          >
            {accepted ? <CheckIcon /> : <XIcon />}
          </button>
        )}
      </div>

      {/* Priority selector (new tasks only) */}
      {priority && onPriorityChange && !readOnly && accepted && (
        <div className="mb-2">
          <label className="block text-xs font-medium mb-1" style={{ color: '#475569' }}>Priority</label>
          <div className="flex gap-2">
            {(['critical', 'standard', 'informational'] as Priority[]).map(p => (
              <button
                key={p}
                type="button"
                onClick={() => onPriorityChange(p)}
                className="flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium transition"
                style={{
                  borderColor:     priority === p ? PRIORITY_COLORS[p] : '#E2E8F0',
                  backgroundColor: priority === p ? PRIORITY_BG[p]    : '#FFFFFF',
                  color:           priority === p ? PRIORITY_COLORS[p] : '#94A3B8',
                }}
              >
                <span
                  className="inline-block rounded-full"
                  style={{ width: 6, height: 6, backgroundColor: PRIORITY_COLORS[p] }}
                />
                {p.charAt(0).toUpperCase() + p.slice(1, 4)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Priority display (read-only) */}
      {priority && readOnly && (
        <div className="mb-2">
          <span
            className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
            style={{ backgroundColor: PRIORITY_BG[priority], color: PRIORITY_COLORS[priority] }}
          >
            <span className="inline-block rounded-full" style={{ width: 6, height: 6, backgroundColor: PRIORITY_COLORS[priority] }} />
            {priority.charAt(0).toUpperCase() + priority.slice(1)}
          </span>
        </div>
      )}

      {/* Notes textarea */}
      {readOnly ? (
        notes ? (
          <p className="text-sm" style={{ color: '#475569' }}>{notes}</p>
        ) : null
      ) : (
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: '#475569' }}>Notes</label>
          <textarea
            ref={notesRef}
            value={notes}
            onChange={e => onNotesChange(e.target.value)}
            onInput={e => {
              const el = e.currentTarget
              el.style.height = 'auto'
              el.style.height = `${el.scrollHeight}px`
            }}
            disabled={!accepted}
            rows={4}
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none disabled:opacity-50"
            style={{ borderColor: '#E2E8F0', color: '#0F172A', backgroundColor: '#FAFAFA' }}
            placeholder="Add notes from this meeting…"
          />
        </div>
      )}

      {/* Confidence score */}
      <p className="text-xs mt-1.5" style={{ color: '#CBD5E1' }}>
        Confidence: {Math.round(confidenceScore * 100)}%
      </p>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const PRIORITY_COLORS: Record<Priority, string> = {
  critical:      '#EF4444',
  standard:      '#F59E0B',
  informational: '#94A3B8',
}

const PRIORITY_BG: Record<Priority, string> = {
  critical:      '#FEF2F2',
  standard:      '#FFFBEB',
  informational: '#F8FAFC',
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function XIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}
