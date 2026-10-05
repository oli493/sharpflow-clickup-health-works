import { lazy, Suspense, useRef } from 'react'
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { Button, Chip, Eyebrow, IconArrow, IconShield, Magnetic, Reveal, WordReveal } from '../ui'
import { EASE, d, stagger } from '../../lib/motion'

const OrbView = lazy(() => import('../three/views').then((m) => ({ default: m.OrbView })))

const OrbFallback = (
  <div className="grid h-full w-full place-items-center">
    <div className="h-64 w-64 animate-floaty rounded-full bg-gradient-to-br from-brand to-brand-ink shadow-glow" />
  </div>
)

const stats = [
  { value: '7', label: 'scoring categories' },
  { value: '18', label: 'utilisation signals' },
  { value: '39', label: 'automated findings' },
  { value: '~3 min', label: 'per workspace' },
]

const how = [
  { n: '01', t: 'Connect', d: 'Secure, read-only ClickUp OAuth. No personal tokens.' },
  { n: '02', t: 'Configure', d: 'Pick the workspace and exclude sandbox or template Spaces.' },
  { n: '03', t: 'Analyse', d: 'A background scan reads structure, work, fields and activity.' },
  { n: '04', t: 'Report', d: 'A deterministic score, findings and grounded recommendations.' },
]

const marqueeItems = [
  'ClickUp OAuth',
  '7 weighted categories',
  'Background scans',
  'Grounded AI explanations',
  'White-label reports',
  'Read-only by design',
  '39 configurable rules',
  'PDF exports',
]

export default function Landing({
  onConnect,
  onSample,
}: {
  onConnect: () => void
  onSample: () => void
}) {
  const reduce = useReducedMotion()
  const wrap = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: wrap, offset: ['start start', 'end start'] })
  const textY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -70])
  const orbY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 90])
  const orbScale = useTransform(scrollYProgress, [0, 1], [1, reduce ? 1 : 1.08])
  const fade = useTransform(scrollYProgress, [0, 0.8], [1, reduce ? 1 : 0.35])

  return (
    <div ref={wrap} className="relative mx-auto max-w-[1360px] px-6 pb-24 pt-32">
      <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8">
        <motion.div style={{ y: textY, opacity: fade }}>
          <motion.div initial="hidden" animate="show" variants={stagger(0.09)}>
            <motion.div variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}>
              <Chip>
                <span className="h-1.5 w-1.5 rounded-full bg-magenta" /> ClickUp Workspace Intelligence
              </Chip>
            </motion.div>

            <h1 className="mt-7 font-display text-[2.6rem] font-semibold leading-[1.02] tracking-display text-txt-primary sm:text-[3.4rem] lg:text-[3.9rem]">
              <WordReveal text="Grade your ClickUp" />
              <br />
              <span className="text-txt-primary">workspace </span>
              <span className="relative inline-block bg-[linear-gradient(90deg,#24574E,#5FBA95,#E01072,#24574E)] bg-[length:200%_100%] bg-clip-text text-transparent animate-gradientMove">
                in minutes.
              </span>
            </h1>

            <motion.p
              variants={{ hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0 } }}
              className="mt-6 max-w-xl text-[17px] leading-relaxed text-txt-muted"
            >
              Connect ClickUp and get a fully automated health assessment — structure, workflow,
              data quality, operations, adoption and utilisation — scored, explained and turned into
              clear recommendations. No consultant, no manual review.
            </motion.p>

            <motion.div
              variants={{ hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0 } }}
              className="mt-9 flex flex-wrap items-center gap-4"
            >
              <Magnetic>
                <Button onClick={onConnect} size="lg" icon={<IconArrow className="h-5 w-5" />}>
                  Grade my workspace
                </Button>
              </Magnetic>
              <Magnetic strength={0.2}>
                <Button variant="ghost" size="lg" onClick={onSample}>
                  See a sample report
                </Button>
              </Magnetic>
            </motion.div>

            <motion.div
              variants={{ hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0 } }}
              className="mt-9 flex flex-wrap items-center gap-x-7 gap-y-3"
            >
              {[
                { icon: <IconShield className="h-4 w-4 text-sev-good" />, label: 'Read-only access' },
                { icon: <span className="h-1.5 w-1.5 rounded-full bg-magenta" />, label: 'Token removed after scan' },
                { icon: <span className="h-1.5 w-1.5 rounded-full bg-brand-glow" />, label: 'No email to see results' },
              ].map((f) => (
                <div key={f.label} className="flex items-center gap-2 text-sm text-txt-muted">
                  {f.icon}
                  {f.label}
                </div>
              ))}
            </motion.div>
          </motion.div>
        </motion.div>

        <motion.div
          style={{ y: orbY, scale: orbScale }}
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: d(1.1), ease: EASE }}
          className="relative"
        >
          <div className="relative mx-auto aspect-square w-full max-w-[520px]">
            <div className="absolute inset-8 animate-halo rounded-full bg-brand/20 blur-[90px]" />
            <Suspense fallback={OrbFallback}>
              <OrbView className="relative h-full w-full" fallback={OrbFallback} />
            </Suspense>

            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
              className="glass absolute -left-4 top-10 rounded-2xl px-4 py-3"
            >
              <Eyebrow>Health score</Eyebrow>
              <div className="mt-1 font-mono text-2xl text-magenta">
                74<span className="text-sm text-txt-faint">/100</span>
              </div>
            </motion.div>

            <motion.div
              animate={{ y: [0, 12, 0] }}
              transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
              className="glass absolute -right-2 bottom-16 rounded-2xl px-4 py-3"
            >
              <Eyebrow>Findings</Eyebrow>
              <div className="mt-1 flex items-center gap-2 font-mono text-sm">
                <span className="text-sev-critical">4 crit</span>
                <span className="text-txt-faint">·</span>
                <span className="text-sev-high">11 high</span>
                <span className="text-txt-faint">·</span>
                <span className="text-sev-opportunity">24 opp</span>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* marquee */}
      <div className="relative mt-20 overflow-hidden border-y border-line py-4">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-ink to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-ink to-transparent" />
        <div className="flex w-max animate-marquee gap-10">
          {[...marqueeItems, ...marqueeItems].map((m, i) => (
            <span key={i} className="flex items-center gap-3 whitespace-nowrap font-mono text-[12px] uppercase tracking-eyebrow text-txt-faint">
              <span className="h-1 w-1 rounded-full bg-brand-glow" />
              {m}
            </span>
          ))}
        </div>
      </div>

      {/* stat strip */}
      <Reveal className="mt-14">
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line/60 md:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="bg-ink-soft/80 px-6 py-6">
              <div className="font-mono text-3xl text-txt-primary">{s.value}</div>
              <div className="mt-1 text-sm text-txt-faint">{s.label}</div>
            </div>
          ))}
        </div>
      </Reveal>

      {/* how it works */}
      <div className="mt-20">
        <Eyebrow>From connect to report</Eyebrow>
        <div className="mt-6 grid gap-5 md:grid-cols-4">
          {how.map((s, i) => (
            <Reveal key={s.n} delay={i * 0.08}>
              <div className="glass group h-full rounded-2xl p-6 transition-transform duration-500 hover:-translate-y-1">
                <div className="font-mono text-xs text-brand-glow">{s.n}</div>
                <div className="mt-4 font-display text-lg font-medium text-txt-primary">{s.t}</div>
                <div className="mt-2 text-sm leading-relaxed text-txt-muted">{s.d}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </div>
  )
}
