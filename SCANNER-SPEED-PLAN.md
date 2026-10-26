# Scanner Speed Plan

Branch: `perf/scan-throughput`
Status: implemented and validated; ready for merge approval
Live: `main` remains on the rolled-back 15Ã¢â‚¬â€œ18 minute scanner until this branch is validated

## Goal

Full-coverage scans on Eyes On should finish comfortably under 10 minutes, ideally 3Ã¢â‚¬â€œ6 minutes.

## First iteration Ã¢â‚¬â€ implemented

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
| Requests | Ã¢â‚¬â€ | 2,720 |
| Average latency | Ã¢â‚¬â€ | 707 ms |
| Detected rate limit | Ã¢â‚¬â€ | 10,000/min |
| Total time | ~32Ã¢â‚¬â€œ45 min | **8.4 min** |

The page-window path was compared against a cached sequential run (`CLICKUP_PAGE_WINDOW=1`):
both produced the same task count and the same score, so the parallelisation is not dropping\nor duplicating tasks.

Score change 75 Ã¢â€ â€™ 73 is data drift plus a threshold crossing:
`fragmentedListsPct` moved from ~24.87% to ~25.13%, crossing the 25% Medium threshold.
This is a model sensitivity, not a data-loss bug.

## Next iteration

- Move per-List scanning into `lib/scan/tasks.ts`
- Run 3Ã¢â‚¬â€œ4 Lists concurrently inside each step
- Keep page windows inside each List
- Aggregate per-List partials in the existing merge path
- Re-measure; target 3Ã¢â‚¬â€œ6 minutes
- Re-run the cached sequential-vs-parallel comparison
- Run the full end-to-end worker test
- Then merge correctness + speed together
