import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const brandDir = path.join(root, 'public', 'brand')
const outDir = path.join(root, 'docs')
fs.mkdirSync(outDir, { recursive: true })

/* ------------------------------- palette -------------------------------- */
const GREEN = rgb(0.09, 0.204, 0.208) // #173435
const GREEN2 = rgb(0.141, 0.341, 0.306) // #24574E
const MAGENTA = rgb(0.878, 0.063, 0.447) // #E01072
const GREY = rgb(0.42, 0.505, 0.478)
const LINE = rgb(0.85, 0.87, 0.85)

/* --------------------------------- data ---------------------------------
   api: 'Yes' = measurable today, 'Part' = partial/conditional, 'No' = not exposed.
--------------------------------- ---------- ------------------------------ */
const SIGNALS = [
  {
    cat: 'Architecture & Structure',
    weight: 15,
    signals: [
      { n: 'Avg tasks per List', api: 'Yes', w: 30, t: '< 10 tasks', s: 'High' },
      { n: 'Dormant Lists (no activity)', api: 'Yes', w: 25, t: '> 15% of Lists', s: 'Medium' },
      { n: 'Fragmented Lists (< 5 tasks)', api: 'Yes', w: 25, t: '> 20% of Lists', s: 'High' },
      { n: 'Hierarchy / folder sprawl', api: 'Yes', w: 20, t: '> 20% unused', s: 'Low' },
    ],
  },
  {
    cat: 'Workflow Design',
    weight: 15,
    signals: [
      { n: 'Statuses per Space', api: 'Yes', w: 30, t: '> 10 per Space', s: 'Medium' },
      { n: 'Unused statuses', api: 'Yes', w: 30, t: '> 3 unused', s: 'High' },
      { n: 'Duplicate status names', api: 'Yes', w: 20, t: 'any clear dupe', s: 'Medium' },
      { n: 'Avg time in a status', api: 'Part', w: 20, t: '> 14 days', s: 'Medium' },
    ],
  },
  {
    cat: 'Data & Governance',
    weight: 15,
    signals: [
      { n: 'Custom Field count (bloat)', api: 'Yes', w: 25, t: '> 100 fields', s: 'Medium' },
      { n: 'Custom Field completion rate', api: 'Yes', w: 30, t: '< 60% average', s: 'High' },
      { n: 'Unused Custom Fields (90d)', api: 'Yes', w: 25, t: '> 20% unused', s: 'High' },
      { n: 'Tasks missing key fields', api: 'Yes', w: 20, t: '> 20%', s: 'Medium' },
    ],
  },
  {
    cat: 'Operational Health',
    weight: 20,
    signals: [
      { n: 'Overdue task rate', api: 'Yes', w: 35, t: '> 15%', s: 'Critical' },
      { n: 'Stale tasks (untouched 90d+)', api: 'Yes', w: 25, t: '> 5% of open', s: 'High' },
      { n: 'Tasks without a due date', api: 'Yes', w: 15, t: '> 20%', s: 'Medium' },
      { n: 'Completion vs creation trend', api: 'Yes', w: 15, t: 'backlog growing', s: 'Medium' },
      { n: 'Work-in-progress level', api: 'Yes', w: 10, t: '> 10 active/person', s: 'Low' },
    ],
  },
  {
    cat: 'Adoption & Activity',
    weight: 15,
    signals: [
      { n: 'Inactive paid seats (30d)', api: 'Yes', w: 35, t: '> 3 seats', s: 'Opportunity' },
      { n: 'Activity concentration', api: 'Part', w: 25, t: '> 60% in 1 Space', s: 'Medium' },
      { n: 'Comment / update frequency', api: 'Yes', w: 20, t: 'low vs team size', s: 'Low' },
      { n: 'Dormant Spaces', api: 'Yes', w: 20, t: 'any Space', s: 'Medium' },
    ],
  },
  {
    cat: 'Platform Utilisation',
    weight: 10,
    signals: [
      { n: 'Time tracking in use', api: 'Yes', w: 20, t: '0 logged', s: 'Opportunity' },
      { n: 'Estimate coverage', api: 'Yes', w: 15, t: '< 25%', s: 'Low' },
      { n: 'Views / Dashboards used', api: 'Yes', w: 15, t: '< 2 per Space', s: 'Low' },
      { n: 'Dependencies / Relationships', api: 'Yes', w: 15, t: 'none used', s: 'Low' },
      { n: 'Goals tracked', api: 'Yes', w: 10, t: 'none', s: 'Opportunity' },
      { n: 'Docs used', api: 'Yes', w: 10, t: 'none', s: 'Opportunity' },
      { n: 'Custom Task Types used', api: 'Yes', w: 10, t: 'none', s: 'Opportunity' },
      { n: 'Automations / Forms / Whiteboards / Workload / AI', api: 'No', w: 0, t: 'not measurable', s: 'Low' },
    ],
  },
  {
    cat: 'Reporting Readiness',
    weight: 10,
    signals: [
      { n: 'Due-date coverage', api: 'Yes', w: 30, t: '< 80%', s: 'High' },
      { n: 'Ownership (assignee) coverage', api: 'Yes', w: 30, t: '< 80%', s: 'High' },
      { n: 'Estimate coverage', api: 'Yes', w: 20, t: '< 40%', s: 'Medium' },
      { n: 'Consistent statuses / workflow', api: 'Yes', w: 20, t: 'inconsistent', s: 'Medium' },
    ],
  },
]

const SEVERITIES = ['Critical', 'High', 'Medium', 'Low', 'Opportunity']

/* ------------------------------- document -------------------------------- */
const doc = await PDFDocument.create()
const font = await doc.embedFont(StandardFonts.Helvetica)
const bold = await doc.embedFont(StandardFonts.HelveticaBold)
const italic = await doc.embedFont(StandardFonts.HelveticaOblique)

const wordmark = await doc.embedPng(fs.readFileSync(path.join(brandDir, 'logo-wordmark.png')))
const badge = await doc.embedPng(fs.readFileSync(path.join(brandDir, 'partner-badge.png')))

const form = doc.getForm()

const A4 = [595.28, 841.89]
const M = 44
const CW = A4[0] - M * 2
let page
let y
let pageNum = 0

function addPage() {
  page = doc.addPage(A4)
  pageNum += 1
  y = A4[1] - M

  const wmW = 116
  const wmH = (wordmark.height / wordmark.width) * wmW
  page.drawImage(wordmark, { x: M, y: y - wmH, width: wmW, height: wmH })
  const t = 'Scoring Worksheet'
  const tw = bold.widthOfTextAtSize(t, 9)
  page.drawText(t, { x: A4[0] - M - tw, y: y - 12, size: 9, font: bold, color: GREY })
  y -= wmH + 8
  page.drawLine({ start: { x: M, y }, end: { x: A4[0] - M, y }, thickness: 1, color: LINE })
  y -= 16

  page.drawLine({ start: { x: M, y: M - 4 }, end: { x: A4[0] - M, y: M - 4 }, thickness: 0.6, color: LINE })
  page.drawText('Sharpflow ClickUp Health', { x: M, y: M - 16, size: 7.5, font, color: GREY })
  const pn = `Page ${pageNum}`
  const pw = font.widthOfTextAtSize(pn, 7.5)
  page.drawText(pn, { x: A4[0] - M - pw, y: M - 16, size: 7.5, font, color: GREY })
  const bw = 30
  const bh = (badge.height / badge.width) * bw
  page.drawImage(badge, { x: A4[0] - M - 64 - bw, y: M - 22, width: bw, height: bh })
}

function need(h) {
  if (y - h < M + 26) addPage()
}

function wrap(text, size, f, maxW) {
  const words = text.split(' ')
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

function para(text, size = 9, color = GREEN, opts = {}) {
  const lines = wrap(text, size, opts.font || font, CW)
  lines.forEach((l) => {
    need(size + 4)
    page.drawText(l, { x: M, y: y - size, size, font: opts.font || font, color })
    y -= size + 4
  })
  y -= 2
}

function h1(text) {
  need(30)
  page.drawText(text, { x: M, y: y - 20, size: 19, font: bold, color: GREEN })
  y -= 26
}
function h2(text, color = GREEN2) {
  need(26)
  page.drawText(text, { x: M, y: y - 14, size: 12, font: bold, color })
  y -= 20
}

function numberField(name, value, x, yy, w) {
  const f = form.createTextField(name)
  f.addToPage(page, { x, y: yy, width: w, height: 15, borderWidth: 0.6, borderColor: LINE, backgroundColor: rgb(1, 1, 1) })
  f.setText(String(value))
  f.setFontSize(8)
}
function textField(name, value, x, yy, w) {
  const f = form.createTextField(name)
  f.addToPage(page, { x, y: yy, width: w, height: 15, borderWidth: 0.6, borderColor: LINE, backgroundColor: rgb(1, 1, 1) })
  f.setText(String(value))
  f.setFontSize(8)
}
function areaField(name, x, yy, w, h) {
  const f = form.createTextField(name)
  f.addToPage(page, { x, y: yy, width: w, height: h, borderWidth: 0.6, borderColor: LINE, backgroundColor: rgb(1, 1, 1) })
  f.enableMultiline()
  f.setFontSize(9)
}
function severityField(name, value, x, yy, w) {
  const dd = form.createDropdown(name)
  dd.addOptions(SEVERITIES)
  dd.addToPage(page, { x, y: yy, width: w, height: 15, borderWidth: 0.6, borderColor: LINE, backgroundColor: rgb(1, 1, 1) })
  if (SEVERITIES.includes(value)) dd.select(value)
  dd.setFontSize(8)
}
function checkField(name, x, yy) {
  const cb = form.createCheckBox(name)
  cb.addToPage(page, { x, y: yy, width: 12, height: 12, borderWidth: 0.6, borderColor: GREY })
}

/* ------------------------------- content --------------------------------- */
addPage()

h1('ClickUp Health - Scoring Worksheet')
para(
  'This worksheet defines how the Health Score is calculated. Each row is a signal the scan can measure. We have pre-filled a sensible default weight and threshold - keep it, or change the value. Tick N/A for any signal you do not want scored.',
  9,
  GREEN,
  { font: italic },
)
para('API column:  Yes = measurable today     Part = partial / conditional     No = not exposed by the ClickUp API (reference only).', 8.5, GREY)
y -= 2

/* A. Overall model */
h2('A. Overall model')
para('Score: 0-100.     Grades:  A = 85+   B 75-84   C 60-74   D 45-59   F under 45.', 9)
para('Severity levels:  Critical / High / Medium / Low / Opportunity.', 9)
y -= 4

/* B. Category weights */
h2('B. Category weights  (should total 100%)')
const WCOL = [M + 6, M + 380]
SIGNALS.forEach((c, ci) => {
  need(22)
  const ry = y
  page.drawText(`${ci + 1}.  ${c.cat}`, { x: WCOL[0], y: ry - 15, size: 9.5, font, color: GREEN })
  numberField(`cat_weight_${ci}`, c.weight, WCOL[1], ry - 18, 52)
  page.drawText('%', { x: WCOL[1] + 56, y: ry - 15, size: 9, font, color: GREY })
  y -= 22
  page.drawLine({ start: { x: M, y: y + 3 }, end: { x: A4[0] - M, y: y + 3 }, thickness: 0.4, color: rgb(0.91, 0.92, 0.91) })
})
y -= 4

/* C. Signals */
h2('C. Signals per category')
SIGNALS.forEach((c, ci) => {
  need(60)
  page.drawText(`${ci + 1}. ${c.cat}`, { x: M, y: y - 12, size: 11, font: bold, color: MAGENTA })
  const wlab = `weight ${c.weight}%`
  const wlw = font.widthOfTextAtSize(wlab, 8.5)
  page.drawText(wlab, { x: A4[0] - M - wlw, y: y - 12, size: 8.5, font, color: GREY })
  y -= 20

  need(20)
  page.drawRectangle({ x: M, y: y - 15, width: CW, height: 15, color: rgb(0.941, 0.949, 0.937) })
  const H = [
    ['Signal', M + 6],
    ['API', M + 198],
    ['Weight', M + 216],
    ['Threshold', M + 272],
    ['Severity', M + 388],
    ['N/A', M + 486],
  ]
  H.forEach(([t, x]) => page.drawText(t, { x, y: y - 11, size: 7.5, font: bold, color: GREEN2 }))
  y -= 18

  c.signals.forEach((s, si) => {
    need(24)
    const ry = y
    const label = s.n.length > 40 ? s.n.slice(0, 39) + '...' : s.n
    page.drawText(label, { x: M + 6, y: ry - 15, size: 8, font, color: s.api === 'No' ? GREY : GREEN })
    const apiColor = s.api === 'Yes' ? GREEN2 : s.api === 'Part' ? rgb(0.79, 0.63, 0.15) : GREY
    page.drawText(s.api, { x: M + 198, y: ry - 15, size: 8.5, font: bold, color: apiColor })

    if (s.api !== 'No') {
      numberField(`w_${ci}_${si}`, s.w, M + 214, ry - 18, 46)
      textField(`t_${ci}_${si}`, s.t, M + 268, ry - 18, 110)
      severityField(`sev_${ci}_${si}`, s.s, M + 384, ry - 18, 96)
    } else {
      page.drawText(s.t, { x: M + 268, y: ry - 15, size: 8, font, color: GREY })
    }
    checkField(`na_${ci}_${si}`, M + 488, ry - 17)

    y -= 23
    page.drawLine({ start: { x: M, y: y + 2 }, end: { x: A4[0] - M, y: y + 2 }, thickness: 0.35, color: rgb(0.92, 0.93, 0.92) })
  })
  y -= 8
})

/* D. Global definitions */
need(160)
h2('D. Global definitions  (change any you wish)')
const DEFS = [
  ['Overdue', 'def_overdue', '15%', 'past due date, not closed'],
  ['Stale', 'def_stale', '90 days', 'open, no update for N days'],
  ['Dormant List', 'def_dormant', '90 days', 'no task activity for N days'],
  ['Fragmented List', 'def_fragmented', '< 5 active tasks', 'fewer than N active tasks'],
  ['Active user', 'def_active', '30 days', 'created / completed / commented'],
]
DEFS.forEach((d) => {
  need(22)
  const ry = y
  page.drawText(d[0], { x: M + 6, y: ry - 15, size: 9, font: bold, color: GREEN })
  textField(d[1], d[2], M + 150, ry - 18, 110)
  page.drawText(d[3], { x: M + 272, y: ry - 15, size: 8.5, font, color: GREY })
  y -= 22
  page.drawLine({ start: { x: M, y: y + 3 }, end: { x: A4[0] - M, y: y + 3 }, thickness: 0.4, color: rgb(0.91, 0.92, 0.91) })
})
y -= 6

/* E. Questions */
need(240)
h2('E. A few questions')
const QUESTIONS = [
  ['q_cat', 'Any category you want weighted more or less than above?'],
  ['q_overdue', 'Overdue threshold - right, or should it be stricter / looser?'],
  ['q_utilisation', 'Platform Utilisation: count toward the score, or show as insights only?'],
  ['q_signals', 'Any signals you would add or drop?'],
]
QUESTIONS.forEach((q) => {
  need(70)
  page.drawText(q[1], { x: M, y: y - 10, size: 9, font, color: GREEN })
  y -= 16
  areaField(q[0], M, y - 46, CW, 46)
  y -= 56
})

need(30)
page.drawLine({ start: { x: M, y }, end: { x: A4[0] - M, y }, thickness: 0.6, color: LINE })
y -= 14
para('Once complete, return this worksheet and we will configure the scoring engine to match.', 8.5, GREY, { font: italic })

/* ------------------------------- finalise -------------------------------- */
const bytes = await doc.save()
const out = path.join(outDir, 'Sharpflow-ClickUp-Health-Scoring-Worksheet.pdf')
fs.writeFileSync(out, bytes)

console.log(`Wrote ${out}`)
console.log(`Pages: ${pageNum} | Form fields: ${form.getFields().length}`)
