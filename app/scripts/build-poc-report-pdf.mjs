import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const APP_DIR = path.resolve(__dirname, '..')
const OUT = path.join(APP_DIR, 'public', 'poc', 'sharpflow-poc-report.pdf')
const WORDMARK = path.join(APP_DIR, 'public', 'brand', 'logo-wordmark.png')

const C = {
  cream: rgb(0.965, 0.961, 0.945),
  paper: rgb(1, 1, 1),
  ink: rgb(0.09, 0.204, 0.208),
  green: rgb(0.141, 0.341, 0.306),
  greenSoft: rgb(0.925, 0.957, 0.937),
  lime: rgb(0.87, 0.968, 0.431),
  magenta: rgb(0.878, 0.063, 0.447),
  magentaSoft: rgb(0.984, 0.925, 0.949),
  amber: rgb(0.878, 0.478, 0.184),
  amberSoft: rgb(0.984, 0.945, 0.91),
  grey: rgb(0.42, 0.505, 0.478),
  greyLight: rgb(0.61, 0.66, 0.64),
  line: rgb(0.84, 0.87, 0.84),
}

const A4 = [595.28, 841.89]
const M = 44
const CW = A4[0] - M * 2

async function main() {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const italic = await doc.embedFont(StandardFonts.HelveticaOblique)
  const wordmark = fs.existsSync(WORDMARK) ? await doc.embedPng(fs.readFileSync(WORDMARK)) : null
  const pages = []

  function wrap(text, size, f, maxW) {
    const words = String(text).replace(/\s+/g, ' ').trim().split(' ')
    const lines = []
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

  function addPage() {
    const page = doc.addPage(A4)
    page.drawRectangle({ x: 0, y: 0, width: A4[0], height: A4[1], color: C.cream })
    pages.push(page)
    return page
  }

  function header(page, label) {
    let y = A4[1] - M
    if (wordmark) {
      const w = 88
      const h = (wordmark.height / wordmark.width) * w
      page.drawImage(wordmark, { x: M, y: y - h, width: w, height: h })
      y -= h + 2
    } else {
      page.drawText('Sharpflow', { x: M, y: y - 14, size: 14, font: bold, color: C.ink })
      y -= 20
    }
    const l = label.toUpperCase()
    page.drawText(l, { x: A4[0] - M - bold.widthOfTextAtSize(l, 7.5), y: A4[1] - M - 8, size: 7.5, font: bold, color: C.magenta })
    return A4[1] - M - 34
  }

  function para(page, s, x, y, size = 9.5, color = C.grey, f = font, maxW = CW) {
    for (const line of wrap(s, size, f, maxW)) {
      page.drawText(line, { x, y: y - size, size, font: f, color })
      y -= size * 1.4
    }
    return y
  }

  function rule(page, y, color = C.lime, width = CW) {
    page.drawRectangle({ x: M, y, width, height: 2.2, color })
    return y - 14
  }

  /* ------------------------------- page 1 ------------------------------- */
  let page = addPage()
  let y = header(page, 'Proof of concept')

  page.drawText('CLICKUP HEALTH REPORT', { x: M, y: y - 8, size: 7.5, font: bold, color: C.magenta })
  y -= 22
  page.drawText('Northwind Creative', { x: M, y: y - 28, size: 27, font: bold, color: C.ink })
  y -= 40
  page.drawText('Business Plus  |  42 members  |  14,217 tasks  |  sample data', { x: M, y: y - 9, size: 8.5, font, color: C.grey })
  y -= 22
  y = rule(page, y)

  const band = rgb(1, 0.82, 0.4)
  page.drawRectangle({ x: M, y: y - 92, width: CW, height: 92, color: C.ink })
  page.drawText('CLICKUP HEALTH SCORE', { x: M + 18, y: y - 24, size: 8, font: bold, color: C.lime })
  page.drawText('74', { x: M + 18, y: y - 66, size: 40, font: bold, color: band })
  page.drawText('/100', { x: M + 74, y: y - 62, size: 12, font, color: rgb(0.82, 0.88, 0.84) })
  page.drawText('Grade C+', { x: M + 210, y: y - 48, size: 15, font: bold, color: band })
  page.drawText('39 findings', { x: M + 210, y: y - 67, size: 9, font, color: rgb(0.82, 0.88, 0.84) })
  page.drawText('This PoC adds the reason behind each score and a clear next step.', { x: M + 330, y: y - 49, size: 8.2, font, color: rgb(0.82, 0.88, 0.84), maxWidth: 150 })
  y -= 110

  page.drawText('Category scores', { x: M, y: y - 13, size: 13, font: bold, color: C.green })
  y -= 26
  const cats = [
    ['Architecture & Structure', 81],
    ['Workflow Design', 77],
    ['Data & Governance', 62],
    ['Operational Health', 68],
    ['Adoption & Activity', 79],
    ['Platform Utilisation', 57],
    ['Reporting Readiness', 83],
  ]
  for (const [name, score] of cats) {
    const color = score >= 85 ? rgb(0.274, 0.878, 0.627) : score >= 75 ? rgb(0.49, 0.886, 0.69) : score >= 60 ? rgb(1, 0.82, 0.4) : rgb(1, 0.624, 0.271)
    page.drawText(name, { x: M, y: y - 10, size: 9, font, color: C.ink })
    page.drawRectangle({ x: M + 190, y: y - 8, width: CW - 224, height: 6, color: rgb(0.9, 0.91, 0.9) })
    page.drawRectangle({ x: M + 190, y: y - 8, width: ((CW - 224) * score) / 100, height: 6, color })
    page.drawText(String(score), { x: A4[0] - M - 18, y: y - 10, size: 9, font: bold, color })
    y -= 19
  }

  y -= 8
  page.drawRectangle({ x: M, y: y - 62, width: CW, height: 62, color: C.paper })
  page.drawRectangle({ x: M, y: y - 62, width: 3, height: 62, color: C.magenta })
  page.drawText('WHAT THIS POC ADDS', { x: M + 18, y: y - 20, size: 7.2, font: bold, color: C.magenta })
  page.drawText('A clear reason behind every score, and an Action Plan that tells the client what to do next.', { x: M + 18, y: y - 40, size: 9.2, font: bold, color: C.ink })
  page.drawText('The score itself is unchanged. This is an explanation and conversion layer on top of the existing report.', { x: M + 18, y: y - 54, size: 8, font, color: C.grey })

  y -= 84
  page.drawRectangle({ x: M, y: y - 64, width: CW, height: 64, color: C.greenSoft })
  page.drawText('INSIDE THIS SAMPLE', { x: M + 16, y: y - 18, size: 7, font: bold, color: C.green })
  const inside = [
    ['01', 'Why this score', 'Every category explains its score.'],
    ['02', 'Finding targets', 'Why it is bad and what good looks like.'],
    ['03', 'Action Plan', 'Top five actions and a clear next step.'],
  ]
  inside.forEach(([n, head, body], i) => {
    const ix = M + 16 + i * 164
    page.drawText(n, { x: ix, y: y - 38, size: 8, font: bold, color: C.magenta })
    page.drawText(head, { x: ix + 18, y: y - 38, size: 8.2, font: bold, color: C.ink })
    page.drawText(body, { x: ix + 18, y: y - 52, size: 7.2, font, color: C.grey })
  })

  /* ------------------------------- page 2 ------------------------------- */
  page = addPage()
  y = header(page, 'Why this score - PoC')
  page.drawText('Why these scores', { x: M, y: y - 22, size: 24, font: bold, color: C.ink })
  y -= 34
  y = para(page, 'Each category score is the weighted result of its signals. Below are the signals that are pulling the score down, and what good looks like.', M, y, 10, C.grey)
  y -= 8

  const detail = [
    {
      name: 'Operational Health',
      score: 68,
      impact: 6.4,
      summary: 'Overdue work is the biggest driver, followed by stale tasks and high WIP.',
      signals: [
        ['Overdue rate', '31.4%', '< 15%', '-4.2 pts', '31.4% of active tasks are past due. Delivery is slipping and the due-date signal cannot be trusted.'],
        ['Stale 90d+', '12%', '< 5%', '-1.6 pts', 'A meaningful share of open tasks have not been updated for over 90 days.'],
        ['WIP / person', '19', '< 15', '-0.6 pts', 'People are carrying too many open tasks at once, which slows completion.'],
      ],
    },
    {
      name: 'Data & Governance',
      score: 62,
      impact: 5.7,
      summary: 'Custom Field sprawl and low completion are the main gaps.',
      signals: [
        ['Field completion', '43%', '>= 50%', '-2.4 pts', 'Less than half of in-scope fields are filled, so reporting built on them is unreliable.'],
        ['Custom Fields', '148', '< 100', '-1.6 pts', 'The active field set is too large for the team to maintain consistently.'],
        ['Fields at 0%', '61', '0', '-1.4 pts', '61 fields are never used where they apply, adding noise without data.'],
      ],
    },
    {
      name: 'Architecture & Structure',
      score: 81,
      impact: 2.9,
      summary: 'Mostly healthy, but a long tail of thin Lists is creating clutter.',
      signals: [
        ['Fragmented Lists', '38%', '< 25%', '-2.2 pts', '81 of 214 active Lists contain fewer than five tasks, spreading work too thin.'],
        ['Dormant Lists 90d+', '11%', '< 5%', '-0.7 pts', '23 Lists have had no activity for over 90 days.'],
        ['Avg tasks / List', '66.4', '>= 10', 'within target', 'The average List carries a healthy amount of work.'],
      ],
    },
    {
      name: 'Workflow Design',
      score: 77,
      impact: 3.5,
      summary: 'Mostly consistent, but unused and duplicated statuses add friction.',
      signals: [
        ['Unused statuses', '9', '<= 3', '-1.8 pts', 'Nine statuses are used on very few tasks, creating choices without tracking value.'],
        ['Duplicate names', '2', '0', '-1.2 pts', 'The same status name appears with different types, confusing rollups.'],
      ],
    },
    {
      name: 'Adoption & Activity',
      score: 79,
      impact: 3.2,
      summary: 'Most of the team is active, but quiet members and guest access are dragging the score.',
      signals: [
        ['Inactive members', '19%', '< 15%', '-1.4 pts', 'Eight members have had no task or comment activity in 30 days.'],
        ['Guest ratio', '38%', '< 30%', '-1.1 pts', 'A high share of users are guests, which can indicate an access-governance gap.'],
      ],
    },
  ]

  for (const cat of detail) {
    page.drawText(cat.name, { x: M, y: y - 13, size: 12.5, font: bold, color: C.ink })
    page.drawText(`${cat.score}/100`, { x: M + 300, y: y - 13, size: 11, font: bold, color: C.amber })
    page.drawText(`costing -${cat.impact.toFixed(1)} overall points`, { x: M + 360, y: y - 12, size: 8, font, color: C.magenta })
    y -= 19
    y = para(page, cat.summary, M, y, 8.6, C.grey, font, CW - 20)
    y -= 2
    for (const [name, value, target, impact, why] of cat.signals) {
      page.drawText(name, { x: M, y: y - 8, size: 8.2, font: bold, color: C.ink })
      page.drawText(`${value}  vs  ${target}`, { x: M + 118, y: y - 8, size: 8, font, color: C.grey })
      page.drawText(impact, { x: M + 250, y: y - 8, size: 8, font: bold, color: impact === 'within target' ? C.green : C.magenta })
      y -= 11
      y = para(page, why, M + 118, y, 7.6, C.grey, font, CW - 138)
      y -= 3
    }
    y -= 8
  }

  /* ------------------------------- page 3 ------------------------------- */
  page = addPage()
  y = header(page, 'Action Plan - PoC')
  page.drawText('Action Plan', { x: M, y: y - 22, size: 24, font: bold, color: C.ink })
  y -= 34
  y = para(page, 'Top five actions, ranked deterministically by severity, category weight, share of workspace affected and effort.', M, y, 10, C.grey)
  y -= 8

  const actions = [
    ['1', 'Reduce overdue work', 'Operational Health', 'Critical', 'Quick win', 'High', '4,466 tasks'],
    ['2', 'Retire never-filled fields', 'Data & Governance', 'High', 'Quick win', 'Medium', '61 fields'],
    ['3', 'Consolidate thin Lists', 'Architecture', 'High', 'Small project', 'High', '81 Lists'],
    ['4', 'Assign owners', 'Reporting Readiness', 'Medium', 'Quick win', 'High', '731 tasks'],
    ['5', 'Adopt time tracking', 'Platform Utilisation', 'Opportunity', 'Consulting', 'Medium', '6% of tasks'],
  ]
  page.drawText('ACTION', { x: M + 18, y: y - 8, size: 6.8, font: bold, color: C.greyLight })
  page.drawText('EFFORT', { x: M + 300, y: y - 8, size: 6.8, font: bold, color: C.greyLight })
  page.drawText('IMPACT', { x: M + 390, y: y - 8, size: 6.8, font: bold, color: C.greyLight })
  y -= 16
  for (const [rank, title, cat, sev, effort, impact, affected] of actions) {
    page.drawText(rank, { x: M, y: y - 10, size: 9, font: bold, color: C.magenta })
    page.drawText(title, { x: M + 18, y: y - 10, size: 9, font: bold, color: C.ink })
    page.drawText(`${cat}  |  ${sev}  |  ${affected}`, { x: M + 18, y: y - 21, size: 7.2, font, color: C.grey })
    page.drawText(effort, { x: M + 300, y: y - 10, size: 8, font, color: C.green })
    page.drawText(impact, { x: M + 390, y: y - 10, size: 8, font, color: C.magenta })
    page.drawLine({ start: { x: M, y: y - 27 }, end: { x: M + CW, y: y - 27 }, thickness: 0.4, color: C.line })
    y -= 36
  }

  y -= 6
  page.drawRectangle({ x: M, y: y - 58, width: (CW - 18) / 2, height: 58, color: C.paper })
  page.drawRectangle({ x: M, y: y - 58, width: (CW - 18) / 2, height: 58, color: C.greenSoft })
  page.drawText('QUICK WINS', { x: M + 14, y: y - 18, size: 7, font: bold, color: C.green })
  page.drawText('Reduce overdue work, retire dead fields, assign owners.', { x: M + 14, y: y - 34, size: 8, font, color: C.ink })
  page.drawText('Low effort, immediate score lift.', { x: M + 14, y: y - 48, size: 7.2, font, color: C.grey })

  const x2 = M + (CW - 18) / 2 + 18
  page.drawRectangle({ x: x2, y: y - 58, width: (CW - 18) / 2, height: 58, color: C.paper })
  page.drawRectangle({ x: x2, y: y - 58, width: (CW - 18) / 2, height: 58, color: C.magentaSoft })
  page.drawText('STRATEGIC FIXES', { x: x2 + 14, y: y - 18, size: 7, font: bold, color: C.magenta })
  page.drawText('Consolidate thin Lists, adopt time tracking.', { x: x2 + 14, y: y - 34, size: 8, font, color: C.ink })
  page.drawText('Higher effort, larger structural gain.', { x: x2 + 14, y: y - 48, size: 7.2, font, color: C.grey })
  y -= 80

  page.drawRectangle({ x: M, y: y - 82, width: CW, height: 82, color: C.ink })
  page.drawText('THE NEXT STEP', { x: M + 18, y: y - 20, size: 7.2, font: bold, color: C.lime })
  page.drawText('Turn the report into a working session.', { x: M + 18, y: y - 44, size: 14, font: bold, color: C.paper })
  page.drawText('Walk through the priorities, agree what to fix first, and decide where Sharpflow can help.', { x: M + 18, y: y - 62, size: 8.4, font, color: rgb(0.82, 0.88, 0.84) })
  page.drawText('Talk to Sharpflow  ->  sharpflowconsulting.com', { x: M + 18, y: y - 76, size: 8.2, font: bold, color: C.lime })

  y = 303
  page.drawRectangle({ x: M, y: y - 68, width: CW, height: 68, color: C.greenSoft })
  page.drawText('HOW THE RANKING WORKS', { x: M + 16, y: y - 18, size: 7, font: bold, color: C.green })
  const rankCols = [
    ['Severity', 'How urgent the finding is.'],
    ['Category weight', 'How much it moves the overall score.'],
    ['Share affected', 'How much of the workspace it touches.'],
    ['Effort', 'Quick win versus larger project.'],
  ]
  rankCols.forEach(([head, body], i) => {
    const rx = M + 16 + (i % 2) * 250
    const ry = y - 36 - Math.floor(i / 2) * 18
    page.drawText(head, { x: rx, y: ry, size: 7.6, font: bold, color: C.ink })
    page.drawText(body, { x: rx + 74, y: ry, size: 7, font, color: C.grey })
  })

  y -= 84
  page.drawRectangle({ x: M, y: y - 52, width: CW, height: 52, color: C.paper })
  page.drawText('SUCCESS MEASURES', { x: M + 16, y: y - 18, size: 7, font: bold, color: C.magenta })
  const measures = ['Action Plan views', 'PDF downloads', 'Book a call clicks', 'Scans to calls']
  measures.forEach((m, i) => {
    page.drawText(m, { x: M + 16 + i * 120, y: y - 36, size: 7.4, font: bold, color: C.ink })
  })

  /* ------------------------------- footers ------------------------------ */
  pages.forEach((p, i) => {
    p.drawLine({ start: { x: M, y: 54 }, end: { x: A4[0] - M, y: 54 }, thickness: 0.5, color: C.line })
    p.drawText('Sharpflow ClickUp Health  |  Proof of concept  |  Sample data', { x: M, y: 38, size: 7, font, color: C.greyLight })
    const pn = `Page ${i + 1} of ${pages.length}`
    p.drawText(pn, { x: A4[0] - M - font.widthOfTextAtSize(pn, 7), y: 38, size: 7, font, color: C.greyLight })
  })

  const bytes = await doc.save()
  fs.writeFileSync(OUT, bytes)
  console.log(`Wrote ${OUT} (${bytes.length} bytes, ${pages.length} pages)`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
