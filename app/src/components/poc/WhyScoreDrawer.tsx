'use client'

import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { scoreBand, severityMeta } from '../../lib/format'
import type { PocCategory, PocSignal } from '../../lib/mock/poc'

const ORDER: Record<PocSignal['status'], number> = { bad: 0, watch: 1, good: 2 }

function SignalRow({ signal }: { signal: PocSignal }) {
  const meta = signal.severity ? severityMeta[signal.severity] : null
  const statusLabel = signal.status === 'good' ? 'Within target' : signal.status === 'watch' ? 'Watch' : meta?.label ?? 'Below target'
  const statusColor = signal.status === 'good' ? '#2F9E74' : signal.status === 'watch' ? '#B38A00' : meta?.color ?? '#E01072'
  const statusSoft = signal.status === 'good' ? 'rgba(47,158,116,0.10)' : signal.status === 'watch' ? 'rgba(179,138,0,0.10)' : meta?.soft ?? 'rgba(224,16,114,0.10)'

  return (
    <div className="rounded-xl border border-line bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="font-display text-[14px] font-medium text-txt-primary">{signal.name}</div>
          <div className="mt-1 flex flex-wrap items-center gap-2 font-mono text-[11px]">
            <span className="font-semibold text-txt-primary">{signal.value}</span>
            <span className="text-txt-faint">vs target {signal.target}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest" style={{ background: statusSoft, color: statusColor }}>
            {statusLabel}
          </span>
          {signal.impact != null && signal.impact > 0 && (
            <span className="rounded-full bg-magenta/[0.08] px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-magenta">
              -{signal.impact.toFixed(1)} pts
            </span>
          )}
        </div>
      </div>

      <p className="mt-2 text-[12.5px] leading-relaxed text-txt-muted">{signal.why}</p>

      <div className="mt-2 rounded-lg bg-brand-ink/[0.03] px-3 py-2">
        <span className="font-mono text-[9px] uppercase tracking-widest text-txt-faint">Good looks like </span>
        <span className="text-[11.5px] text-txt-muted">{signal.good}</span>
      </div>

      {signal.affected && (
        <div className="mt-2 font-mono text-[10px] text-txt-faint">Affected: {signal.affected}</div>
      )}
    </div>
  )
}

export default function WhyScoreDrawer({
  category,
  onClose,
}: {
  category: PocCategory | null
  onClose: () => void
}) {
  useEffect(() => {
    if (!category) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [category, onClose])

  if (typeof document === 'undefined') return null

  const band = category ? scoreBand(category.score) : null
  const signals = category ? [...category.signals].sort((a, b) => ORDER[a.status] - ORDER[b.status]) : []

  return createPortal(
    <AnimatePresence>
      {category && band && (
        <motion.div className="fixed inset-0 z-[80] flex justify-end" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-brand-ink/35 backdrop-blur-sm" onClick={onClose} />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
            className="relative flex h-full w-full max-w-[640px] flex-col border-l border-line bg-[#F6F5F1] shadow-panel"
          >
            <div className="panel-gradient relative px-7 pb-6 pt-7 text-white">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-widest text-lime">Why this score - PoC</div>
                  <h2 className="mt-2 font-display text-2xl font-semibold">{category.name}</h2>
                  <p className="mt-1 max-w-md text-[13px] text-white/80">{category.summary}</p>
                </div>
                <button
                  onClick={onClose}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25"
                  aria-label="Close"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
                    <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
              </div>

              <div className="mt-5 flex flex-wrap items-end gap-5">
                <div className="font-mono text-5xl" style={{ color: band.color }}>
                  {category.score}
                  <span className="text-sm text-white/60">/100</span>
                </div>
                <div className="mb-1 rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-widest" style={{ background: 'rgba(255,255,255,0.14)', color: band.color }}>
                  {band.label}
                </div>
                <div className="mb-1 text-[12px] text-white/75">
                  Costing you <span className="font-semibold text-white">-{category.overallImpact.toFixed(1)}</span> overall points
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="font-display text-[15px] font-medium text-txt-primary">The signals behind the score</div>
                  <div className="mt-1 text-[12px] text-txt-muted">Bad signals first, healthy signals after.</div>
                </div>
                <span className="rounded-full border border-line px-3 py-1 font-mono text-[9px] uppercase tracking-widest text-txt-faint">
                  {signals.filter((s) => s.status === 'bad').length} below target
                </span>
              </div>

              <div className="space-y-3">
                {signals.map((signal) => (
                  <SignalRow key={signal.name} signal={signal} />
                ))}
              </div>

              <div className="mt-5 rounded-xl border border-brand/20 bg-brand/[0.05] p-4">
                <div className="font-mono text-[9px] uppercase tracking-widest text-brand-glow">How the score works</div>
                <p className="mt-1.5 text-[12px] leading-relaxed text-txt-muted">
                  Each signal carries a weight inside its category. A signal outside target deducts points based on severity and how far it is from target. Healthy signals do not lower the score.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-line bg-white px-6 py-4">
              <span className="font-mono text-[10px] uppercase tracking-widest text-txt-faint">Proof of concept - sample data</span>
              <button onClick={onClose} className="rounded-full bg-brand-ink px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-white">
                Close
              </button>
            </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
