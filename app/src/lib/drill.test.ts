import { describe, expect, it } from 'vitest'
import { DATASET_META } from './drill'

const REQUIRED_DATASETS = [
  'overdue',
  'stale-30',
  'stale-60',
  'stale-90',
  'dormant-lists-60',
  'dormant-lists-90',
  'fragmented-lists',
  'custom-fields',
  'unused-statuses',
  'missing-due',
  'missing-owner',
  'inactive-members',
  'duplicate-statuses',
  'views',
  'dormant-spaces',
]

describe('drill dataset metadata', () => {
  it.each(REQUIRED_DATASETS)('has metadata for %s', (key) => {
    const meta = DATASET_META[key]
    expect(meta).toBeDefined()
    expect(meta.columns.length).toBeGreaterThan(0)
    expect(meta.title.length).toBeGreaterThan(0)
  })
})
