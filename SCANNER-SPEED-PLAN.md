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
| Requests | - | 1,739 |
| Average latency | - | 903 ms |
| Detected rate limit | - | 10,000/min |
| Peak heap | - | **730 MB** |
| Total time | ~32-45 min | **9.7 min** |

The first high-concurrency version (4 Lists x 16 pages) reached 6.9 min locally but OOMed on Vercel at 2 GB.
The memory-safe version uses 4 Lists x 4-page windows, processed with bounded memory:

- 2 Lists x 4 pages: 11.8 min, 699 MB peak
- 3 Lists x 4 pages: 9.8 min, 760 MB peak
- 4 Lists x 4 pages: **9.7 min, 730 MB peak**

4 Lists x 4 pages is the default. It stays well under the 2 GB Vercel limit.

The parallel path was compared against a cached sequential run (`CLICKUP_PAGE_WINDOW=1`):
both produced the same task count and the same score, so parallel pagination is not dropping
or duplicating tasks.

Score change 75 to 73 is data drift plus a threshold crossing:
`fragmentedListsPct` moved from ~24.87% to ~25.13%, crossing the 25% Medium threshold.
This is a model sensitivity, not a data-loss bug.

## Validation

Memory-capped run (`NODE_OPTIONS=--max-old-space-size=2048`, 4 Lists x 4 pages, no cache):

- Score **75/100 (B)**
- 382/382 Lists, 81,352 tasks, 0 failed, 0 truncated
- Peak heap **730 MB**
- Total time **9.7 min**

A previous end-to-end run on the branch verified the report page, PDF (~444 KB) and all repaired
drill-downs; the final memory-safe configuration will be live-tested after deploy/resync.

## Remaining

- Merge correctness + speed
- Wait for Vercel deploy
- Resync Inngest (skip Override Input)
- Run the live Eyes On smoke scan and delete the test scan