# Scanner Speed Plan

Branch: `perf/scan-throughput`
Status: first iteration implemented and measured; list-level concurrency still to do
Live: `main` remains on the rolled-back 15–18 minute scanner until this branch is validated

## Goal

Full-coverage scans on Eyes On should finish comfortably under 10 minutes, ideally 3–6 minutes.

## First iteration — implemented

- Adaptive `RateGovernor` driven by ClickUp `X-RateLimit-*` headers
- Bounded `mapWithConcurrency` helper
- Task page windows: fetch up to 16 pages per List in parallel
- Prefetch custom fields and first task page across the batch (concurrency 12)
- Structure discovery in parallel (4 Spaces per step, folders in parallel)
- Comments fetched in parallel (concurrency 6)
- Retry on truncated/invalid JSON responses
- Request/latency/rate-limit telemetry stored in `ScanResult.dataQuality`

## Measured on Eyes On

| Metric | Before | First iteration |
|---|---:|---:|
| Lists | 383 | 383 |
| Tasks | 81,346 | 81,340 |
| Failed Lists | 0 (with cache run) | 0 |
| Requests | — | 2,720 |
| Average latency | — | 707 ms |
| Detected rate limit | — | 10,000/min |
| Total time | ~32–45 min | **8.4 min** |

The page-window path was compared against a cached sequential run (`CLICKUP_PAGE_WINDOW=1`):
both produced the same task count and the same score, so the parallelisation is not dropping
or duplicating tasks.

Score change 75 → 73 is data drift plus a threshold crossing:
`fragmentedListsPct` moved from ~24.87% to ~25.13%, crossing the 25% Medium threshold.
This is a model sensitivity, not a data-loss bug.

## Next iteration

- Move per-List scanning into `lib/scan/tasks.ts`
- Run 3–4 Lists concurrently inside each step
- Keep page windows inside each List
- Aggregate per-List partials in the existing merge path
- Re-measure; target 3–6 minutes
- Re-run the cached sequential-vs-parallel comparison
- Run the full end-to-end worker test
- Then merge correctness + speed together
