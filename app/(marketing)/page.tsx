import Hero from '@/components/marketing/Hero'
import Problem from '@/components/marketing/Problem'
import Solution from '@/components/marketing/Solution'
import Features from '@/components/marketing/Features'
import HowItWorks from '@/components/marketing/HowItWorks'
import PricingPreview from '@/components/marketing/PricingPreview'
import FinalCTA from '@/components/marketing/FinalCTA'

export const metadata = {
  title: 'Vauter — Funeral Home Operations Software',
  description:
    'Vauter keeps funeral home staff accountable so directors never have to triple-check anything again. Task confirmation, automatic reminders, and meeting intelligence for independent funeral homes.',
  openGraph: {
    title: 'Vauter — Funeral Home Operations Software',
    description:
      'Task confirmation, automatic reminders, and meeting intelligence for independent funeral homes.',
    url: 'https://www.getvauter.com',
    siteName: 'Vauter',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Vauter — Funeral Home Operations Software',
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
