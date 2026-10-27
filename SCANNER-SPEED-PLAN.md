# Scanner Speed Plan

Branch: `perf/scan-tuning`
Status: tuned and validated; ready for merge approval
Live: `main` is on v1.4 (4 Lists x 6 pages, ~9.6 min)

## Goal

Full-coverage Eyes On scans should finish under 10 minutes while staying safely under the
2 GB Vercel function limit. No 4 GB upgrade unless necessary.

## What changed

- Adaptive `RateGovernor` driven by ClickUp `X-RateLimit-*` headers
- Bounded `mapWithConcurrency` helper
- Per-List scanning in `lib/scan/tasks.ts`
- 4 Lists processed concurrently
- Configurable task-page windows, memory-safe defaults
- Parallel structure discovery and comment sampling
- Retry on truncated/invalid JSON
- Heap peaking telemetry in `ScanResult.dataQuality`

## Tuning results

All runs used `NODE_OPTIONS=--max-old-space-size=2048`, no cache, full Eyes On workspace.

| Config (Lists x pages) | Time | Peak heap | Result |
|---|---:|---:|---|
| 2 x 4 | 11.8 min | 699 MB | Passed |
| 3 x 4 | 9.8 min | 760 MB | Passed |
| 4 x 4 (live v1.3) | 9.7 min | 730 MB | Passed |
| 6 x 4 | 10.4 min | 727 MB | Slower |
| **4 x 6** | **8.3 min** | **977 MB** | **Winner** |
| 4 x 8 | 8.8 min | 952 MB | Slower than 4x6 |

The original 4 x 16 version reached 6.9 min locally but OOMed at 2 GB. The 4 x 6 version is the
fastest memory-safe configuration on the 2 GB plan.

## Validation

Memory-capped run (`--max-old-space-size=2048`, 4 Lists x 6 pages, no cache):

- Score **75/100 (B)**
- 382/382 Lists, 81,357 tasks, 0 failed, 0 truncated
- Peak heap **977 MB**
- Total time **8.3 min**
- No 429s, no retries

The parallel path matches the validated score and task counts. The score change from the old
baseline is data drift plus the fragmented-list threshold, not data loss.

## Live validation

After merge, Vercel deploy and Inngest resync:

- Live Eyes On scan completed in **~9.6 minutes**
- Score **75/100 (B)**, 16 findings
- 382/382 Lists, 81,357 tasks, 0 failed, 0 truncated
- Peak heap **628 MB** on the 2 GB plan
- Report page, PDF (~444 KB) and all repaired drill-downs verified
- Test scan, 16 findings, 382 list_stats and 12 sample datasets deleted afterward

## Status

Merged and live. 2 GB Standard; no 4 GB upgrade needed.
