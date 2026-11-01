/**
 * Static geography for the playable roster: land borders and landlocked
 * states. Capitals are too coarse for this (Cairo is closer to Tehran than to
 * Addis Ababa), so crises that need a shared frontier or a coastline use these.
 */

const BORDERS: Record<string, string[]> = {
  AFG: ["CHN", "IRN", "PAK"],
  ARE: ["SAU"],
  BLR: ["POL", "RUS", "UKR"],
  BRA: ["VEN"],
  CAN: ["USA"],
  CHN: ["AFG", "IND", "PAK", "PRK", "RUS"],
  DEU: ["DNK", "FRA", "POL"],
  DNK: ["DEU"],
  EGY: ["ISR", "PSX", "SDN"],
  ETH: ["SDN"],
  FRA: ["DEU", "ITA"],
  IND: ["CHN", "PAK"],
  IRN: ["AFG", "IRQ", "PAK", "TUR"],
  IRQ: ["IRN", "SAU", "SYR", "TUR"],
  ISR: ["EGY", "LBN", "PSX", "SYR"],
  ITA: ["FRA"],
  KOR: ["PRK"],
  LBN: ["ISR", "SYR"],
  MEX: ["USA"],
  PAK: ["AFG", "CHN", "IND", "IRN"],
  POL: ["BLR", "DEU", "RUS", "UKR"],
  PRK: ["CHN", "KOR", "RUS"],
  PSX: ["EGY", "ISR"],
  RUS: ["BLR", "CHN", "POL", "PRK", "UKR"],
  SAU: ["ARE", "IRQ", "YEM"],
  SDN: ["EGY", "ETH"],
  SYR: ["IRQ", "ISR", "LBN", "TUR"],
  TUR: ["IRN", "IRQ", "SYR"],
  UKR: ["BLR", "POL", "RUS"],
  USA: ["CAN", "MEX"],
  VEN: ["BRA"],
  YEM: ["SAU"],
};

const LANDLOCKED = new Set(["AFG", "BLR", "ETH"]);

/** Do a and b share a land border? Undefined for countries outside the table. */
export function sharesLandBorder(a: string, b: string): boolean | undefined {
  const fromA = BORDERS[a];
  const fromB = BORDERS[b];
  if (!fromA && !fromB) return undefined;
  return (fromA ?? []).includes(b) || (fromB ?? []).includes(a);
}

export function isLandlocked(id: string): boolean {
  return LANDLOCKED.has(id);
}
