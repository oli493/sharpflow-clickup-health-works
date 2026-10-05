'use client'

import Link from 'next/link'
import Background from './Background'
import Cursor from './Cursor'
import ScrollProgress from './ScrollProgress'
import IntroLoader from './IntroLoader'
import Footer from './Footer'
import { Logo } from './ui'

export default function Chrome({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <Background />
      <Cursor />
      <ScrollProgress />
      <IntroLoader />

      <header className="fixed inset-x-0 top-0 z-40">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-ink via-ink/85 to-transparent backdrop-blur-[6px]" />
        <div className="relative mx-auto flex max-w-[1360px] items-center justify-between px-6 py-5">
          <Link href="/" className="transition-opacity hover:opacity-80">
            <Logo />
          </Link>
          <span className="chip hidden sm:inline-flex">
            <span className="h-1.5 w-1.5 rounded-full bg-sev-good" /> Read-only
          </span>
        </div>
      </header>

      <main className="relative z-10">{children}</main>

      <Footer />
    </div>
  )
}
