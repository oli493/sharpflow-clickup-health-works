import { z } from 'zod'

const schema = z.object({
  CLICKUP_CLIENT_ID: z.string().min(1),
  CLICKUP_CLIENT_SECRET: z.string().min(1),
  CLICKUP_REDIRECT_URI: z.string().url(),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SUPABASE_DB_URL: z.string().optional(),
  INNGEST_EVENT_KEY: z.string().optional(),
  INNGEST_SIGNING_KEY: z.string().optional(),
  LLM_API_KEY: z.string().optional(),
  LEAD_CAPTURE_WEBHOOK: z.string().optional(),
  LEAD_CAPTURE_LIST_ID: z.string().optional(),
  TOKEN_ENCRYPTION_KEY: z.string().optional(),
})

export type Env = z.infer<typeof schema>

let cached: Env | null = null

export function env(): Env {
  if (cached) return cached
  const parsed = schema.safeParse(process.env)
  if (!parsed.success) {
    throw new Error(`Invalid environment: ${parsed.error.issues.map((i) => i.path.join('.')).join(', ')}`)
  }
  cached = parsed.data
  return cached
}
