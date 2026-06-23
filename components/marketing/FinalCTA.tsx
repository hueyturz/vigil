import Link from 'next/link'

export default function FinalCTA() {
  return (
    <div className="py-24 px-6" style={{ backgroundColor: '#0A2540' }}>
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
          Ready to run your funeral home with confidence?
        </h2>
        <p className="text-xl text-white/80 mb-10">
          Join funeral directors who trust Vigilight to keep their teams accountable
          and their families well-served.
        </p>

        <div className="flex gap-4 justify-center flex-wrap">
          <Link
            href="/demo"
            className="bg-[#E8B923] text-[#0A2540] font-semibold px-8 py-4 rounded-full text-lg hover:opacity-90 transition-opacity"
          >
            Start Free Trial →
          </Link>
          <Link
            href="/demo"
            className="border-2 border-white text-white font-semibold px-8 py-4 rounded-full text-lg hover:bg-white/10 transition-colors"
          >
            Request a Demo
          </Link>
        </div>

        <p className="text-white/60 text-sm mt-6">
          14-day free trial · No credit card required · Cancel anytime
        </p>
      </div>
    </div>
  )
}
