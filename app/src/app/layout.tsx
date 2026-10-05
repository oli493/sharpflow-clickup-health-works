import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Sharpflow ClickUp Health',
  description: 'Connect ClickUp and get an automated workspace health assessment.',
  icons: { icon: '/brand/logo-mark.jpg' },
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
      <body>{children}</body>
    </html>
  )
}
