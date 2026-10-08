'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Button, IconDownload } from '../ui'
import { getDrill } from '../../lib/api'
import type { DrillDataset, DrillRow } from '../../lib/types'
import { EASE } from '../../lib/motion'

interface DrillApi {
  open: (key: string) => void
}

const DrillCtx = createContext<DrillApi>({ open: () => {} })
export const useDrill = () => useContext(DrillCtx)

export function DrillProvider({ scanId, children, mock = false }: { scanId: string; children: ReactNode; mock?: boolean }) {
  const [key, setKey] = useState<string | null>(null)
  const open = useCallback((k: string) => setKey(k), [])
  return (
    <DrillCtx.Provider value={{ open }}>
      {children}
      <DrillDrawer scanId={scanId} datasetKey={key} onClose={() => setKey(null)} mock={mock} />
    </DrillCtx.Provider>
  )
}

function toCsv(columns: { key: string; label: string }[], rows: DrillRow[]) {
  const head = columns.map((c) => `"${c.label}"`).join(',')
  const body = rows
    .map((r) => columns.map((c) => `"${String(r[c.key] ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n')
  return `${head}\n${body}`
}

function DrillDrawer({
  scanId,
  datasetKey,
  onClose,
  mock = false,
}: {
  scanId: string
  datasetKey: string | null
  onClose: () => void
  mock?: boolean
}) {
  const [dataset, setDataset] = useState<DrillDataset | null>(null)
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState<string>('')
  const [dir, setDir] = useState<1 | -1>(1)

  useEffect(() => {
    if (!datasetKey) return
    setLoading(true)
    setDataset(null)
    setQuery('')
    setSortKey('')
    let active = true
    getDrill(scanId, datasetKey, mock)
      .then((d) => active && setDataset(d))
      .catch(() => active && setDataset(null))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [scanId, datasetKey, mock])

  useEffect(() => {
    if (!datasetKey) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [datasetKey, onClose])

  const rows = useMemo(() => {
    if (!dataset) return []
    let r = dataset.rows
    if (query.trim()) {
      const q = query.toLowerCase()
      r = r.filter((row) => Object.values(row).some((v) => String(v).toLowerCase().includes(q)))
    }
    if (sortKey) {
      r = [...r].sort((a, b) => {
        const av = a[sortKey]
        const bv = b[sortKey]
        if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir
        return String(av).localeCompare(String(bv)) * dir
      })
    }
    return r
  }, [dataset, query, sortKey, dir])

  const download = () => {
    if (!dataset) return
    const blob = new Blob([toCsv(dataset.columns, rows)], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sharpflow-${dataset.key.replace(/[:]/g, '-')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {datasetKey && (
        <motion.div className="fixed inset-0 z-[70] flex justify-end" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-brand-ink/30 backdrop-blur-sm" onClick={onClose} />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.45, ease: EASE }}
            className="relative flex h-full w-full max-w-[600px] flex-col border-l border-line bg-white shadow-panel"
          >
            <div className="panel-gradient relative px-7 pb-6 pt-7 text-white">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-accent text-[10px] uppercase tracking-eyebrow text-white/70">Drill-down</div>
                  <h2 className="mt-2 font-display text-2xl font-semibold">{dataset?.title ?? 'Loading…'}</h2>
                  <p className="mt-1 max-w-sm text-[13px] text-white/80">{dataset?.subtitle ?? ''}</p>
                </div>
                <button onClick={onClose} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25" aria-label="Close">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none">
                    <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
              {dataset && (
                <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 font-mono text-[11px]">
                  <span className="h-1.5 w-1.5 rounded-full bg-magenta" /> {dataset.unit}
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 border-b border-line px-6 py-3">
              <div className="flex flex-1 items-center gap-2 rounded-full border border-line bg-brand-ink/[0.03] px-3 py-2">
                <svg viewBox="0 0 24 24" className="h-4 w-4 text-txt-faint" fill="none">
                  <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
                  <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search…" className="w-full bg-transparent text-[13px] text-txt-primary outline-none placeholder:text-txt-faint" />
              </div>
              <Button variant="ghost" className="px-4 py-2 text-[13px]" onClick={download} icon={<IconDownload className="h-4 w-4" />}>
                Export
              </Button>
            </div>

            <div className="flex-1 overflow-auto">
              {loading || !dataset ? (
                <div className="grid place-items-center py-24 text-sm text-txt-faint">Loading…</div>
              ) : (
                <table className="w-full border-collapse text-left">
                  <thead className="sticky top-0 z-10 bg-white/95 backdrop-blur">
                    <tr className="border-b border-line">
                      {dataset.columns.map((c) => (
                        <th
                          key={c.key}
                          onClick={() => {
                            if (sortKey === c.key) setDir((d) => (d === 1 ? -1 : 1))
                            else {
                              setSortKey(c.key)
                              setDir(1)
                            }
                          }}
                          className={`cursor-pointer select-none px-5 py-3 font-mono text-[10px] uppercase tracking-widest text-txt-faint transition-colors hover:text-txt-primary ${c.align === 'right' ? 'text-right' : ''}`}
                        >
                          {c.label}
                          {sortKey === c.key && <span className="ml-1 text-brand-glow">{dir === 1 ? '↑' : '↓'}</span>}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <tr key={i} className="border-b border-line/70 transition-colors hover:bg-brand-ink/[0.03]">
                        {dataset.columns.map((c) => (
                          <td key={c.key} className={`px-5 py-3 text-[13px] text-txt-primary ${c.align === 'right' ? 'text-right font-mono text-[12px] text-txt-muted' : ''}`}>
                            {String(row[c.key])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {dataset && rows.length === 0 && <div className="grid place-items-center py-16 text-sm text-txt-faint">No matching rows</div>}
            </div>

            <div className="flex items-center justify-between border-t border-line px-6 py-4">
              <span className="font-mono text-[10px] uppercase tracking-widest text-txt-faint">{rows.length} rows</span>
              <span className="font-mono text-[10px] uppercase tracking-widest text-brand-glow">{mock ? 'Sample data' : 'Live via ClickUp API'}</span>
            </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
