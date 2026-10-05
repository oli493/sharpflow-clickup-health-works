import { expect, it } from 'vitest'
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
  fs.writeFileSync(path.join(os.tmpdir(), 'sf-report-sample.pdf'), bytes)
})
