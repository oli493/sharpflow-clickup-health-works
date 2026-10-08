'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button, Chip, Eyebrow, IconCheck, Panel } from '@/components/ui'
import {
  createScan,
  getConnectionSpaces,
  getConnectionWorkspaces,
  type SpaceSummary,
} from '@/lib/api'

// Spaces that usually distort a health score, auto-excluded by default.
const AUTO_EXCLUDE = /template|sandbox|demo|test|archive|qa|onboarding/i

// Shown when ClickUp won't let the app read a workspace (OAuth token is scoped
// to the one workspace chosen at consent).
function ReconnectBlock({ workspace }: { workspace?: string }) {
  return (
    <div>
      <p className="text-sm leading-relaxed text-txt-muted">
        {workspace ? (
          <>
            ClickUp is blocking the app from{' '}
            <span className="font-medium text-txt-primary">{workspace}</span>.
          </>
        ) : (
          <>ClickUp is blocking the app from your workspace.</>
        )}{' '}
        This usually means a different workspace was selected when you connected, or this one
        hasn&apos;t approved the app.
      </p>
      <a href="/api/clickup/oauth" className="btn-primary btn-arrow pr-2.5 mt-4 inline-flex">
        Reconnect ClickUp
      </a>
    </div>
  )
}

function Inner() {
  const router = useRouter()
  const params = useSearchParams()
  const connectionId = params.get('connection') ?? ''

  const [workspaces, setWorkspaces] = useState<{ id: string; name: string }[] | null>(null)
  const [selected, setSelected] = useState<string>('')
  const [spaces, setSpaces] = useState<SpaceSummary[]>([])
  const [excluded, setExcluded] = useState<string[]>([])
  const [loadingWorkspaces, setLoadingWorkspaces] = useState(false)
  const [loadingSpaces, setLoadingSpaces] = useState(false)
  const [wsError, setWsError] = useState<string | null>(null)
  const [wsUnauthorized, setWsUnauthorized] = useState(false)
  const [spacesError, setSpacesError] = useState<'not_authorized' | 'generic' | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fatal, setFatal] = useState<string | null>(null)

  const selectedName = workspaces?.find((w) => w.id === selected)?.name

  function loadWorkspaces() {
    if (!connectionId) {
      setFatal('No workspace connection was found. Please connect ClickUp to continue.')
      return
    }
    setLoadingWorkspaces(true)
    setWsError(null)
    setWsUnauthorized(false)
    getConnectionWorkspaces(connectionId)
      .then((res) => {
        setWorkspaces(res.workspaces)
        setWsUnauthorized(!!res.unauthorized && res.workspaces.length === 0)
        setSelected((prev) =>
          prev && res.workspaces.some((w) => w.id === prev) ? prev : res.workspaces[0]?.id ?? '',
        )
      })
      .catch(() => setWsError("We couldn't load your ClickUp workspaces (ClickUp timed out)."))
      .finally(() => setLoadingWorkspaces(false))
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => loadWorkspaces(), [connectionId])

  useEffect(() => {
    if (!selected) {
      setSpaces([])
      setSpacesError(null)
      return
    }
    setLoadingSpaces(true)
    setSpacesError(null)
    getConnectionSpaces(connectionId, selected)
      .then((list) => {
        setSpaces(list)
        setExcluded(list.filter((s) => AUTO_EXCLUDE.test(s.name)).map((s) => s.id))
      })
      .catch((e) => {
        setSpaces([])
        setSpacesError((e as Error).message === 'workspace_not_authorized' ? 'not_authorized' : 'generic')
      })
      .finally(() => setLoadingSpaces(false))
  }, [connectionId, selected])

  const toggle = (id: string) =>
    setExcluded((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  async function run() {
    if (!connectionId || !selected) return
    setBusy(true)
    setError(null)
    try {
      const ws = workspaces?.find((w) => w.id === selected)
      const { id } = await createScan({
        connectionId,
        teamId: selected,
        workspaceName: ws?.name,
        excludeSpaceIds: excluded,
      })
      router.push(`/scan/${id}`)
    } catch (e) {
      setError((e as Error).message)
      setBusy(false)
    }
  }

  if (fatal) {
    return (
      <div className="mx-auto grid min-h-[70vh] max-w-2xl place-items-center px-6">
        <Panel className="p-8 text-center">
          <h2 className="font-display text-2xl font-semibold text-brand-ink">Connection needed</h2>
          <p className="mt-2 text-sm text-txt-muted">{fatal}</p>
          <Link href="/" className="btn-primary btn-arrow pr-2.5 mt-6 inline-flex">Connect ClickUp</Link>
        </Panel>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1100px] px-6 pb-24 pt-32">
      <Eyebrow className="mb-3">Step 2 · Audit configuration</Eyebrow>
      <h1 className="font-display text-3xl font-semibold tracking-display text-txt-primary sm:text-4xl">Choose what gets analysed</h1>
      <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-txt-muted">
        Pick the workspace to audit, and exclude any Spaces that would distort the score: template libraries, sandboxes and test environments.
      </p>

      {error && (
        <div className="mt-6 rounded-xl border border-magenta/40 bg-magenta/[0.06] px-5 py-4 text-sm text-txt-primary">{error}</div>
      )}

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <Panel className="p-6">
          <Eyebrow className="mb-4">Workspace</Eyebrow>
          {loadingWorkspaces ? (
            <div className="text-sm text-txt-faint">Loading your workspaces…</div>
          ) : wsError ? (
            <div>
              <p className="text-sm text-txt-muted">{wsError}</p>
              <Button variant="ghost" onClick={loadWorkspaces} className="mt-3 px-5 py-2.5 text-sm">Retry</Button>
            </div>
          ) : wsUnauthorized ? (
            <ReconnectBlock />
          ) : !workspaces || workspaces.length === 0 ? (
            <div className="text-sm text-txt-muted">No workspaces found for this connection.</div>
          ) : (
            <div className="space-y-2.5">
              {workspaces.map((w) => {
                const on = selected === w.id
                return (
                  <button
                    key={w.id}
                    onClick={() => setSelected(w.id)}
                    className={`flex w-full items-center gap-4 rounded-xl border p-4 text-left transition-colors ${
                      on ? 'border-brand/50 bg-brand/[0.08]' : 'border-line bg-brand-ink/[0.03] hover:border-line-strong'
                    }`}
                  >
                    <span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-brand to-brand-ink font-display text-sm font-semibold text-white">
                      {w.name.slice(0, 2).toUpperCase()}
                    </span>
                    <span className="flex-1">
                      <span className="flex items-center gap-2">
                        <span className="font-medium text-txt-primary">{w.name}</span>
                        {on && <IconCheck className="h-4 w-4 text-magenta" />}
                      </span>
                      <span className="font-mono text-[11px] text-txt-faint">{w.id}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </Panel>

        <Panel className="p-6">
          <div className="flex items-center justify-between">
            <Eyebrow>Exclude Spaces</Eyebrow>
            <Chip>{excluded.length} excluded</Chip>
          </div>
          <div className="mt-4 space-y-2.5">
            {loadingSpaces ? (
              <div className="text-sm text-txt-faint">Loading Spaces…</div>
            ) : spacesError === 'not_authorized' ? (
              <ReconnectBlock workspace={selectedName} />
            ) : spaces.length === 0 ? (
              <div className="text-sm text-txt-muted">No Spaces found for this workspace.</div>
            ) : (
              spaces.map((s) => {
                const on = excluded.includes(s.id)
                return (
                  <button
                    key={s.id}
                    onClick={() => toggle(s.id)}
                    className="flex w-full items-center gap-4 rounded-xl border border-line bg-brand-ink/[0.03] p-4 text-left transition-colors hover:border-line-strong"
                  >
                    <span className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${on ? 'bg-magenta' : 'bg-brand-ink/20'}`}>
                      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${on ? 'left-[1.15rem]' : 'left-0.5'}`} />
                    </span>
                    <span className="flex-1">
                      <span className="block text-sm text-txt-primary">{s.name}</span>
                      <span className="block font-mono text-[11px] text-txt-faint">{s.id}</span>
                    </span>
                    {on && <span className="font-mono text-[10px] uppercase tracking-widest text-magenta">Excluded</span>}
                  </button>
                )
              })
            )}
          </div>
        </Panel>
      </div>

      <Panel className="mt-6 flex flex-col items-start justify-between gap-5 p-6 sm:flex-row sm:items-center">
        <div className="flex flex-wrap gap-x-8 gap-y-3 font-mono text-[12px] text-txt-muted">
          <span><span className="text-txt-faint">Score</span> 7 categories</span>
          <span><span className="text-txt-faint">Findings</span> configurable rules</span>
        </div>
        <Button onClick={run} size="lg" disabled={busy || !selected || spacesError === 'not_authorized'} arrow>
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
