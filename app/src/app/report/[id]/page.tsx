'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Panel } from '@/components/ui'
import ReportView from '@/components/report/ReportView'
import { getScanStatus } from '@/lib/api'
import type { ScanResult } from '@/lib/types'

export default function ReportPage() {
  const params = useParams<{ id: string }>()
  const id = params.id
  const [result, setResult] = useState<ScanResult | null>(null)
  const [connectionId, setConnectionId] = useState<string | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    getScanStatus(id)
      .then((s) => {
        if (!active) return
        setConnectionId(s.connectionId)
        if (s.result) setResult(s.result)
        else setError('This scan is not complete yet.')
      })
      .catch((e) => active && setError(e.message))
    return () => {
      active = false
    }
  }, [id])

  if (error) {
    return (
      <div className="mx-auto grid min-h-[70vh] max-w-2xl place-items-center px-6">
        <Panel className="p-8 text-center">
          <h2 className="font-display text-2xl font-semibold text-brand-ink">Report unavailable</h2>
          <p className="mt-2 text-sm text-txt-muted">{error}</p>
          <Link href={connectionId ? `/workspaces?connection=${connectionId}` : '/'} className="btn-primary btn-arrow pr-2.5 mt-6 inline-flex">Run a scan</Link>
        </Panel>
      </div>
    )
  }

  if (!result) {
    return <div className="grid min-h-screen place-items-center text-sm text-txt-faint">Loading report…</div>
  }

  return <ReportView result={result} scanId={id} connectionId={connectionId} />
}
