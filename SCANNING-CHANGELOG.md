# Scanning changelog

## v1.1 — scanner correctness

Branch: `fix/scanner-correctness`

Corrects the data collection layer without changing the agreed scoring model.

### Fixed

- Due-date, ownership and estimate coverage now use **open tasks**, not all tasks.
- Lists are read to their final page. No silent 4,000-task cap; a 400-page safety cap is recorded
  in `dataQuality.truncated`.
- New/empty Lists and Spaces are no longer counted as dormant 90d+.
- Distinct workflows are counted from unique status signatures, not Space count.
- Unused statuses and statuses-per-workflow are calculated per workflow.
- Custom-field bloat and “0% filled” include configured fields that never appear on a task.
- Comment frequency is sampled across Lists and filtered to the last 30 days.
- Activity concentration uses recent activity, not historical task volume.
- Time tracking uses workspace time entries for the last 90 days; falls back to “any time logged”
  with an explicit label.
- Partial failures are recorded. Material missing data fails the scan instead of publishing a
  misleading score.
- Drill-downs now cover custom fields, unused statuses, fragmented lists, missing owners and the
  correct stale/dormant tiers.
- Report shows partial/sampled/truncated coverage and measured signal counts.

### Expected score movement

Scores can move because the scanner is now more accurate. Expected directions:

- Reporting Readiness may rise as false coverage findings disappear.
- Architecture and Adoption may rise as false dormant findings disappear.
- Governance may fall as unused custom fields are counted.
- Operational and Platform Utilisation may move where task truncation previously hid data.

Every change should be explainable by one of the fixes above.

### Validation

- `npm run typecheck`
- `npm test` — 56 passing, 1 validation test skipped by default
- `npm run build`
- Real-workspace run on **Eyes On** (383 Lists, 81,346 tasks):
  - baseline **76 (B)** → branch **75 (B)**
  - full coverage, 383/383 Lists, 0 failures, 31/32 signals
  - Architecture 87 → 88 (dormant fix)
  - Reporting 48 → 45 (open-task due-date coverage is genuinely lower than
    the old all-task number)
  - Workflow restored to 100 after reporting the worst workflow instead of
    summing unused statuses across workflows
  - tasks scanned rose from ~55,947 (old 4,000/List cap) to 81,346 (full)
- Full end-to-end worker test on the same workspace:
  - report page, PDF, and all repaired drill-downs verified
  - test scan and child rows deleted afterwards
- Cached validation runs complete in ~2 minutes via the opt-in
  `CLICKUP_CACHE_DIR`; the cache is never enabled in production.

### Not included

- Production environment, domain, key rotation or database migrations.

## v1.2 — scan throughput (work in progress)

Branch: `perf/scan-throughput`

- Adaptive rate governor using ClickUp `X-RateLimit-*` headers
- Task page windows (parallel pagination)
- Parallel structure discovery and comment sampling
- Prefetch of custom fields and first task pages
- Retry on truncated/invalid JSON
- Request/latency/rate-limit telemetry in `dataQuality`

Measured on Eyes On: full 383/383 Lists, 81,340 tasks, 2,720 requests, 707 ms average latency,
**8.4 minutes** (down from ~32–45 minutes uncached). No failed Lists.

Validation: cached sequential (`CLICKUP_PAGE_WINDOW=1`) and parallel runs produced the same task
count and score, confirming no tasks were dropped by parallel pagination.

Still to do: List-level concurrency, target 3–6 minutes, full end-to-end test, then merge.
