'use client'

import { useState } from 'react'
import Link from 'next/link'

const FEATURES = [
  'Unlimited services',
  'Unlimited staff accounts',
  'Task confirmation with proof',
  'Automatic SMS & email reminders',
  'Meeting recording & AI task extraction',
  'Activity log & audit trail',
  'Per-task assignment',
  'Service progress dashboard',
  'Priority support',
]

function CheckCircle() {
  return (
    <span className="w-5 h-5 flex-shrink-0 rounded-full flex items-center justify-center" style={{ backgroundColor: '#0D6E68' }}>
      <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="2 6 5 9 10 3" />
      </svg>
    </span>
  )
}

export function PricingClient() {
  const [annual, setAnnual] = useState(false)
  const price = annual ? '66' : '79'

  return (
    <>
      {/* Toggle */}
      <div className="flex items-center justify-center gap-3 mb-12">
        <div className="inline-flex rounded-full border p-1" style={{ borderColor: '#E2E8F0' }}>
          <button
            type="button"
            onClick={() => setAnnual(false)}
            className="px-5 py-2 rounded-full text-sm font-semibold transition-colors"
            style={annual
              ? { backgroundColor: '#FFFFFF', color: '#475569' }
              : { backgroundColor: '#0D6E68', color: '#FFFFFF' }}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setAnnual(true)}
            className="px-5 py-2 rounded-full text-sm font-semibold transition-colors"
            style={annual
              ? { backgroundColor: '#0D6E68', color: '#FFFFFF' }
              : { backgroundColor: '#FFFFFF', color: '#475569' }}
          >
            Annual
          </button>
        </div>
        {annual && (
          <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ backgroundColor: '#ECFDF5', color: '#10B981' }}>
            Save $158
          </span>
        )}
      </div>

      {/* Card */}
      <div className="max-w-md mx-auto bg-white rounded-3xl shadow-xl border border-[#E2E8F0] p-10 text-center">
        {/* Price */}
        <div className="flex items-start justify-center gap-1">
          <span className="text-2xl font-bold mt-3" style={{ color: '#0F172A' }}>$</span>
          <span className="text-7xl font-bold" style={{ color: '#0F172A' }}>{price}</span>
          <span className="text-xl self-end mb-3" style={{ color: '#94A3B8' }}>/mo</span>
        </div>
        {annual && (
          <p className="text-sm mb-1" style={{ color: '#94A3B8' }}>billed annually ($790/year)</p>
        )}
        <p className="text-sm mb-8" style={{ color: '#94A3B8' }}>per funeral home</p>

        <Link
          href="/demo"
          className="block w-full bg-[#0D6E68] text-white font-semibold py-4 rounded-full text-lg hover:opacity-90 transition-opacity"
        >
          Start Free Trial
        </Link>
        <p className="text-sm mt-3 mb-8" style={{ color: '#94A3B8' }}>
          14-day free trial · No credit card required
        </p>

        <div className="border-t border-[#E2E8F0]" />

        <ul className="text-left space-y-4 mt-8">
          {FEATURES.map(f => (
            <li key={f} className="flex items-center gap-3">
              <CheckCircle />
              <span className="text-sm" style={{ color: '#0F172A' }}>{f}</span>
            </li>
          ))}
        </ul>
      </div>
    </>
  )
}
