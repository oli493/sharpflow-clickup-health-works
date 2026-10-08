import fs from 'node:fs'
import path from 'node:path'
import { ImageResponse } from 'next/og'
import { scoreBand } from './format'
import type { ScanResult } from './types'

export const ogSize = { width: 1200, height: 630 }
export const ogContentType = 'image/png' as const

type OgFont = { name: string; data: Buffer; weight: 400 | 600; style: 'normal' }
let fontsCache: OgFont[] | null = null

// Explicit fonts so next/og never falls back to its bundled default (which
// resolves to an invalid path on Windows) and the card matches the brand.
function poppins(): OgFont[] {
  if (fontsCache) return fontsCache
  const dir = path.join(process.cwd(), 'public', 'fonts')
  fontsCache = [
    { name: 'Poppins', data: fs.readFileSync(path.join(dir, 'Poppins-Regular.ttf')), weight: 400, style: 'normal' },
    { name: 'Poppins', data: fs.readFileSync(path.join(dir, 'Poppins-SemiBold.ttf')), weight: 600, style: 'normal' },
  ]
  return fontsCache
}

/** Shared branded Open Graph card for health reports. */
export function healthOgImage(result?: ScanResult) {
  const has = !!result
  const score = result?.overallScore ?? 0
  const band = scoreBand(score)
  const grade = result?.overallGrade ?? '—'
  const cats = (result?.categories ?? []).slice(0, 7)

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#F6F5F1',
          padding: 64,
          fontFamily: 'Poppins',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div
              style={{
                display: 'flex',
                background: '#173435',
                color: '#DEF76E',
                padding: '6px 16px',
                borderRadius: 10,
                fontSize: 32,
                fontWeight: 700,
              }}
            >
              Sharpflow
            </div>
            <div style={{ display: 'flex', fontSize: 22, color: '#6B817A', letterSpacing: 3 }}>
              CLICKUP HEALTH
            </div>
          </div>
          <div style={{ display: 'flex', fontSize: 20, color: '#6B817A' }}>sharpflowconsulting.com</div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 48 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12 }}>
            <div style={{ display: 'flex', fontSize: 190, lineHeight: 1, fontWeight: 700, color: '#173435' }}>
              {has ? score : '—'}
            </div>
            <div style={{ display: 'flex', fontSize: 40, color: '#6B817A', marginBottom: 26 }}>/100</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div
              style={{
                display: 'flex',
                background: band.soft,
                color: band.color,
                fontSize: 42,
                fontWeight: 700,
                padding: '8px 30px',
                borderRadius: 18,
              }}
            >
              {has ? grade : '—'}
            </div>
            <div style={{ display: 'flex', fontSize: 26, color: '#3F5A52' }}>
              {has ? `${band.label} health` : 'Sample report'}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginLeft: 'auto' }}>
            <div style={{ display: 'flex', fontSize: 18, color: '#6B817A', letterSpacing: 3 }}>WORKSPACE</div>
            <div style={{ display: 'flex', fontSize: 40, fontWeight: 600, color: '#173435' }}>
              {result?.workspaceName ?? 'Northwind Creative'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          {cats.map((c) => {
            const b = scoreBand(c.score)
            return (
              <div
                key={c.key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  background: '#FFFFFF',
                  border: '1px solid rgba(23,52,53,0.12)',
                  borderRadius: 999,
                  padding: '10px 20px',
                  fontSize: 22,
                  color: '#3F5A52',
                }}
              >
                <div style={{ display: 'flex', width: 12, height: 12, borderRadius: 999, background: b.color }} />
                {c.name} · {c.score}
              </div>
            )
          })}
        </div>
      </div>
    ),
    { ...ogSize, fonts: poppins() },
  )
}
