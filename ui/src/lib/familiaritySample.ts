/**
 * The sample sentence of the familiarity question (FamiliarityPrompt): one line of real news from
 * the era being played, with the names a newcomer may not know marked (QA3-S3-1: the 2026 Donetsk
 * line showed in every era, an anachronism for a 1960 or 1990 seat). Plain parts are strings;
 * `{ mark }` parts are the names "Guide me" underlines. Each line is true at its era's start date.
 */
export type SamplePart = string | { mark: string };

export interface FamiliaritySample {
  era: '1960' | '1990' | '2025' | '2026';
  parts: SamplePart[];
}

const SAMPLES: Record<FamiliaritySample['era'], SamplePart[]> = {
  // Khrushchev's Berlin ultimatum (1958 to 1961)
  '1960': ['Khrushchev threatens a separate peace treaty with ', { mark: 'East Germany' }, ' that would hand it the access routes to ', { mark: 'West Berlin' }, '.'],
  // After 9 November 1989, the "two plus four" question of a united Germany
  '1990': ['After the fall of the ', { mark: 'Berlin Wall' }, ', Bonn and Moscow argue over whether a united Germany stays in ', { mark: 'NATO' }, '.'],
  // January 2025: the Gaza ceasefire and hostage exchange; Ukraine still holds part of Kursk
  '2025': ['A ceasefire in ', { mark: 'Gaza' }, ' begins with a hostage exchange, while Ukrainian troops still hold ground in Russia’s ', { mark: 'Kursk oblast' }, '.'],
  '2026': ['US mediators propose a zone in ', { mark: 'Donetsk oblast' }, ', including the ', { mark: 'fortress belt' }, ' of Kramatorsk.'],
};

/** The era of a game date (YYYY-MM): the scenario years 1960, 1990, 2025 and 2026. */
export function sampleEra(date: string | undefined): FamiliaritySample['era'] {
  const y = Number((date ?? '').slice(0, 4));
  if (!Number.isFinite(y) || y <= 0) return '2026';
  if (y < 1975) return '1960';
  if (y < 2010) return '1990';
  if (y < 2026) return '2025';
  return '2026';
}

/** The sample for the game being started (by its world date; 2026 before a game exists). */
export function familiaritySample(date: string | undefined): FamiliaritySample {
  const era = sampleEra(date);
  return { era, parts: SAMPLES[era] };
}

/** How many names the sample marks ("2 names" on the info chip). */
export function sampleMarks(s: FamiliaritySample): number {
  return s.parts.filter((p) => typeof p !== 'string').length;
}

/** The sentence as plain text. */
export function sampleText(s: FamiliaritySample): string {
  return s.parts.map((p) => (typeof p === 'string' ? p : p.mark)).join('');
}
