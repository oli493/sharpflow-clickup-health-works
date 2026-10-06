# HANDOFF — Sharpflow ClickUp Health

> **Read this first.** Full context for continuing this job in a fresh chat on this machine.
> No secret values are stored in this file — credentials live in `app/.env.local` and the host settings.

Everything you need is in this repository. This document is the single source of truth for
picking the project up cold.

---

## 1. Summary & current status

We are building **Sharpflow ClickUp Health** — a standalone web app that lets a customer connect
their own ClickUp workspace (OAuth, read-only) and get an automated **workspace health assessment**:
an overall score, category scores, findings, recommendations and a branded dashboard. Built for
**Sharpflow Consulting** (Oli Walker) as a branded, self-serve **lead-generation freebie**.

**Status:** Phase B is live locally. The app runs end-to-end against **real ClickUp data** —
connect → workspace picker → background scan (Inngest) → report → PDF. First real scan of Oli's
demo workspace produced **62/100 (Grade C), 6/7 categories measured, 14 findings**. Not yet deployed.

---

## 2. Client & contract

- **Client:** Oli Walker — Sharpflow Consulting (British-led ClickUp consultancy, based in Mexico;
  works with UK/US clients).
- **Upwork job:** "SaaS Developer Needed for ClickUp Audit & Scoring Product"
  - Job URL: https://www.upwork.com/jobs/~022106474084368307973
  - Job ID: `2106474084368307973`
- **Contract:** fixed price **$400**, in two milestones of **$200**:
  1. "Initial Product Demo & Build out"
  2. "Product Delivery & Handover"
  - Upwork freelancer fee 10% → **net ≈ $360**.
  - Offer accepted **04 Oct 2026**.
- **Product model (Oli's):** a **connect button** handed to clients who are workspace admins/owners;
  they connect independently. Used as a **freebie** for potential and existing clients. End goal is
  Sharpflow branded, ending with an email capture + "Book a call" CTA.

---

## 3. Accounts & ownership (owner = Oli / Sharpflow)

| Service | Detail | Access |
|---|---|---|
| **GitHub repo** | https://github.com/oli493/sharpflow-clickup-health-works | **PUBLIC** repo; owner `oli493` (Oli). Misho added as collaborator and has pushed. |
| **Vercel** | Hosting (Next.js) | Oli's **Pro team**; Misho invited (`mikailtorres99@gmail.com`). Deploy not done yet. |
| **Supabase** | Postgres (project ref `iijehqonmdfhsutkbwsz`, URL https://iijehqonmdfhsutkbwsz.supabase.co) | Oli's **Pro** org; Misho added; schema applied. |
| **Inngest** | Background jobs | Oli's account; Misho invited. |
| **ClickUp OAuth app** | Created under Sharpflow | client_id `7B4OAURBRZ4OE9S52H5UP9M1PKPIXW2V` (secret in `app/.env.local`). Redirect registered: `http://localhost:3000/api/clickup/callback`. |
| **Anthropic** | LLM (Claude) for summaries | Oli's account. Key is **user-scoped** (needs `anthropic-workspace-id`). |
| **Calendly CTA** | "Book a call" button target | https://calendly.com/oli-sharpflowconsulting/clickup-health-discussion |
| **Domain (planned)** | `health.sharpflowconsulting.com` | Oli owns the domain; will add one CNAME at deploy. |

---

## 4. Local repo

- **Local path:** `C:\Users\misho\Desktop\My Own Exercise\WebWorkflowAutomationBotForBooking\sharpflow-health-demo`
- **Branch:** `main` · **remote:** `origin` → the GitHub repo above (pushed).
- **Structure (monorepo):**
  ```
  prototype/   Vite + React branded demo (design/UX + scoring worksheet generator)
  app/         Next.js production app (Phase B)
  PROJECT.md   Full product & build spec (scope, branding, scoring model, stack)
  README.md    Concise overview + how to run
  HANDOFF.md   This file
  ```

---

## 5. What's built

### `prototype/` — Vite demo (Phase A, design sign-off)
Light, Sharpflow-branded prototype with **sample data**: Landing (3D health orb) → Connect (simulated
OAuth) → Configure → Scan (animated) → Report (3D score gauge, 7 category cards, 3D topology graph,
findings with severity, performing-well, platform-utilisation matrix, streaming AI summary, rules
engine, **drill-down drawer**, email capture + "Book a call" CTA, branded **PDF preview**).
Also generates the fillable **scoring worksheet** (`npm run worksheet`).
- Stack: Vite, React 18, TypeScript, Tailwind, framer-motion, React Three Fiber.

### `app/` — Next.js production app (Phase B, real data)
- **Pages:** `/` (connect), `/workspaces` (real workspace picker + exclude Spaces), `/scan/[id]`
  (progress), `/report/[id]` (full dashboard + drill-down + lead capture + PDF).
- **API routes:** `/api/clickup/oauth`, `/api/clickup/callback`, `/api/clickup/dev-connect`
  (dev-only), `/api/connections/[id]`, `/api/scans` (POST create + GET status), `/api/scans/[id]/drill/[key]`,
  `/api/scans/[id]/report.pdf`, `/api/scans/[id]/summary`, `/api/leads`, `/api/inngest`.
- **Core libs:** `lib/crypto.ts` (AES-256-GCM token encryption), `lib/supabase/server.ts`,
  `lib/clickup/{client,oauth,types}.ts` (rate-limit/retry-aware client), `lib/scoring/{model,engine,copy}.ts`,
  `lib/report/map.ts` (engine → UI model), `lib/report-pdf.ts` (server PDF), `lib/llm.ts` (Claude),
  `lib/api.ts` + `lib/mock/scan.ts` (mock/dev mode).
- **Background scan:** `inngest/scan.ts` (hierarchy + tasks → metrics → scoring engine → stores
  scores/findings/list_stats/samples + the report snapshot; progress stages).
- **DB schema:** `app/supabase/schema.sql` — tables `connections`, `scans`, `findings`, `leads`,
  `list_stats`, `scan_samples` (+ `progress`/`stage`/`result` on `scans`).
- **Tests:** Vitest (`npm test`) — scoring engine + PDF (11 passing).
- Stack: Next.js (App Router), TypeScript, Tailwind, Supabase, Inngest, pdf-lib, Anthropic.

---

## 6. Scoring model (agreed with Oli)

Oli completed the scoring worksheet and returned it. Source of truth:
- **`PROJECT.md` §9** (full tables: weights, thresholds, severities)
- **`prototype/docs/scoring-answers.json`** (his answers as data)
- **`prototype/docs/Sharpflow-ClickUp-Health-Scoring-Worksheet-COMPLETED.pdf`** (his filled version)

Key points:
- **Category weights:** Architecture 15, Workflow 15, Data & Governance 15, Operational 20,
  Adoption 15, Platform Utilisation 10, Reporting 10.
- **No double-counting:** due-date & estimate coverage scored **only in Reporting**.
- **Overdue tiered:** >15% High, >30% Critical; overdue = past due AND status not Done/Closed.
- **Opportunity findings carry no score penalty.**
- **Platform Utilisation** scores only Time tracking, Views, Dependencies/Relationships
  (Goals/Docs/Custom Task Types = insight only; unexposed capabilities = "not measured").
- Engine honours a **category coverage rule**: a category is only scored if ≥50% of its signal
  weight is measurable; otherwise it's excluded from the overall and shown as **"Not measured"**.

---

## 7. Key files map

| Concern | File |
|---|---|
| Product spec & decisions | `PROJECT.md` |
| Scoring definition (data) | `app/src/lib/scoring/model.ts` |
| Scoring engine | `app/src/lib/scoring/engine.ts` |
| Finding copy (templated) | `app/src/lib/scoring/copy.ts` |
| Engine → report UI model | `app/src/lib/report/map.ts` |
| Server PDF | `app/src/lib/report-pdf.ts` |
| LLM (Claude) | `app/src/lib/llm.ts` |
| ClickUp client / OAuth | `app/src/lib/clickup/{client,oauth}.ts` |
| Background scan | `app/src/inngest/scan.ts` |
| DB schema | `app/supabase/schema.sql` |
| Report UI components | `app/src/components/report/*` |
| Prototype demo | `prototype/src/*` |
| Scoring worksheet generator | `prototype/scripts/*` |

---

## 8. Environment variables

Values live **only** in `app/.env.local` (gitignored) and the host/Vercel settings — **never commit
them**. Names:

```
CLICKUP_CLIENT_ID, CLICKUP_CLIENT_SECRET, CLICKUP_REDIRECT_URI
DEV_CLICKUP_TOKEN                 # dev-only: personal ClickUp token (OAuth workaround)
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_DB_URL
INNGEST_EVENT_KEY, INNGEST_SIGNING_KEY
LLM_API_KEY, LLM_MODEL, LLM_WORKSPACE_ID
LEAD_CAPTURE_WEBHOOK, LEAD_CAPTURE_LIST_ID
TOKEN_ENCRYPTION_KEY              # 32-byte AES-256-GCM key
NEXT_PUBLIC_MOCK                  # 1 = sample data, 0 = real
```
Current `app/.env.local` has: ClickUp creds + localhost redirect, Supabase URL/anon/service_role,
`TOKEN_ENCRYPTION_KEY`, `LLM_API_KEY` (+ `LLM_MODEL`), and `DEV_CLICKUP_TOKEN` (Misho's personal
token). `LLM_WORKSPACE_ID` is **blank** (see open issues).

---

## 9. How to run

**Prototype**
```
cd prototype
npm install
npm run dev                # http://localhost:5173  (add ?demo=1 for slow-motion recording)
npm run worksheet          # regenerate the scoring worksheet PDF
```

**App (real mode)**
```
cd app
npm install
npm run dev                # http://localhost:3000   (reads app/.env.local)
npx inngest-cli dev        # background jobs (dev server on :8288) — required for scans
npm test                   # scoring engine + PDF tests
```
- To preview the mock demo instead of real data: set `NEXT_PUBLIC_MOCK=1` in `app/.env.local`.
- Real flow: open http://localhost:3000 → (dev) **Connect with personal token** → pick workspace →
  **Run audit** → report.

---

## 10. Verified state

- Real scan of **SHARPFLOW CONSULTING DEMO SPACE** (30 members, 21 Spaces, 113 Lists, 705 tasks):
  - **62/100 (Grade C)**, **6/7 categories measured** (Adoption & Activity = "Not measured"),
    **14 findings** (4 High).
  - Categories: Architecture 64 · Workflow 75 · Data & Governance 45 · Operational 60 ·
    Platform Utilisation 100 · Reporting Readiness 35.
  - Findings include: ownership coverage **16%**, due-date coverage **39%**, overdue **22%**,
    fragmented Lists **58%**, Custom Field completion **24%** (218 fields, 32% never filled),
    4 unused statuses.
- Branded **PDF** generates (HTTP 200, ~646 KB).
- `npm test` 11/11 green; `next build` clean (15 routes).

---

## 11. Open issues & next steps

1. **Platform Utilisation still 100** — because **Views aren't measured** (30% of its weight) and the
   **time-tracking band** (0.9% logged) doesn't trigger. Fix: read Views per Space
   (`GET /space/{id}/view`) and consider tightening the time-tracking threshold with Oli.
2. **Not yet measured:** inactive members, activity concentration, duplicate statuses,
   time-in-status (needs ClickApp), missing required fields, Docs/Goals/Custom Task Types.
3. **AI summary** currently falls back to templated text — needs Oli's Anthropic **workspace ID**
   (`LLM_WORKSPACE_ID`) or a workspace-scoped key.
4. **ClickUp OAuth is broken on ClickUp's side** ("Unable to authorize your teams" — ClickUp support
   confirmed). We use the **dev-token** path locally. Keep OAuth for production; re-test later / on a
   real HTTPS domain.
5. **Still needed from Oli:** the **CRM List** for leads, the **domain** decision, and the
   **production redirect URL** (at deploy). All secret values were shared in chat — consider rotating
   before launch.
6. **Deploy** on Vercel (Root Directory = `app`) + Supabase + Inngest; add the prod redirect URL.

---

## 12. Communication history (summary)

1. Misho applied to Oli's job with a proposal ($400).
2. Oli sent his full MVP spec (ClickUp doc) and asked to confirm feasibility within the rate.
3. Misho built a **branded Vite prototype** and sent walkthrough videos; Oli: *"That looks awesome"*,
   asked for **full branding** ("look like my website") and **drill-down** ("click 23 dormant lists → see which lists").
4. Rebuilt in Sharpflow branding (green/lime/magenta, Poppins/Inter/Montserrat Alternates, real logos,
   Sapphire badge, gradients) + added drill-down, email capture + Calendly CTA. Oli: *"I love the branding"*.
5. Oli sent an **offer**; Misho accepted. Oli clarified the **freebie** model.
6. Misho sent a **scoring worksheet**; Oli completed it and returned it (final model).
7. Setup: GitHub, Supabase, Inngest, ClickUp app, Vercel — all under Sharpflow, Misho added.
8. Chosen hosting: **paid** (Vercel Pro + Supabase Pro) for reliability.
9. Built Phase B; ran the **first real scan**. ClickUp OAuth hit a **ClickUp platform bug**, bypassed
   with a dev personal token.
10. Oli confirmed both workspaces; demo audited first (he expected low results).

---

## 13. Gotchas & conventions

- ⚠️ **Do not edit UTF-8 files with PowerShell `Get-Content`/`Set-Content`** — it corrupts em dashes
  and other non-ASCII (turns them into `�?"`). Use the editor/edit tool. (This bit us twice.)
- ⚠️ Do **not** run `next build` while `next dev` is running — it clobbers `.next` and breaks the
  dev server (restart dev afterwards).
- **Browser automation:** clicking via refs/`find … click` is flaky for some buttons; use a direct DOM
  click via `eval`, or hit the API directly (`POST /api/scans`).
- The **repo is public** (Oli's choice) — keep secrets out of it.
- `SUPABASE_SERVICE_ROLE_KEY` has full DB access — server-side only.
- `.env*` is gitignored. Never commit secrets.

---

## 14. Links & IDs

- **Upwork job:** https://www.upwork.com/jobs/~022106474084368307973
- **Upwork MCP `org_uid`:** `1891956117832253066` (use `upwork_upwork__*` tools: `list_accounts`,
  `get_messages` with `room_id room_b0cebea6c048fc17a6addb6205bf3683`, etc.)
- **GitHub:** https://github.com/oli493/sharpflow-clickup-health-works
- **Supabase dashboard:** https://supabase.com/dashboard/project/iijehqonmdfhsutkbwsz
- **ClickUp API docs:** https://developer.clickup.com
- **Vercel:** https://vercel.com · **Inngest:** https://app.inngest.com
- **Calendly (CTA):** https://calendly.com/oli-sharpflowconsulting/clickup-health-discussion

---

## 15. Asset inventory

- Brand assets (prototype + app `public/brand/`): `logo-mark.jpg`, `logo-wordmark.png`, `partner-badge.png`.
- `prototype/docs/`: blank + **COMPLETED** scoring worksheet PDFs, `scoring-answers.json`.
- Oli's completed worksheet is a **real file on disk** — reachable from any new chat on this machine.
