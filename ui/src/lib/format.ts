import type { DecisionOption } from '../store/gameStore';

const ISO2: Record<string, string> = {
  USA: 'US', CHN: 'CN', RUS: 'RU', DEU: 'DE', IND: 'IN', BRA: 'BR', CAN: 'CA', MEX: 'MX',
  FRA: 'FR', GBR: 'GB', POL: 'PL', TUR: 'TR', SAU: 'SA', IRN: 'IR', ISR: 'IL', EGY: 'EG',
  JPN: 'JP', IDN: 'ID', KOR: 'KR', PRK: 'KP', AUS: 'AU', PAK: 'PK', NGA: 'NG', ZAF: 'ZA',
  ITA: 'IT', UKR: 'UA', TWN: 'TW', BLR: 'BY', DNK: 'DK', SYR: 'SY', IRQ: 'IQ', PSX: 'PS',
  LBN: 'LB', YEM: 'YE', ARE: 'AE', AFG: 'AF', PHL: 'PH', VEN: 'VE', CUB: 'CU', SDN: 'SD',
  ETH: 'ET',
};

/** Emoji flag from an ISO3 code (falls back to a globe). */
export function flag(iso3: string): string {
  const iso2 = ISO2[iso3];
  if (!iso2) return '🌐';
  return String.fromCodePoint(...[...iso2].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

export function money(n: number): string {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(0)}B`;
  return `$${(n / 1e6).toFixed(0)}M`;
}

export function monthLabel(date: string): string {
  const [y, m] = date.split('-').map(Number);
  return new Date(Date.UTC(y, (m ?? 1) - 1, 1)).toLocaleString('en-US', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export const ADVISOR_NAMES: Record<string, string> = {
  FOREIGN_MINISTER: 'Foreign Minister',
  DEFENSE_MINISTER: 'Defense Minister',
  FINANCE_MINISTER: 'Finance Minister',
  INTELLIGENCE_CHIEF: 'Intelligence Chief',
  DOMESTIC_ADVISOR: 'Interior Minister',
  CHIEF_OF_STAFF: 'Chief of Staff',
};

export interface Arrow {
  label: string;
  dir: 'up' | 'down';
  strength: 1 | 2 | 3;
  good: boolean;
}

/**
 * Turn exact option effects into qualitative arrows (▲▲, ▼). Players see the
 * direction and rough size of consequences, not the exact numbers, which
 * keeps decisions about judgment rather than arithmetic.
 */
export function effectArrows(
  option: DecisionOption,
  names: (id: string) => string,
): Arrow[] {
  const out: Arrow[] = [];
  const size = (v: number, scale = 1): 1 | 2 | 3 => {
    const a = Math.abs(v) / scale;
    return a >= 9 ? 3 : a >= 4 ? 2 : 1;
  };
  const push = (label: string, v: number, scale = 1, goodWhenUp = true) => {
    if (!v) return;
    out.push({ label, dir: v > 0 ? 'up' : 'down', strength: size(v, scale), good: v > 0 === goodWhenUp });
  };
  const e = option.effects;
  push('Approval', e.approval ?? 0);
  push('Stability', e.stability ?? 0);
  push('Legitimacy', e.legitimacy ?? 0);
  push('Economy', (e.gdp ?? 0) * 6 + (e.growth ?? 0) * 12);
  push('Allies', e.relationsAllies ?? 0, 0.7);
  for (const [k, v] of Object.entries(e)) {
    if (k.startsWith('relations:')) push(names(k.split(':')[1]), v, 1.4);
  }
  for (const k of Object.keys(e)) {
    if (k.startsWith('ceasefire:')) out.push({ label: `Ceasefire with ${names(k.split(':')[1])}`, dir: 'up', strength: 3, good: true });
  }
  if (e.relationsRivals) push('Rivals', e.relationsRivals, 0.7);
  if (e.mobilization) push('Mobilization', e.mobilization, 3);
  if (e.intel) push('Counter-intel', e.intel, 3);
  if (e.pc) push('Pol. capital', e.pc, 0.4);
  if (e.coupShield) out.push({ label: 'Coup-proofed', dir: 'up', strength: 2, good: true });
  if (option.tensionDelta) push('Tension', option.tensionDelta, 0.8, false);
  for (const a of option.actions) {
    if (a.type === 'DIPLOMACY_DECLARE_WAR') out.push({ label: 'WAR', dir: 'up', strength: 3, good: false });
    if (a.type === 'MILITARY_AIRSTRIKE') out.push({ label: 'Airstrike', dir: 'up', strength: 2, good: false });
  }
  if (option.followUp) out.push({ label: 'Consequences later', dir: 'down', strength: 1, good: false });
  return out;
}

export function arrowText(a: Arrow): string {
  const glyph = a.dir === 'up' ? '▲' : '▼';
  return `${a.label} ${glyph.repeat(a.strength)}`;
}

// Mirrors src/core/text.ts withArticle
const TAKES_THE = new Set([
  'United States',
  'United Kingdom',
  'Philippines',
  'Netherlands',
  'United Arab Emirates',
  'Czech Republic',
  'Central African Republic',
  'Democratic Republic of the Congo',
  'Gambia',
  'Bahamas',
]);
/** "the Philippines", "the United States", but "Iran". */
export const withArticle = (name: string) => (TAKES_THE.has(name) ? `the ${name}` : name);
