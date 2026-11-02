import {
  IconBomb,
  IconBuilding,
  IconBulldozer,
  IconCash,
  IconCloudStorm,
  IconFlame,
  IconHammer,
  IconHomeX,
  IconPlant,
  IconRocket,
  IconShield,
  IconSwords,
  IconTank,
  IconTruckDelivery,
  type Icon,
} from '@tabler/icons-react';
import type { Hotspot } from '../store/gameStore';

/** Mirrors hotspotSummary() in src/core/systems/hotspots.ts: plain words for a zone's phase. */
export function phaseLabel(h: Hotspot): string {
  if (h.phase === 'WAR') return 'At war';
  if (h.phase === 'CEASEFIRE') return h.violence >= 55 ? 'Ceasefire close to breaking' : 'Fragile ceasefire';
  if (h.phase === 'UPRISING') return 'Uprising';
  if (h.phase === 'CALM') return 'Calm for now';
  return 'Tense';
}

export function needLabel(h: Hotspot): string {
  if (h.humanitarian >= 75) return 'famine conditions';
  if (h.humanitarian >= 55) return 'a humanitarian emergency';
  if (h.humanitarian >= 35) return 'serious hardship';
  return 'manageable needs';
}

export function hotspotLine(h: Hotspot): string {
  return `${h.name}: ${phaseLabel(h).toLowerCase()}, ${needLabel(h)}, aid ${h.aid >= 55 ? 'flowing' : h.aid >= 30 ? 'restricted' : 'barely getting in'}.`;
}

/** Fill and outline colours by heat (colour-blind safe: lightness carries it as well as hue). */
export function heat(h: Hotspot): { fill: string; line: string } {
  if (h.phase === 'WAR') return { fill: '#a3121b', line: '#ff5a4f' };
  if (h.violence >= 60) return { fill: '#d7352f', line: '#ff8a7a' };
  if (h.violence >= 35) return { fill: '#e07b2e', line: '#ffc48a' };
  return { fill: '#c9a55a', line: '#f2dca4' };
}

const KIND_ICON: Record<string, Icon> = {
  strike: IconBomb,
  rocket: IconRocket,
  ground: IconTank,
  raid: IconTank,
  clash: IconSwords,
  attack: IconSwords,
  aid: IconTruckDelivery,
  crossing: IconTruckDelivery,
  famine: IconTruckDelivery,
  storm: IconCloudStorm,
  rebuild: IconHammer,
  isf: IconShield,
  tunnel: IconBulldozer,
  settler: IconFlame,
  outpost: IconBuilding,
  demolition: IconHomeX,
  salaries: IconCash,
  calm: IconPlant,
  protest: IconFlame,
  strike_day: IconCash,
};

/** The icon for a zone right now: its newest incident, or fire when it is at war. */
export function zoneIcon(h: Hotspot): Icon {
  if (h.phase === 'WAR') return IconFlame;
  return KIND_ICON[h.incidents[0]?.kind ?? ''] ?? IconFlame;
}

export const METER_LABELS = (h: Hotspot): Array<{ key: keyof Hotspot; label: string; bad: boolean }> => [
  { key: 'violence', label: 'Violence', bad: true },
  { key: 'humanitarian', label: 'Humanitarian need', bad: true },
  { key: 'aid', label: 'Aid getting in', bad: false },
  { key: 'governance', label: 'Civil order', bad: false },
  { key: 'control', label: h.id === 'GAZA' ? 'Held by the Israeli army' : 'Settlement and annexation', bad: true },
];
