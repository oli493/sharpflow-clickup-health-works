'use client'

import { lazy, Suspense } from 'react'
import { motion } from 'framer-motion'
import { Chip, IconSpark, Panel } from '../ui'
import { scoreBand } from '../../lib/format'
import { useCountUp } from '../../lib/useCountUp'
import type { ScanResult } from '../../lib/types'

const GaugeView = lazy(() => import('../three/views').then((m) => ({ default: m.GaugeView })))

const GaugeFallback = (
  <div className="grid h-full w-full place-items-center">
    <div className="h-56 w-56 rounded-full border-[14px] border-[#C9A227]" />
  </div>
)

export default function ScoreHero({ result }: { result: ScanResult }) {
  const band = scoreBand(result.overallScore)
  const count = useCountUp(result.overallScore, 1800)

  const quickStats = [
    { label: 'Critical issues', value: String(result.findingsSummary.critical), color: '#D6336C' },
    { label: 'High priority', value: String(result.findingsSummary.high), color: '#E07A2F' },
    { label: 'Opportunities', value: String(result.findingsSummary.opportunity), color: '#2F9E74' },
  ]

  return (
    <Panel className="overflow-hidden p-0">
      <div className="grid lg:grid-cols-[0.85fr_1.15fr]">
        <div className="relative grid place-items-center border-b border-line bg-[radial-gradient(120%_120%_at_50%_0%,rgba(95,186,149,0.16),transparent_60%)] p-8 lg:border-b-0 lg:border-r">
          <div className="relative h-[280px] w-[280px]">
            <div className="absolute inset-10 rounded-full blur-[60px]" style={{ background: band.soft }} />
            <Suspense fallback={GaugeFallback}>
              <GaugeView className="relative h-full w-full" score={result.overallScore} color={band.color} fallback={GaugeFallback} />
            </Suspense>
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <div className="text-center">
                <div className="font-mono text-6xl tracking-tight text-txt-primary">{Math.round(count)}</div>
                <div className="mt-1 font-mono text-[11px] uppercase tracking-eyebrow text-txt-faint">ClickUp Health</div>
              </div>
            </div>
          </div>

          <div className="mt-2 flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl font-display text-xl font-semibold" style={{ background: band.soft, color: band.color }}>
              {result.overallGrade}
            </span>
            <div>
              <div className="text-sm text-txt-primary">{band.label} health</div>
              <div className="font-mono text-[11px] text-txt-faint">{result.workspaceName}</div>
            </div>
          </div>
        </div>

        <div className="p-8 lg:p-10">
          <div className="flex items-center justify-between">
            <Chip>
              <span className="h-1.5 w-1.5 rounded-full bg-sev-good" /> Scan complete
            </Chip>
            <span className="font-mono text-[11px] text-txt-faint">
              {result.activeTasks.toLocaleString()} tasks · {result.coverage.scored}/{result.coverage.total} categories measured
            </span>
          </div>

          <motion.h2 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }} className="mt-6 font-display text-2xl font-semibold tracking-display text-txt-primary sm:text-3xl">
            {result.summaryHeadline}
          </motion.h2>
          <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.28, ease: [0.16, 1, 0.3, 1] }} className="mt-4 max-w-2xl text-[15px] leading-relaxed text-txt-muted">
            {result.summaryBody}
          </motion.p>

          <div className="mt-7 grid grid-cols-3 gap-px overflow-hidden rounded-2xl border border-line bg-line/60">
            {quickStats.map((s) => (
              <div key={s.label} className="bg-ink-soft/80 px-5 py-5">
                <div className="font-mono text-2xl" style={{ color: s.color }}>{s.value}</div>
                <div className="mt-1 text-[11px] text-txt-faint">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex items-center gap-3 rounded-xl border border-brand/30 bg-brand/[0.07] px-5 py-4">
            <IconSpark className="h-5 w-5 text-magenta" />
            <p className="text-sm text-txt-muted">
              <span className="text-txt-primary">Projected score {result.projectedScore}/100</span> if the key findings are addressed.
            </p>
          </div>
        </div>
      </div>
    </Panel>
  )
}
