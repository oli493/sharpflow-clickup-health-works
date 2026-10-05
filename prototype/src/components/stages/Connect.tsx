import { motion } from 'framer-motion'
import { Button, Chip, Eyebrow, IconArrow, IconCheck, Logo, Panel } from '../ui'

const scopes = [
  { label: 'View workspaces and hierarchy', detail: 'Spaces · Folders · Lists' },
  { label: 'View tasks and their metadata', detail: 'Status, dates, assignees, custom fields' },
  { label: 'View members, views, goals and docs', detail: 'For adoption & utilisation scoring' },
  { label: 'View time entries and estimates', detail: 'Where available and permitted' },
]

export default function Connect({
  onBack,
  onAuthorize,
}: {
  onBack: () => void
  onAuthorize: () => void
}) {
  return (
    <div className="mx-auto max-w-[1100px] px-6 pb-24 pt-32">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <Eyebrow className="mb-3">Step 2 · Secure connection</Eyebrow>
        <h1 className="font-display text-3xl font-semibold tracking-display text-txt-primary sm:text-4xl">
          Connect your ClickUp account
        </h1>
        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-txt-muted">
          We use ClickUp's official OAuth. You approve exactly what we can read, and nothing is ever
          modified. The access token is deleted the moment the scan finishes.
        </p>
      </motion.div>

      <div className="mt-10 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        {/* mock oauth window */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <Panel className="overflow-hidden p-0">
            {/* browser chrome */}
            <div className="flex items-center gap-3 border-b border-line bg-ink-soft/80 px-4 py-3">
              <div className="flex gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-brand-ink/20" />
                <span className="h-2.5 w-2.5 rounded-full bg-brand-ink/20" />
                <span className="h-2.5 w-2.5 rounded-full bg-brand-ink/20" />
              </div>
              <div className="flex-1 truncate rounded-md bg-brand-ink/[0.05] px-3 py-1.5 font-mono text-[11px] text-txt-faint">
                app.clickup.com/oauth/authorize?client_id=sharpflow-health
              </div>
            </div>

            <div className="p-8">
              <div className="flex items-center gap-4">
                <Logo compact />
                <div className="relative hidden h-px w-12 bg-line-strong sm:block">
                  <motion.span
                    className="absolute top-1/2 h-1.5 w-1.5 -mt-[3px] rounded-full bg-magenta"
                    style={{ boxShadow: '0 0 10px rgba(224,16,114,0.9)' }}
                    animate={{ x: [0, 42, 0] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand/20 font-display text-sm text-brand-glow">
                    S
                  </span>
                  <div>
                    <div className="text-sm font-medium text-txt-primary">Sharpflow ClickUp Health</div>
                    <div className="font-mono text-[10px] uppercase tracking-widest text-txt-faint">
                      wants to access your account
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-7 rounded-xl border border-line bg-brand-ink/[0.03] p-5">
                <div className="eyebrow mb-4">This app will be able to</div>
                <ul className="space-y-3">
                  {scopes.map((s, i) => (
                    <motion.li
                      key={s.label}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.25 + i * 0.07 }}
                      className="flex items-start gap-3"
                    >
                      <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-sev-good/15 text-sev-good">
                        <IconCheck className="h-3 w-3" />
                      </span>
                      <span>
                        <span className="block text-sm text-txt-primary">{s.label}</span>
                        <span className="block font-mono text-[11px] text-txt-faint">{s.detail}</span>
                      </span>
                    </motion.li>
                  ))}
                </ul>
              </div>

              <div className="mt-6 flex items-center justify-between">
                <button
                  onClick={onBack}
                  className="font-mono text-[11px] uppercase tracking-widest text-txt-faint transition-colors hover:text-txt-primary"
                >
                  Cancel
                </button>
                <Button onClick={onAuthorize} icon={<IconArrow className="h-4 w-4" />}>
                  Authorise read-only access
                </Button>
              </div>
            </div>
          </Panel>
        </motion.div>

        {/* security explainer */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="space-y-5"
        >
          <Panel className="p-6">
            <Chip className="mb-4">
              <span className="h-1.5 w-1.5 rounded-full bg-sev-good" /> Zero write scope
            </Chip>
            <h3 className="font-display text-lg text-txt-primary">How your data is handled</h3>
            <ul className="mt-4 space-y-3 text-sm text-txt-muted">
              {[
                'OAuth access is read-only — no task, field or setting is ever changed.',
                'The token is deleted as soon as the scan completes.',
                'We measure description length, never its content. Titles are never stored.',
                'You can disconnect at any time and re-run as often as you like.',
              ].map((t) => (
                <li key={t} className="flex gap-3">
                  <IconCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-glow" />
                  <span className="leading-relaxed">{t}</span>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel className="p-6">
            <Eyebrow>Requirements</Eyebrow>
            <div className="mt-3 space-y-2 font-mono text-[12px] text-txt-muted">
              <div className="flex justify-between">
                <span>ClickUp plan</span>
                <span className="text-txt-primary">Any (incl. Free)</span>
              </div>
              <div className="flex justify-between">
                <span>Permission needed</span>
                <span className="text-txt-primary">Workspace member</span>
              </div>
              <div className="flex justify-between">
                <span>Scan time</span>
                <span className="text-txt-primary">~3 minutes</span>
              </div>
            </div>
          </Panel>
        </motion.div>
      </div>
    </div>
  )
}
