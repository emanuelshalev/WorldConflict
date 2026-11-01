/** Small English helpers for generated prose. */

/** "Iran's", but "United States'" and "Philippines'". */
export function possessive(name: string): string {
  return /s$/i.test(name) ? `${name}'` : `${name}'s`;
}
