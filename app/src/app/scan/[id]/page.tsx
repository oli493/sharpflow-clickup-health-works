'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Eyebrow, IconCheck, Panel } from '@/components/ui'
import { getScanStatus, IS_MOCK } from '@/lib/api'
import { MOCK_SCAN_STAGES } from '@/lib/mock/scan'

const RADIUS = 78
const CIRC = 2 * Math.PI * RADIUS

const STAGES = MOCK_SCAN_STAGES

export default function ScanPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params.id
  const [index, setIndex] = useState(0)
  const [tasks, setTasks] = useState(0)
  const done = index >= STAGES.length - 1

  useEffect(() => {
    const target = 14217
    const t = setInterval(() => setTasks((v) => (v + Math.round(target / 34) >= target ? target : v + Math.round(target / 34))), 90)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (IS_MOCK) {
      if (index >= STAGES.length - 1) {
        const end = setTimeout(() => router.replace(`/report/${id}`), 1200)
        return () => clearTimeout(end)
      }
      const t = setTimeout(() => setIndex((i) => i + 1), index === 0 ? 900 : 900)
      return () => clearTimeout(t)
    }

    // Real mode: poll the scan status.
    let active = true
    const poll = async () => {
      try {
        const s = await getScanStatus(id)
        if (!active) return
        const stageIndex = Math.min(STAGES.length - 1, Math.floor((s.progress / 100) * (STAGES.length - 1)))
        setIndex(stageIndex)
        if (s.status === 'complete') router.replace(`/report/${id}`)
        else if (s.status === 'failed') setIndex(STAGES.length - 1)
        else setTimeout(poll, 1500)
      } catch {
        if (active) setTimeout(poll, 2000)
      }
    }
    poll()
    return () => {
      active = false
    }
  }, [id, router, index])

  const progress = Math.min(1, (index + 0.35) / STAGES.length)

  return (
    <div className="mx-auto grid min-h-screen max-w-[980px] place-items-center px-6 pb-16 pt-32">
      <div className="w-full">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <Eyebrow className="mb-3">Step 3 · Background audit running</Eyebrow>
          <h1 className="font-display text-3xl font-semibold tracking-display text-txt-primary sm:text-4xl">Reading the workspace</h1>
          <p className="mt-3 text-[15px] text-txt-muted">This runs on our servers: you can safely close the browser.</p>
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
              <div className="font-mono text-[10px] uppercase tracking-widest text-txt-faint">{tasks.toLocaleString()} tasks</div>
            </div>
          </div>

          <div className="space-y-1.5">
            {STAGES.map((s, i) => {
              const isDone = i < index
              const active = i === index
              return (
                <div key={s.label} className={`flex items-center gap-4 rounded-xl px-4 py-3 transition-colors ${active ? 'bg-brand-ink/[0.05]' : ''}`}>
                  <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border ${isDone ? 'border-sev-good/40 bg-sev-good/15 text-sev-good' : active ? 'border-magenta/50 bg-magenta/10 text-magenta' : 'border-line text-txt-faint'}`}>
                    {isDone ? <IconCheck className="h-3.5 w-3.5" /> : active ? <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-magenta" /> : <span className="font-mono text-[10px]">{i + 1}</span>}
                  </span>
                  <span className="flex-1">
                    <span className={`block text-sm ${isDone || active ? 'text-txt-primary' : 'text-txt-faint'}`}>{s.label}</span>
                    <span className="block font-mono text-[11px] text-txt-faint">{s.detail}</span>
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
