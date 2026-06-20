'use client'

import { useEffect, useState } from 'react'

function greetingForHour(hour: number): string {
  if (hour >= 5 && hour < 12)  return 'Good morning'
  if (hour >= 12 && hour < 17) return 'Good afternoon'
  return 'Good evening' // 5pm–10pm and 10pm–5am
}

export function DashboardGreeting({ firstName }: { firstName: string }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  // Time-dependent greeting renders only after mount to avoid a hydration
  // mismatch (server clock vs client clock).
  const prefix = mounted ? `${greetingForHour(new Date().getHours())}${firstName ? `, ${firstName}` : ''}. ` : ''

  return (
    <p className="text-sm" style={{ color: '#475569' }}>
      {prefix}Here&apos;s where things stand.
    </p>
  )
}
