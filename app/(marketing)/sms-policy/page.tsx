import Link from 'next/link'

export const metadata = {
  title: 'SMS Messaging Policy — Vigilight',
  description:
    'How Vigilight uses SMS to notify funeral home staff, including message frequency, opt-in and opt-out instructions, and rates disclosure.',
}

const TEAL = '#4A7C8C'
const DARK = '#0F172A'
const BODY = '#475569'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="text-xl font-semibold mb-2" style={{ color: DARK }}>
        {title}
      </h2>
      <div className="text-base leading-relaxed space-y-3" style={{ color: BODY }}>
        {children}
      </div>
    </section>
  )
}

export default function SmsPolicyPage() {
  return (
    <div className="bg-white py-24 px-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <p className="text-sm font-semibold tracking-widest uppercase mb-4" style={{ color: TEAL }}>
          Compliance
        </p>
        <h1 className="text-4xl sm:text-5xl font-bold mb-4" style={{ color: DARK }}>
          SMS Messaging Policy
        </h1>
        <p className="text-lg" style={{ color: BODY }}>
          This policy describes how Vigilight uses SMS text messaging to support funeral home operations.
        </p>

        <Section title="Program description">
          <p>
            Vigilight sends automated SMS notifications to funeral home staff, including task reminders,
            overdue alerts, and service updates. These messages help teams stay accountable for
            time-sensitive work across active cases.
          </p>
        </Section>

        <Section title="Message frequency">
          <p>Message frequency varies based on active cases and task assignments.</p>
        </Section>

        <Section title="How you opt in">
          <p>
            Users opt in by providing their phone number during account setup and explicitly
            consenting to receive SMS notifications.
          </p>
        </Section>

        <Section title="How you opt out">
          <p>
            Reply <strong style={{ color: DARK }}>STOP</strong> to any message to unsubscribe. Reply{' '}
            <strong style={{ color: DARK }}>HELP</strong> for help.
          </p>
        </Section>

        <Section title="Message and data rates">
          <p>Message and data rates may apply.</p>
        </Section>

        <Section title="Support">
          <p>
            Questions about this policy or your notifications? Contact us at{' '}
            <a href="mailto:support@getvigilight.com" className="font-medium hover:underline" style={{ color: TEAL }}>
              support@getvigilight.com
            </a>
            .
          </p>
        </Section>

        {/* Back to home */}
        <div className="mt-12 pt-8 border-t" style={{ borderColor: '#E2E8F0' }}>
          <Link href="/" className="text-sm font-medium hover:underline" style={{ color: TEAL }}>
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  )
}
