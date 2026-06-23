import Hero from '@/components/marketing/Hero'
import Problem from '@/components/marketing/Problem'
import Solution from '@/components/marketing/Solution'
import Features from '@/components/marketing/Features'
import HowItWorks from '@/components/marketing/HowItWorks'
import PricingPreview from '@/components/marketing/PricingPreview'
import FinalCTA from '@/components/marketing/FinalCTA'

export const metadata = {
  title: 'Vigilight — Funeral Home Operations Software',
  description:
    'Vigilight keeps funeral home staff accountable so directors never have to triple-check anything again. Task confirmation, automatic reminders, and meeting intelligence for independent funeral homes.',
  openGraph: {
    title: 'Vigilight — Funeral Home Operations Software',
    description:
      'Task confirmation, automatic reminders, and meeting intelligence for independent funeral homes.',
    url: 'https://www.getvigilight.com',
    siteName: 'Vigilight',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Vigilight — Funeral Home Operations Software',
    description:
      'Task confirmation, automatic reminders, and meeting intelligence for independent funeral homes.',
  },
}

export default function HomePage() {
  return (
    <>
      <Hero />
      <Problem />
      <Solution />
      <Features />
      <HowItWorks />
      <PricingPreview />
      <FinalCTA />
    </>
  )
}
