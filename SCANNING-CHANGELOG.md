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
- `npm test` — 40 tests
- `npm run build`
- Manual review on a real workspace before merge.

### Not included

- Speed/concurrency work.
- Production environment, domain, key rotation or database migrations.
