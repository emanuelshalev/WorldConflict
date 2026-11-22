import type { CodexEntry } from '../../lib/codexMatch';
import { withArticle } from '../../lib/format';
import { KIND_WORD, foldName as norm, placeName, samePerson } from './explain';

export { samePerson };
import type { PlayerViewCountry, WorldState } from '../../store/gameStore';

/**
 * The "In your game" line of an explainer (design-learn.md §4): what is true in the player's
 * world right now. Foreign countries come only from the belief-filtered `playerView` (ranges,
 * never ground truth: the asymmetric information invariant). Wars, hot zones and leaders are
 * public. Returns null when there is nothing live to say.
 */

function relationWord(r: number): string {
  if (r >= 60) return 'close';
  if (r >= 25) return 'friendly';
  if (r > -25) return 'cool';
  if (r > -60) return 'hostile';
  return 'enemies';
}

function range(u: { low: number; high: number }): string {
  const lo = Math.round(u.low);
  const hi = Math.round(u.high);
  return lo === hi ? `${lo}` : `${lo} to ${hi}`;
}

/** The country this entry is (a country place entry), if any. */
export function countryOfEntry(entry: CodexEntry, view: readonly PlayerViewCountry[]): PlayerViewCountry | null {
  if (entry.kind !== 'place' || !entry.countryId) return null;
  const c = view.find((v) => v.id === entry.countryId);
  return c && norm(c.name) === norm(entry.name) ? c : null;
}

/** Front line from the player's side when they fight, else from the attacker's. */
function frontWords(world: WorldState, countryId: string, playerId: string): string | null {
  const war = world.wars.find((w) => w.attackerId === countryId || w.defenderId === countryId);
  if (!war) return null;
  const name = (id: string) => world.countries.find((c) => c.id === id)?.name ?? id;
  const mine = war.attackerId === playerId || war.defenderId === playerId;
  const side = mine ? playerId : war.attackerId;
  const f = Math.round(side === war.attackerId ? war.frontline : 100 - war.frontline);
  const state = f >= 60 ? 'gaining' : f <= 40 ? 'losing ground' : 'close to stalemate';
  const who = mine ? 'you are' : `${name(side)} is`;
  const enemy = side === war.attackerId ? war.defenderId : war.attackerId;
  return `War with ${name(enemy)}: front line ${f} of 100, ${who} ${state}.`;
}

export function liveLine(entry: CodexEntry, world: WorldState | null, view: readonly PlayerViewCountry[]): string | null {
  if (!world) return null;
  const me = world.playerCountryId;
  const nameOf = (id: string) => view.find((v) => v.id === id)?.name ?? world.countries.find((c) => c.id === id)?.name ?? id;

  // Hot zones that are not states (Gaza, the West Bank)
  const zone = world.hotspots?.find((h) => norm(h.name) === norm(entry.name) || (entry.countryId && h.mapId === entry.countryId && entry.kind === 'place'));
  if (zone) {
    const phase = zone.phase.toLowerCase();
    return `${zone.name} is ${phase === 'war' ? 'at war' : phase}: violence ${Math.round(zone.violence)} of 100, humanitarian need ${Math.round(zone.humanitarian)} of 100.`;
  }

  // A country
  const country = countryOfEntry(entry, view);
  if (country) {
    if (country.isPlayer) {
      const front = frontWords(world, me, me);
      return front ? `Your country. ${front}` : `Your country, led by you.`;
    }
    const parts: string[] = [];
    if (country.atWarWith.includes(me)) parts.push('At war with you.');
    else parts.push(`Relations with you: ${Math.round(country.relationWithPlayer)}, ${relationWord(country.relationWithPlayer)}.`);
    const front = country.atWarWith.length && !country.atWarWith.includes(me) ? frontWords(world, country.id, me) : null;
    if (front) parts.push(front);
    parts.push(`Stability ${range(country.stability)} (your intelligence estimate).`);
    return parts.join(' ');
  }

  // A leader
  if (entry.kind === 'person' && entry.countryId) {
    const c = view.find((v) => v.id === entry.countryId);
    if (!c) return null;
    if (!samePerson(c.leader.name, entry.name)) return `No longer in power in your game: ${c.name} is now led by ${c.leader.name}.`;
    if (c.isPlayer) return `That is you. ${c.leader.title} of ${c.name}.`;
    if (c.atWarWith.includes(me)) return `In power, and at war with you.`;
    return `In power. ${c.name}'s relations with you: ${Math.round(c.relationWithPlayer)}, ${relationWord(c.relationWithPlayer)}.`;
  }

  // A place inside a war (a city, a region): the front line of that country's war
  // A city, region or capital ("Washington" for the US government): that country's relations and war
  if (entry.kind === 'place' && entry.countryId) {
    const c = view.find((v) => v.id === entry.countryId);
    const front = frontWords(world, entry.countryId, me);
    if (!c || c.isPlayer) return front;
    const rel = c.atWarWith.includes(me) ? `${nameOf(c.id)} is at war with you.` : `${nameOf(c.id)}: relations with you ${Math.round(c.relationWithPlayer)}, ${relationWord(c.relationWithPlayer)}.`;
    return front && !c.atWarWith.includes(me) ? `${rel} ${front}` : rel;
  }
  return null;
}

const ORIGIN_WORD: Record<string, string> = {
  ELECTED: 'election',
  COUP: 'coup',
  SUCCESSION: 'succession',
  REVOLUTION: 'revolution',
  APPOINTED: 'appointment',
};

/** A leader who came to power during this game (generated name, never real). */
export function fictionalLeader(world: WorldState | null, view: readonly PlayerViewCountry[], countryId: string): { name: string; title: string; country: string; line: string } | null {
  const c = view.find((v) => v.id === countryId);
  if (!c || !world) return null;
  const startTurn = c.leader.sinceTurn ?? 0;
  const [y, m] = world.date.split('-').map(Number);
  const months = y * 12 + (m - 1) - (world.turn - startTurn);
  const when = new Date(Date.UTC(Math.floor(months / 12), months % 12, 1)).toLocaleString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
  const how = ORIGIN_WORD[c.leader.origin] ?? c.leader.origin.toLowerCase();
  return {
    name: c.leader.name,
    title: c.leader.title,
    country: c.name,
    line: `Came to power in your game in ${when} (${how}). A made-up person: the simulation names leaders who rise during play.`,
  };
}

/** Whether a country's current leader came to power during this game. */
export function isFictionalLeader(c: PlayerViewCountry | undefined): boolean {
  return !!c && (c.leader.sinceTurn ?? 0) > 0;
}

function firstClause(s: string): string {
  let cut = s.split(/(?<=[.:;])\s/)[0];
  const comma = cut.indexOf(', ');
  if (comma >= 20) cut = cut.slice(0, comma);
  return cut.length <= 90 ? cut.replace(/[.:;]$/, '') : `${cut.slice(0, 88).replace(/\s\S*$/, '')}...`;
}

function sinceYear(c: PlayerViewCountry): string {
  const d = (c.leader as { sinceDate?: string }).sinceDate;
  return d ? ` since ${d.slice(0, 4)}` : '';
}

/** "President of Ukraine since 2019", from the game's leader, else the entry's first clause. */
export function roleLine(entry: CodexEntry, view: readonly PlayerViewCountry[]): string {
  if (entry.kind === 'person' && entry.countryId) {
    const c = view.find((v) => v.id === entry.countryId);
    if (c && samePerson(c.leader.name, entry.name)) return `${c.leader.title} of ${withArticle(c.name)}${sinceYear(c)}`;
  }
  if (entry.kind !== 'person') return `${KIND_WORD[entry.kind]}${entry.countryId ? ` · ${placeName(entry.countryId)}` : ''}`;
  return firstClause(entry.short);
}

export function isPlayerEntry(entry: CodexEntry, view: readonly PlayerViewCountry[], playerId: string | undefined | null): boolean {
  if (!playerId || entry.countryId !== playerId) return false;
  const me = view.find((v) => v.id === playerId);
  if (entry.kind === 'person') return !!me && samePerson(me.leader.name, entry.name);
  return entry.kind === 'place' && !!me && me.name === entry.name;
}

