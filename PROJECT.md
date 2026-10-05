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

## 9. Scoring engine principles

- **Deterministic** — scores come from the engine, never from the LLM.
- **Layered** — Raw Data → Metrics → Findings → Scores → Recommendations (each layer independent
  so thresholds can change without re-collecting data).
- **Configurable** — rules, weights, thresholds and severities are configuration, not code;
  additive rules without a rebuild.
- **AI scope** — explains and summarises; must remain grounded in actual findings.

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
  - `DATABASE_URL`
  - `LLM_API_KEY` (OpenAI or Anthropic)
  - `LEAD_CAPTURE_WEBHOOK` (optional — CRM/email destination)

---

## 13. Tech stack & architecture

**Phase A — prototype (this repo, `sharpflow-health-demo/`)**
- Vite + React 18 + TypeScript + Tailwind + framer-motion + React Three Fiber.
- Sample data; no backend. For design sign-off and the walkthrough video.

**Phase B — production app (separate Next.js codebase)**
- **Next.js (App Router) + TypeScript.**
- **Postgres** (Supabase/Neon) + ORM.
- **Background scan worker / queue** (pagination, rate-limit handling, retries).
- **Deterministic scoring engine** + configurable rules.
- **AI layer** (OpenAI/Claude) for explanations only.
- ClickUp **OAuth** integration.
- Branded **PDF** export; deploy on **Vercel**.

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
- [ ] Exact scoring methodology, weights and thresholds — to be defined with Sharpflow.
- [ ] Lead destination (email inbox / CRM / webhook) — to confirm.
- [ ] PDF export template details — to confirm.

---

## 16. Config reference

`.env.example` lists the required variable **names** only. No secrets are stored in this repository.

## 17. Documents

- **`docs/Sharpflow-ClickUp-Health-Scoring-Worksheet.pdf`** — fillable scoring worksheet for Sharpflow (weights, thresholds, severities, definitions). Regenerate with `npm run worksheet` (source: `scripts/generate-scoring-worksheet.mjs`).
- **CTA link** — the "Book a call" button points to the Calendly link: `https://calendly.com/oli-sharpflowconsulting/clickup-health-discussion`.

