import { FLAG_COLORS } from './palette';

/**
 * How each nation's flag is laid out. Scene art only receives the three colours, so the table is
 * keyed by `colors.join()` (the FLAG_COLORS triple), letting <Flag> pick the right pattern without
 * a country id. Unknown triples fall back to vertical stripes.
 */
export type FlagLayout =
  | 'vertical'
  | 'horizontal'
  | 'bicolor'
  | 'horizontal2'
  | 'usa'
  | 'union'
  | 'ensign'
  | 'nordic'
  | 'disc'
  | 'taegeuk'
  | 'diamond'
  | 'canada'
  | 'cantonStar'
  | 'cantonSun'
  | 'cuba'
  | 'hoist'
  | 'israel'
  | 'india'
  | 'lebanon'
  | 'pakistan'
  | 'philippines'
  | 'prk'
  | 'triangle'
  | 'saudi'
  | 'crescent'
  | 'zaf';

const BY_COUNTRY: Record<string, FlagLayout> = {
  AFG: 'vertical',
  ARE: 'hoist',
  AUS: 'ensign',
  BLR: 'horizontal2',
  BRA: 'diamond',
  CAN: 'canada',
  CHN: 'cantonStar',
  CUB: 'cuba',
  DEU: 'horizontal',
  DNK: 'nordic',
  EGY: 'horizontal',
  ETH: 'horizontal',
  FRA: 'vertical',
  GBR: 'union',
  IDN: 'bicolor',
  IND: 'india',
  IRN: 'horizontal',
  IRQ: 'horizontal',
  ISR: 'israel',
  ITA: 'vertical',
  JPN: 'disc',
  KOR: 'taegeuk',
  LBN: 'lebanon',
  MEX: 'vertical',
  NGA: 'vertical',
  PAK: 'pakistan',
  PHL: 'philippines',
  POL: 'bicolor',
  PRK: 'prk',
  PSX: 'triangle',
  RUS: 'horizontal',
  SAU: 'saudi',
  SDN: 'horizontal',
  SYR: 'horizontal',
  TUR: 'crescent',
  TWN: 'cantonSun',
  UKR: 'bicolor',
  USA: 'usa',
  VEN: 'horizontal',
  YEM: 'horizontal',
  ZAF: 'zaf',
};

export const FLAG_LAYOUT: Record<string, FlagLayout> = Object.fromEntries(
  Object.entries(BY_COUNTRY)
    .filter(([id]) => FLAG_COLORS[id])
    .map(([id, layout]) => [FLAG_COLORS[id].join(), layout]),
);

export const flagLayout = (colors: readonly string[]): FlagLayout => FLAG_LAYOUT[colors.join()] ?? 'vertical';
