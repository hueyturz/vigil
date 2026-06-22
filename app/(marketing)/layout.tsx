import { MarketingNav } from '@/components/marketing/MarketingNav'
import { MarketingFooter } from '@/components/marketing/MarketingFooter'

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <MarketingNav />
      {/* pt-16 clears the fixed 64px nav */}
      <main className="flex-1 pt-16">{children}</main>
      <MarketingFooter />
    </div>
  )
}
