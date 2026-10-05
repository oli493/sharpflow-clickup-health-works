'use client'

import { useEffect, useMemo, useState } from 'react'
import { Chip, IconSpark, Panel } from '../ui'

export default function ExecutiveSummary({ summary }: { summary: string[] }) {
  const words = useMemo(() => {
    const out: { p: number; text: string }[] = []
    summary.forEach((para, p) => para.split(' ').forEach((text) => out.push({ p, text })))
    return out
  }, [summary])

  const [revealed, setRevealed] = useState(0)
  const done = revealed >= words.length

  useEffect(() => {
    if (done) return
    const t = setTimeout(() => setRevealed((r) => r + 1), 34)
    return () => clearTimeout(t)
  }, [revealed, done])

  const paragraphs = summary.map((_, p) => words.filter((w, i) => w.p === p && i < revealed))
  const activePara = paragraphs.findIndex((_, p) => paragraphs[p].length < words.filter((w) => w.p === p).length)

  return (
    <Panel className="relative overflow-hidden p-7">
      <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-brand/20 blur-[80px]" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-magenta/10 text-magenta">
            <IconSpark className="h-4 w-4" />
          </span>
          <div>
            <h3 className="font-display text-lg text-txt-primary">AI executive summary</h3>
            <p className="font-mono text-[11px] text-txt-faint">Explains the engine — never sets the score</p>
          </div>
        </div>
        <Chip className={done ? '' : 'animate-pulse'}>
          <span className={`h-1.5 w-1.5 rounded-full ${done ? 'bg-sev-good' : 'bg-magenta'}`} />
          {done ? 'Grounded in the findings' : 'Generating…'}
        </Chip>
      </div>

      <div className="mt-6 space-y-4">
        {paragraphs.map((para, p) => {
          if (para.length === 0) return null
          const isActive = p === activePara && !done
          return (
            <p key={p} className="text-[14px] leading-relaxed text-txt-muted">
              {para.map((w, i) => (
                <span key={i}>{w.text}{i < para.length - 1 ? ' ' : ''}</span>
              ))}
              {isActive && <span className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 animate-pulse bg-magenta align-middle" />}
            </p>
          )
        })}
      </div>

      <div className="mt-6 flex items-center gap-3 border-t border-line pt-5 font-mono text-[10px] uppercase tracking-widest text-txt-faint">
        <span>Deterministic scores</span>
        <span className="h-1 w-1 rounded-full bg-txt-faint" />
        <span>LLM explanations only</span>
      </div>
    </Panel>
  )
}
