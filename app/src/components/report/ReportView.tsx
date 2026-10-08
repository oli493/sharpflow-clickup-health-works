'use client'

import { lazy, Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { Button, Chip, Eyebrow, IconDownload, Panel, SectionHeading } from '@/components/ui'
import ScoreHero from '@/components/report/ScoreHero'
import CategoryCards from '@/components/report/CategoryCards'
import FindingsList from '@/components/report/FindingsList'
import PerformingWell from '@/components/report/PerformingWell'
import UtilisationMatrix from '@/components/report/UtilisationMatrix'
import ExecutiveSummary from '@/components/report/ExecutiveSummary'
import RulesTeaser from '@/components/report/RulesTeaser'
import LeadCapture from '@/components/report/LeadCapture'
import PdfPreview from '@/components/report/PdfPreview'
import SectionNav from '@/components/report/SectionNav'
import { DrillProvider, useDrill } from '@/components/report/Drill'
import { getStructure, type StructureSpace } from '@/lib/api'
import type { ScanResult } from '@/lib/types'

const TopologyView = lazy(() => import('@/components/three/views').then((m) => ({ default: m.TopologyView })))

const legend = [
  { color: '#7DE2B0', label: 'Healthy' },
  { color: '#FFD166', label: 'Needs attention' },
  { color: '#FF9F45', label: 'At risk' },
  { color: '#E01072', label: 'Workspace hub' },
]

function TopologyPanel({ spaces }: { spaces: StructureSpace[] | null }) {
  const { open } = useDrill()
  const empty = spaces !== null && spaces.length === 0
  return (
    <Panel className="relative min-h-[420px] overflow-hidden p-0">
      {empty ? (
        <div className="grid h-full min-h-[420px] place-items-center px-8 text-center">
          <div>
            <p className="font-display text-lg text-txt-primary">No structure to display</p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-txt-muted">
              This scan didn't read any Spaces or Lists. Connect as a workspace Owner or Admin to see the full structure.
            </p>
          </div>
        </div>
      ) : (
        <>
          <Suspense fallback={<div className="grid h-full place-items-center font-mono text-xs text-txt-faint">Loading 3D visualisation…</div>}>
            <TopologyView className="absolute inset-0" onSelect={(name) => open(`space:${name}`)} spaces={spaces ?? undefined} fallback={<div className="grid h-full place-items-center font-mono text-xs text-txt-faint">3D visualisation</div>} />
          </Suspense>
          <div className="pointer-events-none absolute left-6 top-5">
            <Chip><span className="h-1.5 w-1.5 rounded-full bg-magenta" /> Click a Space to drill in</Chip>
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-wrap gap-4 bg-gradient-to-t from-white to-transparent px-6 pb-5 pt-12">
            {legend.map((l) => (
              <span key={l.label} className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-txt-muted">
                <span className="h-2 w-2 rounded-full" style={{ background: l.color, boxShadow: `0 0 8px ${l.color}` }} />
                {l.label}
              </span>
            ))}
          </div>
        </>
      )}
    </Panel>
  )
}

export default function ReportView({
  result,
  scanId,
  connectionId,
  sample = false,
}: {
  result: ScanResult
  scanId: string
  connectionId?: string
  sample?: boolean
}) {
  const [pdfOpen, setPdfOpen] = useState(false)
  const [spaces, setSpaces] = useState<StructureSpace[] | null>(null)
  const insufficient = result.activeTasks === 0 || result.coverage.scored <= 2
  const workspacesHref = sample ? '/' : connectionId ? `/workspaces?connection=${connectionId}` : '/'

  useEffect(() => {
    getStructure(scanId, sample)
      .then(setSpaces)
      .catch(() => setSpaces([]))
  }, [scanId, sample])

  if (insufficient) {
    return (
      <div className="mx-auto max-w-[1100px] px-6 pb-28 pt-28">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <Eyebrow>Workspace report</Eyebrow>
            <h1 className="mt-2 font-display text-2xl font-semibold tracking-display text-txt-primary sm:text-3xl">{result.workspaceName}</h1>
            <div className="mt-2 font-mono text-[11px] text-txt-faint">scanned {result.scannedAt}</div>
          </div>
          <Link href={workspacesHref}>
            <Button variant="ghost" className="px-5 py-3 text-sm">Run another scan</Button>
          </Link>
        </div>

        <Panel className="p-8 sm:p-10">
          <Chip className="mb-4">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: '#E07A2F' }} /> Insufficient data
          </Chip>
          <h2 className="font-display text-2xl font-semibold tracking-display text-brand-ink sm:text-3xl">
            We couldn't read enough of this workspace to score it.
          </h2>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-txt-muted">
            The connected account could only see <span className="text-txt-primary">{result.spaces}</span> Space{result.spaces === 1 ? '' : 's'} and{' '}
            <span className="text-txt-primary">{result.activeTasks.toLocaleString()}</span> task{result.activeTasks === 1 ? '' : 's'}. ClickUp hides
            workspace structure and tasks from anyone who isn't the workspace Owner or Admin, so any score here would be misleading.
          </p>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-txt-muted">
            Reconnect as an <span className="font-medium text-txt-primary">Owner or Admin</span> of the workspace to get a full report.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/"><Button arrow>Connect ClickUp</Button></Link>
            <Link href={workspacesHref}><Button variant="ghost" className="px-5 py-3 text-sm">Choose a workspace</Button></Link>
          </div>
        </Panel>
      </div>
    )
  }

  return (
    <DrillProvider scanId={scanId} mock={sample}>
      <div className="mx-auto max-w-[1360px] px-6 pb-28 pt-28">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <Eyebrow>Workspace report</Eyebrow>
            <h1 className="mt-2 font-display text-2xl font-semibold tracking-display text-txt-primary sm:text-3xl">{result.workspaceName}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 font-mono text-[11px] text-txt-faint">
              <span>{result.plan}</span>
              <span className="h-1 w-1 rounded-full bg-txt-faint" />
              <span>{result.members} members</span>
              <span className="h-1 w-1 rounded-full bg-txt-faint" />
              <span>scanned {result.scannedAt}</span>
              {sample && (
                <>
                  <span className="h-1 w-1 rounded-full bg-txt-faint" />
                  <span className="text-magenta">sample data</span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href={workspacesHref}>
              <Button variant="ghost" className="px-5 py-3 text-sm">{sample ? 'Connect your ClickUp' : 'Run another scan'}</Button>
            </Link>
            <Button onClick={() => setPdfOpen(true)} className="px-6 py-3 text-sm" icon={<IconDownload className="h-4 w-4" />}>Download PDF</Button>
          </div>
        </div>

        <div id="overview" className="scroll-mt-[150px]">
          <ScoreHero result={result} />
        </div>

        <div className="mt-8">
          <SectionNav />
        </div>

        <section id="categories" className="scroll-mt-[150px]">
          <SectionHeading index="01" title="Category scores" hint="Seven weighted categories" />
          <div className="mt-7">
            <CategoryCards categories={result.categories} />
          </div>
        </section>

        <section id="structure" className="mt-16 scroll-mt-[150px]">
          <SectionHeading index="02" title="Structure at a glance" hint="Hierarchy health" />
          <div className="mt-7 grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
            <TopologyPanel spaces={spaces} />
            <div className="space-y-5">
              <Panel className="p-6">
                <Eyebrow className="mb-3">What you're seeing</Eyebrow>
                <p className="text-[13.5px] leading-relaxed text-txt-muted">
                  Every node is a location in your workspace: the hub is the workspace, the large nodes are Spaces and the small nodes are Lists. Size reflects task volume; colour reflects health.
                </p>
              </Panel>
              <Panel className="p-6">
                <div className="space-y-4">
                  {[
                    { l: 'Spaces analysed', v: String(result.spaces) },
                    { l: 'Folders', v: String(result.folders) },
                    { l: 'Lists', v: String(result.lists) },
                    { l: 'Active tasks', v: result.activeTasks.toLocaleString() },
                  ].map((s) => (
                    <div key={s.l} className="flex items-center justify-between border-b border-line pb-3 last:border-0 last:pb-0">
                      <span className="text-[13px] text-txt-muted">{s.l}</span>
                      <span className="font-mono text-lg text-txt-primary">{s.v}</span>
                    </div>
                  ))}
                </div>
              </Panel>
            </div>
          </div>
        </section>

        <section id="findings" className="mt-16 scroll-mt-[150px]">
          <SectionHeading index="03" title="Findings & recommendations" hint="Ranked by severity" />
          <div className="mt-7">
            <FindingsList findings={result.findings} findingsSummary={result.findingsSummary} />
          </div>
        </section>

        <section className="mt-16 grid gap-6 lg:grid-cols-2">
          <PerformingWell items={result.performingWell} />
          <UtilisationMatrix utilisation={result.utilisation} />
        </section>

        <section id="intelligence" className="mt-16 scroll-mt-[150px]">
          <SectionHeading index="04" title="Intelligence & configuration" hint="AI on top of a deterministic engine" />
          <div className="mt-7 space-y-6">
            <ExecutiveSummary summary={result.aiSummary} />
            <RulesTeaser rules={result.rules} />
          </div>
        </section>

        <section className="mt-16">
          <LeadCapture scanId={scanId} sample={sample} />
        </section>

        <PdfPreview result={result} scanId={scanId} open={pdfOpen} onClose={() => setPdfOpen(false)} sample={sample} />
      </div>
    </DrillProvider>
  )
}
