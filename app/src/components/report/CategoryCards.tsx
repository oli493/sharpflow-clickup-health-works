'use client'

import { motion } from 'framer-motion'
import { Panel } from '../ui'
import { scoreBand } from '../../lib/format'
import { useTilt } from '../../lib/useTilt'
import { useDrill } from './Drill'
import type { CategoryResult } from '../../lib/types'

function MiniRing({ value, color }: { value: number; color: string }) {
  const r = 16
  const c = 2 * Math.PI * r
  return (
    <svg viewBox="0 0 40 40" className="h-10 w-10 -rotate-90">
      <circle cx="20" cy="20" r={r} fill="none" stroke="rgba(23,52,53,0.1)" strokeWidth="4" />
      <motion.circle
        cx="20" cy="20" r={r} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeDasharray={c}
        initial={{ strokeDashoffset: c }}
        whileInView={{ strokeDashoffset: c * (1 - value / 100) }}
        viewport={{ once: true }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
        style={{ filter: `drop-shadow(0 0 4px ${color}88)` }}
      />
    </svg>
  )
}

function CatCard({ cat, index }: { cat: CategoryResult; index: number }) {
  const { ref } = useTilt<HTMLDivElement>({ max: 8 })
  const { open } = useDrill()
  const band = scoreBand(cat.score)

  if (!cat.scored) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 22 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: (index % 4) * 0.06 }}
      >
        <div className="flex h-full flex-col justify-between rounded-xl2 border border-dashed border-line-strong bg-white/40 p-5">
          <span className="font-mono text-[11px] uppercase tracking-widest text-txt-faint">Not measured</span>
          <div>
            <h3 className="font-display text-[15px] font-medium leading-snug text-txt-primary/70">{cat.name}</h3>
            <p className="mt-2 text-[12.5px] leading-relaxed text-txt-faint">
              Not enough measurable data through the ClickUp API yet: excluded from the score.
            </p>
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 26, rotateX: -8 }}
      whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.7, delay: (index % 4) * 0.07, ease: [0.16, 1, 0.3, 1] }}
      style={{ perspective: 900 }}
    >
      <div ref={ref}>
        <Panel className="glare h-full p-5">
          <div className="flex items-start justify-between">
            <div className="relative grid place-items-center">
              <MiniRing value={cat.score} color={band.color} />
              <span className="absolute font-mono text-[13px] text-txt-primary">{cat.score}</span>
            </div>
            <span className="rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest" style={{ background: band.soft, color: band.color }}>
              {band.label}
            </span>
          </div>

          <h3 className="mt-4 font-display text-[15px] font-medium leading-snug text-txt-primary">{cat.name}</h3>
          <p className="mt-2 text-[12.5px] leading-relaxed text-txt-muted">{cat.blurb}</p>

          <div className="mt-4 space-y-1 border-t border-line pt-4">
            {cat.metrics.map((m) => {
              const valueEl = (
                <span className={m.tone === 'down' ? 'text-sev-high' : m.tone === 'up' ? 'text-sev-good' : 'text-txt-muted'}>{m.value}</span>
              )
              return m.drill ? (
                <button
                  key={m.label}
                  data-cursor="hover"
                  onClick={() => open(m.drill!)}
                  className="group flex w-full items-center justify-between rounded-md px-1.5 py-1 font-mono text-[11px] transition-colors hover:bg-brand-ink/[0.05]"
                >
                  <span className="flex items-center gap-1.5 text-txt-faint group-hover:text-txt-primary">
                    {m.label}
                    <span className="text-[9px] text-brand-glow opacity-0 transition-opacity group-hover:opacity-100">drill ▸</span>
                  </span>
                  {valueEl}
                </button>
              ) : (
                <div key={m.label} className="flex items-center justify-between px-1.5 font-mono text-[11px]">
                  <span className="text-txt-faint">{m.label}</span>
                  {valueEl}
                </div>
              )
            })}
          </div>
        </Panel>
      </div>
    </motion.div>
  )
}

export default function CategoryCards({ categories }: { categories: CategoryResult[] }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {categories.map((cat, i) => (
        <CatCard key={cat.key} cat={cat} index={i} />
      ))}
      <motion.div
        initial={{ opacity: 0, y: 26 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="sm:col-span-2 lg:col-span-1"
      >
        <div className="flex h-full flex-col justify-between rounded-xl2 border border-dashed border-line-strong bg-brand-ink/[0.03] p-5 transition-colors hover:border-brand/40">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand/15 text-brand-glow">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <h3 className="font-display text-[15px] font-medium text-txt-primary">Configurable scoring</h3>
            <p className="mt-2 text-[12.5px] leading-relaxed text-txt-muted">
              Categories, weights and thresholds are defined with Sharpflow and can change without a rebuild.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
