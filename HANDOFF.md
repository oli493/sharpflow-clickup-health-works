# HANDOFF — Sharpflow ClickUp Health (complete project context)

> **Read this first, in full.** This is the single source of truth for continuing the job in a
> fresh chat on this machine. It contains everything: the client, the contract, the accounts,
> every file, the exact scoring model, the database, the API integration, what's done, what's
> running, what's verified, what's left, and every gotcha.
>
> **No secret values are in this file.** Credentials live in `app/.env.local` (gitignored) and the
> host/platform settings. See §13.

Last updated: 26 Oct 2026 · branch `fix/scanner-correctness` (based on `4b218f1`)

---

## 0. TL;DR

- **What:** a standalone web app ("Sharpflow ClickUp Health") that connects a customer's ClickUp
  workspace via OAuth (read-only), runs an automated audit, and produces a 0–100 **ClickUp Health
  Score** with category scores, findings, severities, recommendations and a polished branded
  dashboard + PDF. Built for **Sharpflow Consulting** as a **lead-generation freebie**.
- **Where we are:** **deployed and live** at **https://health.sharpflowconsulting.com** (Vercel
  tracks `main` → every push auto-deploys). The full flow works in production: connect → workspace
  picker → background scan → report → branded PDF → lead capture. AI summary live (Claude Haiku 4.5).
- **Blockers:** none. The only outstanding freebie is *emailed* reports, which needs a sending
  address / DNS record on the Sharpflow domain.
- **Next:** (optional) report email; Phase 2 roadmap — see §5 (scope) and §20 (post-launch changes).

---

## 1. Client & contract

- **Client:** Oli Walker — **Sharpflow Consulting** (British-led, ClickUp-only consultancy based in
  Mexico; clients in UK/US; teams of 5+).
- **Upwork job:** "SaaS Developer Needed for ClickUp Audit & Scoring Product"
  - Job URL: https://www.upwork.com/jobs/~022106474084368307973
  - Job ID: `2106474084368307973`
- **Contract:** **fixed price $400**, paid as **two milestones of $200** — **both paid** (Oli also
  added a thank-you bonus):
  1. **"Initial Product Demo & Build out"** — paid
  2. **"Product Delivery & Handover"** — paid
  - Upwork freelancer service fee 10% → **expected net ≈ $360** (+ bonus).
  - **Offer accepted 04 Oct 2026** (offer id `112710148`).
- **Freelancer:** Misho (Mihail) Todorov — Upwork account `misho_t` / org_uid `1891956117832253066`,
  GitHub `Misho-1019`, email `mikailtorres99@gmail.com`.

### Product / business model (Oli's own words)
- A **"connect button"** Oli gives to clients who are **admins/owners of their own workspace**;
  they connect independently.
- Used as a **freebie** for **potential and existing** clients (lead generation), not sold per seat.
- Branded entirely as Sharpflow; ends with an **email capture** + **"Book a call" CTA**.

---

## 2. How this got here (timeline)

| When (2026) | What |
|---|---|
| Oct 3 | Misho applied; Oli sent the full MVP spec (ClickUp doc) and asked to confirm feasibility within the quoted rate. |
| Oct 3 | Misho sent a **proposal draft** (honest API-feasibility + scope). Oli replied warmly, clarified the freebie model. |
| Oct 3 | Misho **built a branded Vite prototype** and sent a walkthrough video. Oli: *"That looks awesome."* Asked for **full branding** and **card drill-down**. |
| Oct 3 | Misho sent the Canva brand info; Oli sent **fonts, logos, Sapphire badge, gradients**. |
| Oct 4 | Misho sent an updated, fully-branded walkthrough. Oli: *"I love the branding."* |
| Oct 4 | **Oli sent the offer** ($400, two $200 milestones). **Misho accepted.** |
| Oct 4 | Oli: *"I won't have you do any more work for free."* Confirmed freebie model. |
| Oct 4 | Misho asked for a test workspace + ClickUp OAuth app; Oli created the app and sent **client id + secret**. |
| Oct 4 | Misho sent a **fillable scoring worksheet (PDF)**; Oli completed it and returned it. |
| Oct 5 | Misho built the **demo mode** run-through; Oli added Misho to GitHub, Supabase and Inngest, and to **both** ClickUp workspaces (demo + live). |
| Oct 5 | Oli asked which AI to use; Misho recommended **Claude**. Oli chose the **paid** hosting stack ("crème de la crème") for reliability, then upgraded Vercel to Pro + Supabase to Pro. |
| Oct 5 | Misho wired Supabase schema, ran the **first real scan** (dev token). Calibrated the scoring engine (see §19). |
| Oct 6 | Misho wrote this handoff doc. |

---

## 3. Local environment

- **OS:** Windows (win32). Shell: **PowerShell 5.1**. Note: PowerShell heredocs (`<<`) do NOT work.
- **Node:** `v22.21.0` · **npm:** `11.3.0` · **git:** `2.46.0.windows.1`.
- **Repo local path:**
  `C:\Users\misho\Desktop\My Own Exercise\WebWorkflowAutomationBotForBooking\sharpflow-health-demo`
- **Ports used:** prototype `5173` · app `3000` · Inngest dev server `8288`.
- **Temp dir used by tooling:** `C:\Users\misho\AppData\Local\Temp\opencode`
- **Currently-running background processes (dev):** the app `next dev` on :3000 and
  `inngest-cli dev` on :8288 (started detached; logs at `%TEMP%\app-dev.log`, `%TEMP%\inngest-dev.log`).

---

## 4. Repository

- **Remote (GitHub):** https://github.com/oli493/sharpflow-clickup-health-works
  - Owner `oli493` = Oli's **personal** GitHub account. Repo is **PUBLIC** (Oli's choice).
  - Misho is a **collaborator**; pushes over HTTPS with cached creds.
- **Branch:** `main` · **remote:** `origin` · working tree clean.
- **Structure (monorepo):**
  ```
  sharpflow-health-demo/
  ├─ prototype/         Vite + React branded demo (Phase A) + scoring worksheet generator
  ├─ app/               Next.js production app (Phase B)
  ├─ PROJECT.md         Product & build spec (scope, branding, scoring model, stack)
  ├─ README.md          Short overview + how to run
  ├─ HANDOFF.md         This document
  └─ .gitignore         excludes node_modules, dist, .env*, *.local, *.tsbuildinfo, *.log
  ```
- **Git history (oldest → newest):**
  ```
  78cc0c7  Initial commit: prototype + scoring worksheet
  905d5cc  Step 0: capture Oli's scoring model (PROJECT.md + completed worksheet) and sync demo
  b4fde0f  Step 1: scaffold Phase B Next.js app (ClickUp OAuth, Supabase, Inngest scan, scoring engine)
  b28bdbf  chore: ignore tsbuildinfo
  769ad04  Step 2: port branded report UI + working flow into app/ (mock mode)
  208cfba  Phase B: branded PDF generator + scoring tests + real API routes, schema, report mapper, extended scan
  74af7ff  chore: restructure to monorepo (prototype/ + app/), add README
  818a860  feat: credible scoring calibration (coverage rule, no stubs), LLM layer, dev-token connect, real scan metrics
  6e5cc98  docs: add HANDOFF.md
  ... (deploy + post-launch work — full log via `git log --oneline`)
  f29ae6f  feat: capture leads into the Sharpflow ClickUp CRM list
  d8527d9  feat: real scan progress, Diamond partner badge, instant cursor
  7cd1712  fix: resilient ClickUp connect (hardened callback, lazy workspace fetch, retries)
  87846a6  fix: carry connection id from report to workspace picker
  18f2aa5  feat: transparent Diamond badge + two-column findings layout
  0a8e867  feat: rules & thresholds as a collapsed dropdown; AI summary full width
  7cd74f1  feat: public sample report, OG share cards, lead-magnet playbook
  fabca1e  fix: handle unauthorised ClickUp workspaces + failed-scan state
  dfe2745  fix: chunk scan worker into small steps (no more 504 timeouts)
  4f32415  fix: record failed scans directly (try/catch)
  74a476b  chore: raise list coverage cap to 1000
  dcce457  feat: use Sharpflow brand card as the landing link-preview image
  ```

---

## 5. Branding / design system

**Colours (exact)**
| Role | Hex |
|---|---|
| Dark green (base / text) | `#173435` |
| Green | `#24574E` |
| Mint | `#5FBA95` |
| Lime (accent) | `#DEF76E` |
| Magenta (primary CTA) | `#E01072` |
| White / off-white surfaces | `#FFFFFF` / `#F6F5F1` |
| Grayscale ramp | `#1A1A1A · #3F3F3F · #7A7A7A · #A9A9A9 · #E6E6E6 · #FFFFFF` |

**Fonts:** Headers **Poppins** · Body **Inter** · Accent **Montserrat Alternates**.

**Backgrounds:** two approved gradients (used tastefully, not over-mixed): (1) soft **pastel page
wash** (off-white + mint + rose), (2) **green→lime** gradient for hero/report panels.

**Assets (in `prototype/public/brand/` and `app/public/brand/`):**
`logo-mark.jpg` (green square + lime arrow), `logo-wordmark.png` (horizontal "Sharpflow"),
`partner-badge.png` (ClickUp **Sapphire** Partner 2026 — displayed in the lead-capture panel + footer).

**Reference site:** https://sharpflowconsulting.com (light theme — the app mirrors it).

---

## 6. The `prototype/` (Vite demo, Phase A)

Light, Sharpflow-branded clickable demo with **sample data** ("Northwind Creative"). Used for design
sign-off and walkthrough videos. **Stack:** Vite 5, React 18, TypeScript, Tailwind 3, framer-motion,
React Three Fiber (`three`, `@react-three/fiber`, `@react-three/drei`).

**Stage flow** (`src/App.tsx`, deep-linkable via hash: `#landing #connect #config #scan #report`):
1. **Landing** (`components/stages/Landing.tsx`) — hero, 3D **health orb**, word-reveal headline,
   magnetic CTAs, marquee, stat strip.
2. **Connect** (`Connect.tsx`) — simulated ClickUp OAuth consent (mock browser chrome, scopes).
3. **Config** (`Config.tsx`) — workspace + exclude-Space toggles.
4. **Scan** (`Scan.tsx`) — animated progress (radar, particles, live log stream, stages).
5. **Report** (`Report.tsx`) — assembles the dashboard:
   - `ScoreHero` (3D **score gauge**, count-up, quick stats, projected score)
   - `CategoryCards` (7 cards w/ mini rings, tilt + glare)
   - `SectionNav` (sticky scroll-spy)
   - structure section with 3D **topology graph** (clickable Space nodes)
   - `FindingsList` (severity, filters, expand, "View the items")
   - `PerformingWell`, `UtilisationMatrix`
   - `ExecutiveSummary` (streaming text), `RulesTeaser`
   - `LeadCapture` (email + **Calendly CTA** + Sapphire badge)
   - `PdfPreview` (branded report preview modal)

**Other prototype files:** `src/lib/{motion,format,useTilt,useScrollSpy,useCountUp}.ts`, `src/components/ui.tsx`,
`Background.tsx`, `Cursor.tsx` (custom cursor), `ScrollProgress.tsx`, `IntroLoader.tsx`, `ErrorBoundary.tsx`,
`Footer.tsx`, `src/components/three/{Scene3D,scenes,views}.tsx`, `src/data/{demoData,drillData}.ts`.

**Scoring worksheet generator (also in prototype):**
- `scripts/generate-scoring-worksheet.mjs` — builds the **fillable** worksheet PDF (145 AcroForm fields).
  Run via `npm run worksheet`.
- `scripts/fill-scoring-worksheet.mjs` — fills the blank PDF with Oli's answers → the COMPLETED PDF +
  `docs/scoring-answers.json`.
- Outputs in `prototype/docs/`.

---

## 7. The `app/` (Next.js production app, Phase B)

**Stack:** Next.js 14 (App Router), TypeScript, Tailwind 3, Supabase (Postgres), Inngest (jobs),
pdf-lib (PDF), Anthropic Claude (summaries), zod (validation), vitest (tests).

**Pages**
| Route | File | Purpose |
|---|---|---|
| `/` | `app/src/app/page.tsx` | Landing + **Connect ClickUp** (OAuth) + dev-only **Connect with personal token** |
| `/workspaces` | `workspaces/page.tsx` | Real workspace picker (from the connection) + exclude Spaces + **Run audit** |
| `/scan/[id]` | `scan/[id]/page.tsx` | Live progress (polls `/api/scans/[id]`) → redirects to report |
| `/report/[id]` | `report/[id]/page.tsx` | Full dashboard (same components as the prototype, prop-driven) |

**API routes** (`app/src/app/api/…`)
| Method | Route | Does |
|---|---|---|
| GET | `/api/clickup/oauth` | Redirect to ClickUp consent (sets `cu_oauth_state` cookie) |
| GET | `/api/clickup/callback` | Exchange code → token, encrypt, store `connection`, redirect to `/workspaces` |
| GET | `/api/clickup/dev-connect` | **DEV-ONLY** (404 in production): uses `DEV_CLICKUP_TOKEN` to create a connection (OAuth workaround) |
| GET | `/api/connections/[id]` | Connection summary + workspaces |
| POST | `/api/scans` | Create scan row + fire Inngest `scan/requested` → `{ id }` |
| GET | `/api/scans/[id]` | Status + progress + stage + `result` |
| GET | `/api/scans/[id]/drill/[key]` | Drill-down rows (from `list_stats` / `scan_samples`; supports `space:<name>`) |
| GET | `/api/scans/[id]/report.pdf` | Server-generated branded PDF (`application/pdf`) |
| GET | `/api/scans/[id]/summary` | AI executive summary (stored on the scan; template fallback) |
| POST | `/api/leads` | Store lead + optional `LEAD_CAPTURE_WEBHOOK` |
| POST | `/api/inngest` | Inngest serve endpoint (syncs the `scan/requested` function) |

**Libraries** (`app/src/lib/…`)
- `env.ts` — zod-validated env.
- `crypto.ts` — **AES-256-GCM** encrypt/decrypt for ClickUp tokens at rest.
- `supabase/server.ts` — service-role client (server only).
- `clickup/client.ts` — ClickUp v2 client: pagination (`iterateTasks`), 429/5xx retry with backoff,
  spaces/folders/lists/custom-fields/tasks.
- `clickup/oauth.ts` — authorize URL + code→token exchange.
- `clickup/types.ts` — minimal ClickUp types.
- `scoring/model.ts` — **Oli's model as data** (categories, signals, weights, thresholds, severities).
- `scoring/engine.ts` — deterministic metrics → findings → category scores → overall (+ coverage rule).
- `scoring/copy.ts` — templated explanation/recommendation per signal + category blurbs.
- `report/map.ts` — engine result + metrics + utilisation → the UI `ScanResult` model.
- `report-pdf.ts` — server PDF from a `ScanResult`.
- `llm.ts` — Anthropic Claude call for the executive summary (grounded; never scores).
- `types.ts` — shared types (`ScanResult`, `ScanStatus`, `DrillDataset`, `CategoryResult`, …).
- `api.ts` — typed fetchers; `IS_MOCK` switches mock vs real.
- `mock/scan.ts` — full sample scan + drill datasets (mock mode).
- `drill.ts` — drill dataset metadata (titles/columns).

**Background scan** (`app/src/inngest/scan.ts`) — steps: mark running → load connection → load
structure → scan tasks → progress updates → evaluate → `toScanResult` → **AI summary** → store
`list_stats` + `scan_samples` → store results. It writes `scans.progress/stage/result`, `findings`,
`list_stats` (all lists) and `scan_samples` (≤100 rows per dataset: overdue/stale/missing-due).

**Tests** (`app`): `src/lib/scoring/engine.test.ts` + `src/lib/report-pdf.test.ts` → **11 passing**
(`npm test`).

**Dependencies pinned:** see `app/package.json` (next ^14.2.15, react ^18.3.1, framer-motion ^11.5.4,
three ^0.169.0, @react-three/fiber ^8.17.10, @react-three/drei ^9.114.0, @supabase/supabase-js ^2.45.4,
inngest ^3.22.2, pdf-lib ^1.17.1, zod ^3.23.8; dev: typescript ^5.5.4, vitest ^2.1.0, tailwindcss ^3.4.13).

---

## 8. Database (Supabase / Postgres)

Schema file: **`app/supabase/schema.sql`**. **Applied** to project `iijehqonmdfhsutkbwsz` (verified:
all tables exposed via REST, HTTP 200).

| Table | Columns (key ones) |
|---|---|
| `connections` | `id`, `clickup_user_id`, `clickup_username`, `clickup_email`, **`token_encrypted`**, `workspaces` (jsonb `[{id,name}]`), `created_at`, `updated_at` |
| `scans` | `id`, `connection_id`, `team_id`, `workspace_name`, `status` (queued/running/complete/failed), **`progress`**, **`stage`**, **`result` (jsonb – full ScanResult)**, `started_at`, `finished_at`, `overall_score`, `grade`, `metrics` (jsonb), `category_scores` (jsonb), `error`, `created_at` |
| `findings` | `id`, `scan_id`, `signal_key`, `category_key`, `category_name`, `title`, `severity`, `metric_value`, `threshold`, `created_at` |
| `leads` | `id`, `scan_id`, `email`, `source`, `created_at` |
| `list_stats` | `id`, `scan_id`, `list_id`, `list_name`, `space_id`, `space_name`, `tasks`, `open_tasks`, `overdue`, `stale`, `last_activity`, `created_at` |
| `scan_samples` | `id`, `scan_id`, `dataset`, `rows` (jsonb), `created_at` |

RLS is **enabled** on all tables (the app uses the service-role key, which bypasses RLS).

---

## 9. ClickUp API integration

**Auth:** OAuth 2.0 (authorization code). Authorize: `https://app.clickup.com/api`. Token:
`POST https://api.clickup.com/api/v2/oauth/token`. ClickUp has **no scopes** — the token inherits the
authorizing user's permissions, so the app **only ever reads**. Personal tokens use header
`Authorization: pk_...`; OAuth uses `Authorization: <access_token>`.

**Endpoints used:** `GET /v2/user`, `GET /v2/team`, `/team/{id}/space`, `/space/{id}/folder`,
`/space/{id}/list`, `/folder/{id}/list`, `/list/{id}/field`, `/list/{id}/task` (paginated).

**Must handle (implemented):** pagination, rate limits (per-token; ~100 req/min below Business Plus),
429/5xx retry with backoff, large workspaces (list cap 300 in first pass), timeouts, token encryption.

**Platform-utilisation feasibility (honest)**
| Verdict | Capabilities |
|---|---|
| Reliably detectable | Views, Time Tracking, Time Estimates, Dependencies, Relationships, Custom Task Types, Goals, Docs, Custom Fields, hierarchy, users, task metadata |
| Conditional | Time in Status (needs the ClickUp ClickApp enabled); Templates (task/list/folder only) |
| Not exposed by the public API | Forms (config), Automations, Dashboards, Whiteboards, Workload, ClickApps enabled-state, ClickUp AI usage, installed Integrations (only webhooks visible) |

**OAuth works in production.** Early on, ClickUp's OAuth was broken platform-side (selecting a
workspace returned *"Whoops! Unable to authorize your teams"*); that resolved, and OAuth now works on
the real HTTPS domain. Note ClickUp scopes the token to **the single workspace selected at consent**
— `GET /team` may list more workspaces than the token can actually read, which surfaces as
`OAUTH_192 "Workspace not authorized"`. The app detects this and asks the user to reconnect.
`GET /api/clickup/dev-connect` (`DEV_CLICKUP_TOKEN`) remains **dev-only** (404 in production).

---

## 10. Scoring model (finalised with Oli)

Source of truth: **`PROJECT.md` §9**, **`prototype/docs/scoring-answers.json`**,
**`prototype/docs/Sharpflow-ClickUp-Health-Scoring-Worksheet-COMPLETED.pdf`** (Oli's filled version).
Reference implementation: **`app/src/lib/scoring/model.ts`**.

**Overall:** 0–100 · Grades: A ≥85, B 75–84, C 60–74, D 45–59, F <45.
Severities: Critical · High · Medium · Low · Opportunity.

**Category weights:** Architecture 15 · Workflow 15 · Data & Governance 15 · Operational 20 ·
Adoption 15 · Platform Utilisation 10 · Reporting 10.

**Signal weights / thresholds / severities** (signal weight within category):

**Architecture & Structure**
- Avg tasks per List — 15 — `< 10 (median)` → Low
- Dormant Lists — 30 — `> 20% of Lists` → Medium
- Fragmented Lists (<5 tasks) — 35 — `> 25% of Lists` → Medium
- Hierarchy/folder sprawl — 20 — `> 20% empty Folders` → Low

**Workflow Design**
- Statuses per workflow — 25 — `> 12` → Low
- Unused statuses — 25 — `> 3 per workflow` → Medium
- Duplicate status names — 20 — `same name, diff type` → Medium
- Avg time in a status — 30 — `> 14d in active status` → Medium (needs ClickApp)

**Data & Governance**
- Custom Field count — 20 — `> 100 fields` → Low
- Custom Field completion rate — 35 — `< 50% where in scope` → High
- Fields never filled (0%) — 25 — `0% filled in scope` → Medium
- Tasks missing required Custom Fields — 20 — `> 20%` → Medium

**Operational Health**
- Overdue task rate — 30 — `> 15% High · > 30% Critical` (**tiered**)
- Stale tasks (no update 90d+) — 25 — `> 20% of open` → High
- Open subtasks under closed parents *(new)* — 15 — `> 2% of subtasks` → Medium
- Completion vs creation trend — 15 — `created > done over 3 months` → Medium
- Work-in-progress level — 15 — `> 15 open / person` → Low

**Adoption & Activity**
- Inactive members *(renamed from "inactive paid seats")* — 25 — `> 15% of members` → Medium (partial)
- Guest vs member ratio *(new)* — 15 — `> 30% of users are guests` → Medium
- Activity concentration — 15 — `> 80% in 1 Space` → Low (partial)
- Comment / update frequency — 20 — `< 1 per active user / week` → Low
- Dormant Spaces — 25 — `any (after exclusions)` → Medium

**Platform Utilisation** (scored subset only)
- Time tracking in use — 35 — `0 logged in 90d` → Opportunity
- Views — 30 — `< 2 Views per Space` → Low
- Dependencies / Relationships — 35 — `none used` → Low
- Goals · Docs · Custom Task Types — **insight only** (Opportunity, no score)
- Dashboards · Automations · Whiteboards · Workload · AI · Integrations — **not measured** (never penalised)

**Reporting Readiness**
- Due-date coverage — 30 — `< 80% of open tasks` → High
- Ownership (assignee) coverage — 30 — `< 80% of open tasks` → High
- Estimate coverage — 20 — `< 40% of open tasks` → Medium
- Consistent statuses / workflow — 20 — `> 5 distinct workflows` → Medium

**Definitions:** Overdue = past due AND status not Done/Closed · Stale = open, no update 90 days ·
Dormant = no activity 90 days · Fragmented List = <5 open tasks · Active user = created/completed/
commented in 30 days.

**Engine rules:**
- **No double-counting:** due-date & estimate coverage scored **only in Reporting**.
- **Opportunity severity = 0 score penalty.**
- **Magnitude scaling:** each fired signal's deduction scales from **1× at the threshold to 1.5× at
  the ceiling** (so a signal just over the line costs less than one near the ceiling).
- **Tiered stale / dormant:** stale 30–60d → Low · 60–90d → Medium · 90d+ → High; dormant Lists
  (60d Medium / 90d High) and dormant Spaces are tiered the same way.
- **"Insufficient data":** if the connecting token can't see enough (non-admin/empty workspace) the
  report shows an insufficient-data state instead of a misleading score.
- **Category coverage rule:** a category is scored only if ≥50% of its signal weight is measurable;
  otherwise it is **excluded from the overall** and shown as **"Not measured"** (surfaced as
  `coverage.scored / coverage.total`).

**AI:** the LLM only writes the executive summary (grounded, no invented numbers); it never computes
scores. Model: `claude-haiku-4-5-20251001` (Claude Haiku 4.5 — the old `claude-3-5-haiku-latest`
alias is retired and returns 404).

---

## 11. Environment variables

Values live **only** in `app/.env.local` (gitignored) and the platform settings — **never commit them**.

| Variable | Notes / current non-secret value |
|---|---|
| `CLICKUP_CLIENT_ID` | `7B4OAURBRZ4OE9S52H5UP9M1PKPIXW2V` (non-secret) |
| `CLICKUP_CLIENT_SECRET` | 🔐 secret (in env only) |
| `CLICKUP_REDIRECT_URI` | dev: `http://localhost:3000/api/clickup/callback`; production: `https://health.sharpflowconsulting.com/api/clickup/callback` |
| `DEV_CLICKUP_TOKEN` | 🔐 dev-only personal ClickUp token (`pk_...`) |
| `NEXT_PUBLIC_APP_URL` | dev `http://localhost:3000`; production `https://health.sharpflowconsulting.com` |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://iijehqonmdfhsutkbwsz.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 🔐 (anon — public by design, still in env only) |
| `SUPABASE_SERVICE_ROLE_KEY` | 🔐 full DB access — server-side only |
| `SUPABASE_DB_URL` | blank (schema applied via SQL Editor) |
| `INNGEST_EVENT_KEY` / `INNGEST_SIGNING_KEY` | blank for dev (Inngest dev server needs none) |
| `LLM_API_KEY` | 🔐 Anthropic key (user-scoped) |
| `LLM_MODEL` | `claude-haiku-4-5-20251001` |
| `LLM_WORKSPACE_ID` | **set** (`wrkspc_01XvgD9pRNyCE3etUvUjK9kq`) — required because Oli's key is user-scoped; without the header the Anthropic API returns `400 … must include the anthropic-workspace-id header`. |
| `LEAD_CAPTURE_WEBHOOK` / `LEAD_CAPTURE_LIST_ID` / `LEAD_CAPTURE_CLICKUP_TOKEN` | set — leads are created in Sharpflow's ClickUp CRM (Sales Pipeline list `901325698521`). |
| `TOKEN_ENCRYPTION_KEY` | 🔐 32-byte AES-256-GCM key |
| `NEXT_PUBLIC_MOCK` | `0` (real mode). Set `1` to preview the mock demo. |

---

## 12. How to run (exact commands)

> Full operator guide — deploy, Inngest sync, database, scoring rules, the scan worker and
> troubleshooting: see [`handover/Runbook.md`](./handover/Runbook.md).

**Prototype**
```
cd prototype
npm install
npm run dev                       # http://localhost:5173  (?demo=1 slows animations for recording)
npm run build                     # tsc --noEmit && vite build
npm run worksheet                 # regenerate the fillable scoring worksheet PDF
```

**App (real mode)**
```
cd app
npm install
npm run dev                       # http://localhost:3000 (reads app/.env.local)
npx inngest-cli dev               # background jobs (dev server on :8288) — REQUIRED for scans
npm run typecheck                 # tsc --noEmit
npm test                          # vitest — scoring engine + PDF (11 tests)
npm run build                     # next build  (do NOT run while `next dev` is running)
```

**Real end-to-end (current, dev-token path)**
1. `cd app` → `npm run dev` and (separately) `npx inngest-cli dev`.
2. Open http://localhost:3000 → click **"Connect with personal token"** → creates a connection.
3. On **/workspaces** pick **SHARPFLOW CONSULTING DEMO SPACE** → **Run audit**.
   (If the button click is flaky in a headless browser, POST `/api/scans` directly:
   body `{ "connectionId": "<id>", "teamId": "90141283722", "workspaceName": "SHARPFLOW CONSULTING DEMO SPACE", "excludeSpaceIds": [] }`.)
4. `/scan/<id>` → progress → `/report/<id>`.

---

## 13. Verified state / real results

**Live:** https://health.sharpflowconsulting.com · sample report at `/sample`.
- `app` **`npm test`** → **26/26 pass** (scoring engine + PDF). **`tsc`** clean. **`next build`** clean.
- **Schema** applied and reachable (REST 200 on all tables).
- **PDF** route returns HTTP 200, `application/pdf` (~450 KB for a real report).
- **Real end-to-end scans in production** (Vercel + Inngest Cloud), e.g.:
  - `EES Agency` — **13 Spaces · 200 Folders · 388 Lists · ~48,200 tasks** → **64/100 (C)**, 19 findings.
    The largest workspace seen; a full scan takes **~13–15 min** on the chunked worker and completes reliably.
  - `SHARPFLOW CONSULTING LTD` → **74/100 (C)** · `Astrocorn Industries` → **58/100 (D)** ·
    `Santa Iontchevska's Workspace` → **54–55/100 (D)**.
- **Failure handling:** a failed scan is recorded as `failed` with its error; a stale-scan reaper marks
  any `running` scan `failed` after 45 min — so nothing hangs indefinitely.

---

## 14. Open issues & remaining work

**Done**
- ✅ Metric coverage (Platform Utilisation honest, Adoption scored, new signals, limited-coverage banner).
- ✅ AI executive summary live (Claude Haiku 4.5 + workspace id).
- ✅ **Deployed** to Vercel + Supabase + Inngest Cloud — live on `health.sharpflowconsulting.com`.
- ✅ **Lead capture wired** → Sharpflow's ClickUp CRM (Sales Pipeline list).
- ✅ Scan worker hardened for very large workspaces (chunked steps, request timeouts, failure recording).

**Remaining**
- **Report email (optional freebie):** the "Email me the report" button captions the send but does not
  yet deliver the PDF — needs a sending address / DNS record on the Sharpflow domain (Resend + 2 DNS
  records, or an app password on Oli's mailbox).
- **`avgTimeInStatusDays`** unmeasured (needs the Time in Status ClickApp) — left `undefined` so the
  coverage rule handles it.
- **Docs** utilisation stays "not measurable" (the Docs API is v3-only).

**Housekeeping**
- The GitHub repo is **public** — consider making it private (owner-only).
- The ClickUp **client secret** and Anthropic key were shared in chat → consider rotating.

---

## 15. What Oli still needs to provide

- **A test workspace** — ✅ done.
- **The CRM List** leads are created in — ✅ done (Sharpflow Sales Pipeline list).
- **Anthropic workspace id** — ✅ done (`LLM_WORKSPACE_ID` set; AI summary live).
- **Domain** — ✅ done (`health.sharpflowconsulting.com` live).
- **Production redirect URL** on the ClickUp app — ✅ done.
- **[Optional]** a sending address / DNS record on the Sharpflow domain to switch on **emailed reports**.

---

## 16. Gotchas & conventions (important)

- ⚠️ **Never edit UTF-8 files with PowerShell `Get-Content`/`Set-Content`** — it mangles em dashes /
  arrows into `�?"`. Use the editor/edit tool. (This caused two corruption incidents.)
- ⚠️ **Don't run `next build` while `next dev` is running** — it clobbers `.next` and 404s the dev
  server. Restart `next dev` after a build.
- **Browser automation:** agent-browser `click` via refs / `find … click` is flaky for some buttons
  (clicks land but don't fire). Use a direct DOM click via `eval`, or POST the API directly.
- **PowerShell** has no heredocs (`<<EOF` fails); use here-strings (`@' … '@`) or the file tools.
- **`SUPABASE_SERVICE_ROLE_KEY`** = full DB access → server-side only.
- The **repo is public** — keep secrets out.
- `.env*` and `*.local` are gitignored; API/product keys live only in `app/.env.local` + hosts.
- Mock vs real is controlled by **`NEXT_PUBLIC_MOCK`** (`app/src/lib/api.ts` → `IS_MOCK`).

---

## 17. Links & IDs

- **Upwork job:** https://www.upwork.com/jobs/~022106474084368307973 (job id `2106474084368307973`)
- **Upwork MCP:** `org_uid 1891956117832253066`; chat room `room_b0cebea6c048fc17a6addb6205bf3683`
  (tools: `upwork_upwork__list_accounts`, `get_messages`, `find_saved_jobs`, …)
- **GitHub:** https://github.com/oli493/sharpflow-clickup-health-works
- **Production app:** https://health.sharpflowconsulting.com (sample report: `/sample`)
- **Supabase dashboard:** https://supabase.com/dashboard/project/iijehqonmdfhsutkbwsz
- **ClickUp API docs:** https://developer.clickup.com
- **Vercel:** https://vercel.com · **Inngest:** https://app.inngest.com
- **Calendly (CTA):** https://calendly.com/oli-sharpflowconsulting/clickup-health-discussion
- **Reference site:** https://sharpflowconsulting.com

---

## 18. Asset inventory

- **Brand:** `prototype/public/brand/` and `app/public/brand/` — `logo-mark.jpg`, `logo-wordmark.png`,
  `partner-badge.png`.
- **Docs (prototype/docs/):** `Sharpflow-ClickUp-Health-Scoring-Worksheet.pdf` (blank fillable),
  `Sharpflow-ClickUp-Health-Scoring-Worksheet-COMPLETED.pdf` (**Oli's filled answers**),
  `scoring-answers.json` (answers as data).
- **Videos (sent to Oli via Upwork; not stored in repo):** walkthrough v1 + v2 (branded).
- **Generator scripts:** `prototype/scripts/{generate-scoring-worksheet,fill-scoring-worksheet}.mjs`.

> Oli's completed worksheet is a **real file on disk and committed** — any new chat can read it; it
> does not depend on the (expiring) Upwork attachment links.

---

## 19. Glossary

- **Phase A** = the Vite prototype (design/UX demo). **Phase B** = the Next.js production app.
- **Health Score** = 0–100 deterministic score across 7 weighted categories.
- **Finding** = a rule that fired, with severity + supporting metric + recommendation.
- **Drill-down** = click a metric/finding/Space to see the underlying items (a drawer with a table).
- **Freebie** = Oli's model: give the tool to clients (potential + existing) to generate leads.
- **Coverage** = how many categories had enough measurable data to be scored.

---

## 20. Post-launch changes (since first handover)

- **Scan worker bounded by work, not list count.** Task analysis runs in page-budgeted steps
  (`MAX_LIST_PAGES_PER_STEP = 50`), with a **400-page safety cap per List** (`MAX_PAGES_PER_LIST`);
  structure runs in `SPACE_BATCH = 2` Spaces per step; plus a **30 s per-request timeout** on the
  ClickUp client. Safety-cap truncation is recorded in `dataQuality.truncated`.
  This fixed 300 s step timeouts on large workspaces (incl. single Lists with 10k+ tasks) and the
  scan being stuck at one percentage forever.
- **Failure + stale handling.** The handler records failures directly (try/catch) → the scan row is
  marked `failed` with its error; an Inngest `onFailure` and a **45-minute stale-scan reaper** back it up.
- **Coverage cap** raised to **1000 Lists** (`SAMPLE_LIST_LIMIT`); if exceeded, the scan is marked
  sampled and the report shows a coverage banner.
- **Unauthorised-workspace handling.** ClickUp `OAUTH_192` is mapped to a clear "reconnect and select
  this workspace" message + a Reconnect button; the workspace picker only lists readable workspaces.
- **Report UX:** findings in a **two-column grid**; **Rules & thresholds** as a collapsed dropdown;
  **AI summary full-width**; **transparent Diamond partner badge**.
- **Sample report** at `/sample` (synthetic "Northwind Creative" data) + a "See a sample report" link.
- **Social share cards:** report/sample links unfurl with the **score**; the landing uses a static
  Sharpflow brand image (`app/public/brand/share-card.png`).
- **Lead-magnet playbook** at `handover/Lead-Magnet-Playbook.md`.
- Performance: DOM-driven card tilt, click-only 3D raycasting, offscreen canvas pause, instant cursor.

---

## 21. Scanner correctness (v1.1, branch `fix/scanner-correctness`)

This branch corrects the data layer without changing the agreed scoring model.

- **Open-task coverage:** due-date, ownership and estimate coverage now use open tasks.
- **No silent truncation:** Lists are read to the final page; safety-cap truncation and failed Lists
  are recorded in `ScanResult.dataQuality` and shown in the report banner.
- **Dormant logic:** empty/new Lists and Spaces are not counted as dormant unless they are older
  than the threshold; creation dates are used where available.
- **Distinct workflows:** counted from unique status signatures, not Space count.
- **Per-workflow statuses:** unused statuses and statuses-per-workflow are calculated per workflow.
- **Custom fields:** configured field definitions are counted, including fields never used on tasks.
- **Comments:** sampled across Lists and filtered to the last 30 days.
- **Activity concentration:** based on recent activity, not historical task volume.
- **Time tracking:** uses workspace time entries for the last 90 days; falls back to “any time logged”
  with an explicit label if the endpoint is unavailable.
- **Drill-downs:** added `custom-fields`, `unused-statuses`, `fragmented-lists`, `missing-owner`,
  stale tiers and dormant-list tiers; corrected labels and sample-row wording.
- **Partial scans:** material missing data fails the scan instead of publishing a misleading score.

Validation: `npm run typecheck`, `npm test` (40 tests), `npm run build`.
No production env, domain, key or database changes are required.
