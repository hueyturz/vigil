import { PricingClient } from '@/components/marketing/PricingClient'
import { PricingFAQ } from '@/components/marketing/PricingFAQ'
import FinalCTA from '@/components/marketing/FinalCTA'

export const metadata = {
  title: 'Pricing — Vigilight',
  description: 'Simple, transparent pricing for funeral homes. $79/month includes unlimited services, staff accounts, and all features. 14-day free trial.',
}

export default function PricingPage() {
  return (
    <>
      <div className="bg-white py-24 px-6">
        {/* Hero */}
        <div className="max-w-3xl mx-auto text-center mb-20">
          <p className="text-sm font-semibold tracking-widest uppercase mb-4" style={{ color: '#4A7C8C' }}>
            Pricing
          </p>
          <h1 className="text-5xl font-bold mb-4" style={{ color: '#0F172A' }}>
            Simple, transparent pricing.
          </h1>
          <p className="text-xl" style={{ color: '#475569' }}>
            One plan. Everything included. 14-day free trial. No credit card required.
          </p>
        </div>

        {/* Toggle + card */}
        <PricingClient />

        {/* FAQ */}
        <PricingFAQ />
      </div>

      <FinalCTA />
    </>
  )
}
