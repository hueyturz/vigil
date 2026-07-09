'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createPortal } from 'react-dom'
import { markWelcomeSeen } from '@/app/onboarding/actions'

interface WelcomeStep {
  title: string
  body:  string
  icon:  React.ReactNode
}

const STEPS: WelcomeStep[] = [
  {
    title: 'Services',
    body: "A service represents one family you're serving. Every deceased person gets their own service with all tasks, contacts, and notes in one place.",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4A7C8C" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 21h18" /><path d="M5 21V7l8-4v18" /><path d="M19 21V11l-6-4" />
      </svg>
    ),
  },
  {
    title: 'Tasks',
    body: 'Tasks are the individual to-do items inside a service. Assign them to staff, set when each is due, and mark them complete. The dashboard shows you everything overdue or due soon across all services.',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4A7C8C" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
  },
  {
    title: 'Notifications',
    body: 'Staff get automatic SMS reminders when tasks are assigned to them and when tasks go overdue. This keeps everyone accountable without you having to chase people down.',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4A7C8C" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    ),
  },
  {
    title: "You're ready",
    body: 'Create your first service to get started.',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#4A7C8C" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12h14" /><path d="M12 5l7 7-7 7" />
      </svg>
    ),
  },
]

// First-run welcome slideshow. Shown once (has_seen_welcome flag) after signup,
// and re-openable from the sidebar "Getting started" link (?welcome=1).
export function WelcomeModal({ initialOpen, firstTime }: { initialOpen: boolean; firstTime: boolean }) {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [open, setOpen]       = useState(initialOpen)
  const [step, setStep]       = useState(0)

  useEffect(() => setMounted(true), [])

  // Flip the flag as soon as a first-time user sees the modal, so it never
  // reshows even if they navigate away without dismissing.
  useEffect(() => {
    if (open && firstTime) void markWelcomeSeen()
  }, [open, firstTime])

  if (!mounted || !open) return null

  const isLast  = step === STEPS.length - 1
  const current = STEPS[step]

  function close() {
    setOpen(false)
  }

  function createFirstService() {
    setOpen(false)
    router.push('/services?new=1')
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-4"
      style={{ backgroundColor: 'rgba(10,37,64,0.55)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-title"
    >
      <div
        className="relative w-full max-w-md rounded-2xl border shadow-xl max-h-[90dvh] overflow-y-auto"
        style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }}
      >
        {/* Close (X) */}
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-md transition hover:bg-gray-100"
          style={{ color: '#94A3B8' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="px-8 pt-10 pb-7 text-center">
          {/* Icon */}
          <div
            className="mx-auto mb-5 flex items-center justify-center rounded-full"
            style={{ width: 56, height: 56, backgroundColor: '#EAF1F3' }}
          >
            {current.icon}
          </div>

          <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: '#94A3B8' }}>
            Step {step + 1} of {STEPS.length}
          </p>
          <h2 id="welcome-title" className="text-xl font-bold" style={{ color: '#0F172A' }}>
            {current.title}
          </h2>
          <p className="mt-2.5 text-sm leading-relaxed" style={{ color: '#475569' }}>
            {current.body}
          </p>

          {/* Progress dots */}
          <div className="mt-6 flex items-center justify-center gap-1.5">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className="h-1.5 rounded-full transition-all"
                style={{
                  width: i === step ? 20 : 6,
                  backgroundColor: i === step ? '#4A7C8C' : '#E2E8F0',
                }}
              />
            ))}
          </div>
        </div>

        {/* Footer controls */}
        <div className="flex items-center justify-between gap-3 border-t px-6 py-4" style={{ borderColor: '#E2E8F0' }}>
          {step === 0 ? (
            <button
              type="button"
              onClick={close}
              className="text-sm font-medium transition hover:opacity-70"
              style={{ color: '#94A3B8' }}
            >
              Skip
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setStep(s => s - 1)}
              className="text-sm font-medium transition hover:opacity-70"
              style={{ color: '#475569' }}
            >
              ← Back
            </button>
          )}

          {isLast ? (
            <button
              type="button"
              onClick={createFirstService}
              className="rounded-lg px-4 py-2 text-sm font-semibold transition hover:opacity-90"
              style={{ backgroundColor: '#0A2540', color: '#F4C95D' }}
            >
              Create my first service →
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setStep(s => s + 1)}
              className="rounded-lg px-4 py-2 text-sm font-semibold transition hover:opacity-90"
              style={{ backgroundColor: '#0A2540', color: '#F4C95D' }}
            >
              Next →
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
