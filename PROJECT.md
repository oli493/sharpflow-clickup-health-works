# Sharpflow ClickUp Health — Product & Build Spec

> Single source of truth for the Sharpflow ClickUp Health app. Maintained by Misho (freelancer) for Sharpflow Consulting (Oli Walker).
> **Nothing in this file should contain secrets** — credentials live in environment variables only.

---

## 1. Overview & purpose

A standalone web app that lets a customer securely connect their ClickUp workspace and receive a
fully automated **workspace health assessment** — an overall score, category scores, findings,
severities, recommendations and a polished dashboard.

**Business model:** a **free lead-generation tool ("freebie")** Sharpflow hands to prospects and
existing clients. It is branded entirely as Sharpflow and ends with a "Book a call" CTA, feeding
Sharpflow's pipeline. It is not sold per-seat.

---

## 2. Product model

- One **"Connect ClickUp"** button / public entry point.
- The customer (a **workspace owner/admin**) authorises their **own** workspace via ClickUp OAuth.
- They pick which workspace (and optionally exclude Spaces), the audit runs in the background, and
  they get their report.
- One Sharpflow-owned OAuth app serves all customers (no app review / listing gate required by ClickUp).

---

## 3. Goals & success metrics

- Low-friction: connect → report with no manual review by a Sharpflow consultant.
- Credible, defensible score (deterministic engine; AI only explains).
- Clear conversion path: email capture + "Book a call with Sharpflow".

---

## 4. User journey

1. **Access** — land on the Sharpflow-branded app.
2. **Connect** — ClickUp OAuth (read-only by behaviour).
3. **Workspace selection** — choose workspace; optionally exclude sandbox/template/archived Spaces.
4. **Run audit** — background scan (not reliant on the browser staying open).
5. **Scoring** — overall + 7 category scores, metrics, findings, severities, utilisation.
6. **Recommendations** — grounded in findings (AI may explain, never scores).
7. **Results dashboard** — interactive report with drill-down.
8. **CTA** — email capture + "Book a call with Sharpflow".

---

## 5. Scope

### MVP (Milestone 1 "Initial Product Demo & Build out" + Milestone 2 "Product Delivery & Handover")
- Sharpflow-branded UI matching sharpflowconsulting.com.
- ClickUp OAuth, workspace selection, Space exclusions.
- Background audit with progress stages.
- Deterministic scoring engine: raw data → metrics → findings → scores → recommendations.
- 7 categories + severity levels.
- AI explanations grounded in the engine.
- Results dashboard + **drill-down** into underlying data.
- Email capture + "Book a call with Sharpflow" CTA.
- Branded PDF export.

### Phase 2 (out of scope for the MVP — quoted separately)
Recurring/scheduled scans, historical score tracking, continuous monitoring, benchmarking, alerts,
subscription plans, advanced reporting, additional AI functionality, connectors beyond ClickUp + LLM.

---

## 6. Branding (mirror sharpflowconsulting.com)

**Fonts**
- Headers: **Poppins**
- Body: **Inter**
- Accent: **Montserrat Alternates**

**Colour tokens**
| Role | Hex |
| --- | --- |
| Dark green (base / text) | `#173435` |
| Green | `#24574E` |
| Mint | `#5FBA95` |
| Lime (accent) | `#DEF76E` |
| Magenta (primary CTA) | `#E01072` |
| White / off-white surfaces | `#FFFFFF` / `#F6F5F1` |
| Grayscale ramp | `#1A1A1A · #3F3F3F · #7A7A7A · #A9A9A9 · #E6E6E6 · #FFFFFF` |

**Backgrounds (two approved gradients, keep mixing subtle — avoid over-mixing)**
1. Soft pastel page wash — off-white + mint + rose.
2. Green→lime gradient — hero / report panels.

**Assets**
- Sharpflow wordmark (dark green "Sharp" + "flow" in a dark-green box, lime text).
- Sharpflow mark (lime "S" flow on dark green).
- **ClickUp Sapphire Partner 2026 badge** — displayed as a trust signal (lead-capture panel).
- ClickUp brand assets used only for the partner/badge context (https://clickup.com/brand); note ClickUp's own fonts differ (Plus Jakarta Sans / Inter / Sometype Mono) and are **not** used for the product UI.

**Reference:** https://sharpflowconsulting.com · Brand guidelines: Canva (sharpflow)

---

## 7. Report spec

- **Overall Health Score** (0–100) with a grade.
- **7 category scores:**
  1. Architecture & Structure
  2. Workflow Design
  3. Data & Governance
  4. Operational Health
  5. Adoption & Activity
  6. Platform Utilisation
  7. Reporting Readiness
- **Findings summary** (Critical / High / Opportunity counts).
- **Individual findings** — title, category, severity, supporting metric, explanation, recommendation.
- **Areas performing well** (positive section).
- **Platform Utilisation** matrix (detected / partial / not measurable — honest about the API).
- **AI executive summary** (streaming, grounded in the engine).
- **Configurable rules & thresholds** engine.
- **Branded PDF export**.

### Severity levels
Critical · High · Medium · Low · Opportunity/Recommendation.

---

## 8. Drill-down spec

Click a metric card, a finding, or a topology node to open a **drill-down drawer** showing the
underlying items (sample data in the prototype; live data from the ClickUp API in production).

- **Metric cards** — click metrics such as "Dormant Lists", "Overdue rate", "Custom Fields",
  "Quiet seats".
- **Findings** — "View the items" opens the affected records.
- **3D topology** — click a Space node to drill into that Space's Lists.
- Drawer features: search, column sort, CSV export, row count.

---

## 9. Scoring model (agreed with Sharpflow)

Oli completed the scoring worksheet and returned it; the final model is captured in
`docs/scoring-answers.json` and `docs/Sharpflow-ClickUp-Health-Scoring-Worksheet-COMPLETED.pdf`.

**Principles**
- **Deterministic** — scores come from the engine, never from the LLM.
- **Layered** — Raw Data → Metrics → Findings → Scores → Recommendations.
- **Configurable** — rules, weights, thresholds and severities are configuration, not code.
- **AI scope** — explains and summarises; grounded in actual findings only.
- **No double-counting** — each signal is scored in exactly one category.
- **Opportunity severity carries little/no score penalty.**
- **Coverage** — if the connecting user is not Owner/Admin, show a "limited coverage" banner (not scored).

### Category weights (total 100%)
| # | Category | Weight |
|---|---|---|
| 1 | Architecture & Structure | 15% |
| 2 | Workflow Design | 15% |
| 3 | Data & Governance | 15% |
| 4 | Operational Health | 20% |
| 5 | Adoption & Activity | 15% |
| 6 | Platform Utilisation | 10% |
| 7 | Reporting Readiness | 10% |

### Signals (signal weight within category · threshold → severity)
Feasibility: **✓** measurable · **~** partial/conditional · **✕** not exposed by the API.

**1. Architecture & Structure (15%)**
| Signal | API | W | Threshold → Severity |
|---|---|---|---|
| Avg tasks per List | ✓ | 15 | < 10 (median) → Low |
| Dormant Lists (no activity) | ✓ | 30 | > 20% of Lists → Medium |
| Fragmented Lists (< 5 tasks) | ✓ | 35 | > 25% of Lists → Medium |
| Hierarchy / folder sprawl | ✓ | 20 | > 20% empty Folders → Low |

**2. Workflow Design (15%)**
| Signal | API | W | Threshold → Severity |
|---|---|---|---|
| Statuses per workflow | ✓ | 25 | > 12 per workflow → Low |
| Unused statuses | ✓ | 25 | > 3 per workflow → Medium |
| Duplicate status names | ✓ | 20 | same name, different type → Medium |
| Avg time in a status | ~ | 30 | > 14d in an active status → Medium |

**3. Data & Governance (15%)**
| Signal | API | W | Threshold → Severity |
|---|---|---|---|
| Custom Field count (bloat) | ✓ | 20 | > 100 fields → Low |
| Custom Field completion rate | ✓ | 35 | < 50% where in scope → High |
| Fields never filled (0%) | ✓ | 25 | 0% filled in scope → Medium |
| Tasks missing required Custom Fields | ✓ | 20 | > 20% → Medium |

**4. Operational Health (20%)**
| Signal | API | W | Threshold → Severity |
|---|---|---|---|
| Overdue task rate | ✓ | 30 | > 15% → High · > 30% → **Critical** (tiered) |
| Stale tasks (no update 90d+) | ✓ | 25 | > 20% of open → High |
| Open subtasks under closed parents *(new)* | ✓ | 15 | > 2% of subtasks → Medium |
| Completion vs creation trend | ✓ | 15 | created > done over 3 months → Medium |
| Work-in-progress level | ✓ | 15 | > 15 open / person → Low |

**5. Adoption & Activity (15%)**
| Signal | API | W | Threshold → Severity |
|---|---|---|---|
| Inactive members *(was "inactive paid seats")* | ~ | 25 | > 15% of members → Medium |
| Guest vs member ratio *(new)* | ✓ | 15 | > 30% of users are guests → Medium |
| Activity concentration | ~ | 15 | > 80% in 1 Space → Low |
| Comment / update frequency | ✓ | 20 | < 1 per active user / week → Low |
| Dormant Spaces | ✓ | 25 | any (after exclusions) → Medium |

**6. Platform Utilisation (10%)** — scored subset only
| Signal | API | W | Threshold → Severity |
|---|---|---|---|
| Time tracking in use | ✓ | 35 | 0 logged in 90d → Opportunity |
| Views | ✓ | 30 | < 2 Views per Space → Low |
| Dependencies / Relationships | ✓ | 35 | none used → Low |
| Goals · Docs · Custom Task Types | ✓ | — | **insight only** (Opportunity, no score) |
| Dashboards · Automations · Whiteboards · Workload · AI · Integrations | ✕ | — | **not measured** — never penalised |

**7. Reporting Readiness (10%)**
| Signal | API | W | Threshold → Severity |
|---|---|---|---|
| Due-date coverage | ✓ | 30 | < 80% of open tasks → High |
| Ownership (assignee) coverage | ✓ | 30 | < 80% of open tasks → High |
| Estimate coverage | ✓ | 20 | < 40% of open tasks → Medium |
| Consistent statuses / workflow | ✓ | 20 | > 5 distinct workflows → Medium |

> **Notes:** due-date coverage and estimate coverage are scored **once, in Reporting Readiness only**
> (removed from Operational Health and Platform Utilisation to avoid double-counting). Weights for the
> three new signals were set by us and other signals in those categories rebalanced to keep totals at 100%.

### Definitions
| Term | Definition |
|---|---|
| Overdue | past due date AND status is not a Done **or** Closed type |
| Stale | open, no task update for 90 days |
| Dormant | no task activity for 90 days |
| Fragmented List | fewer than 5 open tasks |
| Active user | created / completed / commented in last 30 days |

---

## 10. ClickUp API integration

**Auth:** OAuth 2.0 (Authorization Code). Authorize URL `https://app.clickup.com/api`; token
`POST https://api.clickup.com/api/v2/oauth/token`. ClickUp has **no scopes** — the token inherits the
authorizing user's permissions, so the app **only ever reads**.

**Domain:** hierarchy (Spaces/Folders/Lists), Tasks, Custom Fields, Users/members, Views, Goals,
Docs, Time entries, Time in Status, Dependencies, Relationships, Custom Task Types, metadata.

**Must handle:** pagination, rate limits, failed requests/retries, large workspaces, API timeouts,
token management, permissions, missing data.

**Feasibility (Platform Utilisation)**
| Verdict | Capabilities |
| --- | --- |
| Reliably detectable | Views, Time Tracking, Time Estimates, Dependencies, Relationships, Custom Task Types, Goals, Docs, Custom Fields, hierarchy, users, task metadata |
| Conditional | Time in Status (needs ClickUp ClickApp enabled); Templates (task/list/folder only) |
| Not exposed by the public API | Forms (config), Automations, Dashboards, Whiteboards, Workload, ClickApps enabled-state, ClickUp AI usage, installed Integrations (only webhooks visible) |

> Score only what is verifiable; mark the rest "not measurable" so the score stays credible.

**Feasibility notes (from Oli's worksheet):**
- **Inactive members** is **partial** (`~`) — the API exposes roles, not billing; activity is inferred
  from tasks/comments (not logins).
- **Time in Status** requires the **Time in Status ClickApp** to be enabled (conditional).
- **Comment frequency** needs per-task calls on large workspaces → **sample** rather than read all.
- **"Unused Custom Fields (90d)"** became **"0% filled"** — value-change dates are not exposed.

---

## 11. Lead capture

- Email capture on the results ("Email me the report").
- Primary CTA: **"Book a call with Sharpflow"**.
- Sapphire Partner badge as a trust signal.

---

## 12. Data & security

- OAuth token stored per user, **encrypted at rest**.
- App is **read-only in behaviour** (states this on the connect screen).
- Secrets are **never** committed. Use environment variables only.
- Env var **names** (values live outside the repo / in the host's secret store):
  - `CLICKUP_CLIENT_ID`
  - `CLICKUP_CLIENT_SECRET`
  - `CLICKUP_REDIRECT_URI`
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `SUPABASE_DB_URL` (worker / direct connection)
  - `INNGEST_EVENT_KEY`
  - `INNGEST_SIGNING_KEY`
  - `LLM_API_KEY` (OpenAI or Anthropic)
  - `LEAD_CAPTURE_WEBHOOK` (optional — CRM/email destination)

---

## 13. Tech stack & architecture

**Phase A — prototype (this repo, `sharpflow-health-demo/`)**
- Vite + React 18 + TypeScript + Tailwind + framer-motion + React Three Fiber.
- Sample data; no backend. For design sign-off and the walkthrough video.

**Phase B — production app (`app/`)**
- **Next.js (App Router) + TypeScript + Tailwind** (brand tokens carried over from the prototype).
- **Supabase** — Postgres + file storage. Use the **connection pooler** for the serverless app; direct
  connection for the background worker.
- **Inngest** — background scan (paginated, rate-limit aware, retries, progress steps).
- **Deterministic scoring engine** + configurable rules (§9).
- **AI layer** (OpenAI/Claude) for explanations only.
- ClickUp **OAuth** integration (localhost redirect in dev; production redirect at deploy).
- Branded **PDF** export.
- **Deployed on Vercel** (+ Supabase + Inngest); OAuth redirect URL registered once deployed.

**Repo layout (monorepo, created on GitHub when Oli confirms):**
`prototype/` (this Vite demo) · `app/` (Next.js) · `docs/` · `scripts/` · `public/brand/`.
`git init` is already done locally.

---

## 14. Milestones

| # | Milestone | Amount |
| --- | --- | --- |
| 1 | Initial Product Demo & Build out | $200 |
| 2 | Product Delivery & Handover | $200 |

(Fixed price $400; offer accepted 04 Oct 2026.)

---

## 15. Open questions / decisions

- [x] Light theme to match the site — **decided**.
- [x] Sapphire badge (file) rather than Diamond (site) — **decided**.
- [x] Use both site gradients; keep mixing subtle — **decided**.
- [x] Scoring methodology, weights and thresholds — **defined** (Oli's completed worksheet; see §9).
- [x] Lead destination — Sharpflow's **ClickUp CRM** (target List to confirm at wiring time).
- [x] Book-a-call link — Calendly: `calendly.com/oli-sharpflowconsulting/clickup-health-discussion`.
- [x] Deployment stack — **Vercel + Supabase + Inngest**.
- [ ] GitHub repo — create a **monorepo under a Sharpflow org** when Oli confirms.
- [ ] Domain — subdomain `health.sharpflowconsulting.com` (Oli to confirm).
- [ ] Test workspace access (for live validation) — Oli to hand over.
- [ ] PDF export template details — to confirm.
- [ ] **Secret rotation** — the ClickUp client secret was shared in chat; rotate before/at deploy.

---

## 16. Config reference

`.env.example` lists the required variable **names** only. No secrets are stored in this repository.

## 17. Documents

- **`docs/Sharpflow-ClickUp-Health-Scoring-Worksheet.pdf`** — blank fillable worksheet. Regenerate with `npm run worksheet` (`scripts/generate-scoring-worksheet.mjs`).
- **`docs/Sharpflow-ClickUp-Health-Scoring-Worksheet-COMPLETED.pdf`** — Oli's completed version. Rebuild with `node scripts/fill-scoring-worksheet.mjs`.
- **`docs/scoring-answers.json`** — Oli's answers as data (source of truth for the engine config).
- **CTA link** — the "Book a call" button points to the Calendly link: `https://calendly.com/oli-sharpflowconsulting/clickup-health-discussion`.
- **Brand assets** — `public/brand/` (`logo-wordmark.png`, `logo-mark.jpg`, `partner-badge.png`).

