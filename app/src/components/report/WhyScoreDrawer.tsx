'use client'

import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { scoreBand, severityMeta } from '../../lib/format'
import { useDrill } from './Drill'
import type { CategoryResult, SignalExplanation, SignalStatus } from '../../lib/types'

const ORDER: Record<SignalStatus, number> = {
  below: 0,
  above: 0,
  insight: 1,
  not_measured: 2,
  within: 3,
}

function statusLabel(signal: SignalExplanation): string {
  if (signal.status === 'within') return 'Within target'
  if (signal.status === 'not_measured') return 'Not measured'
  if (signal.status === 'insight') return 'Insight only'
  if (signal.severity) return severityMeta[signal.severity].label
  return signal.status === 'below' ? 'Below target' : 'Above target'
}

function statusColors(signal: SignalExplanation) {
  if (signal.status === 'within') return { color: '#2F9E74', soft: 'rgba(47,158,116,0.10)' }
  if (signal.status === 'not_measured') return { color: '#7A807C', soft: 'rgba(122,128,124,0.10)' }
  if (signal.status === 'insight') return { color: '#2F9E74', soft: 'rgba(47,158,116,0.10)' }
  const meta = signal.severity ? severityMeta[signal.severity] : null
  return { color: meta?.color ?? '#E01072', soft: meta?.soft ?? 'rgba(224,16,114,0.10)' }
}

function SignalRow({ signal, onDrill }: { signal: SignalExplanation; onDrill: (drill: string) => void }) {
  const colors = statusColors(signal)
  const isBad = signal.status === 'below' || signal.status === 'above'

  return (
    <div className="rounded-xl border border-line bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-display text-[14px] font-medium text-txt-primary">{signal.name}</div>
          <div className="mt-1 flex flex-wrap items-center gap-2 font-mono text-[11px]">
            <span className="font-semibold text-txt-primary">{signal.value}</span>
            <span className="text-txt-faint">vs target {signal.target}</span>
            <span className="text-txt-faint">· {signal.weight}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          <span className="rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest" style={{ background: colors.soft, color: colors.color }}>
            {statusLabel(signal)}
          </span>
          {signal.categoryPoints > 0 && (
            <span className="rounded-full bg-magenta/[0.08] px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-magenta">
              -{signal.categoryPoints.toFixed(1)} category pts
            </span>
          )}
        </div>
      </div>

      <p className="mt-2 text-[12.5px] leading-relaxed text-txt-muted">{signal.why}</p>

      {isBad && signal.overallPoints != null && signal.overallPoints > 0 && (
        <div className="mt-2 font-mono text-[10px] text-magenta">About -{signal.overallPoints.toFixed(1)} overall points</div>
      )}

      <div className="mt-2 rounded-lg bg-brand-ink/[0.03] px-3 py-2">
        <span className="font-mono text-[9px] uppercase tracking-widest text-txt-faint">Good looks like </span>
        <span className="text-[11.5px] text-txt-muted">{signal.good}</span>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-3">
        {signal.affected && <span className="font-mono text-[10px] text-txt-faint">Affected: {signal.affected}</span>}
        {signal.drill && (
          <button
            onClick={() => onDrill(signal.drill!)}
            className="font-mono text-[10px] uppercase tracking-widest text-brand-glow transition-colors hover:text-brand"
          >
            View affected items -&gt;
          </button>
        )}
      </div>
    </div>
  )
}

export default function WhyScoreDrawer({
  category,
  onClose,
}: {
  category: CategoryResult | null
  onClose: () => void
}) {
  const { open } = useDrill()

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
  const signals = category?.explainers
    ? [...category.explainers].sort((a, b) => {
        const order = ORDER[a.status] - ORDER[b.status]
        if (order !== 0) return order
        return b.categoryPoints - a.categoryPoints
      })
    : []

  const onDrill = (drill: string) => {
    onClose()
    window.setTimeout(() => open(drill), 80)
  }

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
            aria-label={`Why ${category.name} scored ${category.score}`}
          >
            <div className="panel-gradient relative px-7 pb-6 pt-7 text-white">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-widest text-lime">Why this score</div>
                  <h2 className="mt-2 font-display text-2xl font-semibold">{category.name}</h2>
                  <p className="mt-1 max-w-md text-[13px] text-white/80">{category.blurb}</p>
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
                {category.overallImpact != null && category.overallImpact > 0 && (
                  <div className="mb-1 text-[12px] text-white/75">
                    Costs <span className="font-semibold text-white">-{category.overallImpact.toFixed(1)}</span> overall points
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <div className="font-display text-[15px] font-medium text-txt-primary">The signals behind this score</div>
                  <div className="mt-1 text-[12px] text-txt-muted">Signals outside target first, healthy signals after.</div>
                </div>
                <span className="shrink-0 rounded-full border border-line px-3 py-1 font-mono text-[9px] uppercase tracking-widest text-txt-faint">
                  {signals.filter((s) => (s.status === 'below' || s.status === 'above') && s.severity !== 'opportunity' && s.categoryPoints > 0).length} outside target
                </span>
              </div>

              {signals.length > 0 ? (
                <div className="space-y-3">
                  {signals.map((signal) => (
                    <SignalRow key={signal.key} signal={signal} onDrill={onDrill} />
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-line-strong bg-white/50 p-5 text-[13px] text-txt-muted">
                  This scan does not have signal-level explanation data. That usually means it was created before the explanation layer was added.
                </div>
              )}

              <div className="mt-5 rounded-xl border border-brand/20 bg-brand/[0.05] p-4">
                <div className="font-mono text-[9px] uppercase tracking-widest text-brand-glow">How the score works</div>
                <p className="mt-1.5 text-[12px] leading-relaxed text-txt-muted">
                  Each signal has a weight inside its category. A signal outside target deducts points based on severity and how far it is from target. Healthy signals do not lower the score, and unmeasured signals are excluded rather than counted as perfect.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-line bg-white px-6 py-4">
              <span className="font-mono text-[10px] uppercase tracking-widest text-txt-faint">Deterministic explanations</span>
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
