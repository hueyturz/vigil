import Link from 'next/link'

export const metadata = {
  title: 'Privacy Policy — Vigilight',
  description:
    'How Vigilight collects, uses, and protects your information when you use our task management platform for funeral homes.',
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

function MailLink({ children }: { children: React.ReactNode }) {
  return (
    <a href="mailto:help@getvigilight.com" className="font-medium hover:underline" style={{ color: TEAL }}>
      {children}
    </a>
  )
}

export default function PrivacyPage() {
  return (
    <div className="bg-white py-24 px-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <p className="text-sm font-semibold tracking-widest uppercase mb-4" style={{ color: TEAL }}>
          Legal
        </p>
        <h1 className="text-4xl sm:text-5xl font-bold mb-4" style={{ color: DARK }}>
          Privacy Policy
        </h1>
        <p className="text-sm font-medium mb-6" style={{ color: BODY }}>
          Effective Date: June 25, 2026
        </p>
        <p className="text-lg" style={{ color: BODY }}>
          Vigilight LLC (&ldquo;Vigilight,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) operates the
          Vigilight platform, a task management and operations tool for funeral homes and mortuaries. This Privacy
          Policy explains how we collect, use, and protect your information when you use our services at
          getvigilight.com.
        </p>

        <Section title="Information We Collect">
          <p>
            <strong style={{ color: DARK }}>Account information:</strong> When you create an account, we collect your
            name, email address, and phone number.
          </p>
          <p>
            <strong style={{ color: DARK }}>Funeral home information:</strong> We collect your funeral home&rsquo;s name
            and address during onboarding.
          </p>
          <p>
            <strong style={{ color: DARK }}>Usage data:</strong> We collect information about how you use the platform,
            including services created, tasks completed, and activity logs.
          </p>
          <p>
            <strong style={{ color: DARK }}>Meeting recordings and transcripts:</strong> If you use our meeting
            recording feature, we collect audio recordings and the transcripts generated from them.
          </p>
          <p>
            <strong style={{ color: DARK }}>Communications:</strong> We store notes, messages, and other content you
            enter into the platform.
          </p>
        </Section>

        <Section title="How We Use Your Information">
          <p>We use your information to:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Provide and operate the Vigilight platform</li>
            <li>Send SMS and email notifications about task assignments, confirmations, and reminders</li>
            <li>Generate AI-powered summaries and task suggestions from meeting recordings</li>
            <li>Improve our services</li>
            <li>Respond to support requests</li>
          </ul>
        </Section>

        <Section title="SMS Notifications">
          <p>
            By providing your phone number, you consent to receive SMS notifications from Vigilight about task
            assignments and service updates. Message and data rates may apply. You can opt out at any time by replying{' '}
            <strong style={{ color: DARK }}>STOP</strong> to any message or updating your notification preferences in the
            app.
          </p>
        </Section>

        <Section title="Third-Party Services">
          <p>We use the following third-party services to operate Vigilight:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong style={{ color: DARK }}>Supabase</strong> — database and authentication infrastructure
            </li>
            <li>
              <strong style={{ color: DARK }}>Vercel</strong> — application hosting
            </li>
            <li>
              <strong style={{ color: DARK }}>Twilio</strong> — SMS message delivery
            </li>
            <li>
              <strong style={{ color: DARK }}>Resend</strong> — email delivery
            </li>
            <li>
              <strong style={{ color: DARK }}>Anthropic</strong> — AI-powered meeting analysis and task extraction
            </li>
            <li>
              <strong style={{ color: DARK }}>Deepgram</strong> — voice transcription
            </li>
            <li>
              <strong style={{ color: DARK }}>Upstash</strong> — scheduled notification delivery
            </li>
          </ul>
          <p>Each of these services has its own privacy policy governing how they handle data.</p>
        </Section>

        <Section title="Data Retention">
          <p>
            We retain your data for as long as your account is active. If you cancel your subscription, we will retain
            your data for 90 days, after which it will be permanently deleted. You may request earlier deletion by
            contacting us.
          </p>
        </Section>

        <Section title="Data Security">
          <p>
            We use industry-standard security practices to protect your data, including encrypted connections (TLS),
            encrypted data storage, and role-based access controls. No method of transmission over the internet is 100%
            secure, and we cannot guarantee absolute security.
          </p>
        </Section>

        <Section title="We Do Not Sell Your Data">
          <p>We do not sell, rent, or trade your personal information to third parties for marketing purposes.</p>
        </Section>

        <Section title="Your Rights">
          <p>You have the right to:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Access the personal information we hold about you</li>
            <li>Request correction of inaccurate information</li>
            <li>Request deletion of your account and data</li>
            <li>Export your data</li>
          </ul>
          <p>
            To exercise any of these rights, contact us at <MailLink>help@getvigilight.com</MailLink>.
          </p>
        </Section>

        <Section title="Children's Privacy">
          <p>
            Vigilight is not intended for use by individuals under the age of 18. We do not knowingly collect personal
            information from children.
          </p>
        </Section>

        <Section title="Changes to This Policy">
          <p>
            We may update this Privacy Policy from time to time. We will notify you of significant changes by email or
            through the platform. Your continued use of Vigilight after changes are posted constitutes your acceptance of
            the updated policy.
          </p>
        </Section>

        <Section title="Contact Us">
          <p>If you have questions about this Privacy Policy, contact us at:</p>
          <p>
            Vigilight LLC
            <br />
            1134 W 360 S
            <br />
            American Fork, UT 84003
            <br />
            <MailLink>help@getvigilight.com</MailLink>
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
