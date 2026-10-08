import type { Metadata } from 'next'
import './globals.css'
import Chrome from '@/components/Chrome'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://health.sharpflowconsulting.com'),
  title: 'Sharpflow ClickUp Health',
  description: 'Connect ClickUp and get an automated workspace health assessment.',
  icons: { icon: '/brand/logo-mark.jpg' },
  openGraph: {
    title: 'Sharpflow ClickUp Health',
    description: 'Get a free automated ClickUp workspace health check — score, findings and recommendations.',
    siteName: 'Sharpflow ClickUp Health',
    type: 'website',
  },
  twitter: { card: 'summary_large_image' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&family=Inter:wght@400;500;600&family=Montserrat+Alternates:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Chrome>{children}</Chrome>
      </body>
    </html>
  )
}
