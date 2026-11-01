'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Chip, Panel, SectionHeading } from '../ui'
import ScoreHero from '../report/ScoreHero'
import PocCategoryCards from './PocCategoryCards'
import WhyScoreDrawer from './WhyScoreDrawer'
import PocFindings from './PocFindings'
import ActionPlan from './ActionPlan'
import PocPdfPreview from './PocPdfPreview'
import { MOCK_SCAN } from '../../lib/mock/scan'
import { POC_ACTIONS, POC_CATEGORIES, POC_FINDINGS } from '../../lib/mock/poc'

export default function PocReport() {
  const [explainKey, setExplainKey] = useState<string | null>(null)
  const category = POC_CATEGORIES.find((c) => c.key === explainKey) ?? null

  return (
    <>
      <div className="mx-auto max-w-[1360px] px-6 pb-24 pt-28">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Chip className="border-magenta/30 bg-magenta/[0.08] text-magenta">
              <span className="h-1.5 w-1.5 rounded-full bg-magenta" /> Proof of concept
            </Chip>
            <span className="font-mono text-[10px] uppercase tracking-widest text-txt-faint">Sample data - not live ClickUp</span>
          </div>
          <Link href="/sample" className="font-mono text-[10px] uppercase tracking-widest text-txt-muted transition-colors hover:text-txt-primary">
            Back to sample report
          </Link>
        </div>

        <div className="mb-6">
          <div className="font-mono text-[11px] uppercase tracking-widest text-magenta">Phase 2 preview</div>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-display text-txt-primary sm:text-4xl">
            A report that explains itself and tells the client what to do next.
          </h1>
          <p className="mt-3 max-w-3xl text-[14.5px] leading-relaxed text-txt-muted">
            This PoC adds two layers to the existing report: a clear reason behind every score, and a prioritised Action Plan that turns findings into a next step. The production report is unchanged.
          </p>
        </div>

        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          {[
            ['Why this score', 'Every category and signal gets an explanation, actual vs target, and points impact.'],
            ['What good looks like', 'Findings show the target, the recommended move and the expected effect.'],
            ['Action Plan', 'Top five actions split into quick wins and strategic fixes, with a call CTA.'],
          ].map(([title, body]) => (
            <Panel key={title} className="p-4">
              <div className="font-mono text-[10px] uppercase tracking-widest text-brand-glow">{title}</div>
              <p className="mt-2 text-[12.5px] leading-relaxed text-txt-muted">{body}</p>
            </Panel>
          ))}
        </div>

        <ScoreHero result={MOCK_SCAN} />

        <section className="mt-16">
          <SectionHeading index="01" title="Why this score" hint="The explanation layer" />
          <div className="mt-6">
            <PocCategoryCards categories={POC_CATEGORIES} onExplain={setExplainKey} />
          </div>
        </section>

        <section className="mt-16">
          <SectionHeading index="02" title="Findings with reasons" hint="Why it is bad, and what good looks like" />
          <div className="mt-6">
            <PocFindings findings={POC_FINDINGS} />
          </div>
        </section>

        <section className="mt-16">
          <SectionHeading index="03" title="Action Plan" hint="From diagnosis to next step" />
          <div className="mt-6">
            <ActionPlan actions={POC_ACTIONS} />
          </div>
        </section>

        <section className="mt-16">
          <SectionHeading index="04" title="Client-ready PDF" hint="The same explanations, in the document" />
          <div className="mt-6">
            <PocPdfPreview />
          </div>
        </section>

        <div className="mt-16 rounded-xl2 border border-dashed border-line-strong bg-brand-ink/[0.02] p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-magenta">PoC boundary</div>
              <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-txt-muted">
                This page uses the existing Northwind Creative sample workspace and mocked explanation data. It does not touch the live scanner, database, scoring engine, production report or PDF pipeline. If approved, the same UI can be implemented against the real engine.
              </p>
            </div>
            <Link href="/sample" className="rounded-full border border-line px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-txt-muted transition-colors hover:border-line-strong hover:text-txt-primary">
              View current report
            </Link>
          </div>
        </div>
      </div>

      <WhyScoreDrawer category={category} onClose={() => setExplainKey(null)} />
    </>
  )
}
