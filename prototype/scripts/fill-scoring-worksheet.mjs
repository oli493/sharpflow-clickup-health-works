import { PDFDocument } from 'pdf-lib'
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const docs = path.join(root, 'docs')
const blank = path.join(docs, 'Sharpflow-ClickUp-Health-Scoring-Worksheet.pdf')
const completed = path.join(docs, 'Sharpflow-ClickUp-Health-Scoring-Worksheet-COMPLETED.pdf')

// Oli's filled-in answers (captured from the completed worksheet he returned).
const values = {
  cat_weight_0: '15', cat_weight_1: '15', cat_weight_2: '15', cat_weight_3: '20',
  cat_weight_4: '15', cat_weight_5: '10', cat_weight_6: '10',

  w_0_0: '15', t_0_0: '< 10 (median)', sev_0_0: 'Low',
  w_0_1: '30', t_0_1: '> 20% of Lists', sev_0_1: 'Medium',
  w_0_2: '35', t_0_2: '> 25% of Lists', sev_0_2: 'Medium',
  w_0_3: '20', t_0_3: '> 20% empty Folders', sev_0_3: 'Low',

  w_1_0: '25', t_1_0: '> 12 per workflow', sev_1_0: 'Low',
  w_1_1: '25', t_1_1: '> 3 per workflow', sev_1_1: 'Medium',
  w_1_2: '20', t_1_2: 'same name, diff type', sev_1_2: 'Medium',
  w_1_3: '30', t_1_3: '> 14d in active status', sev_1_3: 'Medium',

  w_2_0: '20', t_2_0: '> 100 fields', sev_2_0: 'Low',
  w_2_1: '35', t_2_1: '< 50% where in scope', sev_2_1: 'High',
  w_2_2: '25', t_2_2: '0% filled in scope', sev_2_2: 'Medium',
  w_2_3: '20', t_2_3: '> 20% (required CFs)', sev_2_3: 'Medium',

  w_3_0: '35', t_3_0: '>15% (>30% Critical)', sev_3_0: 'High',
  w_3_1: '30', t_3_1: '> 20% of open', sev_3_1: 'High',
  w_3_2: '0', t_3_2: 'scored in Reporting', sev_3_2: 'Low',
  w_3_3: '20', t_3_3: 'created > done, 3 mo', sev_3_3: 'Medium',
  w_3_4: '15', t_3_4: '> 15 open/person', sev_3_4: 'Low',

  w_4_0: '30', t_4_0: '> 15% of members', sev_4_0: 'Medium',
  w_4_1: '20', t_4_1: '> 80% in 1 Space', sev_4_1: 'Low',
  w_4_2: '20', t_4_2: '< 1/active user/week', sev_4_2: 'Low',
  w_4_3: '30', t_4_3: 'any (after exclusions)', sev_4_3: 'Medium',

  w_5_0: '35', t_5_0: '0 logged in 90d', sev_5_0: 'Opportunity',
  w_5_1: '0', t_5_1: 'scored in Reporting', sev_5_1: 'Low',
  w_5_2: '30', t_5_2: '< 2 Views per Space', sev_5_2: 'Low',
  w_5_3: '35', t_5_3: 'none used', sev_5_3: 'Low',
  w_5_4: '0', t_5_4: 'insight only', sev_5_4: 'Opportunity',
  w_5_5: '0', t_5_5: 'insight only', sev_5_5: 'Opportunity',
  w_5_6: '0', t_5_6: 'insight only', sev_5_6: 'Opportunity',

  w_6_0: '30', t_6_0: '< 80% of open tasks', sev_6_0: 'High',
  w_6_1: '30', t_6_1: '< 80% of open tasks', sev_6_1: 'High',
  w_6_2: '20', t_6_2: '< 40% of open tasks', sev_6_2: 'Medium',
  w_6_3: '20', t_6_3: '> 5 distinct workflows', sev_6_3: 'Medium',

  def_overdue: 'Past due, not Done/Closed',
  def_stale: '90 days (no task update)',
  def_dormant: '90 days',
  def_fragmented: '< 5 open tasks',
  def_active: '30 days (task/comment activity)',

  q_cat:
    'Category weights are fine as they are, with Operational Health highest at 20%. Signal weights are adjusted to remove double-counting: due-date and estimate coverage are now scored once, in Reporting Readiness only. Note the original Platform Utilisation signal weights totalled 95%, now corrected to 100%. Opportunity-severity findings should carry little or no score penalty.',
  q_overdue:
    'Keep 15% but tier it: over 15% = High, over 30% = Critical. Overdue must mean due date passed and status is not a Done OR Closed type (not just Closed). Exclude archived tasks and anything in excluded Spaces. The 15% in section D was a threshold, not a definition, so I have replaced it.',
  q_utilisation:
    "Count toward the score at 10%, but only Time tracking, Views and Dependencies/Relationships. Goals, Docs and Custom Task Types = insights only (show as Opportunity findings, no score impact). Dashboards, Automations, Whiteboards, Integrations, AI and Workload capacity are not exposed by the public API: show as 'not measured' and never penalise.",
  q_signals:
    "Add: guest vs member ratio; open subtasks under closed parents; scan-coverage warning if the connecting user is not Owner/Admin. Rename 'Inactive paid seats' to 'Inactive members' and mark it Part: the API shows roles not billing, and activity is inferred from tasks/comments, not logins. Comment frequency needs per-task calls, so sample on large workspaces. Time in status requires the Time in Status ClickApp. 'Unused CFs (90d)' is now '0% filled' as value-change dates are not exposed.",
}

const bytes = fs.readFileSync(blank)
const doc = await PDFDocument.load(bytes)
const form = doc.getForm()

let applied = 0
for (const field of form.getFields()) {
  const name = field.getName()
  if (!(name in values)) continue
  const v = values[name]
  const kind = field.constructor.name
  try {
    if (kind === 'PDFTextField') field.setText(String(v))
    else if (kind === 'PDFDropdown') field.select(String(v))
    else if (kind === 'PDFCheckBox') {
      if (String(v) === 'true') field.check()
      else field.uncheck()
    }
    applied += 1
  } catch (e) {
    console.error(`! ${name}: ${e.message}`)
  }
}

fs.writeFileSync(completed, await doc.save())
fs.writeFileSync(path.join(docs, 'scoring-answers.json'), JSON.stringify(values, null, 2))

console.log(`Applied ${applied} field values`)
console.log(`Wrote ${completed}`)
console.log(`Wrote ${path.join(docs, 'scoring-answers.json')}`)
