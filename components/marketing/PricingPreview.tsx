import Link from 'next/link'

const FEATURES = [
  'Unlimited services',
  'Unlimited staff accounts',
  'Task confirmation & proof',
  'Automatic reminders',
  'Meeting recording & AI extraction',
  'Activity log & audit trail',
  'Email notifications',
  'Priority support',
]

function CheckCircle() {
  return (
    <span className="w-5 h-5 flex-shrink-0 rounded-full flex items-center justify-center" style={{ backgroundColor: '#4A7C8C' }}>
      <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="2 6 5 9 10 3" />
      </svg>
    </span>
  )
}

export default function PricingPreview() {
  return (
    <div id="pricing" className="py-24 px-6" style={{ backgroundColor: '#F8F5F0' }}>
      {/* Header */}
      <div className="max-w-3xl mx-auto text-center">
        <p className="text-sm font-semibold tracking-widest uppercase mb-4" style={{ color: '#4A7C8C' }}>
          Pricing
        </p>
        <h2 className="text-4xl md:text-5xl font-bold mb-4" style={{ color: '#0F172A' }}>
          Simple, transparent pricing.
        </h2>
        <p className="text-xl mb-16" style={{ color: '#475569' }}>
          One plan. Everything included. No hidden fees.
        </p>
      </div>

      {/* Card */}
      <div className="max-w-sm mx-auto text-center">
        <span className="inline-block bg-[#4A7C8C] text-white text-xs font-semibold px-4 py-1.5 rounded-full mb-4">
          Most Popular
        </span>

        <div className="bg-white rounded-3xl shadow-2xl p-10 text-center">
          {/* Price */}
          <div className="flex items-start justify-center gap-1 mb-2">
            <span className="text-2xl font-bold mt-2" style={{ color: '#0F172A' }}>$</span>
            <span className="text-6xl font-bold" style={{ color: '#0F172A' }}>79</span>
            <span className="text-xl self-end mb-2" style={{ color: '#94A3B8' }}>/mo</span>
          </div>
          <p className="text-sm mb-1" style={{ color: '#94A3B8' }}>per funeral home</p>
          <p className="text-sm font-medium mb-8" style={{ color: '#4A7C8C' }}>
            Save $158 with annual billing
          </p>

          <div className="border-t border-[#E2E8F0] mb-8" />

          {/* Features */}
          <ul className="text-left space-y-4">
            {FEATURES.map(f => (
              <li key={f} className="flex items-center gap-3">
                <CheckCircle />
                <span className="text-sm font-medium" style={{ color: '#0F172A' }}>{f}</span>
              </li>
            ))}
          </ul>

          {/* CTA */}
          <Link
            href="/demo"
            className="mt-8 block w-full bg-[#E8B923] text-[#0A2540] font-semibold py-4 rounded-full text-lg hover:opacity-90 transition-opacity"
          >
            Start Free Trial
          </Link>
          <p className="text-sm mt-3" style={{ color: '#94A3B8' }}>
            14-day free trial · No credit card required
          </p>
        </div>

        <p className="text-sm mt-8" style={{ color: '#475569' }}>
          Need multiple locations?{' '}
          <a href="mailto:hello@getvigilight.com" className="hover:underline" style={{ color: '#4A7C8C' }}>
            Contact us
          </a>{' '}
          for enterprise pricing.
        </p>
      </div>
    </div>
  )
}
