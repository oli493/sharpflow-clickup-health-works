import { lazy, Suspense, useState } from 'react'
import { motion } from 'framer-motion'
import { Button, Chip, Eyebrow, IconDownload, Panel, SectionHeading } from '../ui'
import ScoreHero from '../report/ScoreHero'
import CategoryCards from '../report/CategoryCards'
import FindingsList from '../report/FindingsList'
import PerformingWell from '../report/PerformingWell'
import UtilisationMatrix from '../report/UtilisationMatrix'
import ExecutiveSummary from '../report/ExecutiveSummary'
import RulesTeaser from '../report/RulesTeaser'
import PdfPreview from '../report/PdfPreview'
import SectionNav from '../report/SectionNav'
import LeadCapture from '../report/LeadCapture'
import { DrillProvider, useDrill } from '../report/Drill'
import { workspace } from '../../data/demoData'

const TopologyView = lazy(() => import('../three/views').then((m) => ({ default: m.TopologyView })))

const legend = [
  { color: '#7DE2B0', label: 'Healthy' },
  { color: '#FFD166', label: 'Needs attention' },
  { color: '#FF9F45', label: 'At risk' },
  { color: '#E01072', label: 'Workspace hub' },
]

function TopologyPanel() {
  const { open } = useDrill()
  return (
    <Panel className="relative min-h-[420px] overflow-hidden p-0">
      <Suspense
        fallback={
          <div className="grid h-full place-items-center font-mono text-xs text-txt-faint">
            Loading 3D visualisation…
          </div>
        }
      >
        <TopologyView
          className="absolute inset-0"
          onSelect={(name) => open(`space:${name}`)}
          fallback={
            <div className="grid h-full place-items-center font-mono text-xs text-txt-faint">
              3D visualisation
            </div>
          }
        />
      </Suspense>
      <div className="pointer-events-none absolute left-6 top-5">
        <Chip>
          <span className="h-1.5 w-1.5 rounded-full bg-magenta" /> Click a Space to drill in
        </Chip>
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-wrap gap-4 bg-gradient-to-t from-ink-panel to-transparent px-6 pb-5 pt-12">
        {legend.map((l) => (
          <span key={l.label} className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-txt-muted">
            <span className="h-2 w-2 rounded-full" style={{ background: l.color, boxShadow: `0 0 8px ${l.color}` }} />
            {l.label}
          </span>
        ))}
      </div>
    </Panel>
  )
}

export default function Report({ onReset }: { onReset: () => void }) {
  const [pdfOpen, setPdfOpen] = useState(false)

  return (
    <DrillProvider>
      <div className="mx-auto max-w-[1360px] px-6 pb-28 pt-28">
      {/* report header */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <Eyebrow>Workspace report</Eyebrow>
          <h1 className="mt-2 font-display text-2xl font-semibold tracking-display text-txt-primary sm:text-3xl">
            {workspace.name}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 font-mono text-[11px] text-txt-faint">
            <span>{workspace.plan}</span>
            <span className="h-1 w-1 rounded-full bg-txt-faint" />
            <span>{workspace.members} members</span>
            <span className="h-1 w-1 rounded-full bg-txt-faint" />
            <span>scanned just now</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={onReset} className="px-5 py-3 text-sm">
            Run another scan
          </Button>
          <Button onClick={() => setPdfOpen(true)} className="px-6 py-3 text-sm" icon={<IconDownload className="h-4 w-4" />}>
            Download PDF
          </Button>
        </div>
      </div>

      {/* hero */}
      <div id="overview" className="scroll-mt-[150px]">
        <ScoreHero />
      </div>

      <div className="mt-8">
        <SectionNav />
      </div>

      {/* category scores */}
      <section id="categories" className="scroll-mt-[150px]">
        <SectionHeading index="01" title="Category scores" hint="Seven weighted categories" />
        <div className="mt-7">
          <CategoryCards />
        </div>
      </section>

      {/* topology */}
      <section id="structure" className="mt-16 scroll-mt-[150px]">
        <SectionHeading index="02" title="Structure at a glance" hint="Hierarchy health" />
        <div className="mt-7 grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <TopologyPanel />

          <div className="space-y-5">
            <Panel className="p-6">
              <Eyebrow className="mb-3">What you're seeing</Eyebrow>
              <p className="text-[13.5px] leading-relaxed text-txt-muted">
                Every node is a location in your workspace — the hub is the workspace, the large
                nodes are Spaces and the small nodes are Lists. Size reflects task volume; colour
                reflects health.
              </p>
            </Panel>
            <Panel className="p-6">
              <div className="space-y-4">
                {[
                  { l: 'Spaces analysed', v: String(workspace.spaces) },
                  { l: 'Folders', v: String(workspace.folders) },
                  { l: 'Lists', v: String(workspace.lists) },
                  { l: 'Avg tasks / List', v: '66.4' },
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

      {/* findings */}
      <section id="findings" className="mt-16 scroll-mt-[150px]">
        <SectionHeading index="03" title="Findings & recommendations" hint="Ranked by severity" />
        <div className="mt-7">
          <FindingsList />
        </div>
      </section>

      {/* strengths + utilisation */}
      <section className="mt-16 grid gap-6 lg:grid-cols-2">
        <PerformingWell />
        <UtilisationMatrix />
      </section>

      {/* AI + rules */}
      <section id="intelligence" className="mt-16 scroll-mt-[150px]">
        <SectionHeading index="04" title="Intelligence & configuration" hint="AI on top of a deterministic engine" />
        <div className="mt-7 grid gap-6 lg:grid-cols-2">
          <ExecutiveSummary />
          <RulesTeaser />
        </div>
      </section>

      {/* lead capture */}
      <section className="mt-16">
        <LeadCapture />
      </section>

      {/* footer CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="mt-16"
      >
        <Panel className="flex flex-col items-start justify-between gap-6 p-8 sm:flex-row sm:items-center">
          <div>
            <Chip className="mb-3">
              <span className="h-1.5 w-1.5 rounded-full bg-magenta" /> White-label ready
            </Chip>
            <h3 className="font-display text-xl text-txt-primary">
              Your brand, your report, your client's score.
            </h3>
            <p className="mt-1 max-w-xl text-[13.5px] text-txt-muted">
              Logo, colours, custom domain and PDF exports — configurable per workspace.
            </p>
          </div>
          <Button onClick={() => setPdfOpen(true)} icon={<IconDownload className="h-4 w-4" />}>
            See branded report
          </Button>
        </Panel>
      </motion.div>

      <PdfPreview open={pdfOpen} onClose={() => setPdfOpen(false)} />
      </div>
    </DrillProvider>
  )
}
