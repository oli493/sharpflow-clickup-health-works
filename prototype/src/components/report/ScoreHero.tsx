import { lazy, Suspense } from 'react'
import { motion } from 'framer-motion'
import { Chip, IconSpark, Panel } from '../ui'
import { overallGrade, overallScore } from '../../data/demoData'
import { scoreBand } from '../../lib/format'
import { useCountUp } from '../../lib/useCountUp'

const GaugeView = lazy(() => import('../three/views').then((m) => ({ default: m.GaugeView })))

const GaugeFallback = (
  <div className="grid h-full w-full place-items-center">
    <div className="grid h-56 w-56 place-items-center rounded-full border-[14px] border-sev-medium" />
  </div>
)

const quickStats = [
  { label: 'Critical issues', value: '4', color: '#FF5C6C' },
  { label: 'High priority', value: '11', color: '#FF9F45' },
  { label: 'Opportunities', value: '24', color: '#7DE2B0' },
]

export default function ScoreHero() {
  const band = scoreBand(overallScore)
  const count = useCountUp(overallScore, 1800)

  return (
    <Panel className="overflow-hidden p-0">
      <div className="grid lg:grid-cols-[0.85fr_1.15fr]">
        {/* gauge */}
        <div className="relative grid place-items-center border-b border-line bg-[radial-gradient(120%_120%_at_50%_0%,rgba(124,108,255,0.16),transparent_60%)] p-8 lg:border-b-0 lg:border-r">
          <div className="relative h-[280px] w-[280px]">
            <div
              className="absolute inset-10 rounded-full blur-[60px]"
              style={{ background: band.soft }}
            />
            <Suspense fallback={GaugeFallback}>
              <GaugeView
                className="relative h-full w-full"
                score={overallScore}
                color={band.color}
                fallback={
                  <div className="grid h-full w-full place-items-center">
                    <div
                      className="grid h-56 w-56 place-items-center rounded-full border-[14px]"
                      style={{ borderColor: band.color }}
                    />
                  </div>
                }
              />
            </Suspense>
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <div className="text-center">
                <div className="font-mono text-6xl font-normal tracking-tight text-txt-primary">
                  {Math.round(count)}
                </div>
                <div className="mt-1 font-mono text-[11px] uppercase tracking-eyebrow text-txt-faint">
                  ClickUp Health
                </div>
              </div>
            </div>
          </div>

          <div className="mt-2 flex items-center gap-3">
            <span
              className="grid h-11 w-11 place-items-center rounded-2xl font-display text-xl font-semibold"
              style={{ background: band.soft, color: band.color }}
            >
              {overallGrade}
            </span>
            <div>
              <div className="text-sm text-txt-primary">{band.label} health</div>
              <div className="font-mono text-[11px] text-txt-faint">Northwind Creative</div>
            </div>
          </div>
        </div>

        {/* summary */}
        <div className="p-8 lg:p-10">
          <div className="flex items-center justify-between">
            <Chip>
              <span className="h-1.5 w-1.5 rounded-full bg-sev-good" /> Scan complete
            </Chip>
            <span className="font-mono text-[11px] text-txt-faint">14,217 tasks analysed</span>
          </div>

          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="mt-6 font-display text-2xl font-semibold tracking-display text-txt-primary sm:text-3xl"
          >
            Good foundation, weak operational discipline.
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="mt-4 max-w-2xl text-[15px] leading-relaxed text-txt-muted"
          >
            Structure and reporting are strong, but overdue work and data hygiene are dragging the
            score down. Fixing overdue tasks and retiring unused fields would lift the workspace
            meaningfully without new process overhead.
          </motion.p>

          <div className="mt-7 grid grid-cols-3 gap-px overflow-hidden rounded-2xl border border-line bg-line/60">
            {quickStats.map((s) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="bg-ink-soft/80 px-5 py-5"
              >
                <div className="font-mono text-2xl" style={{ color: s.color }}>
                  {s.value}
                </div>
                <div className="mt-1 text-[11px] text-txt-faint">{s.label}</div>
              </motion.div>
            ))}
          </div>

          <div className="mt-6 flex items-center gap-3 rounded-xl border border-brand/30 bg-brand/[0.07] px-5 py-4">
            <IconSpark className="h-5 w-5 text-magenta" />
            <p className="text-sm text-txt-muted">
              <span className="text-txt-primary">Projected score 84/100</span> if overdue work drops
              below 15% and time tracking is adopted on client work.
            </p>
          </div>
        </div>
      </div>
    </Panel>
  )
}
