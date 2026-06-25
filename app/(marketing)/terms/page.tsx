import Link from 'next/link'

export const metadata = {
  title: 'Terms of Service — Vigilight',
  description:
    'The terms governing your use of the Vigilight platform, a task management and operations tool for funeral homes.',
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

export default function TermsPage() {
  return (
    <div className="bg-white py-24 px-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <p className="text-sm font-semibold tracking-widest uppercase mb-4" style={{ color: TEAL }}>
          Legal
        </p>
        <h1 className="text-4xl sm:text-5xl font-bold mb-4" style={{ color: DARK }}>
          Terms of Service
        </h1>
        <p className="text-sm font-medium mb-6" style={{ color: BODY }}>
          Effective Date: June 25, 2026
        </p>
        <p className="text-lg" style={{ color: BODY }}>
          These Terms of Service (&ldquo;Terms&rdquo;) govern your use of the Vigilight platform operated by Vigilight
          LLC (&ldquo;Vigilight,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;). By creating an account
          or using our services, you agree to these Terms.
        </p>

        <Section title="1. Description of Service">
          <p>
            Vigilight is a task management and operations platform designed for independent funeral homes and
            mortuaries. The platform includes task tracking, staff notifications, AI-powered meeting transcription, and
            service coordination tools.
          </p>
        </Section>

        <Section title="2. Account Registration">
          <p>
            You must create an account to use Vigilight. You are responsible for maintaining the confidentiality of your
            account credentials and for all activity that occurs under your account. You agree to provide accurate and
            complete information during registration and to keep your information up to date.
          </p>
        </Section>

        <Section title="3. Acceptable Use">
          <p>You agree not to:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Use Vigilight for any unlawful purpose</li>
            <li>Share your account credentials with unauthorized users</li>
            <li>Attempt to gain unauthorized access to any part of the platform</li>
            <li>Upload or transmit malicious code or content</li>
            <li>Use the platform to harass, abuse, or harm others</li>
            <li>Resell or sublicense access to Vigilight without our written permission</li>
          </ul>
        </Section>

        <Section title="4. Payment and Billing">
          <p>
            Vigilight is offered on a subscription basis. Pricing is displayed on our pricing page at
            getvigilight.com/pricing. Subscriptions are billed in advance on a monthly or annual basis. You may cancel
            your subscription at any time; cancellation takes effect at the end of the current billing period.
          </p>
          <p>
            We reserve the right to change our pricing with 30 days&rsquo; notice. Continued use of the platform after a
            price change constitutes acceptance of the new pricing.
          </p>
        </Section>

        <Section title="5. Data and Privacy">
          <p>
            Your use of Vigilight is also governed by our{' '}
            <Link href="/privacy" className="font-medium hover:underline" style={{ color: TEAL }}>
              Privacy Policy
            </Link>
            , available at getvigilight.com/privacy. You retain ownership of all content and data you enter into the
            platform.
          </p>
        </Section>

        <Section title="6. Intellectual Property">
          <p>
            Vigilight and its original content, features, and functionality are owned by Vigilight LLC and are protected
            by applicable intellectual property laws. You may not copy, modify, distribute, or reverse engineer any part
            of the platform without our written consent.
          </p>
        </Section>

        <Section title="7. Termination">
          <p>
            We may suspend or terminate your account if you violate these Terms or engage in conduct that we determine,
            in our sole discretion, is harmful to other users, the platform, or our business. You may terminate your
            account at any time by contacting <MailLink>help@getvigilight.com</MailLink>.
          </p>
          <p>
            Upon termination, your right to use the platform ceases immediately. We will retain your data for 90 days
            following termination before permanent deletion, in accordance with our Privacy Policy.
          </p>
        </Section>

        <Section title="8. Disclaimer of Warranties">
          <p>
            Vigilight is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; without warranties of any kind,
            either express or implied. We do not warrant that the platform will be uninterrupted, error-free, or free of
            viruses or other harmful components.
          </p>
        </Section>

        <Section title="9. Limitation of Liability">
          <p>
            To the fullest extent permitted by law, Vigilight LLC shall not be liable for any indirect, incidental,
            special, consequential, or punitive damages arising from your use of or inability to use the platform, even
            if we have been advised of the possibility of such damages.
          </p>
          <p>
            Our total liability to you for any claims arising from these Terms or your use of the platform shall not
            exceed the amount you paid to Vigilight in the 12 months preceding the claim.
          </p>
        </Section>

        <Section title="10. Governing Law">
          <p>
            These Terms are governed by the laws of the State of Utah, without regard to its conflict of law provisions.
            Any disputes arising from these Terms shall be resolved in the courts of Utah County, Utah.
          </p>
        </Section>

        <Section title="11. Changes to These Terms">
          <p>
            We may update these Terms from time to time. We will notify you of significant changes by email or through
            the platform. Your continued use of Vigilight after changes are posted constitutes your acceptance of the
            updated Terms.
          </p>
        </Section>

        <Section title="12. Contact Us">
          <p>If you have questions about these Terms, contact us at:</p>
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
