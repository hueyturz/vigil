import type { Metadata } from 'next'
import { Toaster } from 'react-hot-toast'
import './globals.css'

export const metadata: Metadata = {
  title: 'Vigil',
  description: 'Funeral service task confirmation platform',
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
                background: '#0D6E68',
                color: '#fff',
              },
              iconTheme: { primary: '#fff', secondary: '#0D6E68' },
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
