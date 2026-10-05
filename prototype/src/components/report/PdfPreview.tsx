import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Button, Eyebrow, IconDownload, Logo } from '../ui'
import { categoryScores, findingsSummary, overallGrade, overallScore, workspace } from '../../data/demoData'
import { scoreBand } from '../../lib/format'

export default function PdfPreview({ open, onClose }: { open: boolean; onClose: () => void }) {
  const band = scoreBand(overallScore)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 grid place-items-center bg-ink/80 p-6 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 250, damping: 25, mass: 0.9 }}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-line-strong bg-ink-panel shadow-panel"
          >
            {/* toolbar */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-ink-panel/95 px-6 py-4 backdrop-blur">
              <span className="font-mono text-[11px] uppercase tracking-widest text-txt-faint">
                Report preview · PDF
              </span>
              <div className="flex items-center gap-3">
                <Button variant="ghost" onClick={onClose} className="px-4 py-2 text-sm">
                  Close
                </Button>
                <Button className="px-5 py-2 text-sm" icon={<IconDownload className="h-4 w-4" />}>
                  Download
                </Button>
              </div>
            </div>

            {/* document */}
            <div className="p-8 sm:p-10">
              <div className="rounded-xl border border-line bg-gradient-to-b from-brand-ink/[0.04] to-transparent p-8">
                <div className="flex items-start justify-between">
                  <Logo />
                  <div className="text-right">
                    <Eyebrow>Prepared for</Eyebrow>
                    <div className="mt-1 text-sm text-txt-primary">{workspace.name}</div>
                    <div className="font-mono text-[10px] text-txt-faint">
                      {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                </div>

                <div className="mt-10 flex items-end gap-6">
                  <div>
                    <Eyebrow>ClickUp Health Score</Eyebrow>
                    <div className="mt-2 font-mono text-7xl text-txt-primary">
                      {overallScore}
                      <span className="text-2xl text-txt-faint">/100</span>
                    </div>
                  </div>
                  <span
                    className="mb-2 grid h-14 w-14 place-items-center rounded-2xl font-display text-2xl"
                    style={{ background: band.soft, color: band.color }}
                  >
                    {overallGrade}
                  </span>
                  <div className="mb-2 font-mono text-[12px] text-txt-muted">
                    {band.label} · 39 findings
                  </div>
                </div>

                <div className="mt-10">
                  <Eyebrow className="mb-4">Category scores</Eyebrow>
                  <div className="space-y-3">
                    {categoryScores.map((c) => {
                      const b = scoreBand(c.score)
                      return (
                        <div key={c.key} className="grid grid-cols-[10rem_1fr_2.5rem] items-center gap-4">
                          <span className="truncate text-[13px] text-txt-muted">{c.name}</span>
                          <span className="h-1.5 overflow-hidden rounded-full bg-brand-ink/10">
                            <span
                              className="block h-full rounded-full"
                              style={{ width: `${c.score}%`, background: b.color }}
                            />
                          </span>
                          <span className="text-right font-mono text-[12px]" style={{ color: b.color }}>
                            {c.score}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="mt-10 grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-line bg-line/60">
                  {[
                    { l: 'Critical', v: findingsSummary.critical, c: '#FF5C6C' },
                    { l: 'High', v: findingsSummary.high, c: '#FF9F45' },
                    { l: 'Opportunities', v: findingsSummary.opportunity, c: '#7DE2B0' },
                  ].map((s) => (
                    <div key={s.l} className="bg-ink-soft/80 px-5 py-4 text-center">
                      <div className="font-mono text-xl" style={{ color: s.c }}>
                        {s.v}
                      </div>
                      <div className="text-[11px] text-txt-faint">{s.l}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-8 border-t border-line pt-5 font-mono text-[10px] uppercase tracking-widest text-txt-faint">
                  Full report · executive summary · findings · recommendations · utilisation
                </div>
              </div>

              <p className="mt-5 text-center font-mono text-[11px] text-txt-faint">
                {workspace.activeTasks.toLocaleString()} tasks · {workspace.members} members · {workspace.spaces} Spaces
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
