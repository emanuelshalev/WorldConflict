import type { ActionPreview } from '../../store/gameStore';
import type { MenuEntry } from '../../lib/availability';

/** What a forecast needs: the server's menu entry or a full /preview-action result. */
export type PreviewSource = Pick<MenuEntry, 'summary' | 'effects' | 'risks' | 'missionWarning'> & {
  chance?: number | null;
  successChance?: number | null;
};

/** A forecast from either source, normalised. */
export function previewOf(p: MenuEntry | ActionPreview | null | undefined): PreviewSource | null {
  if (!p) return null;
  const chance = 'chance' in p ? p.chance : (p as ActionPreview).successChance;
  return { summary: p.summary, effects: p.effects, risks: p.risks, missionWarning: p.missionWarning ?? null, chance };
}

