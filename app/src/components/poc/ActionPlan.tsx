'use client'

import { motion } from 'framer-motion'
import { Panel } from '../ui'
import { severityMeta } from '../../lib/format'
import type { PocAction } from '../../lib/mock/poc'
import { POC_CTA_URL } from '../../lib/mock/poc'

function ActionCard({ action, index }: { action: PocAction; index: number }) {
  const sev = severityMeta[action.severity]
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.45, delay: Math.min(index * 0.05, 0.2), ease: [0.16, 1, 0.3, 1] }}
    >
      <Panel className="h-full p-4">
        <div className="flex items-start gap-3">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-ink font-mono text-[12px] text-lime">{action.rank}</span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h3 className="font-display text-[14px] font-medium leading-snug text-txt-primary">{action.title}</h3>
              <span className="rounded-full px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest" style={{ background: sev.soft, color: sev.color }}>
                {sev.label}
              </span>
            </div>
            <div className="mt-1 font-mono text-[10px] text-txt-faint">{action.category}</div>
          </div>
        </div>

        <p className="mt-3 text-[12px] leading-relaxed text-txt-muted">{action.why}</p>

        <div className="mt-3 rounded-lg bg-brand-ink/[0.03] px-3 py-2">
          <div className="font-mono text-[9px] uppercase tracking-widest text-brand-glow">Recommended move</div>
          <p className="mt-1 text-[11.5px] leading-relaxed text-txt-muted">{action.action}</p>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className="rounded-full border border-line px-2.5 py-1 font-mono text-[9px] uppercase tracking-widest text-txt-muted">{action.effort}</span>
          <span className="rounded-full border border-line px-2.5 py-1 font-mono text-[9px] uppercase tracking-widest text-txt-muted">{action.impact} impact</span>
          <span className="rounded-full border border-line px-2.5 py-1 font-mono text-[9px] uppercase tracking-widest text-txt-faint">{action.affected}</span>
        </div>

        <div className="mt-3 border-t border-line pt-3 font-mono text-[10px] text-txt-faint">Owner hint: {action.owner}</div>
      </Panel>
    </motion.div>
  )
}

export default function ActionPlan({ actions }: { actions: PocAction[] }) {
  const quickWins = actions.filter((a) => a.effort === 'Quick win')
  const strategic = actions.filter((a) => a.effort !== 'Quick win')

  return (
    <div>
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Panel className="p-4">
          <div className="font-mono text-[9px] uppercase tracking-widest text-txt-faint">Prioritised actions</div>
          <div className="mt-1 font-mono text-3xl text-txt-primary">{actions.length}</div>
          <div className="mt-1 text-[11px] text-txt-muted">Ranked deterministically, not guessed.</div>
        </Panel>
        <Panel className="p-4">
          <div className="font-mono text-[9px] uppercase tracking-widest text-txt-faint">Quick wins</div>
          <div className="mt-1 font-mono text-3xl text-brand-glow">{quickWins.length}</div>
          <div className="mt-1 text-[11px] text-txt-muted">Low effort, visible score lift.</div>
        </Panel>
        <Panel className="p-4">
          <div className="font-mono text-[9px] uppercase tracking-widest text-txt-faint">Strategic fixes</div>
          <div className="mt-1 font-mono text-3xl text-magenta">{strategic.length}</div>
          <div className="mt-1 text-[11px] text-txt-muted">Bigger structural gains, more effort.</div>
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-brand-glow">Start here</div>
              <h3 className="mt-1 font-display text-lg text-txt-primary">Quick wins</h3>
            </div>
            <span className="rounded-full border border-brand/30 bg-brand/[0.06] px-3 py-1 font-mono text-[9px] uppercase tracking-widest text-brand-glow">Team can handle</span>
          </div>
          <div className="space-y-3">
            {quickWins.map((action, i) => <ActionCard key={action.rank} action={action} index={i} />)}
          </div>
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-magenta">Go deeper</div>
              <h3 className="mt-1 font-display text-lg text-txt-primary">Strategic fixes</h3>
            </div>
            <span className="rounded-full border border-magenta/30 bg-magenta/[0.06] px-3 py-1 font-mono text-[9px] uppercase tracking-widest text-magenta">Sharpflow can help</span>
          </div>
          <div className="space-y-3">
            {strategic.map((action, i) => <ActionCard key={action.rank} action={action} index={i} />)}
          </div>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl2 bg-brand-ink p-6 text-white">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div>
            <div className="font-mono text-[9px] uppercase tracking-widest text-lime">The next step</div>
            <h3 className="mt-2 font-display text-xl font-semibold text-white">Turn the report into a working session.</h3>
            <p className="mt-1 max-w-xl text-[12.5px] leading-relaxed text-white/70">
              Walk through the priorities, agree what to fix first, and decide where Sharpflow can help.
            </p>
          </div>
          <a
            href={POC_CTA_URL}
            target="_blank"
            rel="noreferrer"
            className="rounded-full bg-lime px-5 py-3 font-mono text-[10px] uppercase tracking-widest text-brand-ink transition-transform hover:-translate-y-0.5"
          >
            Talk to Sharpflow -&gt;
          </a>
        </div>
      </div>
    </div>
  )
}
