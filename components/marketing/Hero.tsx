'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function Hero() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  return (
    <section
      className="relative min-h-screen flex flex-col items-center justify-center pt-32 md:pt-40 px-6 text-center overflow-hidden"
      style={{
        background:
          'radial-gradient(ellipse at center, rgba(230,244,243,0.3) 0%, #FFFFFF 60%)',
      }}
    >
      <div className="max-w-4xl mx-auto w-full">
        {/* Badge */}
        <span
          className="inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm"
          style={{ backgroundColor: '#E6F4F3', color: '#0D6E68' }}
        >
          <span className="w-2 h-2 rounded-full bg-green-500" />
          Built for independent funeral homes
        </span>

        {/* Headline */}
        <h1 className="mt-8 text-5xl md:text-7xl font-bold leading-tight tracking-tight" style={{ color: '#0F172A' }}>
          Nothing slips
          <br />
          through the cracks.
        </h1>

        {/* Subheadline */}
        <p className="mt-6 text-xl max-w-2xl mx-auto leading-relaxed" style={{ color: '#475569' }}>
          Vauter keeps funeral home staff accountable so directors never have to
          triple-check anything again. Automatic reminders. Confirmed tasks.
          Complete peace of mind.
        </p>

        {/* CTAs */}
        <div className="mt-10 flex gap-4 justify-center flex-wrap">
          <Link
            href="/demo"
            className="bg-[#0D6E68] text-white font-semibold px-8 py-4 rounded-full text-lg hover:opacity-90 transition-opacity"
          >
            Start Free Trial →
          </Link>
          <Link
            href="/#features"
            className="border-2 border-[#0D6E68] text-[#0D6E68] font-semibold px-8 py-4 rounded-full text-lg hover:bg-[#E6F4F3] transition-colors"
          >
            See how it works
          </Link>
        </div>

        {/* Trust line */}
        <p className="mt-4 text-sm" style={{ color: '#94A3B8' }}>
          14-day free trial · No credit card required · Cancel anytime
        </p>

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
            app.getvauter.com/dashboard
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
