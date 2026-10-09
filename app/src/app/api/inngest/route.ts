import { serve } from 'inngest/next'
import { inngest } from '@/inngest/client'
import { scanWorkspace } from '@/inngest/scan'

export const dynamic = 'force-dynamic'
// Each scan step is intentionally small, but give the invocation headroom
// (the platform default can be lower).
export const maxDuration = 300

// Inngest serves these functions. In dev, run `npx inngest-cli dev`.
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [scanWorkspace],
})
