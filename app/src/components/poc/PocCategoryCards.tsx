'use client'

import { motion } from 'framer-motion'
import { Panel } from '../ui'
import { scoreBand } from '../../lib/format'
import type { PocCategory } from '../../lib/mock/poc'

function MiniRing({ value, color }: { value: number; color: string }) {
  const r = 16
  const c = 2 * Math.PI * r
  return (
    <svg viewBox="0 0 40 40" className="h-10 w-10 -rotate-90">
      <circle cx="20" cy="20" r={r} fill="none" stroke="rgba(23,52,53,0.1)" strokeWidth="4" />
      <motion.circle
        cx="20"
        cy="20"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={c}
        initial={{ strokeDashoffset: c }}
        whileInView={{ strokeDashoffset: c * (1 - value / 100) }}
        viewport={{ once: true }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
      />
    </svg>
  )
}

function PocCard({ cat, index, onExplain }: { cat: PocCategory; index: number; onExplain: (key: string) => void }) {
  const band = scoreBand(cat.score)
  const bad = cat.signals.filter((s) => s.status === 'bad').length
  const good = cat.signals.filter((s) => s.status === 'good').length

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.55, delay: (index % 4) * 0.06, ease: [0.16, 1, 0.3, 1] }}
    >
      <Panel className="flex h-full flex-col p-5">
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
        <p className="mt-2 text-[12.5px] leading-relaxed text-txt-muted">{cat.summary}</p>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-magenta/20 bg-magenta/[0.05] px-3 py-2">
            <div className="font-mono text-[9px] uppercase tracking-widest text-magenta/80">Pulling down</div>
            <div className="mt-1 font-mono text-lg text-txt-primary">{bad}</div>
          </div>
          <div className="rounded-lg border border-line bg-brand-ink/[0.02] px-3 py-2">
            <div className="font-mono text-[9px] uppercase tracking-widest text-txt-faint">Within target</div>
            <div className="mt-1 font-mono text-lg text-txt-primary">{good}</div>
          </div>
        </div>

        <div className="mt-auto pt-4">
          <button
            onClick={() => onExplain(cat.key)}
            className="flex w-full items-center justify-between rounded-lg border border-brand/30 bg-brand/[0.06] px-3 py-2.5 text-left transition-colors hover:bg-brand/10"
          >
            <span className="font-mono text-[10px] uppercase tracking-widest text-brand-glow">Why this score</span>
            <span className="font-mono text-[11px] text-brand-glow">-&gt;</span>
          </button>
        </div>
      </Panel>
    </motion.div>
  )
}

export default function PocCategoryCards({
  categories,
  onExplain,
}: {
  categories: PocCategory[]
  onExplain: (key: string) => void
}) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {categories.map((cat, i) => (
        <PocCard key={cat.key} cat={cat} index={i} onExplain={onExplain} />
      ))}
    </div>
  )
}
