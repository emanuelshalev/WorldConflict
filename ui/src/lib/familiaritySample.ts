/**
 * The sample sentence of the familiarity question (FamiliarityPrompt): one line of real news from
 * the era being played, with the names a newcomer may not know marked (QA3-S3-1: the 2026 Donetsk
 * line showed in every era, an anachronism for a 1960 or 1990 seat). Plain parts are strings;
 * `{ mark }` parts are the names "Guide me" underlines. Each line is true at its era's start date.
 */
export type SamplePart = string | { mark: string };

export interface FamiliaritySample {
  era: '1960' | '1990' | '2025' | '2026';
  /** Set when the line is the flashpoint's own (QA3R-3f). */
  flashpointId?: string;
  parts: SamplePart[];
}

/**
 * A flashpoint's own line (QA3R-3f: a China or Venezuela game showed the Donetsk sentence). Each is
 * true at the flashpoint's start (data/flashpoints/<id>.json hook).
 */
const FLASHPOINT_SAMPLES: Record<string, SamplePart[]> = {
  'ceasefire-or-collapse': ['US mediators propose a zone in ', { mark: 'Donetsk oblast' }, ', including the ', { mark: 'fortress belt' }, ' of Kramatorsk.'],
  'hormuz-convoy': ['Tankers near the ', { mark: 'Strait of Hormuz' }, ' sail under escort after more than 24 ships were attacked by the ', { mark: 'IRGC' }, '.'],
  quarantine: ['After drills that rehearsed sealing off ', { mark: 'Keelung' }, ' and Kaohsiung, Beijing weighs a ', { mark: 'quarantine' }, ' of Taiwan short of a blockade.'],
  'scarborough-line': ['The China Coast Guard turns water cannon on Philippine vessels at ', { mark: 'Scarborough Shoal' }, ', which Manila says the ', { mark: 'Mutual Defense Treaty' }, ' covers.'],
  'caracas-after-maduro': ['With Maduro on trial in New York, acting president ', { mark: 'Delcy Rodríguez' }, ' opens the oil fields and wins ', { mark: 'sanctions relief' }, '.'],
  'bab-al-mandab-burning': ['The ', { mark: 'Houthis' }, ' take the port of Mokha at the mouth of the ', { mark: 'Bab al-Mandab' }, ' strait.'],
  'fire-on-the-nile': ['The ', { mark: 'Rapid Support Forces' }, ' take El Fasher and set up a rival government in ', { mark: 'Nyala' }, '.'],
  'water-war': ['India keeps the ', { mark: 'Indus Waters Treaty' }, ' in abeyance a year after ', { mark: 'Operation Sindoor' }, '.'],
};

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

/**
 * The sample for the game being started: the flashpoint's own line when there is one, else the
 * era's (by its world date; 2026 before a game exists).
 */
export function familiaritySample(date: string | undefined, flashpointId?: string | null): FamiliaritySample {
  const era = sampleEra(date);
  const own = flashpointId ? FLASHPOINT_SAMPLES[flashpointId] : undefined;
  return own ? { era, flashpointId: flashpointId ?? undefined, parts: own } : { era, parts: SAMPLES[era] };
}

/** The flashpoints that have their own sample line. */
export const SAMPLE_FLASHPOINTS = Object.keys(FLASHPOINT_SAMPLES);

/** How many names the sample marks ("2 names" on the info chip). */
export function sampleMarks(s: FamiliaritySample): number {
  return s.parts.filter((p) => typeof p !== 'string').length;
}

/** The sentence as plain text. */
export function sampleText(s: FamiliaritySample): string {
  return s.parts.map((p) => (typeof p === 'string' ? p : p.mark)).join('');
}
