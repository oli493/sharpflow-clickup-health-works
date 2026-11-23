import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const APP_DIR = path.resolve(__dirname, '..')
const ROOT_DIR = path.resolve(APP_DIR, '..', '..')
const INPUT = path.join(ROOT_DIR, 'sharpflow-health-demo', 'handover', 'ClickUp-Technical-Validation.md')
const OUT = path.join(ROOT_DIR, 'ClickUp-Health-Technical-Validation.pdf')
const WORDMARK = path.join(APP_DIR, 'public', 'brand', 'logo-wordmark.png')

const C = {
  cream: rgb(0.965, 0.961, 0.945),
  ink: rgb(0.09, 0.204, 0.208),
  green: rgb(0.141, 0.341, 0.306),
  lime: rgb(0.87, 0.968, 0.431),
  magenta: rgb(0.878, 0.063, 0.447),
  grey: rgb(0.42, 0.505, 0.478),
  greyLight: rgb(0.61, 0.66, 0.64),
  line: rgb(0.84, 0.87, 0.84),
}

const A4 = [595.28, 841.89]
const M = 48
const CW = A4[0] - M * 2

function plain(s) {
  return s
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
}

async function main() {
  const md = fs.readFileSync(INPUT, 'utf8')
  const lines = md.split(/\r?\n/)

  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const italic = await doc.embedFont(StandardFonts.HelveticaOblique)
  const wordmark = fs.existsSync(WORDMARK) ? await doc.embedPng(fs.readFileSync(WORDMARK)) : null

  const pages = []
  let page = null
  let y = 0

  function wrap(text, size, f, maxW) {
    const words = String(text).split(' ')
    const out = []
    let cur = ''
    for (const w of words) {
      const test = cur ? `${cur} ${w}` : w
      if (f.widthOfTextAtSize(test, size) > maxW && cur) {
        out.push(cur)
        cur = w
      } else cur = test
    }
    if (cur) out.push(cur)
    return out
  }

  function addPage(withMark = true) {
    page = doc.addPage(A4)
    pages.push(page)
    page.drawRectangle({ x: 0, y: 0, width: A4[0], height: A4[1], color: C.cream })
    y = A4[1] - M
    if (withMark && wordmark) {
      const w = 102
      const h = (wordmark.height / wordmark.width) * w
      page.drawImage(wordmark, { x: M, y: y - h, width: w, height: h })
      y -= h + 12
    } else {
      y -= 6
    }
  }

  function need(h) {
    if (y - h < M + 28) addPage(false)
  }

  function text(s, size, color = C.ink, f = font, gap = 4) {
    need(size + gap)
    page.drawText(s, { x: M, y: y - size, size, font: f, color })
    y -= size + gap
  }

  function para(s, size = 9.2, color = C.grey, f = font) {
    for (const line of wrap(plain(s), size, f, CW)) {
      need(size + 4)
      page.drawText(line, { x: M, y: y - size, size, font: f, color })
      y -= size + 4
    }
    y -= 2
  }

  function bullet(s, numbered = false) {
    const size = 9.1
    const prefix = numbered ? '•' : '•'
    const indent = 12
    const lines = wrap(plain(s), size, font, CW - indent)
    need(lines.length * (size + 4) + 2)
    page.drawText(prefix, { x: M, y: y - size, size, font: bold, color: C.magenta })
    for (const line of lines) {
      page.drawText(line, { x: M + indent, y: y - size, size, font, color: C.grey })
      y -= size + 4
    }
    y -= 2
  }

  addPage(true)
  const heading = lines.find((l) => l.startsWith('# '))
  const title = plain(heading ? heading.slice(2) : 'ClickUp Health - Technical Validation Overview')
  page.drawText(title, { x: M, y: y - 20, size: 23, font: bold, color: C.ink })
  y -= 30
  page.drawText('Prepared for ClickUp partnership and technical review', { x: M, y: y - 10, size: 10, font, color: C.grey })
  y -= 18
  page.drawText('Sharpflow Consulting  |  November 2026  |  Version 1.0', { x: M, y: y - 8, size: 8, font, color: C.greyLight })
  y -= 20
  page.drawRectangle({ x: M, y, width: CW, height: 2.2, color: C.lime })
  y -= 18

  let contentStarted = false
  for (const raw of lines) {
    const line = raw.trim()
    if (!contentStarted) {
      if (!line.startsWith('## ')) continue
      contentStarted = true
    }
    if (!line || line.startsWith('# ')) continue
    if (line.startsWith('## ')) {
      need(44)
      y -= 8
      page.drawText(plain(line.slice(3)).toUpperCase(), { x: M, y: y - 9, size: 10, font: bold, color: C.magenta })
      y -= 18
      page.drawLine({ start: { x: M, y }, end: { x: A4[0] - M, y }, thickness: 0.5, color: C.line })
      y -= 11
      continue
    }
    if (line.startsWith('### ')) {
      need(28)
      y -= 4
      page.drawText(plain(line.slice(4)), { x: M, y: y - 10, size: 10.5, font: bold, color: C.green })
      y -= 18
      continue
    }
    if (line.startsWith('- ')) {
      bullet(line.slice(2))
      continue
    }
    const numbered = line.match(/^\d+\.\s+(.*)$/)
    if (numbered) {
      bullet(numbered[1], true)
      continue
    }
    para(line)
  }

  pages.forEach((p, i) => {
    p.drawLine({ start: { x: M, y: 54 }, end: { x: A4[0] - M, y: 54 }, thickness: 0.5, color: C.line })
    p.drawText('Sharpflow Consulting  |  ClickUp Health technical validation', { x: M, y: 38, size: 7, font, color: C.greyLight })
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
