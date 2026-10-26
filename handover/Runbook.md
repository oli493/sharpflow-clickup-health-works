# Sharpflow ClickUp Health — Runbook

Operator guide for running, deploying and maintaining the app.
**Live:** https://health.sharpflowconsulting.com · **Sample report:** `/sample`

No secrets in this file — they live in `app/.env.local` (local) and the host env (Vercel).

---

## 1. Architecture at a glance

| Piece | What it does |
|---|---|
| **Next.js app** (`app/`) | Landing, ClickUp OAuth connect, workspace picker, scan progress, report dashboard, branded PDF, lead capture. |
| **ClickUp API** | Read-only source of workspace data (workspaces, Spaces/Folders/Lists, tasks, custom fields, views, goals). |
| **Supabase (Postgres)** | Stores connections (encrypted tokens), scans, findings, list stats, samples and leads. |
| **Inngest** | Runs the background scan worker (`scan-workspace`) off the request path. |
| **Anthropic (Claude)** | Writes the executive summary only — never sets scores. |
| **Vercel** | Hosting; tracks `main` so every push auto-deploys. |

Flow: `/` → OAuth → `/workspaces` → `/scan/[id]` → `/report/[id]` → PDF + lead capture.

---

## 2. Local development

Requires **Node.js 20+**. Two processes:

```bash
cd app
npm install
npm run dev            # Next dev server → http://localhost:3000
```

```bash
# in a second terminal, from app/
npx inngest-cli dev    # background worker (port 8288) — required for scans
```

- In dev the app uses **sample/mock data** by default. Set `NEXT_PUBLIC_MOCK=0` (with env configured)
  to use the real ClickUp + Supabase path.
- `npm run typecheck` · `npm test` · `npm run build` (do **not** build while `next dev` is running).

The `prototype/` folder is the original Vite design demo (not deployed): `cd prototype && npm run dev`.

---

## 3. Environment variables

Names only — values live in `app/.env.local` and Vercel:

`CLICKUP_CLIENT_ID`, `CLICKUP_CLIENT_SECRET`, `CLICKUP_REDIRECT_URI`, `DEV_CLICKUP_TOKEN` (dev-only),
`NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`, `LLM_API_KEY`, `LLM_MODEL`,
`LLM_WORKSPACE_ID`, `LEAD_CAPTURE_WEBHOOK`, `LEAD_CAPTURE_LIST_ID`, `LEAD_CAPTURE_CLICKUP_TOKEN`,
`TOKEN_ENCRYPTION_KEY`, `NEXT_PUBLIC_MOCK`.

Key notes:
- `TOKEN_ENCRYPTION_KEY` must stay stable — it encrypts stored ClickUp tokens (AES-256-GCM). Changing
  it invalidates existing connections (users must reconnect).
- `LLM_WORKSPACE_ID` is required because the Anthropic key is user-scoped.

---

## 4. Deploy & sync

1. **Push to `main`** → Vercel builds and deploys production automatically.
2. **Inngest** re-syncs `scan-workspace` from `/api/inngest` on deploy. If the worker doesn't pick up
   changes, trigger a resync from the Inngest dashboard (Apps → `sharpflow-clickup-health`).
3. **Domain:** `health.sharpflowconsulting.com` is a CNAME → `…vercel-dns.com` (managed in GoDaddy).
4. **Redirect URL:** the production callback `https://health.sharpflowconsulting.com/api/clickup/callback`
   must be registered on the ClickUp OAuth app.

Env changes: set them in **Vercel → Project → Settings → Environment Variables**, then redeploy.

---

## 5. Database (Supabase)

Schema: `app/supabase/schema.sql`. Tables: `connections`, `scans`, `findings`, `list_stats`,
`scan_samples`, `leads`. RLS is enabled; the app uses the service-role key (server-side only).

Inspect/recover a stuck scan via the REST API (service key) or the Supabase dashboard — a `running`
scan older than 20 min is flipped to `failed` automatically on the next status poll.

---

## 6. The scan worker (`app/src/inngest/scan.ts`)

- **Bounded by work, not list count:** structure is read in **2 Spaces** per step (`SPACE_BATCH`);
  task analysis runs in steps of up to **25 task pages** (`PAGE_BUDGET`), with a **40-page cap per
  List** (`iterateTasks(..., maxPages)`). Progress updates throughout, so no step approaches the
  5-minute limit — even for a 10k+ task List.
- **Coverage cap:** `SAMPLE_LIST_LIMIT = 1000` Lists (largest workspaces are sampled beyond that).
- **Request timeout:** every ClickUp call has a **30 s** timeout and retries `429`/`5xx`/timeouts.
- **Failure handling:** the handler wraps the run in try/catch and marks the scan `failed` with the
  error; an Inngest `onFailure` and the **stale-scan reaper** (`/api/scans/[id]`, 20 min) back it up.
- Typical timings: a normal workspace → 1–3 min; `EES Agency` (~48k tasks / 388 Lists) → ~13–15 min;
  `Eyes On` (~19k tasks / 383 Lists incl. very large Lists) → ~18 min.
- To re-run: from `/workspaces`, pick the workspace → **Run audit** (or `POST /api/scans`).

Tuning: `PAGE_BUDGET` and the per-List `maxPages` cap control step time — raise `PAGE_BUDGET` for
fewer/faster steps (up to the 300 s limit), lower it for more headroom.

---

## 7. Scoring

The model lives in `app/src/lib/scoring/model.ts` (categories, signals, weights, thresholds,
severities — data, not code) and the engine in `engine.ts`.

**To add or change a rule:**
1. Edit `model.ts` (weights/thresholds/severity) and, if needed, the metric in `inngest/scan.ts`.
2. Keep category weights summing to 100%.
3. `npm test` (the engine has unit tests) → `npm run typecheck` → deploy.

Rules of the model: no double-counting; Opportunity severity = 0 penalty; magnitude scaling from
1× at threshold → 1.5× at ceiling; tiered stale/dormant; coverage rule (a category with <50%
measurable weight is excluded as "Not measured"); an "insufficient data" state for non-admin scans.

---

## 8. Report, PDF & share images

- **PDF:** `app/src/lib/report-pdf.ts`, served at `GET /api/scans/[id]/report.pdf` (branded, uses
  `public/brand/logo-wordmark.png` + `partner-badge.png`).
- **Sample report:** `/sample` renders the report with synthetic "Northwind Creative" data; its PDF is
  at `/api/sample/report.pdf`.
- **Share (link-preview) images:**
  - Landing → static `app/public/brand/share-card.png` (set in `app/src/app/layout.tsx` metadata).
  - Report + sample → dynamic score cards via `report/[id]/opengraph-image.tsx` and
    `sample/opengraph-image.tsx` (`next/og`).
  - ⚠️ `next/og` **cannot run on Windows** (its bundled font path breaks) — dynamic OG images only
    work when deployed to Linux/Vercel, or verified via the live URL.

---

## 9. Lead capture

"Email me the report" captures the lead (`POST /api/leads`) and creates a task in **Sharpflow's ClickUp
CRM** (Sales Pipeline list) using `LEAD_CAPTURE_*`. (Actually *emailing* the PDF is not yet wired — it
needs a sending address/DNS record on the Sharpflow domain.)

---

## 10. Troubleshooting

| Symptom | Cause / fix |
|---|---|
| **"Workspace not authorized" (`OAUTH_192`)** | ClickUp scopes a token to the workspace chosen at consent. Reconnect ClickUp and select the workspace; the app shows a Reconnect button for this. |
| **Scan stuck on a %** | Shouldn't happen now. If it does, the 45-min reaper will mark it `failed`; check the Inngest run + Vercel function logs. |
| **`FUNCTION_INVOCATION_TIMEOUT` (504)** | A single step ran >5 min. Reduce batch sizes or raise `maxDuration` (route `/api/inngest`). |
| **Link preview not updating** | Platforms cache previews — re-share the link (or append `?`) to refresh. |
| **Connect fails / `?connect=error`** | Check `CLICKUP_REDIRECT_URI` matches the deployed callback and the ClickUp app's redirect URL. |
| **AI summary missing** | Check `LLM_API_KEY` + `LLM_WORKSPACE_ID`; the report falls back to templated text if the call fails. |

Logs: **Vercel → Project → Logs** (filter `/api/inngest`) and **app.inngest.com → Functions →
scan-workspace → Runs**.

---

## 11. Contacts / handover

- **Client:** Oli Walker — Sharpflow Consulting.
- **Repo:** https://github.com/oli493/sharpflow-clickup-health-works (currently public).
- **Supabase:** project `iijehqonmdfhsutkbwsz` · **Vercel** + **Inngest Cloud** hold the production env.
