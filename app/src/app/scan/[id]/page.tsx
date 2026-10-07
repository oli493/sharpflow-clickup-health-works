'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Eyebrow, IconCheck, Panel } from '@/components/ui'
import { getScanStatus, IS_MOCK } from '@/lib/api'

const RADIUS = 78
const CIRC = 2 * Math.PI * RADIUS

// Matches the worker's progress stages (see inngest/scan.ts).
const STAGES = [
  { label: 'Connecting to ClickUp', detail: 'Secure OAuth · read-only', at: 5 },
  { label: 'Mapping workspace structure', detail: 'Spaces, Folders and Lists', at: 15 },
  { label: 'Analysing tasks', detail: 'Pagination · retries · rate limits', at: 35 },
  { label: 'Sampling activity', detail: 'Comments and member activity', at: 55 },
  { label: 'Calculating Health Score', detail: '7 weighted categories', at: 70 },
  { label: 'Generating recommendations', detail: 'AI explanations grounded in metrics', at: 90 },
  { label: 'Report ready', detail: '', at: 100 },
]

function stageIndexFor(pct: number) {
  return STAGES.reduce((acc, s, i) => (pct >= s.at ? i : acc), 0)
}

export default function ScanPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params.id
  const [pct, setPct] = useState(0)
  const [score, setScore] = useState<number | null>(null)
  const index = stageIndexFor(pct)
  const done = index >= STAGES.length - 1

  useEffect(() => {
    if (IS_MOCK) {
      let i = 0
      const t = setInterval(() => {
        i += 1
        setPct(Math.min(100, Math.round((i / (STAGES.length - 1)) * 100)))
        if (i >= STAGES.length - 1) {
          clearInterval(t)
          setTimeout(() => router.replace(`/report/${id}`), 1200)
        }
      }, 900)
      return () => clearInterval(t)
    }

    // Real mode: poll the scan status.
    let active = true
    const poll = async () => {
      try {
        const s = await getScanStatus(id)
        if (!active) return
        setPct(s.progress ?? 0)
        if (s.status === 'complete') {
          setScore(s.result?.overallScore ?? null)
          setPct(100)
          setTimeout(() => router.replace(`/report/${id}`), 1400)
          return
        }
        if (s.status === 'failed') {
          setPct(100)
          return
        }
        setTimeout(poll, 1500)
      } catch {
        if (active) setTimeout(poll, 2000)
      }
    }
    poll()
    return () => {
      active = false
    }
  }, [id, router])

  const progress = Math.min(1, pct / 100)

  return (
    <div className="mx-auto grid min-h-screen max-w-[980px] place-items-center px-6 pb-16 pt-32">
      <div className="w-full">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <Eyebrow className="mb-3">Step 3 · Background audit running</Eyebrow>
          <h1 className="font-display text-3xl font-semibold tracking-display text-txt-primary sm:text-4xl">Reading the workspace</h1>
          <p className="mt-3 text-[15px] text-txt-muted">This runs on our servers. Your report will appear here automatically when it's ready: keep this tab open (or bookmark this link).</p>
        </motion.div>

        <Panel className="mt-10 grid gap-10 p-8 md:grid-cols-[auto_1fr] md:items-center md:p-10">
          <div className="relative mx-auto grid h-52 w-52 place-items-center">
            <div className="absolute inset-4 rounded-full bg-brand/15 blur-2xl" />
            <svg viewBox="0 0 200 200" className="relative h-52 w-52 -rotate-90">
              <circle cx="100" cy="100" r={RADIUS} fill="none" stroke="rgba(23,52,53,0.1)" strokeWidth="6" />
              <motion.circle
                cx="100" cy="100" r={RADIUS} fill="none" stroke="#E01072" strokeWidth="6" strokeLinecap="round" strokeDasharray={CIRC}
                initial={{ strokeDashoffset: CIRC }}
                animate={{ strokeDashoffset: CIRC * (1 - progress) }}
                transition={{ type: 'spring', stiffness: 60, damping: 16 }}
                style={{ filter: 'drop-shadow(0 0 8px rgba(224,16,114,0.55))' }}
              />
            </svg>
            <div className="absolute text-center">
              <div className="font-mono text-3xl tabular-nums text-txt-primary">{Math.round(progress * 100)}%</div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-txt-faint">
                {done ? (score != null ? `Score ${score}/100` : 'Complete') : 'Audit in progress'}
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            {STAGES.map((s, i) => {
              const isDone = i < index || (done && i === index)
              const active = i === index && !done
              const detail = i === STAGES.length - 1 && score != null ? `Score ${score} / 100` : s.detail
              return (
                <div key={s.label} className={`flex items-center gap-4 rounded-xl px-4 py-3 transition-colors ${active ? 'bg-brand-ink/[0.05]' : ''}`}>
                  <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border ${isDone ? 'border-sev-good/40 bg-sev-good/15 text-sev-good' : active ? 'border-magenta/50 bg-magenta/10 text-magenta' : 'border-line text-txt-faint'}`}>
                    {isDone ? <IconCheck className="h-3.5 w-3.5" /> : active ? <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-magenta" /> : <span className="font-mono text-[10px]">{i + 1}</span>}
                  </span>
                  <span className="flex-1">
                    <span className={`block text-sm ${isDone || active ? 'text-txt-primary' : 'text-txt-faint'}`}>{s.label}</span>
                    {detail && <span className="block font-mono text-[11px] text-txt-faint">{detail}</span>}
                  </span>
                </div>
              )
            })}
          </div>
        </Panel>
      </div>
    </div>
  )
}
