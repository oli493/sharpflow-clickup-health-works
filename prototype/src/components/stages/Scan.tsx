import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Eyebrow, IconCheck, Panel } from '../ui'
import { scanStages } from '../../data/demoData'
import { EASE, d } from '../../lib/motion'

const RADIUS = 78
const CIRC = 2 * Math.PI * RADIUS

const logTemplates = [
  'GET /v2/team/9013/space 200',
  'GET /v2/space/…/folder 200',
  'GET /v2/list/…/task?page=… 200',
  'GET /v2/list/…/field 200',
  'GET /v2/task/…/time_in_status 200',
  'rate-limit ok · 92 req/min',
  'GET /v2/team/9013/view 200',
  'GET /v2/list/…/comment 200',
]

export default function Scan({ onDone }: { onDone: () => void }) {
  const [index, setIndex] = useState(0)
  const [tasks, setTasks] = useState(0)
  const [logs, setLogs] = useState<string[]>([])
  const total = scanStages.length
  const done = index >= total - 1
  const logIndex = useRef(0)

  useEffect(() => {
    if (index >= total - 1) {
      const end = setTimeout(onDone, d(1.5) * 1000)
      return () => clearTimeout(end)
    }
    const t = setTimeout(() => setIndex((i) => i + 1), d(index === 0 ? 0.9 : 1.05) * 1000)
    return () => clearTimeout(t)
  }, [index, total, onDone])

  useEffect(() => {
    const target = 14217
    const id = setInterval(() => {
      setTasks((t) => {
        const next = t + Math.round(target / 34)
        return next >= target ? target : next
      })
    }, 90)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const id = setInterval(() => {
      logIndex.current += 1
      setLogs((prev) => {
        const line = `[${new Date().toLocaleTimeString('en-GB')}] ${logTemplates[logIndex.current % logTemplates.length]}`
        return [...prev.slice(-5), line]
      })
    }, 420)
    return () => clearInterval(id)
  }, [])

  const progress = Math.min(1, (index + 0.35) / total)
  const particles = useMemo(
    () => Array.from({ length: 14 }).map((_, i) => ({ id: i, x: (i * 37) % 100, y: (i * 61) % 100, dur: 3 + (i % 4) })),
    [],
  )

  return (
    <div className="mx-auto grid min-h-screen max-w-[980px] place-items-center px-6 pb-16 pt-32">
      <div className="w-full">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <Eyebrow className="mb-3">Step 4 · Background audit running</Eyebrow>
          <h1 className="font-display text-3xl font-semibold tracking-display text-txt-primary sm:text-4xl">
            Reading the workspace
          </h1>
          <p className="mt-3 text-[15px] text-txt-muted">
            This runs on our servers — you can safely close the browser.
          </p>
        </motion.div>

        <Panel className="mt-10 grid gap-10 p-8 md:grid-cols-[auto_1fr] md:items-center md:p-10">
          {/* progress ring */}
          <div className="relative mx-auto grid h-52 w-52 place-items-center">
            <div className="absolute inset-4 rounded-full bg-brand/15 blur-2xl" />
            {/* radar */}
            <div
              className="absolute inset-6 animate-radar rounded-full opacity-60"
              style={{
                background:
                  'conic-gradient(from 0deg, rgba(224,16,114,0.30), transparent 25%, transparent 100%)',
                WebkitMaskImage: 'radial-gradient(circle, black 60%, transparent 62%)',
                maskImage: 'radial-gradient(circle, black 60%, transparent 62%)',
              }}
            />
            {/* particles */}
            {particles.map((p) => (
              <motion.span
                key={p.id}
                className="absolute h-1 w-1 rounded-full bg-brand-glow"
                style={{ left: `${p.x}%`, top: `${p.y}%` }}
                animate={{ opacity: [0, 0.9, 0], scale: [0.6, 1.4, 0.6] }}
                transition={{ duration: p.dur, repeat: Infinity, delay: p.id * 0.2 }}
              />
            ))}

            <svg viewBox="0 0 200 200" className="relative h-52 w-52 -rotate-90">
              <circle cx="100" cy="100" r={RADIUS} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
              <motion.circle
                cx="100"
                cy="100"
                r={RADIUS}
                fill="none"
                stroke="#E01072"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={CIRC}
                initial={{ strokeDashoffset: CIRC }}
                animate={{ strokeDashoffset: CIRC * (1 - progress) }}
                transition={{ type: 'spring', stiffness: 60, damping: 16 }}
                style={{ filter: 'drop-shadow(0 0 8px rgba(224,16,114,0.55))' }}
              />
            </svg>

            <div className="absolute text-center">
              <AnimatePresence mode="wait">
                {done ? (
                  <motion.div
                    key="done"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 320, damping: 18 }}
                    className="grid h-16 w-16 place-items-center rounded-full bg-sev-good/15 text-sev-good"
                  >
                    <IconCheck className="h-8 w-8" />
                  </motion.div>
                ) : (
                  <motion.div key="num" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <div className="font-mono text-3xl tabular-nums text-txt-primary">
                      {Math.round(progress * 100)}%
                    </div>
                    <div className="font-mono text-[10px] uppercase tracking-widest text-txt-faint">
                      {tasks.toLocaleString()} tasks
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            {!done && <span className="absolute h-40 w-40 animate-pulseRing rounded-full border border-magenta/40" />}
          </div>

          {/* stage list */}
          <div className="space-y-1.5">
            {scanStages.map((s, i) => {
              const isDone = i < index
              const active = i === index
              return (
                <motion.div
                  key={s.label}
                  layout
                  className={`flex items-center gap-4 rounded-xl px-4 py-3 transition-colors ${
                    active ? 'bg-brand-ink/[0.05]' : ''
                  }`}
                >
                  <span
                    className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border transition-colors ${
                      isDone
                        ? 'border-sev-good/40 bg-sev-good/15 text-sev-good'
                        : active
                          ? 'border-magenta/50 bg-magenta/10 text-magenta'
                          : 'border-line text-txt-faint'
                    }`}
                  >
                    {isDone ? (
                      <IconCheck className="h-3.5 w-3.5" />
                    ) : active ? (
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-magenta" />
                    ) : (
                      <span className="font-mono text-[10px]">{i + 1}</span>
                    )}
                  </span>
                  <span className="flex-1">
                    <span className={`block text-sm ${isDone || active ? 'text-txt-primary' : 'text-txt-faint'}`}>
                      {s.label}
                    </span>
                    <span className="block font-mono text-[11px] text-txt-faint">{s.detail}</span>
                  </span>
                  {active && (
                    <span className="overflow-hidden rounded-full">
                      <span className="block h-1 w-16 animate-shimmer rounded-full bg-[linear-gradient(90deg,transparent,rgba(229,254,112,0.8),transparent)] bg-[length:200%_100%]" />
                    </span>
                  )}
                </motion.div>
              )
            })}
          </div>
        </Panel>

        {/* live log */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: d(0.3) }}
          className="mt-6 overflow-hidden rounded-xl border border-line bg-white/70 px-5 py-4"
        >
          <div className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-txt-faint">
            <span className={`h-1.5 w-1.5 rounded-full ${done ? 'bg-sev-good' : 'animate-pulse bg-magenta'}`} />
            live scan log
          </div>
          <div className="space-y-1">
            {logs.map((l, i) => (
              <motion.div
                key={l + i}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: i === logs.length - 1 ? 1 : 0.45, x: 0 }}
                className="truncate font-mono text-[11px] text-txt-muted"
              >
                {l}
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
