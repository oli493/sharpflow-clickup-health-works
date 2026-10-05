-- Sharpflow ClickUp Health — Supabase schema
-- Run in the Supabase SQL editor (or via `supabase db push`).

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- OAuth connections (one per customer who connects ClickUp)
-- ---------------------------------------------------------------------------
create table if not exists public.connections (
  id                uuid primary key default gen_random_uuid(),
  clickup_user_id   text not null,
  clickup_username  text,
  clickup_email     text,
  token_encrypted   text not null,           -- AES-256-GCM ciphertext, never the raw token
  workspaces        jsonb not null default '[]'::jsonb,  -- [{ id, name }]
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists connections_user_idx on public.connections (clickup_user_id);

-- ---------------------------------------------------------------------------
-- Scans (one per audit run)
-- ---------------------------------------------------------------------------
create table if not exists public.scans (
  id                uuid primary key default gen_random_uuid(),
  connection_id     uuid not null references public.connections(id) on delete cascade,
  team_id           text not null,           -- ClickUp workspace id
  workspace_name    text,
  status            text not null default 'queued',  -- queued | running | complete | failed
  started_at        timestamptz,
  finished_at       timestamptz,
  overall_score     integer,
  grade             text,
  metrics           jsonb,                   -- raw metric values
  category_scores   jsonb,                   -- per-category scores + findings snapshot
  error             text,
  created_at        timestamptz not null default now()
);

create index if not exists scans_connection_idx on public.scans (connection_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Findings (one row per finding in a scan)
-- ---------------------------------------------------------------------------
create table if not exists public.findings (
  id              uuid primary key default gen_random_uuid(),
  scan_id         uuid not null references public.scans(id) on delete cascade,
  signal_key      text not null,
  category_key    text not null,
  category_name   text not null,
  title           text not null,
  severity        text not null,             -- critical | high | medium | low | opportunity
  metric_value    double precision,
  threshold       text,
  created_at      timestamptz not null default now()
);

create index if not exists findings_scan_idx on public.findings (scan_id);

-- ---------------------------------------------------------------------------
-- Leads (email capture on the results page)
-- ---------------------------------------------------------------------------
create table if not exists public.leads (
  id          uuid primary key default gen_random_uuid(),
  scan_id     uuid references public.scans(id) on delete set null,
  email       text not null,
  source      text default 'results',
  created_at  timestamptz not null default now()
);

create index if not exists leads_created_idx on public.leads (created_at desc);

-- Row Level Security: the app uses the service-role key (bypasses RLS);
-- enable RLS so nothing is exposed to anon keys by default.
alter table public.connections enable row level security;
alter table public.scans       enable row level security;
alter table public.findings    enable row level security;
alter table public.leads       enable row level security;
