import { expect, it } from 'vitest'
import { PDFArray, PDFDict, PDFDocument, PDFName, PDFRef, PDFString } from 'pdf-lib'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { buildReportPdf } from './report-pdf'
import { MOCK_SCAN } from './mock/scan'

it('builds a valid branded report PDF', async () => {
  const bytes = await buildReportPdf(MOCK_SCAN, { brandDir: path.join(process.cwd(), 'public', 'brand') })
  const head = Buffer.from(bytes.slice(0, 5)).toString('latin1')
  expect(head).toBe('%PDF-')
  expect(bytes.length).toBeGreaterThan(5000)
  const pdf = await PDFDocument.load(bytes)
  expect(pdf.getPageCount()).toBeGreaterThan(2)
  fs.writeFileSync(path.join(os.tmpdir(), 'sf-report-sample.pdf'), bytes)
})

it('adds clickable CTA links to the report PDF', async () => {
  const reportUrl = 'https://example.com/report/abc123'
  const bytes = await buildReportPdf(MOCK_SCAN, {
    brandDir: path.join(process.cwd(), 'public', 'brand'),
    reportUrl,
  })
  const pdf = await PDFDocument.load(bytes)
  const page = pdf.getPage(pdf.getPageCount() - 1)
  const annots = page.node.lookupMaybe(PDFName.of('Annots'), PDFArray)
  expect(annots).toBeDefined()

  const uris: string[] = []
  for (let i = 0; i < annots!.size(); i += 1) {
    const annot = pdf.context.lookup(annots!.get(i) as PDFRef, PDFDict)
    const action = annot.lookupMaybe(PDFName.of('A'), PDFDict)
    const uri = action?.lookupMaybe(PDFName.of('URI'), PDFString)
    if (uri) uris.push(uri.decodeText())
  }

  expect(uris).toContain('https://calendly.com/oli-sharpflowconsulting/clickup-health-discussion')
  expect(uris).toContain(reportUrl)
})
