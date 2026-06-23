'use client'

import { useState, useEffect } from 'react'
import { ExtractionResults } from './ExtractionResults'
import type { IntakeSession } from '@/lib/types'

interface PastMeetingsProps {
  sessions: IntakeSession[]
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month:  'short',
    day:    'numeric',
    year:   'numeric',
    hour:   'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '—'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

const STATUS_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  complete:     { label: 'Complete',     color: '#15803D', bg: '#F0FDF4' },
  failed:       { label: 'Failed',       color: '#991B1B', bg: '#FEF2F2' },
  recording:    { label: 'Recording',    color: '#92400E', bg: '#FFFBEB' },
  transcribing: { label: 'Transcribing', color: '#92400E', bg: '#FFFBEB' },
  extracting:   { label: 'Extracting',   color: '#92400E', bg: '#FFFBEB' },
}

export function PastMeetings({ sessions }: PastMeetingsProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Timestamps format in the runtime's local timezone — only render after mount
  // so server (UTC) and first client render match, avoiding hydration errors.
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  if (!sessions.length) return null

  return (
    <section>
      <h2 className="text-lg font-bold mb-3" style={{ color: '#0F172A' }}>Past Meetings</h2>
      <div className="space-y-2">
        {sessions.map(s => {
          const style  = STATUS_STYLES[s.status] ?? STATUS_STYLES.complete
          const isOpen = expandedId === s.id
          const canView = s.status === 'complete' && s.raw_extraction

          return (
            <div
              key={s.id}
              className="rounded-xl border overflow-hidden"
              style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }}
            >
              {/* Row header */}
              <div className="flex items-center justify-between px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium" style={{ color: '#0F172A' }}>
                    {mounted && formatDateTime(s.created_at)}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>
                    Duration: {formatDuration(s.recording_duration_seconds)}
                  </p>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  <span
                    className="text-xs font-medium px-2.5 py-1 rounded-full"
                    style={{ backgroundColor: style.bg, color: style.color }}
                  >
                    {style.label}
                  </span>
                  {canView && (
                    <button
                      type="button"
                      onClick={() => setExpandedId(isOpen ? null : s.id)}
                      className="text-xs font-semibold hover:underline"
                      style={{ color: '#4A7C8C' }}
                    >
                      {isOpen ? 'Hide Summary ▲' : 'View Summary ▼'}
                    </button>
                  )}
                  {s.status === 'failed' && s.error_message && (
                    <span className="text-xs" style={{ color: '#991B1B' }} title={s.error_message}>
                      Error
                    </span>
                  )}
                </div>
              </div>

              {/* Expanded summary */}
              {isOpen && s.raw_extraction && (
                <div
                  className="border-t px-4 py-5"
                  style={{ borderColor: '#E2E8F0', backgroundColor: '#F8FAFC' }}
                >
                  <ExtractionResults
                    extraction={s.raw_extraction}
                    durationSeconds={s.recording_duration_seconds}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
