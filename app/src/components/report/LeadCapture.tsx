'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Button, Chip, IconCheck, Panel } from '../ui'
import { postLead } from '../../lib/api'

export default function LeadCapture({ scanId }: { scanId: string }) {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      await postLead(scanId, email)
    } catch {
      /* keep UX simple */
    }
    setBusy(false)
    setSent(true)
  }

  return (
    <Panel className="overflow-hidden p-0">
      <div className="grid gap-0 lg:grid-cols-[1.35fr_0.65fr]">
        <div className="p-8 sm:p-10">
          <Chip className="mb-4">
            <span className="h-1.5 w-1.5 rounded-full bg-magenta" /> Free workspace health report
          </Chip>
          <h3 className="font-display text-2xl font-semibold tracking-display text-brand-ink sm:text-3xl">
            Want Sharpflow to fix these findings?
          </h3>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-txt-muted">
            This report was generated automatically. If you'd like, we'll walk you through the priorities and turn this into an action plan: no obligation.
          </p>

          {sent ? (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-7 flex items-center gap-3 rounded-xl border border-magenta/30 bg-magenta/[0.05] px-5 py-4">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-sev-good/15 text-sev-good">
                <IconCheck className="h-4 w-4" />
              </span>
              <span className="text-sm text-txt-primary">
                Thanks. We've queued a full copy to <span className="font-medium">{email || 'your inbox'}</span>.
              </span>
            </motion.div>
          ) : (
            <form onSubmit={submit} className="mt-7 flex flex-col gap-3 sm:flex-row">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="flex-1 rounded-full border border-line-strong bg-white px-5 py-3.5 text-[15px] text-txt-primary outline-none transition-colors placeholder:text-txt-faint focus:border-magenta"
              />
              <Button type="submit" disabled={busy} className="px-7 py-3.5 text-[15px]">
                {busy ? 'Sending…' : 'Email me the report'}
              </Button>
            </form>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button
              onClick={() => window.open('https://calendly.com/oli-sharpflowconsulting/clickup-health-discussion', '_blank')}
              arrow
              className="px-6 py-3 text-sm"
            >
              Book a call with Sharpflow
            </Button>
            <span className="font-mono text-[11px] text-txt-faint">Free 30-min operational review</span>
          </div>
        </div>

        <div className="relative grid place-items-center overflow-hidden border-t border-line bg-brand-ink/[0.03] p-8 lg:border-l lg:border-t-0">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_120%_at_80%_0%,rgba(95,186,149,0.28),transparent_60%)]" />
          <motion.div initial={{ opacity: 0, scale: 0.9, y: 10 }} whileInView={{ opacity: 1, scale: 1, y: 0 }} viewport={{ once: true }} transition={{ type: 'spring', stiffness: 200, damping: 20 }} className="relative text-center">
            <img src="/brand/partner-badge.png" alt="ClickUp Sapphire Partner 2026" className="mx-auto h-40 w-auto drop-shadow-[0_16px_30px_rgba(23,52,53,0.25)]" />
            <div className="mt-4 font-mono text-[10px] uppercase tracking-eyebrow text-txt-faint">ClickUp Sapphire Partner</div>
          </motion.div>
        </div>
      </div>
    </Panel>
  )
}
