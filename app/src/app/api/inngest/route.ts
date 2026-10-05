import { serve } from 'inngest/next'
import { inngest } from '@/inngest/client'
import { scanWorkspace } from '@/inngest/scan'

export const dynamic = 'force-dynamic'

// Inngest serves these functions. In dev, run `npx inngest-cli dev`.
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [scanWorkspace],
})
