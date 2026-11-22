import type { TurnReport, WorldState } from '../store/gameStore';
import { type SceneKind, actionFamily, alternateScene, optionKeyword } from '../scenes/kinds';
import { buildPages } from './debrief';
import { resultScene } from './ease';

/**
 * The month's one picture (F-01-4, QA S3-1): the result card and the paper's lead story show the
 * same scene, chosen from what happened (lib/ease resultScene) and never last month's room.
 * The choice is remembered per save and month (session storage), so reopening the card or the
 * paper shows the same picture.
 */

const KEY = 'worldconflict.monthScenes';

function readMap(): Record<string, SceneKind> {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) ?? '{}') as Record<string, SceneKind>;
  } catch {
    return {};
  }
}

function writeMap(m: Record<string, SceneKind>) {
  try {
    const keys = Object.keys(m);
    // keep the last 40 months
    for (const k of keys.slice(0, Math.max(0, keys.length - 40))) delete m[k];
    sessionStorage.setItem(KEY, JSON.stringify(m));
  } catch {
    /* storage unavailable */
  }
}

/** The lead item's family: an order's action type, else the chosen option's keyword. */
function leadFamily(report: TurnReport): 'diplomacy' | 'domestic' | 'military' | 'intel' | undefined {
  const h = report.highlight;
  if (h?.ref === 'order') {
    const t = report.orders[h.index]?.type;
    return t ? actionFamily(t) : undefined;
  }
  if (h?.ref === 'decision') {
    const d = report.decisions[h.index];
    if (!d) return undefined;
    if (d.kind === 'CALL' || d.kind === 'VISIT') return 'diplomacy';
    return optionKeyword(d.choice)?.family;
  }
  if (h?.ref === 'war') return 'military';
  return undefined;
}

export function monthScene(report: TurnReport, world: WorldState, saveId: string | null = null): SceneKind | undefined {
  const key = `${saveId ?? 'game'}:${report.turn}`;
  const map = readMap();
  if (map[key]) return map[key];
  const card = buildPages(report, world)[0]?.cards[0];
  if (!card?.scene && !report.highlight) return undefined;
  const fronts = (report.wars ?? []).map((w) => Math.abs(w.frontAfter - w.frontBefore));
  const rel = card?.relation ?? card?.facts.find((f) => /view of you/i.test(f.label));
  const appr = report.deltas.approval;
  const scene = resultScene(
    card?.scene,
    {
      verdict: card?.verdict,
      front: fronts.length ? Math.max(...fronts) : 0,
      relation: rel ? rel.after - rel.before : 0,
      tension: report.tension ? world.globalTension - report.tension.before : 0,
      approval: appr ? appr.after - appr.before : 0,
      failed: card?.verdict === 'bad' && /failed/i.test(card.headline),
      family: leadFamily(report),
    },
    map[`${saveId ?? 'game'}:${report.turn - 1}`],
    alternateScene,
  );
  map[key] = scene;
  writeMap(map);
  return scene;
}
