'use client'

import { useState, useRef, useEffect } from 'react'
import { MeetingRecorder } from './MeetingRecorder'
import type { IntakeSession } from '@/lib/types'

// ── Date helpers ──────────────────────────────────────────────────────────────

function formatCardDate(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    weekday: 'long',
    month:   'long',
    day:     'numeric',
    hour:    'numeric',
    minute:  '2-digit',
    hour12:  true,
  })
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '—'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}m ${s.toString().padStart(2, '0')}s`
}

// ── Status badge ──────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  complete:     { label: 'Complete',     color: '#15803D', bg: '#F0FDF4' },
  failed:       { label: 'Failed',       color: '#991B1B', bg: '#FEF2F2' },
  recording:    { label: 'Recording',    color: '#92400E', bg: '#FFFBEB' },
  transcribing: { label: 'Transcribing', color: '#92400E', bg: '#FFFBEB' },
  extracting:   { label: 'Extracting',   color: '#92400E', bg: '#FFFBEB' },
}

// ── Chat types ────────────────────────────────────────────────────────────────

interface ChatMsg {
  role:    'user' | 'assistant'
  content: string
}

// ── AI Summary section ────────────────────────────────────────────────────────

function SummarySection({ session }: { session: IntakeSession }) {
  const [summary,  setSummary]  = useState<string | null>(session.ai_summary ?? null)
  const [loading,  setLoading]  = useState(false)
  const [fetched,  setFetched]  = useState(!!session.ai_summary)

  useEffect(() => {
    if (fetched || !session.transcript || session.status !== 'complete') return
    let cancelled = false
    setLoading(true)
    fetch('/api/intake/summary', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ intake_session_id: session.id }),
    })
      .then(r => r.json())
      .then(d => {
        if (!cancelled) { setSummary(d.summary ?? null); setFetched(true) }
      })
      .catch(() => { if (!cancelled) setFetched(true) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [session.id, session.transcript, session.status, fetched])

  if (!session.transcript || session.status !== 'complete') {
    return (
      <p className="text-sm" style={{ color: '#94A3B8' }}>No transcript available.</p>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <svg className="vigil-spin" width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="#0D6E68" strokeWidth="2.5" strokeLinecap="round">
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
        <span className="text-sm" style={{ color: '#94A3B8' }}>Generating summary…</span>
      </div>
    )
  }

  if (!summary) {
    return <p className="text-sm" style={{ color: '#94A3B8' }}>No summary available.</p>
  }

  return <p className="text-sm leading-relaxed" style={{ color: '#334155' }}>{summary}</p>
}

// ── Transcript rendering ──────────────────────────────────────────────────────

const FAMILY_MEMBER_COLORS = ['#475569', '#64748B', '#334155', '#5B6A7A']

function speakerColor(label: string): string {
  if (/funeral director/i.test(label)) return '#0D6E68'
  const match = label.match(/family member (\d+)/i)
  if (match) {
    const idx = (parseInt(match[1], 10) - 1) % FAMILY_MEMBER_COLORS.length
    return FAMILY_MEMBER_COLORS[idx]
  }
  // "Family Member" (no number) or "Speaker N" fallback
  if (/family member/i.test(label)) return FAMILY_MEMBER_COLORS[0]
  // Speaker N: cycle through muted colors
  const numMatch = label.match(/speaker (\d+)/i)
  if (numMatch) {
    return FAMILY_MEMBER_COLORS[parseInt(numMatch[1], 10) % FAMILY_MEMBER_COLORS.length]
  }
  return '#475569'
}

function hasSpeakerLabels(transcript: string): boolean {
  return /^(Funeral Director|Family Member|Speaker \d+):/m.test(transcript)
}

function DiarizedTranscript({ transcript }: { transcript: string }) {
  const lines = transcript.split('\n').filter(Boolean)
  return (
    <div className="space-y-2">
      {lines.map((line, i) => {
        const colonIdx = line.indexOf(':')
        if (colonIdx === -1) {
          return (
            <p key={i} className="text-sm" style={{ color: '#0F172A', lineHeight: 1.8 }}>
              {line}
            </p>
          )
        }
        const speaker = line.slice(0, colonIdx).trim()
        const text    = line.slice(colonIdx + 1).trim()
        const color   = speakerColor(speaker)
        return (
          <div key={i} style={{ lineHeight: 1.8 }}>
            <span className="text-xs font-bold mr-2" style={{ color }}>{speaker}:</span>
            <span className="text-sm" style={{ color: '#0F172A' }}>{text}</span>
          </div>
        )
      })}
    </div>
  )
}

// ── Transcript section ────────────────────────────────────────────────────────

function TranscriptSection({ session }: { session: IntakeSession }) {
  const [open,    setOpen]    = useState(false)
  const [copied,  setCopied]  = useState(false)

  function handleCopy() {
    if (!session.transcript) return
    navigator.clipboard.writeText(session.transcript).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const diarized = session.transcript ? hasSpeakerLabels(session.transcript) : false

  return (
    <div className="border-t" style={{ borderColor: '#E2E8F0' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center justify-between w-full px-5 py-3 text-sm font-medium transition hover:opacity-70"
        style={{ color: '#475569' }}
      >
        <span>View Full Transcript</span>
        <ChevronIcon open={open} />
      </button>

      {open && (
        <div className="px-5 pb-5">
          {!session.transcript ? (
            <p className="text-sm" style={{ color: '#94A3B8' }}>No transcript available.</p>
          ) : (
            <div className="relative">
              <button
                type="button"
                onClick={handleCopy}
                className="absolute top-2 right-2 rounded-md border px-2.5 py-1 text-xs font-medium transition hover:opacity-70"
                style={{ borderColor: '#E2E8F0', color: '#475569', backgroundColor: '#FFFFFF' }}
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
              <div
                className="rounded-lg border p-4 pr-20 overflow-y-auto"
                style={{
                  borderColor:     '#E2E8F0',
                  backgroundColor: '#F8FAFC',
                  maxHeight:       '24rem',
                }}
              >
                {diarized ? (
                  <DiarizedTranscript transcript={session.transcript} />
                ) : (
                  <p
                    className="text-sm"
                    style={{
                      fontFamily: '"SF Mono", "Fira Code", Consolas, monospace',
                      lineHeight: 1.8,
                      color:      '#0F172A',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {session.transcript}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Chat section ──────────────────────────────────────────────────────────────

function ChatSection({ session }: { session: IntakeSession }) {
  const [open,     setOpen]     = useState(false)
  const [history,  setHistory]  = useState<ChatMsg[]>([])
  const [input,    setInput]    = useState('')
  const [thinking, setThinking] = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [history, thinking, open])

  async function handleSend() {
    const msg = input.trim()
    if (!msg || thinking) return
    setInput('')
    setError(null)

    const userMsg: ChatMsg = { role: 'user', content: msg }
    const newHistory = [...history, userMsg]
    setHistory(newHistory)
    setThinking(true)

    try {
      const res = await fetch('/api/intake/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          intake_session_id:    session.id,
          message:              msg,
          conversation_history: history,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong. Please try again.')
      } else {
        setHistory(prev => [...prev, { role: 'assistant', content: data.reply }])
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setThinking(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  return (
    <div className="border-t" style={{ borderColor: '#E2E8F0' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center justify-between w-full px-5 py-3 text-sm font-medium transition hover:opacity-70"
        style={{ color: '#475569' }}
      >
        <span>Ask a Question</span>
        <ChevronIcon open={open} />
      </button>

      {open && (
        <div className="px-5 pb-5 flex flex-col gap-3">
          {/* Chat history */}
          {(history.length > 0 || thinking) && (
            <div className="flex flex-col gap-2 max-h-72 overflow-y-auto">
              {history.map((m, i) => (
                <div
                  key={i}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className="max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed"
                    style={
                      m.role === 'user'
                        ? { backgroundColor: '#0D6E68', color: '#FFFFFF' }
                        : { backgroundColor: '#F1F5F9', color: '#0F172A' }
                    }
                  >
                    {m.content}
                  </div>
                </div>
              ))}
              {thinking && (
                <div className="flex justify-start">
                  <div
                    className="rounded-2xl px-4 py-3 flex items-center gap-1.5"
                    style={{ backgroundColor: '#F1F5F9' }}
                  >
                    <TypingDot delay="0ms" />
                    <TypingDot delay="150ms" />
                    <TypingDot delay="300ms" />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}

          {error && (
            <p className="text-xs" style={{ color: '#EF4444' }}>{error}</p>
          )}

          {/* Input row */}
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={thinking}
              placeholder="Ask anything about this meeting…"
              className="flex-1 rounded-lg border px-3 py-2 text-sm outline-none disabled:opacity-50"
              style={{
                borderColor:     '#E2E8F0',
                backgroundColor: '#FAFAFA',
                color:           '#0F172A',
              }}
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={!input.trim() || thinking}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: '#0D6E68' }}
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── MeetingCard ───────────────────────────────────────────────────────────────

function MeetingCard({ session }: { session: IntakeSession }) {
  const style = STATUS_STYLES[session.status] ?? STATUS_STYLES.complete

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }}
    >
      {/* Card header */}
      <div className="flex items-start justify-between gap-3 px-5 py-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold" style={{ color: '#0F172A' }}>
            {formatCardDate(session.created_at)}
          </p>
          <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>
            Recording: {formatDuration(session.recording_duration_seconds)}
          </p>
        </div>
        <span
          className="flex-shrink-0 text-xs font-medium px-2.5 py-1 rounded-full"
          style={{ backgroundColor: style.bg, color: style.color }}
        >
          {style.label}
        </span>
      </div>

      {/* AI Summary — always visible */}
      <div className="px-5 pb-4 border-t" style={{ borderColor: '#E2E8F0' }}>
        <p className="text-xs font-semibold uppercase tracking-wide mb-2 mt-4" style={{ color: '#94A3B8' }}>
          AI Summary
        </p>
        <SummarySection session={session} />
        {session.status === 'failed' && session.error_message && (
          <p className="text-xs mt-2" style={{ color: '#EF4444' }}>{session.error_message}</p>
        )}
      </div>

      {/* Transcript — collapsible */}
      <TranscriptSection session={session} />

      {/* Chat — collapsible */}
      {session.status === 'complete' && session.transcript && (
        <ChatSection session={session} />
      )}
    </div>
  )
}

// ── MeetingsTab ───────────────────────────────────────────────────────────────

interface MeetingsTabProps {
  sessions:  IntakeSession[]
  serviceId: string
  canRecord: boolean
}

export function MeetingsTab({ sessions, serviceId, canRecord }: MeetingsTabProps) {
  if (sessions.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center rounded-xl border py-20 text-center"
        style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }}
      >
        <div
          className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full"
          style={{ backgroundColor: '#F0FDFA' }}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#0D6E68" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
        </div>
        <p className="text-base font-semibold mb-1" style={{ color: '#0F172A' }}>
          No meetings recorded yet
        </p>
        <p className="text-sm mb-6 max-w-xs" style={{ color: '#64748B' }}>
          Record your arrangement conference to automatically extract tasks
          and keep a searchable transcript.
        </p>
        {canRecord && <MeetingRecorder serviceId={serviceId} />}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Tab-level header with recorder */}
      {canRecord && (
        <div className="flex justify-end">
          <MeetingRecorder serviceId={serviceId} />
        </div>
      )}
      <div className="space-y-4">
        {sessions.map(s => (
          <MeetingCard key={s.id} session={s} />
        ))}
      </div>
    </div>
  )
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

function TypingDot({ delay }: { delay: string }) {
  return (
    <span
      className="vigil-pulse inline-block rounded-full"
      style={{ width: 6, height: 6, backgroundColor: '#94A3B8', animationDelay: delay }}
    />
  )
}
