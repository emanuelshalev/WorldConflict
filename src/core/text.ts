/** Small English helpers for generated prose. */

/** "Iran's", but "United States'" and "Philippines'". */
export function possessive(name: string): string {
  return /s$/i.test(name) ? `${name}'` : `${name}'s`;
}

const TAKES_THE = new Set([
  "United States",
  "United Kingdom",
  "Philippines",
  "Netherlands",
  "United Arab Emirates",
  "Czech Republic",
  "Central African Republic",
  "Democratic Republic of the Congo",
  "Gambia",
  "Bahamas",
]);

/** "the Philippines", "the United States", but "Iran". */
export function withArticle(name: string): string {
  return TAKES_THE.has(name) ? `the ${name}` : name;
}
