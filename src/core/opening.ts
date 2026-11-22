/**
 * One Term "Start with" (F-02-7): the player picks one of the era's active situations (the war
 * in Ukraine, Hormuz, Taiwan...) and the first crisis on the desk is about it, framed from the
 * player's seat: a side in it, or an outsider deciding whether to back one side, broker talks
 * or stay out. Without a pick the drama director chooses as before.
 *
 * Pure: no I/O, no clock; deterministic given the world and the situation.
 */
import type { EraSituation } from "./data-loader.js";
import { isPresent } from "./era.js";
import type { SeededRandom } from "./seed.js";
import { possessive, withArticle } from "./text.js";
import type {
  CountryState,
  DecisionOption,
  GameEvent,
  PendingDecision,
  WorldState,
} from "./types.js";

/** The situations a Term may open on: the ones burning now (not frozen or still brewing). */
export function openingChoices(situations: EraSituation[]): EraSituation[] {
  return situations.filter((s) => s.phase === "ACTIVE");
}

const TEMPLATE_BY_KIND: Record<EraSituation["kind"], string> = {
  WAR: "opening_war",
  SEA: "opening_sea",
  REGIME: "opening_regime",
  NUCLEAR: "opening_nuclear",
  TRUCE: "opening_truce",
};

function opt(
  id: string,
  label: string,
  description: string,
  effects: Record<string, number>,
  extra: Partial<Pick<DecisionOption, "actions" | "tensionDelta" | "backedBy">> = {},
): DecisionOption {
  return {
    id,
    label,
    description,
    effects,
    actions: extra.actions ?? [],
    tensionDelta: extra.tensionDelta ?? 0,
    backedBy: extra.backedBy ?? [],
  };
}

const atWar = (a: CountryState, b: CountryState) => a.atWarWith.includes(b.id);

/** A name inside a sentence ("the United States"), and at its start ("The United States"). */
const nm = (c: CountryState) => withArticle(c.name);
const Nm = (c: CountryState) => {
  const n = nm(c);
  return n.charAt(0).toUpperCase() + n.slice(1);
};
const intro = (s: EraSituation) => `${s.blurb} It is the first file on your desk.`;

/** The other side the player faces in a situation they are part of (null for an internal one). */
function opponentOf(world: WorldState, player: CountryState, s: EraSituation): CountryState | null {
  const byId = (id: string) => world.countries.find((c) => c.id === id);
  if (s.line && (s.line.from === player.id || s.line.to === player.id)) {
    const other = byId(s.line.from === player.id ? s.line.to : s.line.from);
    if (isPresent(other)) return other;
  }
  const others = s.countries
    .map(byId)
    .filter((c): c is CountryState => isPresent(c) && c.id !== player.id)
    .sort(
      (a, b) =>
        Number(atWar(player, b)) - Number(atWar(player, a)) ||
        (player.relations[a.id] ?? 0) - (player.relations[b.id] ?? 0) ||
        a.id.localeCompare(b.id),
    );
  return others[0] ?? null;
}

/** For an outsider: the side closer to the player (friend) and the one across from it. */
function sidesFor(
  world: WorldState,
  player: CountryState,
  s: EraSituation,
): { friend: CountryState | null; foe: CountryState | null } {
  const byId = (id: string) => world.countries.find((c) => c.id === id);
  const ends = s.line ? [s.line.from, s.line.to] : s.countries;
  const sides = [...new Set(ends)]
    .map(byId)
    .filter((c): c is CountryState => isPresent(c) && c.id !== player.id);
  if (!sides.length) return { friend: null, foe: null };
  const sorted = [...sides].sort(
    (a, b) =>
      (player.relations[b.id] ?? 0) - (player.relations[a.id] ?? 0) || a.id.localeCompare(b.id),
  );
  const friend = sorted[0];
  const foe = sorted.length > 1 ? sorted[sorted.length - 1] : null;
  return { friend, foe: foe && foe.id !== friend.id ? foe : null };
}

interface Draft {
  title: string;
  situation: string;
  affected: string[];
  options: DecisionOption[];
  defaultOptionId: string;
}

function asSide(world: WorldState, player: CountryState, s: EraSituation): Draft {
  const foe = opponentOf(world, player, s);
  if (!foe) {
    // An internal conflict (Algeria for France in 1960, Sudan's civil war...)
    return {
      title: s.title,
      situation: `${intro(s)} The generals want more troops, the treasury wants the cost capped, and the street wants it over.`,
      affected: [player.id],
      options: [
        opt(
          "surge",
          "Send more troops",
          "Win it on the ground. Costly, popular with the hawks, hard on the budget.",
          { mobilization: 10, approval: 1, gdp: -0.3 },
          { tensionDelta: 2, backedBy: ["DEFENSE_MINISTER"] },
        ),
        opt(
          "talks",
          "Open talks",
          "Look for a political way out. The hardliners call it surrender.",
          { stability: 3, approval: -2, legitimacy: 2 },
          { tensionDelta: -2, backedBy: ["FOREIGN_MINISTER"] },
        ),
        opt(
          "contain",
          "Hold what you have",
          "No new gamble either way. Buys time, settles nothing.",
          { stability: 1 },
          { backedBy: ["CHIEF_OF_STAFF"] },
        ),
      ],
      defaultOptionId: "contain",
    };
  }
  const rel = `relations:${foe.id}`;
  if (atWar(player, foe)) {
    return {
      title: `${s.title}: the war you inherit`,
      situation: `${intro(s)} The war with ${nm(foe)} is yours now. Your generals want to press on; your diplomats see an opening for talks.`,
      affected: [player.id, foe.id],
      options: [
        opt(
          "press",
          "Press the offensive",
          `Push ${possessive(nm(foe))} forces back while you can. More men at the front, more risk.`,
          { mobilization: 10, approval: 2, [rel]: -6 },
          { tensionDelta: 4, backedBy: ["DEFENSE_MINISTER"] },
        ),
        opt(
          "hold",
          "Hold the line",
          "Dig in and keep the front where it is. Steady, and it settles nothing.",
          { stability: 2 },
          { backedBy: ["CHIEF_OF_STAFF"] },
        ),
        opt(
          "ceasefire",
          "Offer a ceasefire",
          `Ask ${nm(foe)} to stop the shooting. Popular abroad; the hawks at home call it weakness.`,
          { approval: -2, [rel]: 8 },
          {
            tensionDelta: -4,
            backedBy: ["FOREIGN_MINISTER"],
            actions: [{ type: "DIPLOMACY_PROPOSE_CEASEFIRE", targetCountryId: foe.id }],
          },
        ),
      ],
      defaultOptionId: "hold",
    };
  }
  return {
    title: `${s.title}: the standoff with ${nm(foe)}`,
    situation: `${intro(s)} ${Nm(foe)} is watching how the new leader reacts. A show of strength, a quiet call, or your allies first?`,
    affected: [player.id, foe.id],
    options: [
      opt(
        "strength",
        "Show of strength",
        `Put forces on alert facing ${nm(foe)}. Deterrence, or the first step to a fight.`,
        { mobilization: 8, approval: 2, [rel]: -8 },
        { tensionDelta: 4, backedBy: ["DEFENSE_MINISTER"] },
      ),
      opt(
        "channel",
        "Quiet back channel",
        `Call ${nm(foe)} privately and lower the temperature. Hawks call it weakness.`,
        { approval: -2, [rel]: 8 },
        { tensionDelta: -3, backedBy: ["FOREIGN_MINISTER"] },
      ),
      opt(
        "allies",
        "Rally your allies",
        "Line up your friends before you move. Slower, and nobody can say you stood alone.",
        { relationsAllies: 5, [rel]: -3 },
        { tensionDelta: 1, backedBy: ["CHIEF_OF_STAFF"] },
      ),
    ],
    defaultOptionId: "allies",
  };
}

function asOutsider(world: WorldState, player: CountryState, s: EraSituation): Draft {
  const { friend, foe } = sidesFor(world, player, s);
  if (!friend) {
    return {
      title: s.title,
      situation: `${intro(s)} It is far from your borders, but your allies want to know where you stand.`,
      affected: [player.id],
      options: [
        opt(
          "speak",
          "Speak up for a settlement",
          "Put your name behind a peaceful way out. Costs little, earns some respect.",
          { legitimacy: 1, relationsAllies: 2 },
          { tensionDelta: -1, backedBy: ["FOREIGN_MINISTER"] },
        ),
        opt(
          "home",
          "Keep your focus at home",
          "Not your fight. Voters like it; allies notice.",
          { approval: 1, relationsAllies: -2 },
          { backedBy: ["FINANCE_MINISTER"] },
        ),
      ],
      defaultOptionId: "home",
    };
  }
  const war = foe && atWar(friend, foe);
  const options: DecisionOption[] = [];
  if (foe) {
    options.push(
      opt(
        "back",
        `Back ${nm(friend)}`,
        `Weapons, money and your voice for ${nm(friend)}. ${Nm(foe)} will remember it.`,
        { gdp: -0.2, [`relations:${friend.id}`]: 12, [`relations:${foe.id}`]: -10 },
        { tensionDelta: 3, backedBy: ["DEFENSE_MINISTER"] },
      ),
      opt(
        "talks",
        war ? "Broker talks" : "Offer to mediate",
        `Put yourself between ${nm(friend)} and ${nm(foe)}. A long shot that earns respect if it moves.`,
        { [`relations:${friend.id}`]: 3, [`relations:${foe.id}`]: 4, legitimacy: 1 },
        {
          tensionDelta: -3,
          backedBy: ["FOREIGN_MINISTER"],
          actions: war ? [{ type: "DIPLOMACY_MEDIATE", targetCountryId: friend.id }] : [],
        },
      ),
    );
  } else if (s.kind === "WAR") {
    // A civil war (Sudan): aid and talks, not a side to back
    options.push(
      opt(
        "aid",
        "Send humanitarian aid",
        `Food, medicine and money for the people of ${nm(friend)}. It costs, and it buys goodwill.`,
        { gdp: -0.1, legitimacy: 1, [`relations:${friend.id}`]: 6 },
        { backedBy: ["FOREIGN_MINISTER"] },
      ),
      opt(
        "talks",
        "Push for talks",
        `Lean on the factions in ${nm(friend)} to talk. A long shot that earns respect if it moves.`,
        { legitimacy: 1, [`relations:${friend.id}`]: 3 },
        { tensionDelta: -1, backedBy: ["CHIEF_OF_STAFF"] },
      ),
    );
  } else {
    // Upheaval inside one country (the Soviet republics, apartheid): speak out or engage
    options.push(
      opt(
        "speak",
        "Speak out",
        `Say in public what you think of what ${nm(friend)} is doing. Your allies applaud; ${nm(friend)} does not.`,
        { legitimacy: 2, relationsAllies: 2, [`relations:${friend.id}`]: -6 },
        { tensionDelta: 1, backedBy: ["FOREIGN_MINISTER"] },
      ),
      opt(
        "engage",
        "Engage quietly",
        `Keep the channel to ${nm(friend)} open and press in private. Critics call it looking away.`,
        { approval: -1, [`relations:${friend.id}`]: 6 },
        { backedBy: ["CHIEF_OF_STAFF"] },
      ),
    );
  }
  options.push(
    opt(
      "out",
      "Stay out of it",
      `Keep your focus at home.${foe ? ` ${Nm(friend)} expected more.` : ""}`,
      foe ? { approval: 1, [`relations:${friend.id}`]: -4 } : { approval: 1, legitimacy: -1 },
      { backedBy: ["FINANCE_MINISTER"] },
    ),
  );
  return {
    title: s.title,
    situation: `${intro(s)} ${foe ? `${Nm(friend)} and ${nm(foe)} both want to know where ${nm(player)} stands.` : "The world is watching what you say."}`,
    affected: [player.id, friend.id, ...(foe ? [foe.id] : [])],
    options,
    defaultOptionId: "out",
  };
}

/**
 * The opening crisis about a chosen situation, as the event and the decision the desk shows.
 * Null when the player has no seat (should not happen at world creation).
 */
export function situationOpening(
  world: WorldState,
  s: EraSituation,
  _rng: SeededRandom,
): { event: GameEvent; decision: PendingDecision } | null {
  const player = world.countries.find((c) => c.id === world.playerCountryId);
  if (!player) return null;
  // A side is an end of the situation's front line (or, without a line, a listed country); the
  // US in the Ukraine card is a backer, framed as an outsider choosing whom to back
  const side = s.line
    ? s.line.from === player.id || s.line.to === player.id
    : s.countries.includes(player.id);
  const d = side ? asSide(world, player, s) : asOutsider(world, player, s);
  const templateId = TEMPLATE_BY_KIND[s.kind];
  const decision: PendingDecision = {
    id: `dec_${templateId}_${s.id}_${world.turn}`,
    turn: world.turn,
    title: d.title,
    situation: d.situation,
    affectedCountries: d.affected,
    options: d.options,
    deadlineTurn: world.turn + 1,
    templateId,
    urgency: "URGENT",
    defaultOptionId: d.defaultOptionId,
  };
  const event: GameEvent = {
    id: `evt_crisis_${templateId}_${s.id}_${world.turn}`,
    type: "CRISIS",
    title: `${s.title}: the new leader's first call`,
    description: s.blurb,
    affectedCountries: d.affected,
    turn: world.turn,
    severity: "MAJOR",
    decision,
  };
  return { event, decision };
}
