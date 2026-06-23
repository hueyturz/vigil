'use client'

import { useState, useRef, useEffect } from 'react'
import toast from 'react-hot-toast'
import { addServiceNote } from '@/app/services/actions'
import type { ServiceNote } from '@/lib/types'

interface NoteRecorderProps {
  serviceId: string
  onSaved:   (note: ServiceNote) => void
}

type State = 'idle' | 'recording' | 'transcribing' | 'review' | 'saving'

// Mirrors MeetingRecorder's format detection — audio/mp4 first for iOS Safari.
function getSupportedMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return ''
  if (MediaRecorder.isTypeSupported('audio/mp4'))             return 'audio/mp4'
  if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) return 'audio/webm;codecs=opus'
  if (MediaRecorder.isTypeSupported('audio/webm'))            return 'audio/webm'
  if (MediaRecorder.isTypeSupported('audio/ogg'))             return 'audio/ogg'
  return ''
}

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

export function NoteRecorder({ serviceId, onSaved }: NoteRecorderProps) {
  const [state,   setState]   = useState<State>('idle')
  const [elapsed, setElapsed] = useState(0)
  const [draft,   setDraft]   = useState('')
  const [error,   setError]   = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef        = useRef<BlobPart[]>([])
  const timerRef         = useRef<ReturnType<typeof setInterval> | null>(null)
  const mimeRef          = useRef<string>('')
  const isMountedRef     = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  function stopTracks() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    mediaRecorderRef.current?.stream?.getTracks().forEach(t => t.stop())
  }

  async function startRecording() {
    setError(null)
    const mimeType = getSupportedMimeType()
    if (!mimeType) {
      setError('Recording is not supported on this browser. Please use Chrome on desktop or Android.')
      return
    }

    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
    } catch (err) {
      setError(
        err instanceof DOMException && err.name === 'NotAllowedError'
          ? 'Microphone access was denied. Allow it in your browser settings and try again.'
          : 'Could not access microphone. Please check your device settings.'
      )
      return
    }

    const recorder = new MediaRecorder(stream, { mimeType })
    mimeRef.current = mimeType
    chunksRef.current = []

    recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
    recorder.onstop = () => { void transcribe(new Blob(chunksRef.current, { type: mimeType })) }
    recorder.onerror = () => {
      setError('Recording encountered an error. Please try again.')
      stopTracks()
      setState('idle')
    }

    mediaRecorderRef.current = recorder
    recorder.start(1000)
    setState('recording')
    setElapsed(0)
    const startedAt = Date.now()
    timerRef.current = setInterval(() => setElapsed(Math.round((Date.now() - startedAt) / 1000)), 1000)
  }

  function stopRecording() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    setState('transcribing')
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop())
    }
  }

  async function transcribe(blob: Blob) {
    const formData = new FormData()
    formData.append('audio', blob, 'note')
    formData.append('mimeType', mimeRef.current)
    try {
      const res  = await fetch('/api/intake/transcribe-note', { method: 'POST', body: formData })
      const data = await res.json()
      if (!isMountedRef.current) return
      if (!res.ok) { setError(data.error ?? 'Transcription failed.'); setState('idle'); return }
      setDraft((data.transcript ?? '').trim())
      setState('review')
    } catch {
      if (!isMountedRef.current) return
      setError('Network error during transcription. Please try again.')
      setState('idle')
    }
  }

  async function saveNote() {
    const content = draft.trim()
    if (!content) return
    setState('saving')
    const result = await addServiceNote(serviceId, content)
    if (result.error || !result.data) {
      toast.error(result.error || 'Failed to save note.')
      setState('review')
      return
    }
    onSaved(result.data)
    toast.success('Voice note saved')
    setDraft('')
    setState('idle')
  }

  function discard() {
    setDraft('')
    setError(null)
    setState('idle')
  }

  // ── Review (editable transcription) ──────────────────────────────────────
  if (state === 'review' || state === 'saving') {
    const saving = state === 'saving'
    return (
      <div className="rounded-lg border p-3" style={{ borderColor: '#E2E8F0', backgroundColor: '#FAFAFA' }}>
        <p className="text-xs font-medium mb-1.5" style={{ color: '#94A3B8' }}>Review transcription</p>
        <textarea
          value={draft}
          onChange={e => setDraft(e.target.value)}
          rows={3}
          autoFocus
          disabled={saving}
          className="w-full rounded-lg border px-3 py-2 text-sm outline-none resize-none"
          style={{ borderColor: '#E2E8F0', color: '#0F172A', backgroundColor: '#FFFFFF', lineHeight: 1.6 }}
          placeholder="Transcription…"
        />
        <div className="flex items-center justify-end gap-2 mt-2">
          <button
            type="button"
            onClick={discard}
            disabled={saving}
            className="rounded-lg border px-3 py-1.5 text-xs font-medium transition hover:bg-white disabled:opacity-60"
            style={{ borderColor: '#E2E8F0', color: '#475569' }}
          >
            Discard
          </button>
          <button
            type="button"
            onClick={saveNote}
            disabled={saving || !draft.trim()}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold transition hover:opacity-90 disabled:opacity-60"
            style={{ backgroundColor: '#0A2540', color: '#F4C95D' }}
          >
            {saving ? 'Saving…' : 'Save Note'}
          </button>
        </div>
      </div>
    )
  }

  // ── Recording / transcribing ─────────────────────────────────────────────
  if (state === 'recording' || state === 'transcribing') {
    const transcribing = state === 'transcribing'
    return (
      <div className="flex items-center gap-3 rounded-lg border px-3 py-2.5" style={{ borderColor: '#E2E8F0', backgroundColor: '#FFFFFF' }}>
        {transcribing ? (
          <>
            <svg className="vigil-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4A7C8C" strokeWidth="2.5" strokeLinecap="round">
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            <span className="text-sm" style={{ color: '#64748B' }}>Transcribing…</span>
          </>
        ) : (
          <>
            <span className="vigil-pulse inline-block h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: '#EF4444' }} />
            <span className="text-sm font-mono font-semibold" style={{ color: '#0F172A' }}>{formatTimer(elapsed)}</span>
            <span className="text-xs" style={{ color: '#94A3B8' }}>Recording…</span>
            <button
              type="button"
              onClick={stopRecording}
              className="ml-auto rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90"
              style={{ backgroundColor: '#EF4444' }}
            >
              Stop &amp; Save
            </button>
          </>
        )}
      </div>
    )
  }

  // ── Idle ─────────────────────────────────────────────────────────────────
  return (
    <div>
      <button
        type="button"
        onClick={startRecording}
        className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition hover:bg-gray-50"
        style={{ borderColor: '#0A2540', color: '#0A2540' }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" />
        </svg>
        Record a note
      </button>
      {error && <p className="text-xs mt-1.5" style={{ color: '#EF4444' }}>{error}</p>}
    </div>
  )
}
