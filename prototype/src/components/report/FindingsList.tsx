import { forwardRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Chip, Panel } from '../ui'
import { findings, findingsSummary } from '../../data/demoData'
import { severityMeta } from '../../lib/format'
import { useDrill } from './Drill'
import { findingDrill } from '../../data/drillData'
import type { Finding, Severity } from '../../data/demoData'

const filters: { id: 'all' | Severity; label: string; count: number }[] = [
  { id: 'all', label: 'All findings', count: findingsSummary.total },
  { id: 'critical', label: 'Critical', count: findingsSummary.critical },
  { id: 'high', label: 'High', count: findingsSummary.high },
  { id: 'opportunity', label: 'Opportunities', count: findingsSummary.opportunity },
]

const FindingRow = forwardRef<
  HTMLDivElement,
  { finding: Finding; open: boolean; onToggle: () => void; index: number }
>(function FindingRow({ finding, open, onToggle, index }, ref) {
  const sev = severityMeta[finding.severity]
  const { open: openDrill } = useDrill()
  const drill = findingDrill[finding.id]
  return (
    <motion.div
      ref={ref}
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98, y: -10 }}
      transition={{ duration: 0.45, delay: Math.min(index * 0.03, 0.25), ease: [0.16, 1, 0.3, 1] }}
    >
      <Panel className="overflow-hidden p-0">
        <div className="flex items-stretch">
          <span className="w-1 shrink-0" style={{ background: sev.color }} />
          <button onClick={onToggle} className="flex flex-1 items-center gap-5 p-5 text-left">
            <span
              className="hidden shrink-0 rounded-lg px-3 py-2 text-center sm:block"
              style={{ background: sev.soft, color: sev.color }}
            >
              <span className="block font-mono text-lg leading-none">{finding.metric}</span>
              <span className="mt-1 block max-w-[9rem] font-mono text-[9px] leading-tight tracking-wide opacity-80">
                {finding.metricLabel}
              </span>
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-2">
                <span className="font-display text-[15px] font-medium text-txt-primary">{finding.title}</span>
                <span
                  className="rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest"
                  style={{ background: sev.soft, color: sev.color }}
                >
                  {sev.label}
                </span>
              </span>
              <span className="mt-1 block font-mono text-[11px] text-txt-faint">{finding.category}</span>
            </span>
            <span className="shrink-0 font-mono text-[11px] text-txt-faint">{open ? '−' : '+'}</span>
          </button>
        </div>

        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden"
            >
              <div className="grid gap-5 border-t border-line px-5 py-5 sm:grid-cols-2">
                <div className="sm:hidden">
                  <div className="font-mono text-2xl" style={{ color: sev.color }}>
                    {finding.metric}
                  </div>
                  <div className="font-mono text-[10px] text-txt-faint">{finding.metricLabel}</div>
                </div>
                <div>
                  <div className="eyebrow mb-2">What we found</div>
                  <p className="text-[13.5px] leading-relaxed text-txt-muted">{finding.explanation}</p>
                </div>
                <div>
                  <div className="eyebrow mb-2 text-magenta/80">Recommended action</div>
                  <p className="text-[13.5px] leading-relaxed text-txt-muted">{finding.recommendation}</p>
                  {finding.affected && (
                    <div className="mt-3">
                      <Chip>{finding.affected}</Chip>
                    </div>
                  )}
                  {drill && (
                    <button
                      data-cursor="hover"
                      onClick={() => openDrill(drill)}
                      className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-brand/40 bg-brand/[0.06] px-3.5 py-2 font-mono text-[10px] uppercase tracking-widest text-brand-glow transition-colors hover:bg-brand/10"
                    >
                      View the items ▸
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Panel>
    </motion.div>
  )
})

export default function FindingsList() {
  const [filter, setFilter] = useState<'all' | Severity>('all')
  const [open, setOpen] = useState<Set<string>>(new Set(['f-overdue']))

  const list = filter === 'all' ? findings : findings.filter((f) => f.severity === filter)

  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {filters.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`rounded-full border px-4 py-2 font-mono text-[11px] uppercase tracking-widest transition-colors ${
              filter === f.id
                ? 'border-magenta/50 bg-magenta/10 text-magenta'
                : 'border-line text-txt-muted hover:border-line-strong hover:text-txt-primary'
            }`}
          >
            {f.label} <span className="opacity-60">{f.count}</span>
          </button>
        ))}
        <span className="ml-auto font-mono text-[11px] text-txt-faint">
          Showing {list.length} of {findingsSummary.total}
        </span>
      </div>

      <div className="mt-5 space-y-3">
        <AnimatePresence mode="popLayout" initial={false}>
          {list.map((f, i) => (
            <FindingRow
              key={f.id}
              finding={f}
              index={i}
              open={open.has(f.id)}
              onToggle={() => toggle(f.id)}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
