import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Background from './components/Background'
import Cursor from './components/Cursor'
import ScrollProgress from './components/ScrollProgress'
import IntroLoader from './components/IntroLoader'
import ErrorBoundary from './components/ErrorBoundary'
import Footer from './components/Footer'
import { Logo } from './components/ui'
import { EASE, d } from './lib/motion'
import Landing from './components/stages/Landing'
import Connect from './components/stages/Connect'
import Config from './components/stages/Config'
import Scan from './components/stages/Scan'
import Report from './components/stages/Report'

export type Stage = 'landing' | 'connect' | 'config' | 'scan' | 'report'

const STEPS: { key: Stage; label: string }[] = [
  { key: 'landing', label: 'Start' },
  { key: 'connect', label: 'Connect' },
  { key: 'config', label: 'Configure' },
  { key: 'scan', label: 'Scan' },
  { key: 'report', label: 'Report' },
]

function stageFromHash(): Stage {
  const h = window.location.hash.replace('#', '') as Stage
  return STEPS.some((s) => s.key === h) ? h : 'landing'
}

export default function App() {
  const [stage, setStage] = useState<Stage>(stageFromHash)
  const activeIndex = STEPS.findIndex((s) => s.key === stage)

  useEffect(() => {
    if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual'
  }, [])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [stage])

  useEffect(() => {
    const onHash = () => setStage(stageFromHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const change = (s: Stage) => {
    setStage(s)
    window.history.replaceState(null, '', `#${s}`)
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <Background />
      <Cursor />
      <ScrollProgress />
      <IntroLoader />

      <header className="fixed inset-x-0 top-0 z-40">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-ink via-ink/85 to-transparent backdrop-blur-[6px]" />
        <div className="relative mx-auto flex max-w-[1360px] items-center justify-between px-6 py-5">
          <button onClick={() => change('landing')} className="transition-opacity hover:opacity-80" aria-label="Sharpflow home">
            <Logo />
          </button>

          <div className="hidden items-center gap-1.5 md:flex">
            {STEPS.map((s, i) => (
              <div key={s.key} className="flex items-center gap-1.5">
                <button
                  onClick={() => change(s.key)}
                  className={`rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-widest transition-colors ${
                    i === activeIndex
                      ? 'bg-magenta/10 text-magenta'
                      : i < activeIndex
                        ? 'text-txt-muted hover:text-txt-primary'
                        : 'text-txt-faint hover:text-txt-muted'
                  }`}
                >
                  {s.label}
                </button>
                {i < STEPS.length - 1 && <span className="h-px w-4 bg-line-strong" />}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <span className="chip hidden sm:inline-flex">
              <span className="h-1.5 w-1.5 rounded-full bg-sev-good" /> Read-only
            </span>
            <button
              onClick={() => change('report')}
              className="hidden font-mono text-[11px] uppercase tracking-widest text-txt-muted transition-colors hover:text-txt-primary md:block"
            >
              Sample report
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        <ErrorBoundary>
          <motion.div
            key={stage}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: d(0.5), ease: EASE }}
          >
            {stage === 'landing' && <Landing onConnect={() => change('connect')} onSample={() => change('report')} />}
            {stage === 'connect' && (
              <Connect onBack={() => change('landing')} onAuthorize={() => change('config')} />
            )}
            {stage === 'config' && (
              <Config onBack={() => change('connect')} onRun={() => change('scan')} />
            )}
            {stage === 'scan' && <Scan onDone={() => change('report')} />}
            {stage === 'report' && <Report onReset={() => change('landing')} />}
          </motion.div>
        </ErrorBoundary>
      </main>

      <Footer />
    </div>
  )
}
