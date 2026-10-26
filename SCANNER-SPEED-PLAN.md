# Scanner Speed Plan

Branch: `perf/scan-throughput`
Status: implemented and validated; ready for merge approval
Live: `main` remains on the rolled-back 15-18 minute scanner until this branch is merged

## Goal

Full-coverage scans on Eyes On should finish comfortably under 10 minutes, ideally 3-6 minutes.

## What changed

- Adaptive `RateGovernor` driven by ClickUp `X-RateLimit-*` headers
- Bounded `mapWithConcurrency` helper
- Task page windows: fetch up to 16 pages per List in parallel
- Per-List scanning moved to `lib/scan/tasks.ts`
- Four Lists processed concurrently inside each step
- Structure discovery in parallel (4 Spaces per step, folders in parallel)
- Comments fetched in parallel (concurrency 6)
- Retry on truncated/invalid JSON responses
- Scan telemetry in `ScanResult.dataQuality` (dry-run validation)

## Measured on Eyes On

| Metric | Before | Final |
|---|---:|---:|
| Lists | 383 | 383 |
| Tasks | 81,346 | 81,340 |
| Failed Lists | 0 | 0 |
| Requests | - | 2,720 |
| Average latency | - | 717 ms |
| Detected rate limit | - | 10,000/min |
| Total time | ~32-45 min | **6.9 min** |

A 6-List / 12-page setting measured slower (7.3 min), so the default is 4 Lists / 16 pages.

The parallel path was compared against a cached sequential run (`CLICKUP_PAGE_WINDOW=1`):
both produced the same task count and the same score, so parallel pagination is not dropping
or duplicating tasks.

Score change 75 to 73 is data drift plus a threshold crossing:
`fragmentedListsPct` moved from ~24.87% to ~25.13%, crossing the 25% Medium threshold.
This is a model sensitivity, not a data-loss bug.

## End-to-end validation

- Local Next.js + Inngest dev server + real Supabase persistence
- Scan `4255f305-a3d6-4be6-b2dc-22215a24a44b` completed **73/100 (C)**, 17 findings
- 383/383 Lists, 81,340 tasks, no truncated or failed Lists
- Report page, PDF (~444 KB) and all repaired drill-downs verified
- Test scan, findings, 383 list_stats and 12 sample datasets deleted afterward
- Production UI untouched

## Remaining

- Merge correctness + speed together after approval
