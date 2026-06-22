import Link from 'next/link'

const TEAL = '#0D6E68'
const LINK_CLASS = 'text-sm text-gray-400 hover:text-white transition-colors'

const PRODUCT_LINKS = [
  { label: 'Features',     href: '/#features' },
  { label: 'Pricing',      href: '/pricing'   },
  { label: 'Request Demo', href: '/demo'      },
  { label: 'Log In',       href: '/login'     },
]

export function MarketingFooter() {
  return (
    <footer className="py-16 px-6" style={{ backgroundColor: '#0F172A' }}>
      <div className="mx-auto max-w-7xl grid grid-cols-1 md:grid-cols-3 gap-10">
        {/* Column 1 — brand */}
        <div>
          <span className="text-xl font-bold" style={{ color: TEAL }}>Vauter</span>
          <p className="text-sm text-gray-400 mt-2">
            Accountability for funeral home operations.
          </p>
          <p className="text-xs text-gray-500 mt-4">
            © 2026 Vauter. All rights reserved.
          </p>
        </div>

        {/* Column 2 — Product */}
        <div>
          <h3 className="text-sm font-semibold text-white mb-3">Product</h3>
          <ul className="space-y-2">
            {PRODUCT_LINKS.map(link => (
              <li key={link.href}>
                <Link href={link.href} className={LINK_CLASS}>{link.label}</Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Column 3 — Company */}
        <div>
          <h3 className="text-sm font-semibold text-white mb-3">Company</h3>
          <ul className="space-y-2">
            <li>
              <a href="mailto:hello@getvauter.com" className={LINK_CLASS}>Contact</a>
            </li>
            <li>
              <Link href="/privacy" className={LINK_CLASS}>Privacy Policy</Link>
            </li>
            <li>
              <Link href="/terms" className={LINK_CLASS}>Terms of Service</Link>
            </li>
            <li>
              <Link href="/sms-policy" className={LINK_CLASS}>SMS Policy</Link>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  )
}
