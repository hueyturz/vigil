import { DemoForm } from '@/components/marketing/DemoForm'

export const metadata = {
  title: 'Request a Demo — Vigilight',
  description: 'See how Vigilight helps funeral directors run their operations without missing a beat. Schedule a 20-minute demo.',
}

const BULLETS = [
  'Task confirmation and staff accountability',
  'Meeting recording and AI task extraction',
  'Dashboard and progress tracking',
]

function CheckCircle() {
  return (
    <span className="w-5 h-5 flex-shrink-0 mt-0.5 rounded-full flex items-center justify-center" style={{ backgroundColor: '#4A7C8C' }}>
      <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="2 6 5 9 10 3" />
      </svg>
    </span>
  )
}

export default function DemoPage() {
  return (
    <div className="max-w-5xl mx-auto py-24 px-6 grid grid-cols-1 md:grid-cols-2 gap-16 items-start">
      {/* Left column */}
      <div>
        <p className="text-sm font-semibold tracking-widest uppercase mb-4" style={{ color: '#4A7C8C' }}>
          Request a Demo
        </p>
        <h1 className="text-4xl font-bold mb-4" style={{ color: '#0F172A' }}>
          See Vigilight in action.
        </h1>
        <p className="text-lg mb-8" style={{ color: '#475569' }}>
          We&apos;ll walk you through how Vigilight works for your funeral home in a 20-minute call.
          No pressure, no hard sell.
        </p>

        <ul className="space-y-4">
          {BULLETS.map(text => (
            <li key={text} className="flex items-start gap-3">
              <CheckCircle />
              <span className="font-medium" style={{ color: '#0F172A' }}>{text}</span>
            </li>
          ))}
        </ul>

        <p className="text-sm mt-8" style={{ color: '#94A3B8' }}>
          We typically respond within a few hours during business hours (MT).
        </p>
      </div>

      {/* Right column — form */}
      <DemoForm />
    </div>
  )
}
