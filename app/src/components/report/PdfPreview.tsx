'use client'

import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Button, Eyebrow, IconDownload, Logo } from '../ui'
import { scoreBand } from '../../lib/format'
import { pdfUrl } from '../../lib/api'
import type { ScanResult } from '../../lib/types'

export default function PdfPreview({
  result,
  scanId,
  open,
  onClose,
  sample = false,
}: {
  result: ScanResult
  scanId: string
  open: boolean
  onClose: () => void
  sample?: boolean
}) {
  const band = scoreBand(result.overallScore)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (typeof document === 'undefined') return null

  const download = () => {
    const url = pdfUrl(scanId, sample)
    if (url !== '#') window.open(url, '_blank')
  }

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 grid place-items-center bg-brand-ink/40 p-6 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 250, damping: 25, mass: 0.9 }}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-line-strong bg-white shadow-panel"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-white/95 px-6 py-4 backdrop-blur">
              <span className="font-mono text-[11px] uppercase tracking-widest text-txt-faint">Report preview · PDF</span>
              <div className="flex items-center gap-3">
                <Button variant="ghost" onClick={onClose} className="px-4 py-2 text-sm">Close</Button>
                <Button className="px-5 py-2 text-sm" onClick={download} icon={<IconDownload className="h-4 w-4" />}>Download</Button>
              </div>
            </div>

            <div className="p-8 sm:p-10">
              <div className="rounded-xl border border-line bg-gradient-to-b from-brand-ink/[0.04] to-transparent p-8">
                <div className="flex items-start justify-between">
                  <Logo />
                  <div className="text-right">
                    <Eyebrow>Prepared for</Eyebrow>
                    <div className="mt-1 text-sm text-txt-primary">{result.workspaceName}</div>
                  </div>
                </div>

                <div className="mt-10 flex items-end gap-6">
                  <div>
                    <Eyebrow>ClickUp Health Score</Eyebrow>
                    <div className="mt-2 font-mono text-7xl text-txt-primary">
                      {result.overallScore}
                      <span className="text-2xl text-txt-faint">/100</span>
                    </div>
                  </div>
                  <span className="mb-2 grid h-14 w-14 place-items-center rounded-2xl font-display text-2xl" style={{ background: band.soft, color: band.color }}>
                    {result.overallGrade}
                  </span>
                  <div className="mb-2 font-mono text-[12px] text-txt-muted">{band.label} · {result.findingsSummary.total} findings</div>
                </div>

                <div className="mt-10">
                  <Eyebrow className="mb-4">Category scores</Eyebrow>
                  <div className="space-y-3">
                    {result.categories.map((c) => {
                      const b = scoreBand(c.score)
                      return (
                        <div key={c.key} className="grid grid-cols-[10rem_1fr_2.5rem] items-center gap-4">
                          <span className="truncate text-[13px] text-txt-muted">{c.name}</span>
                          <span className="h-1.5 overflow-hidden rounded-full bg-brand-ink/10">
                            <span className="block h-full rounded-full" style={{ width: `${c.score}%`, background: b.color }} />
                          </span>
                          <span className="text-right font-mono text-[12px]" style={{ color: b.color }}>{c.score}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="mt-10 grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-line bg-line/60">
                  {[
                    { l: 'Critical', v: result.findingsSummary.critical, c: '#D6336C' },
                    { l: 'High', v: result.findingsSummary.high, c: '#E07A2F' },
                    { l: 'Opportunities', v: result.findingsSummary.opportunity, c: '#2F9E74' },
                  ].map((s) => (
                    <div key={s.l} className="bg-white px-5 py-4 text-center">
                      <div className="font-mono text-xl" style={{ color: s.c }}>{s.v}</div>
                      <div className="text-[11px] text-txt-faint">{s.l}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
