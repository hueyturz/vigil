'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ExtractionResults } from './ExtractionResults'
import type { ExtractionData } from '@/lib/types'

interface MeetingRecorderProps {
  serviceId: string
}

type RecorderState = 'idle' | 'recording' | 'processing' | 'complete' | 'error'

interface CompletedResult {
  durationSeconds: number | null
  extraction:      ExtractionData
}

function getSupportedMimeType(): string {
  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
    'audio/ogg',
  ]
  if (typeof MediaRecorder === 'undefined') return ''
  for (const t of types) {
    if (MediaRecorder.isTypeSupported(t)) return t
  }
  return ''
}

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

export function MeetingRecorder({ serviceId }: MeetingRecorderProps) {
  const router = useRouter()

  const [modalOpen,    setModalOpen]    = useState(false)
  const [recState,     setRecState]     = useState<RecorderState>('idle')
  const [elapsed,      setElapsed]      = useState(0)
  const [error,        setError]        = useState<string | null>(null)
  const [result,       setResult]       = useState<CompletedResult | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef        = useRef<BlobPart[]>([])
  const timerRef         = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef     = useRef<number>(0)

  // Clean up timer on unmount
  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  function openModal() {
    setModalOpen(true)
    setRecState('idle')
    setElapsed(0)
    setError(null)
    setResult(null)
  }

  function closeModal() {
    stopTimerAndRecorder()
    setModalOpen(false)
    router.refresh()
  }

  function stopTimerAndRecorder() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    if (mediaRecorderRef.current?.stream) {
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop())
    }
  }

  const startRecording = useCallback(async () => {
    setError(null)

    const mimeType = getSupportedMimeType()
    if (!mimeType) {
      setError('Your browser does not support audio recording. Please try Chrome or Safari.')
      return
    }

    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
    } catch (err) {
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        setError('Microphone access was denied. Please allow microphone access in your browser settings and try again.')
      } else {
        setError('Could not access microphone. Please check your device settings.')
      }
      return
    }

    const recorder = new MediaRecorder(stream, { mimeType })
    chunksRef.current = []

    recorder.ondataavailable = e => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }

    recorder.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: mimeType })
      const duration = Math.round((Date.now() - startTimeRef.current) / 1000)
      await uploadAndProcess(blob, duration)
    }

    recorder.onerror = () => {
      setRecState('error')
      setError('Recording encountered an error. Please try again.')
      stopTimerAndRecorder()
    }

    mediaRecorderRef.current = recorder
    startTimeRef.current = Date.now()
    recorder.start(1000)  // collect chunks every second

    setRecState('recording')
    setElapsed(0)
    timerRef.current = setInterval(() => {
      setElapsed(Math.round((Date.now() - startTimeRef.current) / 1000))
    }, 1000)
  }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  function stopRecording() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    setRecState('processing')
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop())
    }
  }

  async function uploadAndProcess(blob: Blob, durationSeconds: number) {
    const formData = new FormData()
    formData.append('audio', blob, 'recording')
    formData.append('service_id', serviceId)
    formData.append('duration_seconds', String(durationSeconds))

    try {
      const res = await fetch('/api/intake/transcribe', {
        method: 'POST',
        body:   formData,
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Processing failed. Please try again.')
        setRecState('error')
        return
      }

      setResult({ durationSeconds, extraction: data.extraction })
      setRecState('complete')
    } catch {
      setError('Network error. Please check your connection and try again.')
      setRecState('error')
    }
  }

  return (
    <>
      {/* Trigger button */}
      <button
        type="button"
        onClick={openModal}
        className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
        style={{ backgroundColor: '#0D6E68' }}
      >
        <MicIcon />
        Start Meeting
      </button>

      {/* Modal overlay */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <div
            className="relative w-full max-w-md rounded-2xl p-6 shadow-xl overflow-y-auto"
            style={{ backgroundColor: '#FFFFFF', maxHeight: '90vh' }}
          >
            {/* Close button — always visible except during active processing */}
            {recState !== 'processing' && (
              <button
                type="button"
                onClick={closeModal}
                className="absolute top-4 right-4 rounded-full w-8 h-8 flex items-center justify-center transition hover:opacity-60"
                style={{ color: '#94A3B8', backgroundColor: '#F1F5F9' }}
                aria-label="Close"
              >
                <CloseIcon />
              </button>
            )}

            {/* ── IDLE ── */}
            {recState === 'idle' && (
              <div className="text-center py-4">
                <div
                  className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full"
                  style={{ backgroundColor: '#F0FDFA' }}
                >
                  <MicLargeIcon />
                </div>
                <h2 className="text-lg font-bold mb-1" style={{ color: '#0F172A' }}>Record Arrangement Conference</h2>
                <p className="text-sm mb-6" style={{ color: '#64748B' }}>
                  Vigil will transcribe the conversation and automatically populate tasks from the decisions made.
                </p>
                <button
                  type="button"
                  onClick={startRecording}
                  className="w-full rounded-xl py-3 text-sm font-semibold text-white transition hover:opacity-90"
                  style={{ backgroundColor: '#0D6E68' }}
                >
                  Start Recording
                </button>
              </div>
            )}

            {/* ── RECORDING ── */}
            {recState === 'recording' && (
              <div className="text-center py-4">
                <div className="flex items-center justify-center gap-2 mb-6">
                  <span
                    className="inline-block h-3 w-3 rounded-full"
                    style={{ backgroundColor: '#EF4444', animation: 'pulse 1.5s ease-in-out infinite' }}
                  />
                  <span className="text-2xl font-mono font-bold" style={{ color: '#0F172A' }}>
                    {formatTimer(elapsed)}
                  </span>
                </div>
                <p className="text-sm mb-6" style={{ color: '#64748B' }}>Recording in progress…</p>
                <button
                  type="button"
                  onClick={stopRecording}
                  className="w-full rounded-xl py-3 text-sm font-semibold text-white transition hover:opacity-90"
                  style={{ backgroundColor: '#EF4444' }}
                >
                  Stop Recording
                </button>
              </div>
            )}

            {/* ── PROCESSING ── */}
            {recState === 'processing' && (
              <div className="text-center py-10">
                <div className="flex items-center justify-center mb-4">
                  <SpinnerIcon />
                </div>
                <p className="text-base font-semibold mb-1" style={{ color: '#0F172A' }}>Processing…</p>
                <p className="text-sm" style={{ color: '#64748B' }}>
                  Transcribing and extracting tasks. This may take up to 30 seconds.
                </p>
              </div>
            )}

            {/* ── COMPLETE ── */}
            {recState === 'complete' && result && (
              <ExtractionResults
                extraction={result.extraction}
                durationSeconds={result.durationSeconds}
                onDone={closeModal}
              />
            )}

            {/* ── ERROR ── */}
            {recState === 'error' && (
              <div className="py-4">
                <div
                  className="rounded-lg border px-4 py-3 mb-6 text-sm"
                  style={{ backgroundColor: '#FEF2F2', borderColor: '#FECACA', color: '#991B1B' }}
                >
                  {error}
                </div>
                <button
                  type="button"
                  onClick={() => { setRecState('idle'); setError(null) }}
                  className="w-full rounded-xl py-3 text-sm font-semibold text-white transition hover:opacity-90"
                  style={{ backgroundColor: '#0D6E68' }}
                >
                  Try Again
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </>
  )
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function MicIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  )
}

function MicLargeIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#0D6E68" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function SpinnerIcon() {
  return (
    <svg
      width="36" height="36" viewBox="0 0 24 24" fill="none"
      stroke="#0D6E68" strokeWidth="2.5" strokeLinecap="round"
      style={{ animation: 'spin 1s linear infinite' }}
    >
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  )
}
