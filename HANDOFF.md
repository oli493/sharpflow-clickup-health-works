# HANDOFF — Sharpflow ClickUp Health (complete project context)

> **Read this first, in full.** This is the single source of truth for continuing the job in a
> fresh chat on this machine. It contains everything: the client, the contract, the accounts,
> every file, the exact scoring model, the database, the API integration, what's done, what's
> running, what's verified, what's left, and every gotcha.
>
> **No secret values are in this file.** Credentials live in `app/.env.local` (gitignored) and the
> host/platform settings. See §13.

Last updated: 06 Oct 2026 · repo HEAD at time of writing: `3c0faf6` (local metric-coverage work uncommitted)

---

## 0. TL;DR

- **What:** a standalone web app ("Sharpflow ClickUp Health") that connects a customer's ClickUp
  workspace via OAuth (read-only), runs an automated audit, and produces a 0–100 **ClickUp Health
  Score** with category scores, findings, severities, recommendations and a polished branded
  dashboard + PDF. Built for **Sharpflow Consulting** as a **lead-generation freebie**.
- **Where we are:** Phase B is built and **runs end-to-end locally on real ClickUp data**
  (connect → workspace picker → background scan → report → PDF). Latest real scan of Oli's demo
  workspace: **65/100 (C), 7/7 categories measured, 20 findings** (metric coverage completed
  06 Oct 2026 — Adoption is no longer excluded). **Not yet deployed.**
- **Biggest blocker:** ClickUp's OAuth is currently **broken on ClickUp's side**; we use a
  **dev personal token** workaround locally. Production still needs OAuth.
- **Next actions:** wire the AI summary (Oli's key arrived 06 Oct but is **user-scoped**, so it
  needs his Anthropic **workspace id**), then deploy to Vercel + Supabase Pro + Inngest.

---

## 1. Client & contract

- **Client:** Oli Walker — **Sharpflow Consulting** (British-led, ClickUp-only consultancy based in
  Mexico; clients in UK/US; teams of 5+).
- **Upwork job:** "SaaS Developer Needed for ClickUp Audit & Scoring Product"
  - Job URL: https://www.upwork.com/jobs/~022106474084368307973
  - Job ID: `2106474084368307973`
- **Contract:** **fixed price $400**, paid as **two milestones of $200**:
  1. **"Initial Product Demo & Build out"**
  2. **"Product Delivery & Handover"**
  - Upwork freelancer service fee 10% → **expected net ≈ $360**.
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

**⚠️ CRITICAL — ClickUp OAuth is currently broken on ClickUp's side.** Selecting a workspace returns
*"Whoops! Unable to authorize your teams. Please try again."* ClickUp support has confirmed it's a
ClickUp-side issue (see the n8n community thread). Our callback is never reached. **Workaround in
dev:** `GET /api/clickup/dev-connect` using `DEV_CLICKUP_TOKEN` (Misho's ClickUp personal token,
`pk_...`, scoped to the demo workspace). Keep OAuth for production; re-test once ClickUp fixes it
and/or on a real HTTPS domain.

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
| `CLICKUP_REDIRECT_URI` | `http://localhost:3000/api/clickup/callback` |
| `DEV_CLICKUP_TOKEN` | 🔐 dev-only personal ClickUp token (`pk_...`) |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://iijehqonmdfhsutkbwsz.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 🔐 (anon — public by design, still in env only) |
| `SUPABASE_SERVICE_ROLE_KEY` | 🔐 full DB access — server-side only |
| `SUPABASE_DB_URL` | blank (schema applied via SQL Editor) |
| `INNGEST_EVENT_KEY` / `INNGEST_SIGNING_KEY` | blank for dev (Inngest dev server needs none) |
| `LLM_API_KEY` | 🔐 Anthropic key (user-scoped) |
| `LLM_MODEL` | `claude-haiku-4-5-20251001` |
| `LLM_WORKSPACE_ID` | **blank — REQUIRED.** Oli's key is user-scoped (`sk-ant-usr-…`); without this header the Anthropic API returns `400 … must include the anthropic-workspace-id header`. Ask Oli for the workspace id (Console → Settings → Workspace). |
| `LEAD_CAPTURE_WEBHOOK` / `LEAD_CAPTURE_LIST_ID` | blank (leads → Sharpflow ClickUp CRM, pending) |
| `TOKEN_ENCRYPTION_KEY` | 🔐 32-byte AES-256-GCM key |
| `NEXT_PUBLIC_MOCK` | `0` (real mode). Set `1` to preview the mock demo. |

---

## 12. How to run (exact commands)

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

- `app` **`npm test`** → 20/20 pass (scoring engine + PDF). **`tsc`** clean. (`npm run build` clean as of the last committed state.)
- **Schema** applied and reachable (REST 200 on all 6 tables).
- **PDF** route returns HTTP 200, `application/pdf`, ~649 KB.
- **Real scans** of `SHARPFLOW CONSULTING DEMO SPACE` (30 members · 21 Spaces · 113 Lists · 705 tasks):
  - Scan `07986738-…` → **81/100 (B)** *(before calibration — inflated)*
  - Scan `cb46dc14-…` → **68/100 (C)**
  - Scan `42137fcf-…` → **62/100 (C), 6/7 categories measured, 14 findings (4 High)** *(before metric coverage)*
  - Scan `60dc0ea2-…` → **65/100 (C), 7/7 categories measured, 20 findings (4 High, 2 Opportunity)** *(current)*
    - Categories: Architecture **64** · Workflow **68** · Data & Governance **45** · Operational **66** ·
      Adoption **83** *(now scored)* · Platform Utilisation **93** *(honest, was 100)* · Reporting **35**.
    - New findings now firing: duplicate status names, inactive members (60%), comment frequency
      (0/week), Views (1.9/Space), time tracking (1% → Opportunity), Goals (0 → Opportunity).
- **Dev connection id:** `b88fe19c-f505-46f0-8544-5ab5b02793c0` (team `90141283722`).

---

## 14. Open issues & remaining work

**Done 06 Oct 2026 (local, uncommitted)**
1. ✅ **Platform Utilisation no longer flatters:** Views per Space are read (`GET /space/{id}/view`),
   and the time-tracking band is now `< 5% → Opportunity` (a **deviation** from Oli's literal
   "0 logged in 90d" — confirm with him). Demo score dropped 100 → 93.
2. ✅ **Adoption & Activity is now scored** (coverage 7/7): inactive members (activity inferred from
   task creator/assignee dates + commenters), activity concentration, comment frequency (sampled
   ≤60 recently-updated tasks), dormant Spaces.
3. ✅ Added signals: duplicate status names, missing required Custom Fields, open subtasks under
   closed parents; insight-only Goals + Custom Task Types are now read.
4. ✅ **Bug fixed:** Next.js cached Supabase's internal GETs, so `/api/scans/[id]` froze on its first
   response (progress never advanced — would break production). Fixed with a no-store fetch in
   `lib/supabase/server.ts`.
5. ✅ Owner/Admin **limited-coverage banner** implemented (role resolved from `/team`, flag on
   `ScanResult`).

**Remaining**
6. **AI summary:** Oli's key arrived 06 Oct but is **user-scoped** → still needs `LLM_WORKSPACE_ID`.
   Until then the report uses templated text (the fallback now logs the reason).
7. **`avgTimeInStatusDays`** still unmeasured (needs the Time in Status ClickApp) — left `undefined`
   so the coverage rule handles it.
8. **Docs** utilisation stays "not measurable" (the Docs API is v3-only).

**OAuth**
9. ClickUp OAuth still fails platform-side; re-test after ClickUp fixes it and/or on the real HTTPS
   domain. Keep the dev-token route strictly non-production.

**Deploy**
10. Deploy to **Vercel** (Root Directory = `app`), add env vars, register the **production redirect
   URL** on the ClickUp app, point **`health.sharpflowconsulting.com`** (one CNAME), sync **Inngest
   Cloud**, then verify the live flow.

**Leads / CRM**
11. Wire **lead capture → Sharpflow's ClickUp CRM List** (needs the target List + token/webhook).

**Housekeeping**
12. The GitHub repo is **public** — consider making it private.
13. The ClickUp **client secret** and Anthropic key were shared in chat → consider **rotating** before
    launch.

---

## 15. What Oli still needs to provide

- **A test workspace** — ✅ done (both workspaces added; demo used).
- **The CRM List** (name/link) that leads should be created in.
- **Anthropic workspace id** — key received 06 Oct (`sk-ant-usr-…`) but it is **user-scoped**, so the
  **workspace id** is still needed (or a workspace-scoped key) before the AI summary works.
- **Domain** decision (`health.sharpflowconsulting.com`) → add the CNAME at deploy.
- **Production redirect URL** to add to the ClickUp app (sent at deploy time).

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
