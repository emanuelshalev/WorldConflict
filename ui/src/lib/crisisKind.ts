import { IconAnchor, IconCrownOff, IconFence, IconRadioactive, IconSwords, type Icon } from '@tabler/icons-react';

export type CrisisKind = 'WAR' | 'SEA' | 'REGIME' | 'NUCLEAR';
/** Era situations add the armed truce (Berlin, the Korean line): design-worldmap.md 3.3. */
export type SituationKindId = CrisisKind | 'TRUCE';

export interface KindInfo {
  label: string;
  icon: Icon;
  color: string;
  blurb: string;
  /** Icon ink on the pin: white, except on the pale truce pin. */
  ink?: string;
}

/** The four kinds of fire on the title globe: icon, colour and a line for the map key. */
export const CRISIS_KINDS: Record<CrisisKind, KindInfo> = {
  WAR: { label: 'Open war', icon: IconSwords, color: '#ff4d4f', blurb: 'Armies are already fighting' },
  SEA: { label: 'Standoff at sea', icon: IconAnchor, color: '#36c5f0', blurb: 'Ships, straits, shoals and blockades' },
  REGIME: { label: 'Regime in crisis', icon: IconCrownOff, color: '#b48cff', blurb: 'Coups, civil wars, a dictator gone' },
  NUCLEAR: { label: 'Nuclear rivals', icon: IconRadioactive, color: '#f5d547', blurb: 'Two bombs, one fuse' },
};

/** Every kind an era situation can have: the four crisis kinds plus the armed truce. */
export const SITUATION_KINDS: Record<SituationKindId, KindInfo> = {
  ...CRISIS_KINDS,
  TRUCE: { label: 'Armed truce', icon: IconFence, color: '#c9d3e0', blurb: 'A line nobody crosses, yet', ink: '#1b2433' },
};

export const kindOf = (k?: string): CrisisKind => (k && k in CRISIS_KINDS ? (k as CrisisKind) : 'WAR');
export const situationKindOf = (k?: string): SituationKindId =>
  k && k in SITUATION_KINDS ? (k as SituationKindId) : 'WAR';
