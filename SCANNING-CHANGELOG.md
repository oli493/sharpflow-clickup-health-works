# Scanning changelog

## v1.1 Ã¢â‚¬â€ scanner correctness

Branch: `fix/scanner-correctness`

Corrects the data collection layer without changing the agreed scoring model.

### Fixed

- Due-date, ownership and estimate coverage now use **open tasks**, not all tasks.
- Lists are read to their final page. No silent 4,000-task cap; a 400-page safety cap is recorded
  in `dataQuality.truncated`.
- New/empty Lists and Spaces are no longer counted as dormant 90d+.
- Distinct workflows are counted from unique status signatures, not Space count.
- Unused statuses and statuses-per-workflow are calculated per workflow.
- Custom-field bloat and Ã¢â‚¬Å“0% filledÃ¢â‚¬Â include configured fields that never appear on a task.
- Comment frequency is sampled across Lists and filtered to the last 30 days.
- Activity concentration uses recent activity, not historical task volume.
- Time tracking uses workspace time entries for the last 90 days; falls back to Ã¢â‚¬Å“any time loggedÃ¢â‚¬Â
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
- `npm test` Ã¢â‚¬â€ 56 passing, 1 validation test skipped by default
- `npm run build`
- Real-workspace run on **Eyes On** (383 Lists, 81,346 tasks):
  - baseline **76 (B)** Ã¢â€ â€™ branch **75 (B)**
  - full coverage, 383/383 Lists, 0 failures, 31/32 signals
  - Architecture 87 Ã¢â€ â€™ 88 (dormant fix)
  - Reporting 48 Ã¢â€ â€™ 45 (open-task due-date coverage is genuinely lower than
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
## v1.2 - scan throughput

Branch: `perf/scan-throughput`

- Adaptive rate governor using ClickUp `X-RateLimit-*` headers
- Bounded parallel task-page windows
- Per-List scanning moved to `lib/scan/tasks.ts`
- Four Lists processed concurrently with 4-page windows, memory-safe defaults
- Parallel structure discovery and comment sampling
- Retry on truncated/invalid JSON
- Heap and request telemetry in validation

Final memory-capped run on Eyes On (`--max-old-space-size=2048`, 4 Lists x 4 pages):

- Score **75/100 (B)**
- 382/382 Lists, 81,352 tasks, 0 failed, 0 truncated
- Peak heap **730 MB**
- Total time **9.7 minutes**

The earlier 6.9-minute version used 4 Lists x 16 pages and OOMed on Vercel at 2 GB.
The memory-safe version stays well under 2 GB.

Live validation after merge and Inngest resync: **~10.5 minutes**, score **75/100 (B)**,
382/382 Lists, 81,357 tasks, peak heap **511 MB** on 2 GB, 0 failed, 0 truncated.
Report, PDF and all repaired drill-downs verified; the test scan and child rows were deleted.
## v1.3 - scanner tuning

Branch: `perf/scan-tuning`

- Increased task-page windows from 4 to 6 while keeping 4 Lists concurrent
- Stayed on the 2 GB Standard Vercel plan
- Memory-capped Eyes On run: **8.3 minutes**, peak heap **977 MB**
- Score **75/100 (B)**, 382/382 Lists, 81,357 tasks, 0 failed, 0 truncated
- No 429s and no retries
- 4 x 8 was slower (8.8 min); 6 x 4 was slower (10.4 min)
- No 4 GB upgrade required
Live validation of v1.4: **~9.6 minutes**, score **75/100 (B)**, 382/382 Lists,
81,357 tasks, peak heap **628 MB** on 2 GB, 0 failed, 0 truncated.
Report, PDF and all repaired drill-downs verified; the test scan and child rows were deleted.