import type { AchievementView, RarityTier } from '../../store/gameStore';

/** Seal art data (WP9): rarity words and colours, glyph paths and the glyph for each achievement. */

export const TIER_WORD: Record<RarityTier, string> = {
  COMMON: 'Common',
  UNCOMMON: 'Uncommon',
  RARE: 'Rare',
  LEGENDARY: 'Legendary',
};
export const TIER_VAR: Record<RarityTier, string> = {
  COMMON: 'var(--rarity-common)',
  UNCOMMON: 'var(--rarity-uncommon)',
  RARE: 'var(--rarity-rare)',
  LEGENDARY: 'var(--rarity-legendary)',
};
/** Canvas-safe colours (share cards cannot read CSS variables). */
export const TIER_HEX: Record<RarityTier, string> = {
  COMMON: '#8693a6',
  UNCOMMON: '#56c596',
  RARE: '#4fb3d9',
  LEGENDARY: '#f2a93b',
};
export const INFAMY_HEX = '#e5383b';
const TIER_ORDER: Record<RarityTier, number> = { COMMON: 0, UNCOMMON: 1, RARE: 2, LEGENDARY: 3 };
export const tierRank = (t: RarityTier) => TIER_ORDER[t] ?? 0;

/** Glyphs drawn in a 40 x 40 box centred on 0,0; `stroke` glyphs are outlines. */
export const GLYPHS: Record<string, { d: string; stroke?: boolean }> = {
  dove: { d: 'M-14 4 q8 -16 22 -10 q-4 -10 6 -14 q-2 8 4 12 q-6 2 -8 8 q-10 10 -24 4z' },
  star: { d: 'M0 -15 L4.4 -4.7 L15 -4.7 L6.6 2 L9.6 13 L0 6.6 L-9.6 13 L-6.6 2 L-15 -4.7 L-4.4 -4.7Z' },
  wave: { d: 'M-16 2 q4 -6 8 0 t8 0 t8 0 t8 0 v8 h-32z M-6 -14 h12 v12 h-12z' },
  check: { d: 'M-12 0 l8 8 l16 -16', stroke: true },
  clock: { d: 'M0 -13 a13 13 0 1 0 0.01 0 M0 -7 v7 l6 4', stroke: true },
  shield: { d: 'M0 -16 l13 5 v8 q0 12 -13 19 q-13 -7 -13 -19 v-8z' },
  eye: { d: 'M-16 0 q16 -16 32 0 q-16 16 -32 0z M0 -5 a5 5 0 1 0 .01 0' },
  temp: { d: 'M-3 -14 h6 v18 a7 7 0 1 1 -6 0z' },
  up: { d: 'M-14 10 l10 -10 l6 6 l12 -14 M6 -8 h6 v6', stroke: true },
  flag: { d: 'M-9 15 V-14 M-9 -13 h18 l-4 6 l4 6 h-18', stroke: true },
  calendar: { d: 'M-12 -9 h24 v21 h-24z M-12 -2 h24 M-6 -14 v8 M6 -14 v8', stroke: true },
  bolt: { d: 'M3 -16 L-9 3 h8 l-3 13 l13 -19 h-8z' },
  pillar: { d: 'M-12 12 h24 M-10 -11 h20 M-7 -8 v17 M0 -8 v17 M7 -8 v17 M-12 -14 l12 -5 l12 5z', stroke: true },
  hands: { d: 'M-16 2 l7 -7 l6 3 l6 -5 l6 2 l7 7 M-9 -5 l9 9 q3 3 6 0 M-4 6 q3 3 6 0', stroke: true },
  key: { d: 'M-8 -4 a6 6 0 1 0 0.01 0 M-2 0 h16 M10 0 v5 M6 0 v4', stroke: true },
  book: { d: 'M0 -10 q-7 -4 -14 -2 v20 q7 -2 14 2 q7 -4 14 -2 v-20 q-7 -2 -14 2z M0 -10 v20', stroke: true },
  stack: { d: 'M-12 -10 h24 v5 h-24z M-12 -2 h24 v5 h-24z M-12 6 h24 v5 h-24z' },
  atom: { d: 'M-14 0 a14 6 0 1 0 28 0 a14 6 0 1 0 -28 0 M-7 -12 a14 6 60 1 0 14 24 a14 6 60 1 0 -14 -24 M0 -2 a2 2 0 1 0 .01 0', stroke: true },
  crown: { d: 'M-14 10 h28 l2 -18 l-9 7 l-7 -11 l-7 11 l-9 -7z' },
  down: { d: 'M-14 -10 l10 10 l6 -6 l12 14 M6 8 h6 v-6', stroke: true },
  flame: { d: 'M0 -16 q10 10 8 18 q-2 10 -8 12 q-10 -2 -10 -12 q0 -6 5 -10 q0 6 4 8 q2 -8 1 -16z' },
  door: { d: 'M-9 15 v-28 h16 v28 M-13 15 h26 M3 1 a1 1 0 1 0 .01 0', stroke: true },
  cloud: { d: 'M-10 -2 a8 8 0 0 1 4 -12 a9 9 0 0 1 12 0 a8 8 0 0 1 4 12z M-3 -2 h6 v16 h-6z M-10 14 h20' },
  globe: { d: 'M0 -14 a14 14 0 1 0 0.01 0 M-14 0 h28 M0 -14 q-8 14 0 28 M0 -14 q8 14 0 28', stroke: true },
  scales: { d: 'M0 -14 v26 M-8 12 h16 M-13 -9 h26 M-13 -9 l-5 11 h10z M13 -9 l-5 11 h10z', stroke: true },
};

const GLYPH_FOR: Record<string, keyof typeof GLYPHS> = {
  sworn_in: 'flag',
  full_term: 'calendar',
  clean_sheet: 'check',
  ahead_of_schedule: 'clock',
  photo_finish: 'bolt',
  peacemaker: 'dove',
  quick_peace: 'clock',
  no_shot_fired: 'shield',
  comeback_kid: 'up',
  nerves_of_steel: 'bolt',
  iron_approval: 'pillar',
  landslide: 'up',
  boom_times: 'up',
  no_recession: 'shield',
  steady_state: 'pillar',
  cooler_heads: 'temp',
  world_at_peace: 'globe',
  bridge_builder: 'dove',
  coalition: 'hands',
  dealmaker: 'hands',
  spymaster: 'key',
  staff_knows_best: 'book',
  against_advice: 'scales',
  full_desk: 'stack',
  first_strike_rival_nuke: 'atom',
  lame_duck: 'down',
  the_hawk: 'flame',
  pariah: 'eye',
  exposed: 'eye',
  deposed: 'door',
  mushroom_cloud: 'cloud',
  defused: 'atom',
  history_rewritten: 'book',
  re_elected: 'crown',
  statecraft: 'scales',
  decade: 'calendar',
  dynasty: 'crown',
};

export function glyphFor(a: Pick<AchievementView, 'id' | 'signature'>): keyof typeof GLYPHS {
  return GLYPH_FOR[a.id] ?? (a.signature ? 'wave' : 'star');
}

/** "earned by 9% of simulated leaders", or a plain note when the harness has not measured it. */
export function rateText(rate: number | null): string {
  if (rate === null || rate === undefined) return 'rarity not measured yet';
  const pct = rate * 100;
  return `earned by ${pct > 0 && pct < 1 ? '<1' : Math.round(pct)}% of simulated leaders`;
}

