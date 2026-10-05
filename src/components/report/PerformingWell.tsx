import { motion } from 'framer-motion'
import { IconCheck, Panel } from '../ui'
import { performingWell } from '../../data/demoData'

export default function PerformingWell() {
  return (
    <Panel className="p-7">
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-sev-good/15 text-sev-good">
          <IconCheck className="h-4 w-4" />
        </span>
        <div>
          <h3 className="font-display text-lg text-txt-primary">Areas performing well</h3>
          <p className="font-mono text-[11px] text-txt-faint">A balanced report highlights strengths too</p>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {performingWell.map((p, i) => (
          <motion.div
            key={p.title}
            initial={{ opacity: 0, x: -10 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.08 }}
            className="flex gap-4 border-b border-line pb-4 last:border-0 last:pb-0"
          >
            <span className="mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-sev-good/15 text-sev-good">
              <IconCheck className="h-3 w-3" />
            </span>
            <div>
              <div className="text-sm text-txt-primary">{p.title}</div>
              <div className="mt-1 text-[12.5px] leading-relaxed text-txt-muted">{p.detail}</div>
            </div>
          </motion.div>
        ))}
      </div>
    </Panel>
  )
}
