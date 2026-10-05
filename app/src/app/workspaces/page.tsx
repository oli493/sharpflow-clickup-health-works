'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button, Chip, Eyebrow, IconArrow, IconCheck, Panel } from '@/components/ui'
import { createScan, IS_MOCK } from '@/lib/api'

const EXCLUDE_OPTIONS = [
  { id: 'template', label: 'Template Library', detail: 'Reusable templates and boilerplate Lists' },
  { id: 'sandbox', label: 'Sandbox', detail: 'Experimental Spaces used for testing' },
  { id: 'archived', label: 'Archived', detail: 'Spaces and Lists marked as archived' },
  { id: 'test', label: 'Test / Demo', detail: 'Demo, onboarding and QA Spaces' },
]

function Inner() {
  const router = useRouter()
  const params = useSearchParams()
  const connection = params.get('connection') ?? 'demo'
  const [excluded, setExcluded] = useState<string[]>(['template', 'sandbox', 'test'])
  const [busy, setBusy] = useState(false)

  const toggle = (id: string) =>
    setExcluded((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  async function run() {
    setBusy(true)
    try {
      const { id } = await createScan({ connectionId: connection, teamId: 'demo', excludeSpaceIds: excluded })
      router.push(`/scan/${id}`)
    } catch {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-[1100px] px-6 pb-24 pt-32">
      <Eyebrow className="mb-3">Step 2 · Audit configuration</Eyebrow>
      <h1 className="font-display text-3xl font-semibold tracking-display text-txt-primary sm:text-4xl">Choose what gets analysed</h1>
      <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-txt-muted">
        Exclude any Spaces that would distort the score — template libraries, sandboxes and test environments.
      </p>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <Panel className="p-6">
          <Eyebrow className="mb-4">Workspace</Eyebrow>
          <div className="flex items-center gap-4 rounded-xl border border-brand/40 bg-brand/[0.08] p-4">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-brand to-brand-ink font-display text-sm font-semibold text-white">NC</span>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-txt-primary">Northwind Creative</span>
                <IconCheck className="h-4 w-4 text-magenta" />
              </div>
              <div className="font-mono text-[11px] text-txt-faint">Connected workspace{IS_MOCK ? ' · sample data' : ''}</div>
            </div>
          </div>
        </Panel>

        <Panel className="p-6">
          <div className="flex items-center justify-between">
            <Eyebrow>Exclude Spaces</Eyebrow>
            <Chip>{excluded.length} excluded</Chip>
          </div>
          <div className="mt-4 space-y-2.5">
            {EXCLUDE_OPTIONS.map((o) => {
              const on = excluded.includes(o.id)
              return (
                <button key={o.id} onClick={() => toggle(o.id)} className="flex w-full items-center gap-4 rounded-xl border border-line bg-brand-ink/[0.03] p-4 text-left transition-colors hover:border-line-strong">
                  <span className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${on ? 'bg-magenta' : 'bg-brand-ink/20'}`}>
                    <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${on ? 'left-[1.15rem]' : 'left-0.5'}`} />
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
      </div>

      <Panel className="mt-6 flex flex-col items-start justify-between gap-5 p-6 sm:flex-row sm:items-center">
        <div className="flex flex-wrap gap-x-8 gap-y-3 font-mono text-[12px] text-txt-muted">
          <span><span className="text-txt-faint">Score</span> 7 categories</span>
          <span><span className="text-txt-faint">Findings</span> configurable rules</span>
        </div>
        <Button onClick={run} size="lg" disabled={busy} icon={<IconArrow className="h-5 w-5" />}>
          {busy ? 'Starting…' : 'Run audit'}
        </Button>
      </Panel>
    </div>
  )
}

export default function WorkspacesPage() {
  return (
    <Suspense fallback={<div className="grid min-h-screen place-items-center text-sm text-txt-faint">Loading…</div>}>
      <Inner />
    </Suspense>
  )
}
