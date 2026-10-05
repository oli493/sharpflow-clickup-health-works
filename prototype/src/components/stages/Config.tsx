import { useState } from 'react'
import { motion } from 'framer-motion'
import { Button, Chip, Eyebrow, IconArrow, IconCheck, Panel } from '../ui'
import { workspace } from '../../data/demoData'

const excludeOptions = [
  { id: 'template', label: 'Template Library', detail: 'Reusable templates and boilerplate Lists' },
  { id: 'sandbox', label: 'Sandbox', detail: 'Experimental Spaces used for testing' },
  { id: 'archived', label: 'Archived', detail: 'Spaces and Lists marked as archived' },
  { id: 'test', label: 'Test / Demo', detail: 'Demo, onboarding and QA Spaces' },
]

export default function Config({
  onBack,
  onRun,
}: {
  onBack: () => void
  onRun: () => void
}) {
  const [excluded, setExcluded] = useState<string[]>(['template', 'sandbox', 'test'])

  const toggle = (id: string) =>
    setExcluded((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  const includedSpaces = workspace.spaces - 0

  return (
    <div className="mx-auto max-w-[1100px] px-6 pb-24 pt-32">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
        <Eyebrow className="mb-3">Step 3 · Audit configuration</Eyebrow>
        <h1 className="font-display text-3xl font-semibold tracking-display text-txt-primary sm:text-4xl">
          Choose what gets analysed
        </h1>
        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-txt-muted">
          We'll scan one workspace. Exclude any Spaces that would distort the score — template
          libraries, sandboxes and test environments.
        </p>
      </motion.div>

      <div className="mt-10 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        {/* workspace selector */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}>
          <Panel className="p-6">
            <Eyebrow className="mb-4">Workspace</Eyebrow>
            <div className="flex items-center gap-4 rounded-xl border border-brand/40 bg-brand/[0.08] p-4">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-brand to-brand-ink font-display text-sm font-semibold text-white">
                NC
              </span>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-txt-primary">{workspace.name}</span>
                  <IconCheck className="h-4 w-4 text-magenta" />
                </div>
                <div className="font-mono text-[11px] text-txt-faint">
                  {workspace.plan} · {workspace.members} members · {workspace.spaces} Spaces
                </div>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-line bg-line/60">
              {[
                { v: workspace.activeTasks.toLocaleString(), l: 'active tasks' },
                { v: workspace.lists, l: 'Lists' },
                { v: workspace.folders, l: 'Folders' },
              ].map((s) => (
                <div key={s.l} className="bg-ink-soft/80 px-4 py-4 text-center">
                  <div className="font-mono text-lg text-txt-primary">{s.v}</div>
                  <div className="text-[11px] text-txt-faint">{s.l}</div>
                </div>
              ))}
            </div>
          </Panel>
        </motion.div>

        {/* exclusions */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}>
          <Panel className="p-6">
            <div className="flex items-center justify-between">
              <Eyebrow>Exclude Spaces</Eyebrow>
              <Chip>
                <motion.span
                  key={excluded.length}
                  initial={{ scale: 1.5, opacity: 0.4 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 18 }}
                  className="text-magenta"
                >
                  {excluded.length}
                </motion.span>{' '}
                excluded
              </Chip>
            </div>
            <div className="mt-4 space-y-2.5">
              {excludeOptions.map((o) => {
                const on = excluded.includes(o.id)
                return (
                  <button
                    key={o.id}
                    onClick={() => toggle(o.id)}
                    className="flex w-full items-center gap-4 rounded-xl border border-line bg-brand-ink/[0.03] p-4 text-left transition-colors hover:border-line-strong"
                  >
                    <span
                      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
                        on ? 'bg-magenta' : 'bg-brand-ink/20'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 h-4 w-4 rounded-full bg-ink transition-all ${
                          on ? 'left-[1.15rem]' : 'left-0.5'
                        }`}
                      />
                    </span>
                    <span className="flex-1">
                      <span className="block text-sm text-txt-primary">{o.label}</span>
                      <span className="block text-[12px] text-txt-faint">{o.detail}</span>
                    </span>
                    {on && <span className="font-mono text-[10px] uppercase tracking-widest text-magenta">Excluded</span>}
                  </button>
                )
              })}
            </div>
          </Panel>
        </motion.div>
      </div>

      {/* scope footer */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="mt-6"
      >
        <Panel className="flex flex-col items-start justify-between gap-5 p-6 sm:flex-row sm:items-center">
          <div className="flex flex-wrap gap-x-8 gap-y-3 font-mono text-[12px] text-txt-muted">
            <span>
              <span className="text-txt-faint">Analyse</span> {includedSpaces} Spaces
            </span>
            <span>
              <span className="text-txt-faint">Scan</span> {workspace.activeTasks.toLocaleString()} tasks
            </span>
            <span>
              <span className="text-txt-faint">Score</span> 7 categories · 39 rules
            </span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="font-mono text-[11px] uppercase tracking-widest text-txt-faint transition-colors hover:text-txt-primary"
            >
              Back
            </button>
            <Button onClick={onRun} size="lg" icon={<IconArrow className="h-5 w-5" />}>
              Run audit
            </Button>
          </div>
        </Panel>
      </motion.div>
    </div>
  )
}
