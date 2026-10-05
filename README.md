# Sharpflow ClickUp Health

A standalone web app that connects a customer's ClickUp workspace and produces an automated
**workspace health assessment** — an overall score, category scores, findings, recommendations and
a polished dashboard. Built for **Sharpflow Consulting** as a branded, self-serve tool.

Full spec and decisions live in [`PROJECT.md`](./PROJECT.md).

## Repo layout

```
prototype/   Vite + React branded clickable demo (sample data) — design sign-off & walkthroughs
app/         Phase B: Next.js production app (ClickUp OAuth, scan, scoring engine, report)
PROJECT.md   Product & build spec (scope, branding, scoring model, stack)
```

## Getting started

### Prototype (Vite)
```
cd prototype
npm install
npm run dev            # http://localhost:5173 (add ?demo=1 for slow-motion recording)
npm run worksheet      # regenerate the scoring worksheet PDF
```

### App (Next.js)
```
cd app
npm install
cp .env.example .env.local     # fill in values (never commit)
npm run dev                    # http://localhost:3000
npx inngest-cli dev            # background jobs (dev)
npm test                       # scoring engine + PDF tests
```

The app runs on **sample (mock) data** by default in development. Set `NEXT_PUBLIC_MOCK=0` (with the
environment configured) to use the real ClickUp + Supabase path.

## Stack

- **Prototype:** Vite, React, TypeScript, Tailwind, framer-motion, React Three Fiber.
- **App:** Next.js (App Router), TypeScript, Tailwind, Supabase (Postgres), Inngest, pdf-lib.
- **Deploy:** Vercel + Supabase + Inngest.

## Security

- Secrets live in `.env.local` / host env vars only — **never committed** (`.env*` is gitignored).
- The app uses ClickUp **read-only** OAuth; workspace tokens are encrypted at rest (AES-256-GCM).
