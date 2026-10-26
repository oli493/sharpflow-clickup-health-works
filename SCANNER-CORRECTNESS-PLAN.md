# Sharpflow Scanner Correctness — Implementation Plan

> Status: IMPLEMENTED — awaiting real-workspace A/B validation and merge approval
> Branch: `fix/scanner-correctness`
> Base: `main` @ `4b218f1`
> Merge: ONLY after Misho explicitly says “merge”
> Scope: correctness only. Speed/concurrency work is a separate branch.

---

## 0. Non-negotiable guardrails

- Do NOT merge to `main` until explicitly instructed.
- Do NOT push directly to `main`.
- Do NOT change production env vars.
- Do NOT change the production domain or DNS.
- Do NOT change the production ClickUp OAuth callback.
- Do NOT run Supabase migrations against production.
- Do NOT rotate ClickUp/Anthropic keys as part of this work.
- Do NOT run test scans against the production Supabase database.
- Do NOT commit client workspace data, tokens, or secrets into fixtures/docs.
- Do NOT mix speed/concurrency changes into this branch.

The live site is the Vercel deployment of `main`. A branch and PR do not touch it.

---

## 1. Why this work exists

The scoring engine is solid and deterministic. The data collection layer has
several edge-case errors that can materially change the score:

1. Reporting coverage uses all tasks instead of open tasks.
2. Lists over 4,000 tasks are silently truncated.
3. New/empty Lists and Spaces are counted as dormant 90d+.
4. “Distinct workflows” is actually the number of Spaces.
5. Some drill-downs are empty or show the wrong dataset.
6. Partial scan failures can silently undercount.
7. Several metrics are sampled/proxied without disclosure.

Goal: make the scanner trustworthy on large and unusual workspaces, without
changing the agreed scoring model beyond correcting its implementation.

---

## 2. Current state

- Live: https://health.sharpflowconsulting.com
- Sample: https://health.sharpflowconsulting.com/sample
- Repo: `oli493/sharpflow-clickup-health-works` (public)
- Canonical local repo: `sharpflow-health-demo`
- HEAD at branch start: `4b218f1`
- Tests at branch start: 26 passing
- CI at branch start: none
- Vercel: every push to `main` auto-deploys production
- Inngest: `scan-workspace` runs the scan
- Supabase: connections, scans, findings, leads, list_stats, scan_samples
- Scanner caps at branch start:
  - `PAGE_BUDGET = 25` pages per step
  - `SPACE_BATCH = 2`
  - `maxPages = 40` per List (4,000 tasks) — silent
  - `SAMPLE_LIST_LIMIT = 1000` Lists — silent
  - `SAMPLE_ROWS = 100` drill rows
  - `COMMENT_SAMPLE = 60` tasks
  - request timeout 30s
  - step maxDuration 300s
  - stale-scan reaper 45 min

---

## 3. Source of truth

- Oli’s completed scoring worksheet: `prototype/docs/scoring-answers.json`
- Product/spec: `PROJECT.md`
- Engine: `app/src/lib/scoring/model.ts`, `app/src/lib/scoring/engine.ts`
- Scan orchestration: `app/src/inngest/scan.ts`
- ClickUp client: `app/src/lib/clickup/client.ts`
- Report mapping: `app/src/lib/report/map.ts`
- Drill metadata: `app/src/lib/drill.ts`
- Drill route: `app/src/app/api/scans/[id]/drill/[key]/route.ts`

Definitions to enforce:
- Overdue = past due AND status not Done/Closed.
- Stale = open, no task update for 90 days.
- Dormant = no task activity for 90 days.
- Fragmented List = fewer than 5 open tasks.
- Active user = created/completed/commented in 30 days.
- Due-date/ownership/estimate coverage = % of OPEN tasks.
- Distinct workflows = number of distinct status workflows, not Spaces.

---

## 4. Branch and release workflow

1. Confirm `main` is clean and at `4b218f1`.
2. Create `fix/scanner-correctness` from `origin/main`.
3. Keep `main` untouched.
4. Commit atomically; one concern per commit.
5. Open a draft PR.
6. Add CI on PR: `typecheck` + `test`.
7. Validate with unit/golden tests and real A/B scans.
8. Report results and STOP.
9. Merge only after explicit approval.
10. After merge: Vercel auto-deploy, Inngest sync, live smoke test.

No production config changes are required for this branch.

---

## 5. Baseline capture (before any code changes)

Run current `main` on:
- EES Agency
- Eyes On
- Sharpflow demo
- Studio Eleven54

Record:
- scan ID
- overall score + grade
- 7 category scores
- findings count + severity breakdown
- coverage (categories/signals)
- duration
- task count / list count
- any failed/truncated lists

Store real results in the PR description or a private note.
Do NOT commit client workspace names/data into the repo.

---

## 6. Architecture refactor (enables reliable testing)

Move metric calculation out of the Inngest handler into pure functions.

New module:
- `app/src/lib/scan/metrics.ts`

Input:
- raw aggregates produced from tasks/lists/spaces
- now / thresholds

Output:
- `Metrics` + coverage/truncation/partial metadata

Keep in `app/src/inngest/scan.ts`:
- orchestration
- pagination
- rate limits
- progress
- persistence

Why:
- unit-test formulas without mocking Inngest
- compare old vs new with the same input
- avoid regressions hidden inside step callbacks

---

## 7. P0 fixes — material score impact

### P0-1 — Reporting coverage must use OPEN tasks

Problem:
`noDue`, `noAssignee`, `withEstimate` are incremented for every task.
`dueDateCoverage`, `ownershipCoverage`, `estimateCoverage` divide by `totalTasks`.

Fix:
- Add `openNoDue`, `openNoAssignee`, `openWithEstimate`.
- Increment them only inside the open-task branch (`!closedType`).
- Compute:
  - `dueDateCoverage = 1 - openNoDue / openTasks`
  - `ownershipCoverage = 1 - openNoAssignee / openTasks`
  - `estimateCoverage = openWithEstimate / openTasks`
- Return `undefined` when `openTasks === 0`.
- Keep all-task counters only for diagnostics, not scoring.

Tests:
- 2 open (1 due, 1 no due) + 8 closed (all no due) → coverage = 50%, not 10%.
- 0 open tasks → metric undefined, category coverage rule applies.
- Closed tasks still counted for completion trend and dormant/other metrics.

Expected impact:
- Reporting Readiness usually increases.
- False High findings may disappear.
- No change to Architecture/Operational/Adoption unless related.

Acceptance:
- Formula tests pass.
- No other metric changes in the same fixture.

---

### P0-2 — Remove silent 4,000-task truncation

Problem:
`iterateTasks(listId)` defaults to `maxPages = 40`.
100 tasks/page → max 4,000 tasks per List.
Anything beyond is ignored with no flag.

Fix:
- Extend `iterateTasks`:
  - `iterateTasks(listId, { startPage, maxPages })`
  - stop on `last_page` or empty page
- Use `task_count` from the List object to compute expected pages.
- Process Lists by page cursor across Inngest steps:
  - step state: `{ listIndex, page }`
  - each step processes up to `PAGE_BUDGET` pages total
  - a single huge List is split across multiple steps
- If `task_count` is missing:
  - page until `last_page`
  - apply a safety cap (e.g. 500 pages/List)
  - if the safety cap is hit, set `truncated = true`
- Track:
  - `scannedTasks`
  - `expectedTasks`
  - `truncatedLists`
  - `failedLists`
- Add to scan result:
  - `coverageTasks: { scanned, expected, pct }`
  - `truncated: boolean`

Tests:
- 10,000-task List → 100 pages, all tasks counted, `truncated=false`.
- 4,001-task List → not capped at 4,000.
- Missing `task_count` → paginates to `last_page`.
- Page boundary exactly 100 tasks.
- Duplicate/missing task IDs across page transitions → no double count.

Expected impact:
- All task-based metrics can change on huge Lists.
- Eyes On is likely affected.
- Scans may take longer; accepted for correctness.

Acceptance:
- No silent truncation.
- Any safety-cap truncation is explicitly flagged in the report.
- Full coverage on EES and Eyes On.

---

### P0-3 — Fix dormant List/Space logic

Problem:
`if (!l.tasks || !l.last_activity) dormant90 += 1`
A newly created empty List is counted as dormant 90d+.
Same for Spaces with `tasks === 0`.

Fix:
- Never infer dormant from “no tasks” alone.
- Use creation date where available:
  - List: `date_created` (add to type if API returns it)
  - Space: `date_created` (add to type if API returns it)
- Dormant if:
  - item has activity older than threshold, OR
  - item has no activity AND was created more than threshold ago
- If creation date is unavailable:
  - do NOT count as dormant
  - increment `unknownAgeLists` / `unknownAgeSpaces`
- Track empty items separately:
  - `emptyLists`
  - `emptySpaces`

Tests:
- Empty List created 5 days ago → not dormant.
- Empty List created 120 days ago → dormant.
- List with old activity → dormant.
- List with recent activity → not dormant.
- Space with no tasks, created yesterday → not dormant.
- Unknown creation date → not dormant, counted as unknown.

Expected impact:
- Architecture and Adoption scores may rise.
- False Medium dormant findings disappear.

Acceptance:
- No item becomes dormant solely because it has zero tasks.
- Empty/unknown items are visible in coverage metadata.

---

### P0-4 — Distinct workflows from status signatures

Problem:
`distinctWorkflows: structure.spaceCount`
Ten Spaces with identical statuses still triggers “>5 workflows”.

Fix:
- Build a normalized signature per Space:
  - sorted `status:type` list
- `distinctWorkflows` = number of unique signatures.
- `statusesPerWorkflow` = average number of statuses per unique signature.
- `unusedStatuses` = per signature:
  - union of status names used by tasks in Spaces with that signature
  - statuses in the signature not in the union
- Track `usedStatusBySpace` while scanning tasks.

Tests:
- 10 Spaces, same statuses → 1 distinct workflow.
- 2 Spaces, different statuses → 2.
- Same status names but different types → distinct signatures.
- A status used in one Space of a workflow is not “unused” for that workflow.

Expected impact:
- Reporting Readiness may increase.
- False “too many workflows” findings disappear.

Acceptance:
- `distinctWorkflows` equals unique signatures, not Space count.
- Unused statuses are computed per workflow.

---

### P0-5 — Repair drill-downs

Problems:
- `custom-fields` dataset is not stored → “No matching rows”.
- `unused-statuses` dataset is not stored → “No matching rows”.
- `fragmented_lists` maps to the dormant-lists dataset.
- 90d stale/dormant findings open 30d/60d datasets.
- Overdue column “Priority” prints status.
- `missing-due` dataset covers only missing due dates, not missing owner.
- 100-row cap is not labelled as a sample.

Fix:
- Store new `scan_samples` datasets:
  - `custom-fields`: field, scope, completion, status
  - `unused-statuses`: status, space/workflow, tasksUsing
  - `fragmented-lists`: list, space, openTasks, tasks, lastActivity
- Drill route:
  - `fragmented-lists` reads `list_stats` where `open_tasks < 5`
  - `dormant-lists` supports `tier=60|90`
  - `stale` supports `tier=30|60|90` (or separate datasets)
- Report map:
  - `fragmented_lists` → `fragmented-lists`
  - `stale_30_60` / `stale_60_90` / `stale_90plus` → correct tiers
  - `dormant_list_60` / `_90` → correct tiers
  - `ownership_coverage` → `missing-owner`
- Labels:
  - Overdue column → “Status”; add real priority if available.
  - `missing-due` title → “Tasks without a due date”.
  - Add separate `missing-owner` dataset/title.
  - Drill unit → “sample of N rows” when capped.

Tests:
- Contract test: every `DRILL` key resolves to a dataset with rows/columns.
- Custom fields finding opens non-empty rows.
- Unused statuses finding opens non-empty rows.
- Fragmented lists rows all have `open_tasks < 5`.
- 90d stale rows all have `ageDays >= 90`.
- 90d dormant rows all have `last_activity <= now-90d`.
- Overdue rows show status, not priority.
- 100-row dataset is labelled as sample.

Expected impact:
- No score change; trust/UX fix.

Acceptance:
- No “No matching rows” for a finding that exists.
- Dataset filters match the finding label.

---

### P0-6 — Partial scan failures

Problem:
One failed List can throw the whole scan or silently undercount.

Fix:
- Wrap per-List work in try/catch.
- Collect `failedLists` with reason.
- If failures are below threshold:
  - complete the scan
  - set `partial = true`
  - show “Based on X% of Lists” banner
- If failures exceed threshold (recommended: >10% Lists or >10% expected tasks):
  - mark scan `failed` / insufficient data
  - do not publish a misleading score
- Never silently publish a score from incomplete data.

Tests:
- One List fails out of 100 → complete with partial warning.
- 20 Lists fail out of 100 → fail/insufficient.
- Error logged with List ID but no secrets.

Expected impact:
- Some scans may fail instead of showing a wrong score.
- Better trust.

Acceptance:
- No silent undercount.
- Partial coverage is visible in the report.

---

## 8. P1 fixes — accuracy and disclosure

### P1-1 — Exact custom-field inventory

Current:
`customFieldCount` and `cfZeroFilledPct` use only fields observed on tasks.
Configured-but-unused fields are invisible.

Fix:
- You already fetch field definitions per List.
- Merge them into a `fieldDefs` map:
  - field ID, name, type, list scope
- `customFieldCount` = unique field definitions.
- `cfZeroFilledPct` = fields with zero filled values / total field definitions.
- Fields never observed on tasks count as 0% filled.
- Keep task-level completion for `cfCompletionPct`.
- Required-field compliance remains exact from List schema.

Tests:
- 200 configured fields, 5 used → count 200; zero-filled includes 195.
- Field present on tasks with values → accurate completion.
- Field scoped to a List with no tasks → still counted.

Expected impact:
- Governance score may decrease (more bloat detected).
- More accurate "never filled" findings.

---

### P1-2 — Comment rate: 30-day window + stratified sample

Current:
All comments on 60 recently updated tasks, divided by active members/weeks.

Fix:
- Keep sampling (Oli approved sampling on large workspaces).
- Sample tasks stratified across Lists/Spaces, not just the first 60.
- Filter comments to the last 30 days using `comment.date`.
- Count unique commenters and total comments.
- `commentsPerUserPerWeek = comments30d / activeMembers / (30/7)`.
- Label the metric as sampled in the report.

Tests:
- Comments 60 days old → not counted.
- Comments in last 30d → counted.
- Sampling across Lists produces representative rows.
- No comments → 0, Low finding.

Expected impact:
- Adoption score may change.
- More defensible comment metric.

---

### P1-3 — Status metrics per workflow

Current:
`statusesPerWorkflow` = average statuses per Space.
`unusedStatuses` = global across the workspace.

Fix:
- Use the workflow signatures from P0-4.
- `statusesPerWorkflow` = average statuses per unique signature.
- `unusedStatuses` = per-signature unused statuses.
- Store per-workflow usage in scan samples.

Tests:
- Two Spaces share a workflow → not double-counted.
- Status unused in one workflow but used in another → per-workflow result.

Expected impact:
- Workflow category may change modestly.

---

### P1-4 — Activity concentration from recent activity

Current:
`maxSpaceTasks / totalTasks` — historical volume.

Fix:
- Track recent tasks per Space (created/updated in last 30 days).
- `activityConcentration = maxRecentSpaceTasks / totalRecentTasks`.
- If no recent activity → `undefined` (coverage rule).

Tests:
- Space A has many old tasks; Space B has recent activity → concentration reflects B.
- No recent activity → undefined.

Expected impact:
- Adoption score may change.

---

### P1-5 — Time tracking: true 90-day data

Current:
`timeTrackedPct` = tasks with any `time_spent` ever.
This is a deviation from Oli’s “0 logged in 90d”.

Recommended fix:
- Use ClickUp’s team time-entries endpoint for the last 90 days
  (`GET /team/{team_id}/time_entries?start_date=&end_date=`).
- Count time entries / tasks touched in 90d.
- If the endpoint is unavailable or plan-gated:
  - fall back to `time_spent > 0`
  - label the metric “any time logged (90d unavailable)”
  - do not claim 90d.

Tests:
- Time logged 6 months ago only → not counted in 90d.
- Time logged in last 90d → counted.
- Endpoint failure → fallback and disclosure.

Expected impact:
- Platform Utilisation may change.

Decision needed: invest in time-entries endpoint or keep documented approximation.

---

### P1-6 — List sampling flag

Current:
`SAMPLE_LIST_LIMIT = 1000`, silent.

Fix:
- Track `listsTotal` and `listsScanned`.
- If `listsTotal > cap`:
  - `sampled = true`
  - show “Based on X of Y Lists” banner
- Keep the cap configurable; do not raise blindly.

Tests:
- 1,500 Lists → scanned 1,000, sampled true.
- 388 Lists → full, sampled false.

Expected impact:
- No score change for current workspaces; transparency.

---

### P1-7 — Signal-level coverage

Current:
“7/7 categories measured” can look like all signals were measured.

Fix:
- Add per-category signal coverage:
  - `signalsMeasured / signalsTotal`
- Show in report/tooltips.
- Mark approximate signals:
  - inactive members
  - comment rate
  - time tracking (if fallback)
- Keep category coverage rule unchanged.

Tests:
- Workflow with Time-in-Status missing shows 3/4 signals, not just “measured”.
- UI renders the counts.

Expected impact:
- Transparency only.

---

### P1-8 — Label/data corrections

- Overdue drill column: “Priority” → “Status”.
- Add actual priority only if the task payload includes it.
- `missing-due` title → “Tasks without a due date”.
- Add `missing-owner` dataset/title.
- Drill unit: “sample of 100 rows” when capped.
- Stale subtitle: “Sample of up to 100 open tasks untouched for 30+ days”.
- Dormant subtitle: match the selected 60/90 tier.

Tests:
- Snapshot/UI text assertions.
- No finding opens a dataset with a mismatched title/filter.

---

## 9. Test plan

### Unit tests
- open-task coverage formula
- 10k-task pagination / no truncation
- task_count missing
- dormant new/old/empty List and Space
- distinct workflow signatures
- per-workflow unused statuses
- comment 30-day filter
- recent activity concentration
- custom-field inventory exactness
- time tracking 90d/fallback
- list cap/sampling
- partial failure thresholds

### Golden fixtures
- synthetic workspace under `app/src/lib/scan/fixtures/`
- no client data/secrets
- generate large lists programmatically in tests

### Drill contract test
For every key in `DRILL`:
- dataset meta exists
- dataset rows exist when finding exists
- filters match the finding label
- columns match row keys

### A/B validation
Run baseline `main` and branch on:
- EES Agency
- Eyes On
- Sharpflow demo
- Studio Eleven54

Record:
| Workspace | Baseline score | Branch score | Expected direction | Explanation |
|---|---|---|---|---|
| EES Agency | TBD | TBD | TBD | TBD |
| Eyes On | TBD | TBD | TBD | TBD |
| Demo | TBD | TBD | TBD | TBD |
| Studio | TBD | TBD | TBD | TBD |

Every score difference must be explainable by a specific fix.

### Manual QA
- OAuth connect
- workspace picker + exclusions
- scan progress
- report + all drill-downs
- PDF
- lead capture
- failed scan handling
- large workspace scan

### CI
- GitHub Actions on PR:
  - `npm ci`
  - `npm run typecheck`
  - `npm test`
- Do not use production secrets.
- Vercel preview for build.

---

## 10. Documentation updates

- `PROJECT.md`:
  - open-task coverage definitions
  - distinct workflows definition
  - dormant/empty item rule
  - time tracking 90d/fallback
  - custom-field inventory
  - partial/sampled scan disclosure
- `HANDOFF.md`: current state + new coverage flags.
- `handover/Runbook.md`:
  - fix 20 min vs 45 min reaper inconsistency
  - document truncation/sampling flags
- `PROJECT.md`: fix Sapphire vs Diamond badge inconsistency.
- New `SCANNING-CHANGELOG.md`:
  - version, date, fixes, expected score impacts.

---

## 11. Merge checklist

- [x] Branch created from `main` @ `4b218f1`
- [ ] Baseline captured (requires access to EES/Eyes On)
- [x] Pure metrics module + tests
- [x] P0-1 open-task coverage
- [x] P0-2 no truncation
- [x] P0-3 dormant fix
- [x] P0-4 distinct workflows
- [x] P0-5 drill-down repairs
- [x] P0-6 partial failures
- [x] P1-1 custom fields
- [x] P1-2 comments
- [x] P1-3 status metrics
- [x] P1-4 activity concentration
- [x] P1-5 time tracking decision implemented
- [x] P1-6 list sampling flag
- [x] P1-7 signal coverage
- [x] P1-8 labels
- [x] Typecheck + tests + build clean
- [ ] A/B results reviewed and explained
- [ ] Manual QA complete (build + sample page smoke-tested)
- [x] Docs + changelog updated
- [x] Branch pushed and ready for PR (PR URL in branch output; GitHub CLI not installed)
- [ ] **Misho explicitly says "merge"**
- [ ] Merge to `main`
- [ ] Vercel deploy + Inngest sync
- [ ] Live smoke test
- [x] Rollback plan ready

---

## 12. Rollback

- Keep the previous production deployment available in Vercel.
- If post-merge issues appear:
  - revert the merge commit
  - redeploy the previous build
- No database migration is planned, so rollback is code-only.
- New scan records remain; old reports still render.

---

## 13. Open decisions (defaults proposed)

1. **Dormant rule** — default: use creation date; unknown age is not dormant.
2. **Distinct workflows** — default: unique status signatures per Space.
3. **Time tracking** — default: use team time entries for 90d; fallback + label.
4. **Partial failures** — default: complete with warning under 10%; fail above 10%.
5. **Custom fields** — default: exact, using already-fetched List field definitions.
6. **Branch split** — default: one correctness branch and one release.
7. **Test data** — default: local fixtures + staging/A-B; no production DB writes.
8. **File location** — default: `SCANNER-CORRECTNESS-PLAN.md` at repo root.

---

## 14. Non-goals

- Speed/concurrency optimisation (separate branch)
- New product features
- UI redesign
- Recurring scans/history/benchmarks
- Key rotation/security cleanup
- Production env/domain changes
- Supabase migration unless separately approved

---

## 15. Definition of done

- Every P0 item fixed and tested.
- Every P1 item fixed or explicitly deferred with disclosure.
- Scores on real workspaces are explainable.
- No silent truncation, sampling, or partial data.
- Drill-downs match their findings.
- Docs reflect the corrected model.
- Branch is ready for review.
- Production untouched until Misho says “merge”.
