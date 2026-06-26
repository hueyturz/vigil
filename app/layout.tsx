import type { Metadata, Viewport } from 'next'
import * as Sentry from '@sentry/nextjs'
import { Toaster } from 'react-hot-toast'
import './globals.css'

// Use generateMetadata rather than a static `metadata` export so we can inject
// Sentry's per-request trace headers via `other` — Next.js forbids exporting both
// `metadata` and `generateMetadata` from the same module.
export function generateMetadata(): Metadata {
  return {
    metadataBase: new URL('https://getvigilight.com'),
    title: 'Vigilight',
    description: 'Funeral home service operations',
    manifest: '/manifest.json',
    appleWebApp: {
      capable: true,
      statusBarStyle: 'default',
      title: 'Vigilight',
    },
    icons: {
      apple: '/icon-192.png',
    },
    other: {
      ...Sentry.getTraceData(),
    },
  }
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#0A2540',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster
          position="bottom-center"
          toastOptions={{
            duration: 3000,
            style: {
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: 500,
            },
            success: {
              style: {
                background: '#4A7C8C',
                color: '#fff',
              },
              iconTheme: { primary: '#fff', secondary: '#4A7C8C' },
            },
            error: {
              style: {
                background: '#EF4444',
                color: '#fff',
              },
              iconTheme: { primary: '#fff', secondary: '#EF4444' },
            },
          }}
        />
      </body>
    </html>
  )
}
