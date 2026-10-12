# Sharpflow ClickUp Health

**Live:** https://health.sharpflowconsulting.com · **Sample report:** https://health.sharpflowconsulting.com/sample

A self-serve web app that connects a customer's ClickUp workspace (read-only OAuth) and produces an
automated **workspace health assessment** — an overall 0–100 score, seven weighted category scores,
prioritised findings with recommendations, an AI executive summary, and a branded PDF. Built for
**Sharpflow Consulting** as a lead-generation tool: prospects run it themselves and end on a
"Book a call" call-to-action.

Scores come from a **deterministic scoring engine**; the AI only explains the results, it never sets them.

---

## Repository layout

```
app/                     Next.js production app (the deployed product)
prototype/               Vite + React branded clickable demo — design sign-off & walkthroughs
handover/                Handover docs (operator runbook, lead-magnet playbook)
HANDOFF.md               Full project context / source of truth
PROJECT.md               Product & build spec (scope, branding, scoring model, stack)
README.md                This file
```

---

## Getting started

Requires **Node.js 20+**.

### App (Next.js) — the product

```
cd app
npm install
cp .env.example .env.local      # then fill in values — never commit secrets
npm run dev                     # http://localhost:3000
npx inngest-cli dev             # in a second terminal — background scan worker (port 8288)
```

The app runs against **sample (mock) data** in development by default. Set `NEXT_PUBLIC_MOCK=0`
(with the environment configured) to use the real ClickUp + Supabase path.

Useful commands:

```
npm run typecheck    # tsc --noEmit
npm test             # vitest — scoring engine + PDF
npm run build        # next build (don't run while `next dev` is running)
```

### Prototype (Vite)

```
cd prototype
npm install
npm run dev             # http://localhost:5173 (add ?demo=1 for slow-motion recording)
npm run worksheet       # regenerate the scoring worksheet PDF
```

---

## Deployment

- **Host:** Vercel — the project tracks `main`, so **every push to `main` auto-deploys production**.
- **Background worker:** Inngest Cloud runs the scan function (synced from `/api/inngest`).
- **Database / auth:** Supabase (Postgres) — tokens are encrypted at rest; leads and scans are stored here.
- **Domain:** `health.sharpflowconsulting.com` (CNAME → Vercel).

See [`handover/Runbook.md`](./handover/Runbook.md) for the day-to-day operator guide.

---

## Stack

- **App:** Next.js (App Router) · TypeScript · Tailwind · Supabase · Inngest · pdf-lib · Anthropic (Claude).
- **Prototype:** Vite · React · TypeScript · Tailwind · framer-motion · React Three Fiber.
- **Hosting:** Vercel + Supabase + Inngest.

---

## Security

- **Read-only** ClickUp OAuth (no scopes — the token inherits the authorising user's read permissions).
- Workspace tokens are **encrypted at rest** (AES-256-GCM).
- **No secrets in the repo** — everything lives in `.env.local` / host env vars (`.env*` is gitignored).

---

## Documentation

- [`HANDOFF.md`](./HANDOFF.md) — complete project context (client, architecture, scoring model, gotchas).
- [`PROJECT.md`](./PROJECT.md) — product & build spec.
- [`handover/Runbook.md`](./handover/Runbook.md) — run/deploy/troubleshoot guide.
- [`handover/Lead-Magnet-Playbook.md`](./handover/Lead-Magnet-Playbook.md) — how to use the tool to win clients.
