'use client'

import { motion } from 'framer-motion'
import { Panel } from '../ui'
import { severityMeta } from '../../lib/format'
import type { PocFinding } from '../../lib/mock/poc'

export default function PocFindings({ findings }: { findings: PocFinding[] }) {
  return (
    <div className="grid items-start gap-3 md:grid-cols-2">
      {findings.map((finding, i) => {
        const sev = severityMeta[finding.severity]
        return (
          <motion.div
            key={finding.id}
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, delay: Math.min(i * 0.05, 0.2), ease: [0.16, 1, 0.3, 1] }}
          >
            <Panel className="h-full overflow-hidden p-0">
              <div className="flex items-stretch">
                <span className="w-1 shrink-0" style={{ background: sev.color }} />
                <div className="flex-1 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-4">
                      <div className="shrink-0 text-center">
                        <div className="font-mono text-xl" style={{ color: sev.color }}>{finding.metric}</div>
                        <div className="mt-1 max-w-[8rem] font-mono text-[9px] leading-tight tracking-wide text-txt-faint">{finding.metricLabel}</div>
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-display text-[15px] font-medium text-txt-primary">{finding.title}</h3>
                          <span className="rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest" style={{ background: sev.soft, color: sev.color }}>
                            {sev.label}
                          </span>
                        </div>
                        <div className="mt-1 font-mono text-[10px] text-txt-faint">{finding.category}</div>
                      </div>
                    </div>
                    <span className="rounded-full bg-magenta/[0.08] px-2.5 py-1 font-mono text-[9px] uppercase tracking-widest text-magenta">
                      {finding.impact}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3">
                    <div>
                      <div className="font-mono text-[9px] uppercase tracking-widest text-magenta/80">Why this is bad</div>
                      <p className="mt-1 text-[12.5px] leading-relaxed text-txt-muted">{finding.explanation}</p>
                    </div>
                    <div className="rounded-lg bg-brand-ink/[0.03] px-3 py-2.5">
                      <div className="font-mono text-[9px] uppercase tracking-widest text-brand-glow">What good looks like</div>
                      <p className="mt-1 text-[12px] leading-relaxed text-txt-muted">{finding.good}</p>
                    </div>
                    <div>
                      <div className="font-mono text-[9px] uppercase tracking-widest text-txt-faint">Recommended move</div>
                      <p className="mt-1 text-[12px] leading-relaxed text-txt-muted">{finding.recommendation}</p>
                    </div>
                  </div>

                  {finding.affected && (
                    <div className="mt-3 font-mono text-[10px] text-txt-faint">Affected: {finding.affected}</div>
                  )}
                </div>
              </div>
            </Panel>
          </motion.div>
        )
      })}
    </div>
  )
}
