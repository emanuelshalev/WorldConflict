import { IconAnchor, IconCrownOff, IconRadioactive, IconSwords, type Icon } from '@tabler/icons-react';

export type CrisisKind = 'WAR' | 'SEA' | 'REGIME' | 'NUCLEAR';

/** The four kinds of fire on the title globe: icon, colour and a line for the map key. */
export const CRISIS_KINDS: Record<CrisisKind, { label: string; icon: Icon; color: string; blurb: string }> = {
  WAR: { label: 'Open war', icon: IconSwords, color: '#ff4d4f', blurb: 'Armies are already fighting' },
  SEA: { label: 'Standoff at sea', icon: IconAnchor, color: '#36c5f0', blurb: 'Ships, straits, shoals and blockades' },
  REGIME: { label: 'Regime in crisis', icon: IconCrownOff, color: '#b48cff', blurb: 'Coups, civil wars, a dictator gone' },
  NUCLEAR: { label: 'Nuclear rivals', icon: IconRadioactive, color: '#f5d547', blurb: 'Two bombs, one fuse' },
};

export const kindOf = (k?: string): CrisisKind => (k && k in CRISIS_KINDS ? (k as CrisisKind) : 'WAR');
