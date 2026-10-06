/**
 * Sharpflow house style: never use em dashes, en dashes or double hyphens in
 * report text. Replace them with a colon. Applied to AI output and all static
 * report copy so the whole report reads consistently.
 */
export function colonify(s: string): string {
  return s
    .replace(/\s*(?:—|–|--+)\s*/g, ': ')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,.;:])/g, '$1')
    .trim()
}
