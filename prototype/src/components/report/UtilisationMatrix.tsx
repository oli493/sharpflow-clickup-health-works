import { motion } from 'framer-motion'
import { Panel } from '../ui'
import { utilisation } from '../../data/demoData'
import { utilisationMeta } from '../../lib/format'

const order = ['detected', 'partial', 'not_measurable'] as const

export default function UtilisationMatrix() {
  const counts = {
    detected: utilisation.filter((u) => u.status === 'detected').length,
    partial: utilisation.filter((u) => u.status === 'partial').length,
    not_measurable: utilisation.filter((u) => u.status === 'not_measurable').length,
  }

  return (
    <Panel className="p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="font-display text-lg text-txt-primary">Platform utilisation</h3>
          <p className="mt-1 max-w-lg text-[12.5px] leading-relaxed text-txt-muted">
            Which ClickUp capabilities are actually in use — and, honestly, which the public API
            can't measure.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {order.map((k) => (
            <span
              key={k}
              className="flex items-center gap-1.5 rounded-full border border-line px-3 py-1 font-mono text-[10px] uppercase tracking-widest"
              style={{ color: utilisationMeta[k].color }}
            >
              <span>{utilisationMeta[k].symbol}</span>
              {utilisationMeta[k].label} {counts[k]}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {utilisation.map((u, i) => {
          const meta = utilisationMeta[u.status]
          const dim = u.status === 'not_measurable'
          return (
            <motion.div
              key={u.capability}
              initial={{ opacity: 0, y: 14, rotateY: -22 }}
              whileInView={{ opacity: 1, y: 0, rotateY: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: (i % 6) * 0.05, ease: [0.16, 1, 0.3, 1] }}
              style={{ perspective: 700, transformStyle: 'preserve-3d' }}
              className={`flex items-center gap-3 rounded-xl border border-line bg-brand-ink/[0.03] px-4 py-3 transition-colors hover:border-line-strong ${
                dim ? 'opacity-60' : ''
              }`}
            >
              <span
                className="grid h-7 w-7 shrink-0 place-items-center rounded-lg font-mono text-sm"
                style={{ background: `${meta.color}1f`, color: meta.color }}
              >
                {meta.symbol}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] text-txt-primary">{u.capability}</span>
                <span className="block truncate font-mono text-[10px] text-txt-faint">{u.detail}</span>
              </span>
            </motion.div>
          )
        })}
      </div>
    </Panel>
  )
}
