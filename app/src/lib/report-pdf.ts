import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import fs from 'node:fs'
import path from 'node:path'
import type { ScanResult, Severity } from './types'

const GREEN = rgb(0.09, 0.204, 0.208)
const GREEN2 = rgb(0.141, 0.341, 0.306)
const MAGENTA = rgb(0.878, 0.063, 0.447)
const GREY = rgb(0.42, 0.505, 0.478)
const LINE = rgb(0.85, 0.87, 0.85)

const SEV_COLOR: Record<Severity, ReturnType<typeof rgb>> = {
  critical: rgb(0.839, 0.2, 0.424),
  high: rgb(0.878, 0.478, 0.184),
  medium: rgb(0.788, 0.635, 0.153),
  low: rgb(0.247, 0.498, 0.839),
  opportunity: rgb(0.184, 0.62, 0.455),
}

function scoreColor(score: number) {
  if (score >= 85) return rgb(0.274, 0.878, 0.627)
  if (score >= 75) return rgb(0.49, 0.886, 0.69)
  if (score >= 60) return rgb(1, 0.82, 0.4)
  if (score >= 45) return rgb(1, 0.624, 0.271)
  return rgb(1, 0.361, 0.424)
}

function tryRead(p: string): Uint8Array | null {
  try {
    return fs.readFileSync(p)
  } catch {
    return null
  }
}

export interface ReportPdfOptions {
  wordmark?: Uint8Array | null
  badge?: Uint8Array | null
  brandDir?: string
}

/**
 * Build the branded Sharpflow ClickUp Health report PDF from a ScanResult.
 * Pure + side-effect free (reads logo assets if available, otherwise text-only).
 */
export async function buildReportPdf(result: ScanResult, opts: ReportPdfOptions = {}): Promise<Uint8Array> {
  const dir = opts.brandDir ?? path.join(process.cwd(), 'public', 'brand')
  const wordmarkBytes = opts.wordmark ?? tryRead(path.join(dir, 'logo-wordmark.png'))
  const badgeBytes = opts.badge ?? tryRead(path.join(dir, 'partner-badge.png'))

  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const italic = await doc.embedFont(StandardFonts.HelveticaOblique)

  const wordmark = wordmarkBytes ? await doc.embedPng(wordmarkBytes).catch(() => null) : null
  const badge = badgeBytes ? await doc.embedPng(badgeBytes).catch(() => null) : null

  const A4: [number, number] = [595.28, 841.89]
  const M = 44
  const CW = A4[0] - M * 2
  let page = doc.addPage(A4)
  let y = A4[1] - M
  let pageNum = 1

  const wrap = (text: string, size: number, f: typeof font, maxW: number) => {
    const words = text.split(' ')
    const lines: string[] = []
    let cur = ''
    for (const w of words) {
      const test = cur ? `${cur} ${w}` : w
      if (f.widthOfTextAtSize(test, size) > maxW && cur) {
        lines.push(cur)
        cur = w
      } else cur = test
    }
    if (cur) lines.push(cur)
    return lines
  }

  const footer = () => {
    page.drawLine({ start: { x: M, y: M - 4 }, end: { x: A4[0] - M, y: M - 4 }, thickness: 0.6, color: LINE })
    page.drawText('Sharpflow ClickUp Health', { x: M, y: M - 16, size: 7.5, font, color: GREY })
    const pn = `Page ${pageNum}`
    page.drawText(pn, { x: A4[0] - M - font.widthOfTextAtSize(pn, 7.5), y: M - 16, size: 7.5, font, color: GREY })
    if (badge) {
      const bw = 30
      const bh = (badge.height / badge.width) * bw
      page.drawImage(badge, { x: A4[0] - M - 64 - bw, y: M - 22, width: bw, height: bh })
    }
  }

  const newPage = () => {
    footer()
    page = doc.addPage(A4)
    pageNum += 1
    y = A4[1] - M
  }
  const need = (h: number) => {
    if (y - h < M + 26) newPage()
  }
  const text = (s: string, size = 10, color = GREEN, f = font, x = M) => {
    need(size + 4)
    page.drawText(s, { x, y: y - size, size, font: f, color })
    y -= size + 4
  }
  const para = (s: string, size = 10, color = GREY, f = font) => {
    for (const line of wrap(s, size, f, CW)) {
      need(size + 4)
      page.drawText(line, { x: M, y: y - size, size, font: f, color })
      y -= size + 4
    }
    y -= 2
  }
  const sectionTitle = (s: string, color = GREEN2) => {
    need(30)
    page.drawText(s, { x: M, y: y - 15, size: 13, font: bold, color })
    y -= 22
  }
  const rule = () => {
    need(10)
    page.drawLine({ start: { x: M, y }, end: { x: A4[0] - M, y }, thickness: 0.6, color: LINE })
    y -= 12
  }

  /* ------------------------------- cover/header ------------------------------ */
  if (wordmark) {
    const wmW = 130
    const wmH = (wordmark.height / wordmark.width) * wmW
    page.drawImage(wordmark, { x: M, y: y - wmH, width: wmW, height: wmH })
    y -= wmH + 14
  } else {
    text('Sharpflow', 18, GREEN, bold)
  }

  sectionTitle('ClickUp Health Report', GREEN)
  text(result.workspaceName, 16, GREEN, bold)
  text(`${result.plan}  ·  ${result.members} members  ·  ${result.activeTasks.toLocaleString()} tasks  ·  ${result.scannedAt}`, 9, GREY)
  y -= 6

  // score block
  const band = scoreColor(result.overallScore)
  need(90)
  const scoreY = y
  page.drawRectangle({ x: M, y: scoreY - 70, width: CW, height: 70, color: rgb(0.972, 0.973, 0.962) })
  page.drawText(`ClickUp Health Score`, { x: M + 18, y: scoreY - 22, size: 10, font: bold, color: GREY })
  page.drawText(String(result.overallScore), { x: M + 18, y: scoreY - 58, size: 34, font: bold, color: band })
  page.drawText('/100', { x: M + 18 + bold.widthOfTextAtSize(String(result.overallScore), 34) + 4, y: scoreY - 56, size: 12, font, color: GREY })
  page.drawText(`Grade ${result.overallGrade}`, { x: M + 190, y: scoreY - 42, size: 14, font: bold, color: band })
  page.drawText(`${result.findingsSummary.total} findings`, { x: M + 190, y: scoreY - 60, size: 10, font, color: GREY })
  y -= 84

  if (result.dataQuality) {
    const quality = result.dataQuality
    if (
      quality.partial ||
      quality.truncated ||
      quality.listsSampled ||
      quality.tasksScanned < quality.tasksExpected
    ) {
      para(
        `Coverage note: ${quality.listsScanned.toLocaleString()} of ${quality.listsTotal.toLocaleString()} Lists and ${quality.tasksScanned.toLocaleString()} of ${quality.tasksExpected.toLocaleString()} tasks were read.` +
          `${quality.truncated ? ' Some very large Lists were safety-capped.' : ''}` +
          `${quality.listsSampled ? ' The workspace exceeded the List coverage cap.' : ''}` +
          `${quality.failedLists > 0 ? ` ${quality.failedLists} Lists could not be read.` : ''}` +
          `${quality.signalsMeasured != null && quality.signalsTotal != null ? ` ${quality.signalsMeasured} of ${quality.signalsTotal} scored signals were measurable.` : ''}`,
        8.5,
        GREY,
      )
    }
  }

  text(result.summaryHeadline, 14, GREEN, bold)
  para(result.summaryBody, 10, GREY)

  rule()
  sectionTitle('Category scores')
  for (const c of result.categories) {
    need(22)
    const color = scoreColor(c.score)
    page.drawText(c.name, { x: M, y: y - 12, size: 10, font, color: GREEN })
    const barX = M + 190
    const barW = CW - 190 - 34
    page.drawRectangle({ x: barX, y: y - 10, width: barW, height: 6, color: rgb(0.9, 0.91, 0.9) })
    page.drawRectangle({ x: barX, y: y - 10, width: (barW * c.score) / 100, height: 6, color })
    const val = String(c.score)
    page.drawText(val, { x: A4[0] - M - font.widthOfTextAtSize(val, 10), y: y - 12, size: 10, font: bold, color })
    y -= 20
  }
  y -= 6

  rule()
  sectionTitle('Why these scores')
  for (const c of result.categories) {
    const explainers = c.explainers ?? []
    const bad = explainers.filter((e) => e.status === 'below' || e.status === 'above')
    need(42)
    page.drawText(c.name, { x: M, y: y - 12, size: 12, font: bold, color: GREEN })
    page.drawText(`${c.score}/100`, { x: M + 250, y: y - 12, size: 11, font: bold, color: scoreColor(c.score) })
    if (c.overallImpact != null && c.overallImpact > 0) {
      page.drawText(`-${c.overallImpact.toFixed(1)} overall points`, { x: M + 310, y: y - 12, size: 8, font, color: MAGENTA })
    }
    y -= 18
    for (const line of wrap(c.blurb, 8.2, font, CW)) {
      page.drawText(line, { x: M, y: y - 8, size: 8.2, font, color: GREY })
      y -= 10
    }
    y -= 2

    for (const e of explainers) {
      need(14)
      const status =
        e.severity === 'opportunity' ? 'Opportunity'
          : e.status === 'within' ? 'Within target'
            : e.status === 'below' ? 'Below target'
              : e.status === 'above' ? 'Above target'
                : e.status === 'not_measured' ? 'Not measured'
                  : 'Insight only'
      page.drawText(e.name, { x: M + 10, y: y - 8, size: 8.2, font: bold, color: GREEN })
      page.drawText(`${e.value}  vs  ${e.target}`, { x: M + 145, y: y - 8, size: 8, font, color: GREY })
      page.drawText(status, { x: M + 330, y: y - 8, size: 8, font: e.status === 'within' ? font : bold, color: e.status === 'within' ? GREEN2 : MAGENTA })
      if (e.categoryPoints > 0) {
        page.drawText(`-${e.categoryPoints.toFixed(1)} pts`, { x: A4[0] - M - 46, y: y - 8, size: 7.8, font: bold, color: MAGENTA })
      }
      y -= 11

      if (bad.includes(e)) {
        for (const line of wrap(e.why, 7.6, font, CW - 20)) {
          need(10)
          page.drawText(line, { x: M + 10, y: y - 7, size: 7.6, font, color: GREY })
          y -= 9
        }
        for (const line of wrap(`Good looks like: ${e.good}`, 7.4, italic, CW - 20)) {
          need(10)
          page.drawText(line, { x: M + 10, y: y - 7, size: 7.4, font: italic, color: GREEN2 })
          y -= 9
        }
      }
      y -= 2
    }
    y -= 6
  }

  rule()
  sectionTitle('Findings & recommendations')
  for (const f of result.findings) {
    const color = SEV_COLOR[f.severity]
    const explanationLines = wrap(f.explanation, 8.5, font, CW - 160)
    const recommendationLines = wrap(`Recommendation: ${f.recommendation}`, 8.5, italic, CW - 160)
    const targetLines = f.target ? wrap(`Target: ${f.target}`, 8.2, font, CW - 160) : []
    const goodLines = f.good ? wrap(`What good looks like: ${f.good}`, 8.5, font, CW - 160) : []
    const blockH = 42 + (explanationLines.length + recommendationLines.length + targetLines.length + goodLines.length) * 11 + 10
    need(blockH)
    const startY = y
    page.drawRectangle({ x: M, y: startY - blockH, width: 3, height: blockH, color })
    page.drawText(f.metric, { x: M + 12, y: startY - 16, size: 12, font: bold, color })
    page.drawText(f.metricLabel, { x: M + 12, y: startY - 28, size: 8, font, color: GREY })
    page.drawText(f.title, { x: M + 150, y: startY - 15, size: 11, font: bold, color: GREEN })
    page.drawText(`${f.category} | ${f.severity.toUpperCase()}${f.impact ? ` | ${f.impact}` : ''}`, { x: M + 150, y: startY - 28, size: 7.8, font, color })
    let ty = startY - 42
    for (const line of explanationLines) {
      page.drawText(line, { x: M + 150, y: ty, size: 8.5, font, color: GREY })
      ty -= 11
    }
    for (const line of recommendationLines) {
      page.drawText(line, { x: M + 150, y: ty, size: 8.5, font: italic, color: GREEN2 })
      ty -= 11
    }
    for (const line of targetLines) {
      page.drawText(line, { x: M + 150, y: ty, size: 8.2, font, color: GREY })
      ty -= 11
    }
    for (const line of goodLines) {
      page.drawText(line, { x: M + 150, y: ty, size: 8.5, font, color: GREEN2 })
      ty -= 11
    }
    y = startY - blockH - 10
  }

  rule()
  sectionTitle('How the score works')
  para('Each category score is the weighted average of its signals. A signal outside target deducts points based on its severity and how far it is from target. Worse values scale up to 1.5 times the base penalty.', 8.8, GREY)
  para('The overall score is the weighted average of the scored categories. Categories without enough measurable data are excluded rather than counted as perfect. Opportunity findings explain a gap but carry no score penalty.', 8.8, GREY)
  para('The AI summary explains the result. It never calculates, changes or re-derives any score.', 8.8, GREY)

  rule()
  sectionTitle('Platform utilisation')
  for (const u of result.utilisation) {
    need(14)
    const label = u.status === 'detected' ? 'Detected' : u.status === 'partial' ? 'Partial' : 'Not measurable'
    page.drawText(`${u.capability}`, { x: M, y: y - 10, size: 9, font, color: GREEN })
    page.drawText(label, { x: M + 190, y: y - 10, size: 9, font, color: u.status === 'detected' ? GREEN2 : GREY })
    page.drawText(u.detail, { x: M + 300, y: y - 10, size: 8, font, color: GREY })
    y -= 14
  }

  footer()

  return await doc.save()
}
