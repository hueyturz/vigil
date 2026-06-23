'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

const CALLOUTS = [
  { Icon: MessageIcon,  label: 'Automatic SMS notifications to staff' },
  { Icon: MicIcon,      label: 'AI meeting transcription and task extraction' },
  { Icon: CheckboxIcon, label: 'Real-time task accountability per service' },
]

export default function Hero() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  return (
    <section
      className="relative min-h-screen flex flex-col items-center justify-center pt-24 md:pt-28 pb-16 px-6 text-center overflow-hidden"
      style={{
        background:
          'radial-gradient(ellipse at center, #0A2540 0%, #0A2540 60%)',
      }}
    >
      <div className="max-w-4xl mx-auto w-full">
        {/* Badge */}
        <span
          className="inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm"
          style={{ backgroundColor: '#E6F4F3', color: '#4A7C8C' }}
        >
          <span className="w-2 h-2 rounded-full bg-green-500" />
          Built for independent funeral homes
        </span>

        {/* Headline */}
        <h1 className="mt-6 text-5xl md:text-7xl font-bold leading-tight tracking-tight" style={{ color: '#F8F5F0' }}>
          Every task confirmed.
          <br />
          Every service prepared.
        </h1>

        {/* Subheadline */}
        <p className="mt-6 text-xl max-w-2xl mx-auto leading-relaxed" style={{ color: 'rgba(248,245,240,0.75)' }}>
          Vigilight gives funeral directors a real-time task board, automatic SMS reminders
          to staff, and AI-powered meeting notes — so every detail is tracked, every person
          is accountable, and no family is ever let down.
        </p>

        {/* CTAs */}
        <div className="mt-10 flex gap-4 justify-center flex-wrap">
          <Link
            href="/demo"
            className="bg-[#E8B923] text-[#0A2540] font-semibold px-8 py-4 rounded-full text-lg hover:opacity-90 transition-opacity"
          >
            Start Free Trial →
          </Link>
          <Link
            href="/#features"
            className="border-2 border-[rgba(248,245,240,0.4)] text-[#F8F5F0] font-semibold px-8 py-4 rounded-full text-lg hover:bg-[rgba(248,245,240,0.1)] transition-colors"
          >
            See how it works
          </Link>
        </div>

        {/* Trust line */}
        <p className="mt-4 text-sm" style={{ color: 'rgba(248,245,240,0.6)' }}>
          14-day free trial · No credit card required · Cancel anytime
        </p>

        {/* Feature callouts */}
        <div className="mt-12 flex flex-col md:flex-row md:items-center md:justify-center gap-4 md:gap-0 max-w-3xl mx-auto">
          {CALLOUTS.map(({ Icon, label }, i) => (
            <div
              key={label}
              className={`flex items-center justify-center gap-2.5 md:px-6 ${i > 0 ? 'md:border-l md:border-[rgba(248,245,240,0.15)]' : ''}`}
            >
              <span className="flex-shrink-0"><Icon /></span>
              <span className="text-sm" style={{ color: 'rgba(248,245,240,0.8)' }}>{label}</span>
            </div>
          ))}
        </div>

        {/* Testimonial */}
        <figure className="mt-12 mx-auto max-w-[600px] text-left border-l-4 pl-5" style={{ borderColor: '#E8B923' }}>
          <blockquote className="italic text-base md:text-lg leading-relaxed" style={{ color: 'rgba(248,245,240,0.9)' }}>
            “Vigilight is the first tool that actually fits how a funeral home runs. My staff
            knows exactly what to do and when — I don’t have to chase anyone.”
          </blockquote>
          <figcaption className="mt-3 text-sm" style={{ color: '#F4C95D' }}>
            — Licensed Funeral Director, Utah
          </figcaption>
        </figure>

        {/* Dashboard mockup */}
        <div
          className="mt-16 transition-opacity duration-[800ms] delay-300"
          style={{ opacity: mounted ? 1 : 0 }}
        >
          <DashboardMockup />
        </div>
      </div>
    </section>
  )
}

// ── Feature callout icons (teal, inline SVG — no icon-font dependency) ──────────

function MessageIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4A7C8C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  )
}

function MicIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4A7C8C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M19 10a7 7 0 0 1-14 0" />
      <line x1="12" y1="19" x2="12" y2="22" />
    </svg>
  )
}

function CheckboxIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4A7C8C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 11 12 14 22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  )
}

function DashboardMockup() {
  return (
    <div className="max-w-3xl mx-auto rounded-2xl shadow-2xl overflow-hidden border border-[#E2E8F0] text-left">
      {/* Fake browser chrome */}
      <div className="bg-[#F7F8FA] border-b border-[#E2E8F0] px-4 py-3 flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#EF4444' }} />
          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#F59E0B' }} />
          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#10B981' }} />
        </div>
        <div className="flex-1 flex justify-center">
          <div className="rounded bg-white border border-[#E2E8F0] px-3 py-1 text-xs text-gray-400">
            app.getvigilight.com/dashboard
          </div>
        </div>
        {/* spacer to keep URL bar centered */}
        <div className="w-[52px]" />
      </div>

      {/* Dashboard content */}
      <div className="bg-white p-6">
        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-4">
          <StatCard label="Active Services" value="8" />
          <StatCard label="Needs Attention" value="1" valueColor="#F59E0B" />
          <StatCard label="Overdue Tasks" value="0" valueColor="#10B981" />
        </div>

        {/* Upcoming services */}
        <p className="text-sm font-semibold mt-6 mb-3" style={{ color: '#0F172A' }}>Upcoming Services</p>

        <ServiceRow
          family="Henderson Family" deceased="Robert Henderson"
          date="Jun 23" badge="3 days away" badgeColor="#EF4444" badgeBg="#FEF2F2"
          confirmed="6/9 confirmed"
        />
        <ServiceRow
          family="Williams Family" deceased="James Williams"
          date="Jun 27" badge="7 days away" badgeColor="#F59E0B" badgeBg="#FFFBEB"
          confirmed="8/16 confirmed"
        />
        <ServiceRow
          family="Murphy Family" deceased="Dylan Murphy"
          date="Jul 4" badge="14 days away" badgeColor="#94A3B8" badgeBg="#F1F5F9"
          confirmed="0/14 confirmed"
        />
      </div>
    </div>
  )
}

function StatCard({ label, value, valueColor = '#0F172A' }: { label: string; value: string; valueColor?: string }) {
  return (
    <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 text-sm">
      <p style={{ color: '#475569' }}>{label}</p>
      <p className="mt-2 text-2xl font-bold" style={{ color: valueColor }}>{value}</p>
    </div>
  )
}

function ServiceRow({
  family, deceased, date, badge, badgeColor, badgeBg, confirmed,
}: {
  family: string; deceased: string; date: string
  badge: string; badgeColor: string; badgeBg: string; confirmed: string
}) {
  return (
    <div className="flex justify-between items-center py-3 border-b border-[#E2E8F0]">
      <div className="min-w-0">
        <p className="text-sm font-bold truncate" style={{ color: '#0F172A' }}>{family}</p>
        <p className="text-xs truncate" style={{ color: '#94A3B8' }}>{deceased}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-sm" style={{ color: '#475569' }}>{date}</span>
        <span className="rounded-full px-2 py-0.5 text-xs font-semibold" style={{ color: badgeColor, backgroundColor: badgeBg }}>
          {badge}
        </span>
        <span className="text-xs hidden sm:inline" style={{ color: '#94A3B8' }}>{confirmed}</span>
      </div>
    </div>
  )
}
