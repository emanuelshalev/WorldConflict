import { countryName, type GameOver, type TurnReport, type WorldState, useGameStore } from '../store/gameStore';
import type { SceneKind } from '../scenes/kinds';
import type { StingerSound } from './sound';

/**
 * Big moments (design-feel.md 6.4, FEEL-4): derived on the client from the report, the game over
 * and a comparison with the world before the month. At most one per Execute, by priority; never the
 * same kind two months running unless it is nuclear. The rest stay the debrief highlight and the
 * paper's headline.
 */
export type MomentKind = 'nuclear' | 'war' | 'coup' | 'deposed' | 'peace' | 'mission';

export interface BigMoment {
  kind: MomentKind;
  title: string;
  /** "SAUDI ARABIA AGAINST YEMEN · MONTH 4" */
  line: string;
  stat?: { label: string; before: number; after: number };
  scene: SceneKind;
  home: string;
  other?: string;
  sound: StingerSound;
  /** Mission complete and deposition hand off to the end screen, not the result card. */
  ending: boolean;
}

const PRIORITY: MomentKind[] = ['nuclear', 'war', 'coup', 'deposed', 'peace', 'mission'];
const DEPOSED = new Set(['LOST_ELECTION', 'DEPOSED_COUP', 'REVOLUTION', 'ASSASSINATED', 'IMPEACHED', 'COUNTRY_COLLAPSED']);

// The world as it was before the month just played (kept as the store's world changes)
let before: WorldState | null = null;
let lastKind: { kind: MomentKind; turn: number } | null = null;
useGameStore.subscribe((s, prev) => {
  if (s.worldState !== prev.worldState && prev.worldState && s.worldState && s.worldState.turn === prev.worldState.turn + 1) before = prev.worldState;
  else if (s.worldState && prev.worldState && s.worldState.turn < prev.worldState.turn) before = null;
});

const up = (s: string) => s.toUpperCase();

/** Every moment the month produced, highest priority first. */
export function momentsFor(report: TurnReport | null | undefined, world: WorldState, prev: WorldState | null = before, gameOver: GameOver | null = world.gameOver): BigMoment[] {
  const home = world.playerCountryId;
  const me = countryName(home);
  const month = `MONTH ${world.turn}`;
  const out: BigMoment[] = [];
  const events = useGameStore.getState().lastEvents;
  // Nuclear: a strike by anyone, or the player's programme reaching a test
  const strike = (report?.world ?? []).find((m) => m.type === 'NUCLEAR_STRIKE') ?? (report?.orders ?? []).find((o) => o.type === 'NUCLEAR_STRIKE' && o.ok);
  const nukeEvent = events.find((e) => e.type === 'NUCLEAR' && /strike|detonat|nuclear attack/i.test(`${e.title} ${e.description}`));
  const wasStatus = prev?.countries.find((c) => c.id === home)?.nuclear.status;
  const nowStatus = world.countries.find((c) => c.id === home)?.nuclear.status;
  if (strike || nukeEvent) {
    const actor = strike && 'actor' in strike ? strike.actor : nukeEvent?.affectedCountries[0];
    const target = strike && 'target' in strike ? strike.target : nukeEvent?.affectedCountries[1];
    out.push({
      kind: 'nuclear',
      title: 'Nuclear strike',
      line: `${up(actor ? countryName(actor) : me)}${target ? ` ON ${up(countryName(target))}` : ''} · ${month}`,
      stat: report?.tension ? { label: 'World tension', before: report.tension.before, after: Math.round(world.globalTension) } : undefined,
      scene: 'nuclear',
      home: actor ?? home,
      other: target,
      sound: 'nuclear',
      ending: false,
    });
  } else if (wasStatus && wasStatus !== 'TESTED' && wasStatus !== 'ARMED' && nowStatus === 'TESTED') {
    out.push({ kind: 'nuclear', title: 'Nuclear test', line: `${up(me)} · ${month}`, scene: 'nuclear', home, sound: 'nuclear', ending: false });
  }
  // War: a new war involving the player (declared by, on, or via a pact)
  const prevWars = new Set((prev?.wars ?? []).map((w) => w.id));
  const fresh = prev ? world.wars.find((w) => !prevWars.has(w.id) && (w.attackerId === home || w.defenderId === home)) : undefined;
  if (fresh || report?.moments.includes('UNDER ATTACK')) {
    const enemy = fresh ? (fresh.attackerId === home ? fresh.defenderId : fresh.attackerId) : undefined;
    const declared = fresh?.attackerId === home;
    out.push({
      kind: 'war',
      title: report?.moments.includes('ACT OF WAR') ? 'Act of war' : 'War declared',
      line: enemy ? `${up(declared ? me : countryName(enemy))} AGAINST ${up(declared ? countryName(enemy) : me)} · ${month}` : `${up(me)} · ${month}`,
      stat: report?.tension ? { label: 'World tension', before: report.tension.before, after: Math.round(world.globalTension) } : undefined,
      scene: declared ? 'address' : 'deployment',
      home,
      other: enemy,
      sound: 'war',
      ending: false,
    });
  }
  // Coup abroad (yours), or the player deposed
  if (report?.moments.includes('REGIME CHANGE')) {
    const o = report.orders.find((x) => x.type === 'INTEL_COUP' && x.ok);
    out.push({ kind: 'coup', title: 'Regime change', line: `${o?.target ? up(countryName(o.target)) : 'ABROAD'} · ${month}`, scene: 'covert', home, other: o?.target, sound: 'coup', ending: false });
  }
  if (gameOver && DEPOSED.has(gameOver.reason)) {
    const title = gameOver.reason === 'LOST_ELECTION' ? 'Voted out' : gameOver.reason === 'ASSASSINATED' ? 'Assassinated' : gameOver.reason === 'COUNTRY_COLLAPSED' ? 'Collapse' : 'Regime change';
    out.push({ kind: 'deposed', title, line: `${up(me)} · ${month}`, scene: gameOver.reason === 'LOST_ELECTION' ? 'election' : 'streets', home, sound: 'coup', ending: true });
  }
  // Peace: you made it, or your war ended
  const ended = (report?.wars ?? []).find((w) => w.ended);
  if (report?.moments.includes('PEACEMAKER') || ended) {
    out.push({
      kind: 'peace',
      title: 'Ceasefire',
      line: ended ? `${up(me)} AND ${up(countryName(ended.vs))} · ${month}` : `${up(me)} · ${month}`,
      scene: 'ceasefire',
      home,
      other: ended?.vs,
      sound: 'peace',
      ending: false,
    });
  }
  // Mission complete: the game ended with a win
  if (gameOver && world.outcome?.victory) {
    out.push({ kind: 'mission', title: 'Mission complete', line: `${up(me)} · ${world.objective?.title ? up(world.objective.title) : month}`, scene: 'signing', home, sound: 'mission', ending: true });
  }
  return out.sort((a, b) => PRIORITY.indexOf(a.kind) - PRIORITY.indexOf(b.kind));
}

/** The one stinger for this Execute, or null (once per month; no repeat kind two months running). */
let cache: { world: WorldState; value: BigMoment | null } | null = null;
export function bigMomentFor(report: TurnReport | null | undefined, world: WorldState): BigMoment | null {
  if (cache?.world === world) return cache.value;
  const value = pickMoment(report, world);
  cache = { world, value };
  return value;
}

function pickMoment(report: TurnReport | null | undefined, world: WorldState): BigMoment | null {
  const list = momentsFor(report, world);
  const pick = list.find((m) => m.kind === 'nuclear' || !(lastKind && lastKind.kind === m.kind && lastKind.turn === world.turn - 1)) ?? null;
  if (pick) lastKind = { kind: pick.kind, turn: world.turn };
  return pick;
}
