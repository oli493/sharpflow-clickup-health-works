'use client'

import { motion } from 'framer-motion'
import { Chip, Panel } from '../ui'
import { severityMeta } from '../../lib/format'

type Rule = { name: string; condition: string; threshold: string; severity: string; weight: string }

export default function RulesTeaser({ rules }: { rules: Rule[] }) {
  return (
    <Panel className="p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="font-display text-lg text-txt-primary">Rules &amp; thresholds engine</h3>
          <p className="mt-1 max-w-md text-[12.5px] leading-relaxed text-txt-muted">
            Every finding is a rule. Thresholds, severity and weight are configuration: new rules are added without a rebuild.
          </p>
        </div>
        <Chip>{rules.length} shown · configurable</Chip>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-line">
        <div className="grid grid-cols-[1.5fr_1fr_0.7fr_0.6fr] gap-3 border-b border-line bg-brand-ink/[0.04] px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-txt-faint">
          <span>Rule</span>
          <span>Threshold</span>
          <span>Severity</span>
          <span>Weight</span>
        </div>
        {rules.map((r, i) => {
          const sev = severityMeta[r.severity.toLowerCase()] ?? severityMeta.medium
          return (
            <motion.div
              key={r.name}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.04 }}
              className="grid grid-cols-[1.5fr_1fr_0.7fr_0.6fr] items-center gap-3 border-b border-line px-4 py-3 last:border-0"
            >
              <span>
                <span className="block text-[13px] text-txt-primary">{r.name}</span>
                <span className="block font-mono text-[10px] text-txt-faint">{r.condition}</span>
              </span>
              <span className="font-mono text-[12px] text-txt-muted">{r.threshold}</span>
              <span className="font-mono text-[11px]" style={{ color: sev.color }}>{r.severity}</span>
              <span className="font-mono text-[12px] text-txt-muted">{r.weight}</span>
            </motion.div>
          )
        })}
      </div>
    </Panel>
  )
}
