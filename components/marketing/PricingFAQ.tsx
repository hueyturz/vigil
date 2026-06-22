'use client'

import { useState } from 'react'

const FAQS = [
  {
    q: 'Is there really a free trial?',
    a: "Yes — 14 days, no credit card required. You get full access to every feature from day one. If you decide Vauter isn't right for you, just don't add a payment method and your account will pause automatically.",
  },
  {
    q: 'How many staff members can I add?',
    a: "Unlimited. Whether you have 2 staff or 20, there's no per-seat pricing. Everyone on your team can have their own account.",
  },
  {
    q: 'What happens when the trial ends?',
    a: "You'll receive an email reminder before your trial expires. To continue, simply add a payment method. If you don't, your account will be paused — your data is preserved and you can reactivate anytime.",
  },
  {
    q: 'Does Vauter work with Passare or other software?',
    a: "Vauter works alongside your existing tools — it doesn't replace them. Think of it as the accountability layer that sits on top of whatever system you're already using.",
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes. No contracts, no cancellation fees. Cancel from your account settings at any time and you won’t be charged again.',
  },
]

export function PricingFAQ() {
  const [open, setOpen] = useState<number | null>(null)

  return (
    <div className="max-w-2xl mx-auto mt-24">
      <h2 className="text-3xl font-bold text-center mb-12" style={{ color: '#0F172A' }}>
        Frequently asked questions
      </h2>

      <div className="space-y-3">
        {FAQS.map((item, i) => {
          const isOpen = open === i
          return (
            <div key={item.q} className="rounded-xl border" style={{ borderColor: '#E2E8F0' }}>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : i)}
                className="flex items-center justify-between w-full text-left px-5 py-4"
                aria-expanded={isOpen}
              >
                <span className="font-semibold pr-4" style={{ color: '#0F172A' }}>{item.q}</span>
                <svg
                  width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2.5"
                  strokeLinecap="round" strokeLinejoin="round"
                  className="flex-shrink-0 transition-transform"
                  style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              {isOpen && (
                <div className="px-5 pb-4 text-sm leading-relaxed" style={{ color: '#475569' }}>
                  {item.a}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
