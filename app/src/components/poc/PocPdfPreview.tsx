'use client'

import { IconDownload, Panel } from '../ui'
import { POC_PDF_URL } from '../../lib/mock/poc'

export default function PocPdfPreview() {
  return (
    <Panel className="overflow-hidden p-0">
      <div className="grid lg:grid-cols-[0.82fr_1.18fr]">
        <div className="relative flex min-h-[320px] items-center justify-center bg-[radial-gradient(120%_120%_at_50%_0%,rgba(95,186,149,0.16),transparent_60%)] p-8">
          <div className="w-full max-w-[280px] rotate-[-2deg] rounded-sm border border-line bg-white p-5 shadow-panel">
            <div className="font-mono text-[7px] uppercase tracking-widest text-magenta">Why this score</div>
            <div className="mt-3 font-display text-[18px] font-semibold leading-tight text-txt-primary">Operational Health</div>
            <div className="mt-2 font-mono text-4xl text-txt-primary">68<span className="text-xs text-txt-faint">/100</span></div>
            <div className="mt-4 h-1.5 rounded-full bg-brand-ink/10">
              <div className="h-full w-[68%] rounded-full bg-[#FFD166]" />
            </div>
            <div className="mt-4 space-y-2">
              {[['Overdue rate', '31.4%', '-4.2'], ['Stale 90d+', '12%', '-1.6'], ['WIP / person', '19', '-0.6']].map(([a, b, c]) => (
                <div key={a} className="flex items-center justify-between border-b border-line pb-1 font-mono text-[7px] text-txt-muted">
                  <span>{a}</span>
                  <span>{b}</span>
                  <span className="text-magenta">{c}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded bg-magenta/[0.06] p-2 text-[6.5px] leading-relaxed text-txt-muted">
              The report explains the score and gives the next step.
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-center p-7 sm:p-9">
          <div className="font-mono text-[10px] uppercase tracking-widest text-magenta">PDF output - PoC</div>
          <h3 className="mt-2 font-display text-2xl font-semibold tracking-display text-txt-primary">The same story, in a client-ready PDF.</h3>
          <p className="mt-3 max-w-lg text-[13.5px] leading-relaxed text-txt-muted">
            The sample PDF adds the why-score explanations, finding targets and a branded Action Plan page. This is the document a prospect can keep, share internally and act on.
          </p>

          <div className="mt-5 grid gap-2 text-[12px] text-txt-muted sm:grid-cols-3">
            {['Why this score', 'Finding targets', 'Action Plan'].map((item) => (
              <div key={item} className="rounded-lg border border-line bg-brand-ink/[0.02] px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-txt-muted">
                {item}
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href={POC_PDF_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-brand-ink px-5 py-3 font-mono text-[10px] uppercase tracking-widest text-white transition-transform hover:-translate-y-0.5"
            >
              Open sample PDF -&gt;
            </a>
            <a
              href={POC_PDF_URL}
              download
              className="inline-flex items-center gap-2 rounded-full border border-line px-5 py-3 font-mono text-[10px] uppercase tracking-widest text-txt-muted transition-colors hover:border-line-strong hover:text-txt-primary"
            >
              <IconDownload className="h-4 w-4" /> Download
            </a>
          </div>
        </div>
      </div>
    </Panel>
  )
}
