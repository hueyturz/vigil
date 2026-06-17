'use client'

import type { ExtractionData } from '@/lib/types'

interface ExtractionResultsProps {
  extraction:      ExtractionData
  durationSeconds: number | null
  onDone?:         () => void
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return ''
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function ExtractionResults({ extraction, durationSeconds, onDone }: ExtractionResultsProps) {
  const autoConfirmed = (extraction.task_confirmations ?? []).filter(
    c => c.confidence_score >= 0.8 && !c.anxiety_flag
  )
  const needsReview = (extraction.task_confirmations ?? []).filter(
    c => c.confidence_score < 0.8 || c.anxiety_flag
  )
  const newTasks    = extraction.new_tasks    ?? []
  const notes       = extraction.service_notes ?? []
  const meta        = extraction.case_metadata

  const hasContent = autoConfirmed.length || newTasks.length || needsReview.length || notes.length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold" style={{ color: '#0F172A' }}>Meeting Summary</h2>
        {durationSeconds && (
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

      {/* Tasks Confirmed */}
      {autoConfirmed.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5" style={{ color: '#15803D' }}>
            <CheckCircleIcon /> Tasks Confirmed ({autoConfirmed.length})
          </h3>
          <div className="space-y-2">
            {autoConfirmed.map((c, i) => (
              <div
                key={i}
                className="rounded-lg border px-4 py-3"
                style={{ backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }}
              >
                <p className="text-sm font-medium" style={{ color: '#0F172A' }}>{c.task_title}</p>
                <p className="text-xs mt-0.5" style={{ color: '#15803D' }}>{c.confirmation_value}</p>
                <p className="text-xs mt-1" style={{ color: '#94A3B8' }}>
                  Confidence: {Math.round(c.confidence_score * 100)}%
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Tasks Added */}
      {newTasks.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5" style={{ color: '#0D6E68' }}>
            <PlusCircleIcon /> Tasks Added ({newTasks.length})
          </h3>
          <div className="space-y-2">
            {newTasks.map((t, i) => (
              <div
                key={i}
                className="rounded-lg border px-4 py-3"
                style={{ backgroundColor: '#F0FDFA', borderColor: '#99F6E4' }}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium" style={{ color: '#0F172A' }}>{t.title}</p>
                  <PriorityPill priority={t.priority} />
                </div>
                {t.extracted_detail && (
                  <p className="text-xs mt-0.5" style={{ color: '#0D6E68' }}>{t.extracted_detail}</p>
                )}
                <p className="text-xs mt-1" style={{ color: '#94A3B8' }}>
                  {t.category} · due {t.due_days_before}d before service
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Needs Review */}
      {needsReview.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5" style={{ color: '#92400E' }}>
            <AlertIcon /> Needs Review ({needsReview.length})
          </h3>
          <div className="space-y-2">
            {needsReview.map((c, i) => (
              <div
                key={i}
                className="rounded-lg border px-4 py-3"
                style={{ backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }}
              >
                <p className="text-sm font-medium" style={{ color: '#0F172A' }}>{c.task_title}</p>
                <p className="text-xs mt-0.5" style={{ color: '#92400E' }}>{c.confirmation_value}</p>
                <div className="flex gap-3 mt-1">
                  {c.anxiety_flag && (
                    <span className="text-xs font-medium" style={{ color: '#B45309' }}>⚠ Ambiguous</span>
                  )}
                  <span className="text-xs" style={{ color: '#94A3B8' }}>
                    Confidence: {Math.round(c.confidence_score * 100)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Notes */}
      {notes.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold mb-2" style={{ color: '#475569' }}>
            Family Notes ({notes.length})
          </h3>
          <div className="space-y-2">
            {notes.map((n, i) => (
              <div
                key={i}
                className="rounded-lg border px-4 py-3"
                style={{ backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' }}
              >
                <p className="text-sm" style={{ color: '#0F172A' }}>{n.note}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {onDone && (
        <button
          type="button"
          onClick={onDone}
          className="w-full rounded-lg py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
          style={{ backgroundColor: '#0D6E68' }}
        >
          Done
        </button>
      )}
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function PriorityPill({ priority }: { priority: string }) {
  const styles: Record<string, { bg: string; text: string; label: string }> = {
    critical:      { bg: '#FEF2F2', text: '#991B1B', label: 'Critical' },
    standard:      { bg: '#FFFBEB', text: '#92400E', label: 'Standard' },
    informational: { bg: '#F8FAFC', text: '#475569', label: 'Info' },
  }
  const s = styles[priority] ?? styles.standard
  return (
    <span
      className="text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0"
      style={{ backgroundColor: s.bg, color: s.text }}
    >
      {s.label}
    </span>
  )
}

function CheckCircleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  )
}

function PlusCircleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="16" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  )
}

function AlertIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  )
}
