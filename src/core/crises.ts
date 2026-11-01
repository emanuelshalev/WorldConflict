import { isLandlocked, sharesLandBorder } from "./geography.js";
import type { SeededRandom } from "./seed.js";
import { possessive } from "./text.js";
import type {
  CountryState,
  DecisionOption,
  GameEvent,
  PendingDecision,
  ScheduledCrisis,
  WorldState,
} from "./types.js";

/**
 * The drama director: player-facing crises. World events (events.ts) describe
 * what happens to everyone; crises are the decisions only the player makes.
 *
 * Each template is grounded in a recurring historical pattern and offers 2–3
 * options with readable trade-offs. Some options schedule a delayed follow-up
 * (a consequence that lands 1–4 months later), which is what makes choices
 * memorable. The director guarantees a cadence per mode — every Flashpoint
 * turn has a decision; Term/Legacy never go quiet for long — and avoids
 * repeating the same story within six months.
 */

interface Ctx {
  world: WorldState;
  player: CountryState;
  rng: SeededRandom;
}

interface CrisisDraft {
  headline: string;
  text: string;
  decision?: {
    title: string;
    situation: string;
    affectedCountries: string[];
    options: DecisionOption[];
    urgency?: PendingDecision["urgency"];
    defaultOptionId?: string;
  };
  // Outcome-only follow-ups apply effects immediately and just report them
  effects?: Record<string, number>;
}

interface CrisisTemplate {
  id: string;
  /** 0 = not eligible. Scheduled-only templates return 0 here. */
  weight: (ctx: Ctx) => number;
  build: (ctx: Ctx, scheduled?: ScheduledCrisis) => CrisisDraft | null;
}

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function opt(
  id: string,
  label: string,
  description: string,
  effects: Record<string, number> = {},
  extra: Partial<Omit<DecisionOption, "id" | "label" | "description" | "effects">> = {},
): DecisionOption {
  return {
    id,
    label,
    description,
    effects,
    actions: extra.actions ?? [],
    tensionDelta: extra.tensionDelta ?? 0,
    followUp: extra.followUp,
    backedBy: extra.backedBy ?? [],
  };
}

const alive = (c: CountryState | undefined): c is CountryState => !!c && !c.collapsed;

function find(world: WorldState, id: string | undefined): CountryState | undefined {
  return id ? world.countries.find((c) => c.id === id) : undefined;
}

/** Most hostile living rival of the player (historical rival or relation < -30). */
function worstRival(ctx: Ctx, maxRelation = -30): CountryState | undefined {
  const { world, player } = ctx;
  return world.countries
    .filter(
      (c) =>
        alive(c) &&
        c.id !== player.id &&
        ((player.relations[c.id] ?? 0) < maxRelation ||
          player.history.historicalRivals.includes(c.id)),
    )
    .sort((a, b) => (player.relations[a.id] ?? 0) - (player.relations[b.id] ?? 0))[0];
}

export function distanceKm(a?: [number, number], b?: [number, number]): number {
  if (!a || !b) return Number.POSITIVE_INFINITY;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[1] - a[1]);
  const dLon = toRad(b[0] - a[0]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a[1])) * Math.cos(toRad(b[1])) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/** Shared land frontier (static table), falling back to capital distance for unknown states. */
export function areNeighbors(a: CountryState, b: CountryState): boolean {
  return sharesLandBorder(a.id, b.id) ?? distanceKm(a.capital, b.capital) < 1500;
}

/** How a non-border encounter happens: at sea only if both states have a navy's coastline. */
export function encounterAtSea(a: CountryState, b: CountryState): boolean {
  return !isLandlocked(a.id) && !isLandlocked(b.id);
}

const leaderOf = (c: CountryState) => `${c.leader.title} ${c.leader.name}`;

// ----------------------------------------------------------------------------
// Templates
// ----------------------------------------------------------------------------

const TEMPLATES: CrisisTemplate[] = [
  // --- Military incident with a rival (Gulf of Tonkin, Doklam, Black Sea intercepts) ---
  {
    id: "military_incident",
    weight: (ctx) => {
      const r = worstRival(ctx);
      return r && !ctx.player.atWarWith.includes(r.id) ? 3 : 0;
    },
    build: (ctx) => {
      const r = worstRival(ctx);
      if (!r) return null;
      const border = areNeighbors(ctx.player, r);
      const what = border
        ? `Your border units exchanged fire with ${possessive(r.name)} forces`
        : encounterAtSea(ctx.player, r)
          ? `A warship from ${r.name} and one of your patrol aircraft came within meters of collision in international waters`
          : `A military drone from ${r.name} was intercepted at the edge of your airspace, and your jets nearly fired`;
      return {
        headline: border
          ? `Firefight on the ${ctx.player.name}–${r.name} frontier`
          : `${ctx.player.name} and ${r.name} in dangerous military encounter`,
        text: `${what}. ${leaderOf(r)} accuses you of provocation.`,
        decision: {
          title: `Incident with ${r.name}`,
          situation: `${what}. ${leaderOf(r)} blames you publicly. Hardliners demand a show of strength; your diplomats urge a quiet phone call.`,
          affectedCountries: [ctx.player.id, r.id],
          options: [
            opt(
              "deescalate",
              "Call them quietly",
              "Open a back channel and pull units back. Avoids escalation; hawks call it weakness.",
              { approval: -3, [`relations:${r.id}`]: 10 },
              { tensionDelta: -4, backedBy: ["FOREIGN_MINISTER"] },
            ),
            opt(
              "condemn",
              "Condemn publicly",
              "Demand an apology on every channel. Saves face, keeps the standoff alive.",
              { approval: 2, [`relations:${r.id}`]: -5 },
              { tensionDelta: 2, backedBy: ["CHIEF_OF_STAFF"] },
            ),
            opt(
              "reinforce",
              "Reinforce and shadow them",
              "Surge forces to the area. Deterrence — or the first step toward war.",
              { approval: 4, mobilization: 10, [`relations:${r.id}`]: -12 },
              {
                tensionDelta: 6,
                backedBy: ["DEFENSE_MINISTER"],
                followUp: { templateId: "standoff_escalates", delay: 2 },
              },
            ),
          ],
          defaultOptionId: "condemn",
        },
      };
    },
  },

  // follow-up: the standoff you chose to sustain
  {
    id: "standoff_escalates",
    weight: () => 0,
    build: (ctx) => {
      const r = worstRival(ctx, 0);
      if (!r) return null;
      return {
        headline: `Standoff with ${r.name} enters its second month`,
        text: `Both militaries remain eyeball to eyeball.`,
        decision: {
          title: `The standoff with ${r.name}`,
          situation: `Your reinforcements stared down ${r.name} for weeks. Their commanders are now massing equipment of their own. One wrong move by a junior officer could start a war nobody planned.`,
          affectedCountries: [ctx.player.id, r.id],
          urgency: "EXISTENTIAL",
          options: [
            opt(
              "hotline",
              "Propose a deconfliction hotline",
              "Lock in rules of engagement. Calms the region; you look reasonable.",
              { [`relations:${r.id}`]: 12, approval: 1 },
              { tensionDelta: -8, backedBy: ["FOREIGN_MINISTER"] },
            ),
            opt(
              "hold",
              "Hold the line",
              "Stay put. Your resolve is noted — by your voters and their generals.",
              { approval: 3, stability: -2 },
              { tensionDelta: 4, backedBy: ["DEFENSE_MINISTER"] },
            ),
            opt(
              "pullback",
              "Withdraw with a face-saving statement",
              "Declare 'mission accomplished' and bring the troops home.",
              { approval: -4, mobilization: -10, [`relations:${r.id}`]: 6 },
              { tensionDelta: -5 },
            ),
          ],
          defaultOptionId: "hold",
        },
      };
    },
  },

  // --- Corruption scandal (hubris: more likely when riding high) ---
  {
    id: "corruption_scandal",
    weight: (ctx) => (ctx.player.approval > 75 ? 4 : 1.2),
    build: (ctx) => ({
      headline: `Scandal engulfs ${possessive(ctx.player.leader.name)} inner circle`,
      text: `Leaked documents implicate senior officials around you in a vast embezzlement scheme.`,
      decision: {
        title: "Corruption scandal",
        situation: `Documents leaked to the press implicate your inner circle in large-scale embezzlement. ${
          ctx.player.regimeType === "DEMOCRACY"
            ? "The opposition demands resignations and the press smells blood."
            : "The story is banned at home but circulating inside the elite — the dangerous audience."
        }`,
        affectedCountries: [ctx.player.id],
        options: [
          opt(
            "purge",
            "Fire them and prosecute",
            "Restores some trust. The people you fire had friends.",
            { legitimacy: 6, stability: -3, pc: -1 },
            { backedBy: ["DOMESTIC_ADVISOR"] },
          ),
          opt(
            "deny",
            "Call it a foreign forgery",
            "Your base believes you. Nobody else does.",
            { approval: -4, legitimacy: -5 },
            {
              backedBy: ["CHIEF_OF_STAFF"],
              followUp: { templateId: "scandal_second_leak", delay: 3 },
            },
          ),
          opt(
            "commission",
            "Launch an independent commission",
            "Slow and costly, but it could define your legacy.",
            { approval: 3, legitimacy: 3, pc: -2 },
            {},
          ),
        ],
        defaultOptionId: "deny",
      },
    }),
  },
  {
    id: "scandal_second_leak",
    weight: () => 0,
    build: (ctx) => ({
      headline: `Second leak contradicts ${possessive(ctx.player.leader.name)} denials`,
      text: `New documents show the 'forgery' was genuine.`,
      decision: {
        title: "The second leak",
        situation:
          "Your 'foreign forgery' story just collapsed: a second leak includes bank records with your chief of staff's signature. The cover-up is now the story.",
        affectedCountries: [ctx.player.id],
        urgency: "EXISTENTIAL",
        options: [
          opt(
            "sacrifice",
            "Sacrifice your chief of staff",
            "Throw them to the wolves. It may be enough.",
            { approval: 2, legitimacy: -2, stability: -2 },
          ),
          opt("apologize", "Televised apology", "Own it. Rare in politics — sometimes rewarded.", {
            approval: 5,
            legitimacy: -4,
          }),
          opt(
            "crackdown",
            "Shut down the outlets that published",
            "The leaks stop. So does any pretense of a free press.",
            { approval: -6, legitimacy: -8, stability: 3, relationsAllies: -6 },
          ),
        ],
        defaultOptionId: "sacrifice",
      },
    }),
  },

  // --- Telegraphed ouster in a consolidated democracy: impeachment / no-confidence ---
  {
    id: "ouster_vote",
    weight: () => 0,
    build: (ctx) => {
      const presidential = ctx.player.politicalSystem.type === "PRESIDENTIAL_DEMOCRACY";
      const what = presidential ? "articles of impeachment" : "a motion of no confidence";
      return {
        headline: presidential
          ? `Lawmakers draft articles of impeachment against ${ctx.player.leader.name}`
          : `${possessive(ctx.player.leader.name)} own backbenchers move against the government`,
        text: `With legitimacy at ${Math.round(ctx.player.legitimacy)}%, your opponents smell blood.`,
        decision: {
          title: presidential ? "Impeachment looms" : "A vote of no confidence",
          situation: `Your chief whip warns that ${what} will be tabled within weeks, and enough of your own side may vote for it. Stability ${Math.round(ctx.player.stability)}%, legitimacy ${Math.round(ctx.player.legitimacy)}%. Lose the vote and you are out.`,
          affectedCountries: [ctx.player.id],
          urgency: "EXISTENTIAL",
          options: [
            opt(
              "whip",
              "Whip the votes",
              "Committee seats, pork projects, phone calls at midnight. It works, once.",
              { coupShield: 5, pc: -2, legitimacy: -2 },
              { backedBy: ["CHIEF_OF_STAFF"] },
            ),
            opt(
              "inquiry",
              "Concede an independent inquiry",
              "Take the charge head-on and let investigators work. Humbling, but it splits the rebels.",
              { approval: 5, legitimacy: 4, coupShield: 3, stability: -2 },
              { backedBy: ["DOMESTIC_ADVISOR"] },
            ),
            opt(
              "rally",
              "Take it to the country",
              "A prime-time address and a tour of the swing districts: make the vote a referendum on you.",
              { approval: 7, coupShield: 2, pc: -1 },
              { backedBy: ["CHIEF_OF_STAFF"] },
            ),
          ],
          defaultOptionId: "whip",
        },
      };
    },
  },

  // --- Telegraphed coup (raised by government.ts when coup risk appears) ---
  {
    id: "coup_plot",
    weight: () => 0,
    build: (ctx) => ({
      headline: "Rumours of discontent in the officer corps",
      text: "Your intelligence chief requests an urgent meeting.",
      decision: {
        title: "Coup plot uncovered",
        situation: `Your intelligence chief lays out the evidence: a group of senior officers has been meeting in secret. Stability is ${Math.round(ctx.player.stability)}%, legitimacy ${Math.round(ctx.player.legitimacy)}%. If you do nothing, they may move within weeks.`,
        affectedCountries: [ctx.player.id],
        urgency: "EXISTENTIAL",
        options: [
          opt(
            "purge",
            "Purge the plotters",
            "Arrest the ringleaders tonight. Fear works — for a while.",
            { stability: -4, legitimacy: 5, coupShield: 6, approval: -2 },
            { backedBy: ["INTELLIGENCE_CHIEF"] },
          ),
          opt(
            "buyoff",
            "Buy the generals' loyalty",
            "Promotions, budgets, villas. Expensive, quiet, effective.",
            { gdp: -0.4, coupShield: 4, pc: -1 },
            { backedBy: ["DEFENSE_MINISTER"] },
          ),
          opt(
            "concede",
            "Address the nation and concede reforms",
            "Take the plotters' grievances public and act on them. Undercuts their cause.",
            { approval: 8, legitimacy: -4, stability: 4, coupShield: 3 },
            { backedBy: ["DOMESTIC_ADVISOR"] },
          ),
        ],
        defaultOptionId: "buyoff",
      },
    }),
  },

  // --- Telegraphed revolution / mass protests ---
  {
    id: "streets_boiling",
    weight: (ctx) => (ctx.player.stability < 35 && ctx.player.insurgencyLevel !== "NONE" ? 3 : 0),
    build: (ctx) => ({
      headline: `Hundreds of thousands march on ${possessive(ctx.player.name)} capital`,
      text: "The largest protests in a generation fill the streets.",
      decision: {
        title: "The streets are boiling",
        situation: `The largest protests in a generation fill the capital. Police commanders ask for orders; some units are fraternizing with the crowd. Stability ${Math.round(ctx.player.stability)}%.`,
        affectedCountries: [ctx.player.id],
        urgency: "EXISTENTIAL",
        options: [
          opt(
            "concessions",
            "Announce concessions",
            "Cabinet reshuffle, subsidies, an inquiry. Buys time.",
            { approval: 7, stability: 6, gdp: -0.3, legitimacy: -2 },
            { backedBy: ["DOMESTIC_ADVISOR"] },
          ),
          opt(
            "crackdown",
            "Clear the squares",
            "Order the security forces in. It ends tonight — one way or another.",
            { stability: 8, approval: -10, legitimacy: -6, relationsAllies: -8, insurgency: -1 },
            {
              backedBy: ["INTELLIGENCE_CHIEF"],
              followUp: { templateId: "crackdown_aftermath", delay: 2 },
            },
          ),
          opt(
            "unity",
            "Form a national unity government",
            "Bring the opposition into cabinet. You share power to keep it.",
            { approval: 5, legitimacy: 6, stability: 4, pc: -2 },
          ),
        ],
        defaultOptionId: "crackdown",
      },
    }),
  },
  {
    id: "crackdown_aftermath",
    weight: () => 0,
    build: (ctx) => ({
      headline: `Footage of ${ctx.player.name} crackdown circulates worldwide`,
      text: "Smuggled videos of the crackdown dominate foreign newscasts.",
      decision: {
        title: "Aftermath of the crackdown",
        situation:
          "Smartphone footage of the crackdown has gone global. Your allies' parliaments are debating sanctions and the families of the dead are organising.",
        affectedCountries: [ctx.player.id],
        options: [
          opt(
            "inquiry",
            "Order an inquiry, punish a few officers",
            "A gesture of accountability without undermining the security forces.",
            { relationsAllies: 6, approval: 3, stability: -2 },
          ),
          opt(
            "doubledown",
            "Blame foreign agitators",
            "Expel journalists. Your base rallies; the world shrugs you off.",
            { relationsAllies: -8, approval: 2, legitimacy: -3 },
          ),
        ],
        defaultOptionId: "doubledown",
      },
    }),
  },

  // --- Rival ultimatum (1914, Cuba 1962, Ukraine 2021) ---
  {
    id: "rival_ultimatum",
    weight: (ctx) => {
      const r = worstRival(ctx, -45);
      return r && !ctx.player.atWarWith.includes(r.id) && r.mobilizationLevel > 15 ? 2 : 0;
    },
    build: (ctx) => {
      const r = worstRival(ctx, -45);
      if (!r) return null;
      return {
        headline: `${r.name} issues ultimatum to ${ctx.player.name}`,
        text: `${leaderOf(r)} gives you 30 days to meet a list of demands.`,
        decision: {
          title: `Ultimatum from ${r.name}`,
          situation: `${leaderOf(r)} demands that you cut military cooperation with your allies and expel their advisors within 30 days — "or face the consequences." Their forces are at ${Math.round(r.mobilizationLevel)}% readiness.`,
          affectedCountries: [ctx.player.id, r.id],
          urgency: "EXISTENTIAL",
          options: [
            opt(
              "reject",
              "Reject it publicly",
              "Call their bluff. The nation rallies behind you — if it is a bluff.",
              { approval: 6, [`relations:${r.id}`]: -15, relationsAllies: 5 },
              {
                tensionDelta: 8,
                backedBy: ["DEFENSE_MINISTER"],
                followUp: { templateId: "ultimatum_expires", delay: 1 },
              },
            ),
            opt(
              "negotiate",
              "Counter-offer behind closed doors",
              "Give them something small to save face. Buys time.",
              { [`relations:${r.id}`]: 10, approval: -2, pc: -1 },
              { tensionDelta: -3, backedBy: ["FOREIGN_MINISTER"] },
            ),
            opt(
              "allies",
              "Rally your allies",
              "Get your allies to say an attack on you is an attack on them.",
              { relationsAllies: 6, [`relations:${r.id}`]: -6, pc: -2 },
              { tensionDelta: 2 },
            ),
          ],
          defaultOptionId: "reject",
        },
      };
    },
  },
  {
    id: "ultimatum_expires",
    weight: () => 0,
    build: (ctx) => {
      const r = worstRival(ctx, 100);
      if (!r) return null;
      const bluff = ctx.rng.nextBool(0.6 - r.personality.warPropensity / 300);
      return bluff
        ? {
            headline: `${possessive(r.name)} deadline passes quietly`,
            text: `${leaderOf(r)} blinked. Your refusal looks like statesmanship.`,
            effects: { approval: 6, legitimacy: 3 },
          }
        : {
            headline: `${r.name} masses troops after deadline expires`,
            text: `${leaderOf(r)} has moved armored divisions to the border.`,
            decision: {
              title: `${r.name} is massing troops`,
              situation: `The deadline passed and ${r.name} did not blink: satellite photos show armored divisions moving toward you. This is the moment your predecessors feared.`,
              affectedCountries: [ctx.player.id, r.id],
              urgency: "EXISTENTIAL",
              options: [
                opt(
                  "mobilize",
                  "Full mobilization",
                  "Call up the reserves. Deterrence through readiness.",
                  { mobilization: 25, approval: 3, gdp: -0.3 },
                  { tensionDelta: 6, backedBy: ["DEFENSE_MINISTER"] },
                ),
                opt(
                  "summit",
                  "Request an emergency summit",
                  "Fly to a neutral capital. Talk them down — at a price.",
                  { [`relations:${r.id}`]: 15, approval: -3, pc: -2 },
                  { tensionDelta: -10, backedBy: ["FOREIGN_MINISTER"] },
                ),
                opt(
                  "preempt",
                  "Strike first",
                  "Hit their staging areas before they hit you. There is no going back.",
                  { approval: 4 },
                  {
                    actions: [
                      {
                        type: "MILITARY_AIRSTRIKE",
                        targetCountryId: r.id,
                        params: { targetType: "MILITARY" },
                      },
                    ],
                    tensionDelta: 15,
                  },
                ),
              ],
              defaultOptionId: "mobilize",
            },
          };
    },
  },

  // --- An ally asks for help (Article 5, Lend-Lease, 2022) ---
  {
    id: "ally_plea",
    // Only when the ally is genuinely losing: "buckling" must match the front line
    weight: (ctx) => (losingAlly(ctx) && ctx.player.atWarWith.length === 0 ? 4 : 0),
    build: (ctx) => {
      const found = losingAlly(ctx);
      if (!found) return null;
      const { ally, enemy } = found;
      return {
        headline: `${ally.name} appeals to ${ctx.player.name} for help against ${enemy.name}`,
        text: `${leaderOf(ally)} asks you to honor your commitments.`,
        decision: {
          title: `${ally.name} asks for help`,
          situation: `${leaderOf(ally)} calls you at 3 a.m.: ${possessive(ally.name)} defenses against ${enemy.name} are buckling. They want weapons now — and your army if it comes to that.`,
          affectedCountries: [ctx.player.id, ally.id, enemy.id],
          options: [
            opt(
              "arms",
              "Send weapons and money",
              "Arm them to the teeth without firing a shot yourself.",
              { gdp: -0.3, [`relations:${ally.id}`]: 15, [`relations:${enemy.id}`]: -15 },
              { tensionDelta: 3, backedBy: ["DEFENSE_MINISTER", "FOREIGN_MINISTER"] },
            ),
            opt(
              "join",
              "Join the war",
              "Honor the pact in full. Your soldiers will die in their war.",
              { [`relations:${ally.id}`]: 25, approval: -2 },
              {
                actions: [
                  {
                    type: "DIPLOMACY_DECLARE_WAR",
                    targetCountryId: enemy.id,
                    params: { alliedWith: ally.id },
                  },
                ],
                tensionDelta: 12,
              },
            ),
            opt(
              "statement",
              "Strongly worded statement",
              "Express solidarity. Your allies will remember who showed up.",
              { [`relations:${ally.id}`]: -20, relationsAllies: -5 },
              { backedBy: ["FINANCE_MINISTER"] },
            ),
          ],
          defaultOptionId: "statement",
        },
      };
    },
  },

  // --- A rival nears the bomb (Osirak 1981, Al Kibar 2007, Iran 2025) ---
  {
    id: "nuclear_threshold",
    weight: (ctx) => (nuclearRival(ctx) ? 5 : 0),
    build: (ctx) => {
      const r = nuclearRival(ctx);
      if (!r) return null;
      const belief = ctx.player.beliefs[r.id];
      const progress = Math.round(belief?.nuclearProgress ?? r.nuclear.progress);
      return {
        headline: `Intelligence: ${r.name} weeks from the bomb`,
        text: `Your services estimate ${possessive(r.name)} program at ~${progress}% (confidence ${Math.round(belief?.accuracy ?? 50)}%).`,
        decision: {
          title: `${r.name} nears the threshold`,
          situation: `Your intelligence chief puts ${possessive(r.name)} weapons program at roughly ${progress}% — with ${Math.round(belief?.accuracy ?? 50)}% confidence. Once they test, no airstrike can undo it. Two successful strikes in a row would cripple it.`,
          affectedCountries: [ctx.player.id, r.id],
          urgency: "EXISTENTIAL",
          options: [
            opt(
              "strike",
              "Strike the facilities",
              "Bomb the enrichment sites. Could set them back years — or start a war.",
              { approval: 4 },
              {
                actions: [
                  {
                    type: "MILITARY_AIRSTRIKE",
                    targetCountryId: r.id,
                    params: { targetType: "NUCLEAR" },
                  },
                ],
                tensionDelta: 12,
                backedBy: ["DEFENSE_MINISTER"],
              },
            ),
            opt(
              "sabotage",
              "Covert sabotage",
              "Cyberweapons and 'accidents' at their facilities. Deniable — if it works.",
              { pc: -1 },
              {
                actions: [{ type: "INTEL_SABOTAGE", targetCountryId: r.id }],
                tensionDelta: 3,
                backedBy: ["INTELLIGENCE_CHIEF"],
              },
            ),
            opt(
              "diplomacy",
              "Coordinate sanctions and talks",
              "Rally the world for inspections and sanctions. Slow; might be too slow.",
              { relationsAllies: 5, [`relations:${r.id}`]: -6, pc: -1 },
              { tensionDelta: -2, backedBy: ["FOREIGN_MINISTER"] },
            ),
          ],
          defaultOptionId: "diplomacy",
        },
      };
    },
  },

  // --- Refugee wave from a nearby war or collapse ---
  {
    id: "refugee_wave",
    weight: (ctx) => (refugeeSource(ctx) ? 2.5 : 0),
    build: (ctx) => {
      const src = refugeeSource(ctx);
      if (!src) return null;
      return {
        headline: `Refugees from ${src.name} pour toward ${ctx.player.name}`,
        text: `Hundreds of thousands are fleeing ${src.name}.`,
        decision: {
          title: `Refugees from ${src.name}`,
          situation: `${src.atWarWith.length > 0 ? "War" : "Chaos"} in ${src.name} has sent hundreds of thousands fleeing toward your borders. Aid agencies beg you to open them; your interior ministry warns of backlash.`,
          affectedCountries: [ctx.player.id, src.id],
          options: [
            opt(
              "open",
              "Open the borders",
              "A humanitarian triumph abroad, a political fight at home.",
              { approval: -5, stability: -2, relationsAllies: 6, gdp: -0.1 },
              { backedBy: ["FOREIGN_MINISTER"] },
            ),
            opt(
              "close",
              "Seal the border",
              "Popular at home. Harrowing images abroad.",
              { approval: 4, relationsAllies: -5 },
              { backedBy: ["DOMESTIC_ADVISOR"] },
            ),
            opt(
              "deal",
              "Pay a third country to host them",
              "Expensive and cynical. It works — for now.",
              { gdp: -0.3, approval: 1 },
              { backedBy: ["FINANCE_MINISTER"] },
            ),
          ],
          defaultOptionId: "close",
        },
      };
    },
  },

  // --- Oil price spike (1973, 1979, 2022) ---
  {
    id: "energy_shock",
    weight: (ctx) =>
      !(ctx.player.economyProfile?.keyResources ?? []).includes("oil") &&
      ctx.world.globalTension > 55
        ? 1.5
        : 0,
    build: (ctx) => ({
      headline: `Fuel prices hit record high in ${ctx.player.name}`,
      text: "Truckers block highways as energy prices soar.",
      decision: {
        title: "Energy price shock",
        situation:
          "World tensions have sent oil and gas prices soaring. Truckers are blocking highways, inflation is spiking and your finance minister wants a decision by Friday.",
        affectedCountries: [ctx.player.id],
        options: [
          opt(
            "subsidize",
            "Subsidize fuel",
            "Prices fall at the pump; the deficit explodes.",
            { approval: 5, growth: -0.4 },
            { backedBy: ["DOMESTIC_ADVISOR"] },
          ),
          opt(
            "producers",
            "Court the producers",
            "Fly to the Gulf, sign long-term contracts, swallow your principles.",
            { growth: 0.2, approval: -1, pc: -1 },
            { backedBy: ["FOREIGN_MINISTER"] },
          ),
          opt(
            "ride",
            "Ride it out",
            "Let markets adjust. Fiscally sound, politically painful.",
            { approval: -5, growth: -0.2 },
            { backedBy: ["FINANCE_MINISTER"] },
          ),
        ],
        defaultOptionId: "ride",
      },
    }),
  },

  // --- Hostage crisis (Tehran 1979, Entebbe 1976) ---
  {
    id: "hostage_crisis",
    weight: (ctx) => (hostageTaker(ctx) ? 1.5 : 0),
    build: (ctx) => {
      const t = hostageTaker(ctx);
      if (!t) return null;
      return {
        headline: `${ctx.player.name} citizens taken hostage in ${t.name}`,
        text: `Militants hold 30 of your citizens.`,
        decision: {
          title: `Hostages in ${t.name}`,
          situation: `Militants with ties to ${possessive(t.name)} security services have seized 30 of your citizens, including diplomats. Their families are on every channel.`,
          affectedCountries: [ctx.player.id, t.id],
          options: [
            opt(
              "negotiate",
              "Negotiate through intermediaries",
              "Slow, humiliating, usually works.",
              { approval: -2, pc: -1 },
              {
                backedBy: ["FOREIGN_MINISTER"],
                followUp: { templateId: "hostage_talks", delay: 2 },
              },
            ),
            opt(
              "rescue",
              "Send in special forces",
              "Entebbe or Desert One. You will find out which.",
              {},
              {
                tensionDelta: 4,
                backedBy: ["DEFENSE_MINISTER"],
                followUp: { templateId: "rescue_outcome", delay: 1 },
              },
            ),
            opt(
              "sanction",
              "Sanctions and silence",
              "Refuse to bargain. Principled — and the hostages stay put.",
              { approval: -4, [`relations:${t.id}`]: -15 },
              { tensionDelta: 2 },
            ),
          ],
          defaultOptionId: "sanction",
        },
      };
    },
  },
  {
    id: "rescue_outcome",
    weight: () => 0,
    build: (ctx): CrisisDraft => {
      const success = ctx.rng.nextBool(0.55 + ctx.player.intelLevel / 400);
      return success
        ? {
            headline: `Daring raid frees ${ctx.player.name} hostages`,
            text: "Special forces brought every hostage home alive.",
            effects: { approval: 12, legitimacy: 4 },
          }
        : {
            headline: `Hostage rescue ends in disaster`,
            text: "Helicopters crashed in the desert; several soldiers and hostages are dead.",
            effects: { approval: -10, stability: -4, legitimacy: -3 },
          };
    },
  },
  {
    id: "hostage_talks",
    weight: () => 0,
    build: (ctx) => ({
      headline: "Hostages released after secret talks",
      text: "Your negotiators bring the hostages home — at a price nobody will confirm.",
      effects: { approval: 6, gdp: -0.1 },
    }),
  },

  // --- Sanctions vote at the UN / G20 ---
  {
    id: "sanctions_vote",
    weight: (ctx) => (sanctionsTarget(ctx) ? 2 : 0),
    build: (ctx) => {
      const t = sanctionsTarget(ctx);
      if (!t) return null;
      const reason =
        t.nuclear.status === "DEVELOPING"
          ? "its clandestine nuclear program"
          : t.atWarWith.length > 0
            ? "its war of aggression"
            : "its human rights record";
      return {
        headline: `World votes on sanctions against ${t.name}`,
        text: `A resolution targets ${t.name} over ${reason}.`,
        decision: {
          title: `Sanctions on ${t.name}`,
          situation: `A resolution to sanction ${t.name} over ${reason} comes to a vote. Your vote could swing it — and ${leaderOf(t)} is watching.`,
          affectedCountries: [ctx.player.id, t.id],
          options: [
            opt(
              "yes",
              "Vote for sanctions",
              "Stand with the majority. Trade with them will suffer.",
              { [`relations:${t.id}`]: -15, relationsAllies: 4, growth: -0.1 },
              { tensionDelta: 1, backedBy: ["FOREIGN_MINISTER"] },
            ),
            opt(
              "abstain",
              "Abstain",
              "Keep everyone guessing. Nobody thanks you.",
              { [`relations:${t.id}`]: 2, relationsAllies: -2 },
              { backedBy: ["FINANCE_MINISTER"] },
            ),
            opt(
              "no",
              "Vote against",
              "Protect a partner — and your exports. Your allies take note.",
              { [`relations:${t.id}`]: 12, relationsAllies: -7, growth: 0.1 },
              {},
            ),
          ],
          defaultOptionId: "abstain",
        },
      };
    },
  },

  // --- Assassination attempt on the player (survived) ---
  {
    id: "assassination_attempt",
    weight: (ctx) =>
      ctx.player.insurgencyLevel === "REBELLION" ||
      ctx.player.insurgencyLevel === "GUERILLA" ||
      ctx.player.atWarWith.length > 0
        ? 1.5
        : 0.3,
    build: (ctx) => {
      const r = worstRival(ctx, -40);
      return {
        headline: `${ctx.player.leader.name} survives assassination attempt`,
        text: "A bomb detonated seconds after your motorcade passed.",
        decision: {
          title: "You survived an assassination attempt",
          situation: `A roadside bomb detonated seconds after your motorcade passed. Two bodyguards are dead. ${r ? `Initial forensics point toward groups backed by ${r.name}.` : "Nobody has claimed responsibility."}`,
          affectedCountries: [ctx.player.id, ...(r ? [r.id] : [])],
          options: [
            opt(
              "unity",
              "Call for national unity",
              "Stand with the victims' families. Sympathy is a political asset.",
              { approval: 7, legitimacy: 3 },
              { backedBy: ["DOMESTIC_ADVISOR"] },
            ),
            opt(
              "security",
              "Emergency security powers",
              "Sweeping arrests. The plotters are caught — and so are many innocents.",
              { stability: 6, approval: -3, legitimacy: -3, insurgency: -1 },
              { backedBy: ["INTELLIGENCE_CHIEF"] },
            ),
            ...(r
              ? [
                  opt(
                    "blame",
                    `Blame ${r.name}`,
                    "Point the finger abroad. Your people rally; their people rally too.",
                    { approval: 5, [`relations:${r.id}`]: -18 },
                    { tensionDelta: 6, backedBy: ["DEFENSE_MINISTER"] },
                  ),
                ]
              : []),
          ],
          defaultOptionId: "security",
        },
      };
    },
  },

  // --- General strike / cost-of-living revolt ---
  {
    id: "general_strike",
    weight: (ctx) => (ctx.player.growthRate < 0.012 || ctx.player.approval < 45 ? 2 : 0.4),
    build: (ctx) => ({
      headline: `General strike paralyses ${ctx.player.name}`,
      text: "Unions shut down ports, rail and power plants.",
      decision: {
        title: "General strike",
        situation:
          "The unions have shut down ports, railways and half the power grid over wages and prices. Factories are idle and the opposition is joining the picket lines.",
        affectedCountries: [ctx.player.id],
        options: [
          opt(
            "concede",
            "Meet their demands",
            "Wages up, strike over. Inflation and the bond markets will have their say.",
            { approval: 6, growth: -0.3 },
            { backedBy: ["DOMESTIC_ADVISOR"] },
          ),
          opt(
            "break",
            "Break the strike",
            "Declare essential services and send in the army. Order, at a cost.",
            { stability: -4, approval: -5, legitimacy: -2 },
            {
              backedBy: ["CHIEF_OF_STAFF"],
              followUp: { templateId: "general_strike", delay: 4 },
            },
          ),
          opt(
            "mediate",
            "Personally mediate",
            "Lock both sides in a room until they agree. Costs you political capital.",
            { approval: 3, growth: -0.1, pc: -2 },
            { backedBy: ["FINANCE_MINISTER"] },
          ),
        ],
        defaultOptionId: "break",
      },
    }),
  },

  // --- A defence pact offered to the player (never signed without consent) ---
  {
    id: "pact_offer",
    weight: () => 0, // raised by the engine when an AI government proposes a pact
    build: (ctx) => {
      const p = pactSuitor(ctx);
      if (!p) return null;
      const theirWars = p.atWarWith
        .map((id) => find(ctx.world, id)?.name)
        .filter(Boolean)
        .join(" and ");
      return {
        headline: `${p.name} proposes a defence pact with ${ctx.player.name}`,
        text: `${leaderOf(p)} wants a mutual defence treaty.`,
        decision: {
          title: `${possessive(p.name)} pact offer`,
          situation: `${leaderOf(p)} proposes a mutual defence treaty: an attack on one is an attack on both.${theirWars ? ` They are at war with ${theirWars} — sign, and their wars can become yours.` : " It would deter your rivals, and bind you to their quarrels."}`,
          affectedCountries: [ctx.player.id, p.id],
          options: [
            opt(
              "sign",
              "Sign the treaty",
              "Deterrence and a friend in a crisis. Their enemies become yours.",
              { [`pact:${p.id}`]: 1, [`relations:${p.id}`]: 10, legitimacy: 1 },
              { tensionDelta: 2, backedBy: ["DEFENSE_MINISTER"] },
            ),
            opt(
              "talks",
              "Keep talking",
              "Warm words, no signature. They will ask again.",
              { [`relations:${p.id}`]: 2 },
              { backedBy: ["FOREIGN_MINISTER"] },
            ),
            opt(
              "decline",
              "Decline",
              "Keep your hands free. They will be disappointed.",
              { [`relations:${p.id}`]: -8 },
              { backedBy: ["FINANCE_MINISTER"] },
            ),
          ],
          defaultOptionId: "talks",
        },
      };
    },
  },

  // --- Trade deal with strings (Belt & Road, arms-for-oil) ---
  {
    id: "trade_offer",
    weight: (ctx) => (tradePartner(ctx) ? 1.5 : 0),
    build: (ctx) => {
      const p = tradePartner(ctx);
      if (!p) return null;
      return {
        headline: `${p.name} offers ${ctx.player.name} sweeping trade pact`,
        text: `${leaderOf(p)} dangles investment and market access.`,
        decision: {
          title: `${possessive(p.name)} offer`,
          situation: `${leaderOf(p)} offers a sweeping deal: ports, railways and market access worth billions. Your finance minister is thrilled. Your intelligence chief asks what the fine print says.`,
          affectedCountries: [ctx.player.id, p.id],
          options: [
            opt(
              "accept",
              "Sign it",
              "Growth now. Strings later.",
              { growth: 0.4, [`relations:${p.id}`]: 15 },
              {
                backedBy: ["FINANCE_MINISTER"],
                followUp: { templateId: "deal_strings", delay: 4 },
              },
            ),
            opt(
              "negotiate",
              "Renegotiate the terms",
              "Strip the security clauses. Smaller deal, no strings.",
              { growth: 0.15, [`relations:${p.id}`]: 4, pc: -1 },
              { backedBy: ["FOREIGN_MINISTER"] },
            ),
            opt(
              "decline",
              "Politely decline",
              "Keep your independence. They will remember.",
              { [`relations:${p.id}`]: -8 },
              { backedBy: ["INTELLIGENCE_CHIEF"] },
            ),
          ],
          defaultOptionId: "decline",
        },
      };
    },
  },
  {
    id: "deal_strings",
    weight: () => 0,
    build: (ctx) => {
      const p = tradePartner(ctx, true);
      if (!p) return null;
      return {
        headline: `${p.name} asks for a naval base in ${ctx.player.name}`,
        text: "The fine print of the trade pact comes due.",
        decision: {
          title: "The fine print",
          situation: `${p.name} now asks for "logistics access" at one of your ports — a naval base in all but name. Their rivals are furious you are even considering it.`,
          affectedCountries: [ctx.player.id, p.id],
          options: [
            opt(
              "grant",
              "Grant access",
              "Keep the money flowing. Pick a side, effectively.",
              { [`relations:${p.id}`]: 12, growth: 0.1 },
              { tensionDelta: 4 },
            ),
            opt(
              "refuse",
              "Refuse",
              "Sovereignty is not for sale. The investment slows to a trickle.",
              { [`relations:${p.id}`]: -18, growth: -0.25, approval: 3 },
            ),
          ],
          defaultOptionId: "refuse",
        },
      };
    },
  },

  // --- Cyberattack on infrastructure (NotPetya, Colonial Pipeline) ---
  {
    id: "cyberattack",
    weight: (ctx) => {
      const r = worstRival(ctx, -40);
      return r && r.intelLevel > 55 ? 1.5 : 0;
    },
    build: (ctx) => {
      const r = worstRival(ctx, -40);
      if (!r) return null;
      return {
        headline: `Cyberattack blacks out ${possessive(ctx.player.name)} power grid`,
        text: "Millions are without power; hospitals run on generators.",
        decision: {
          title: "Grid down",
          situation: `A cyberattack has blacked out a third of your power grid. Your agencies trace it — with moderate confidence — to units linked to ${r.name}.`,
          affectedCountries: [ctx.player.id, r.id],
          options: [
            opt(
              "retaliate",
              "Hack back",
              "Make them feel it. Quietly.",
              { pc: -1 },
              {
                actions: [{ type: "INTEL_SABOTAGE", targetCountryId: r.id }],
                tensionDelta: 4,
                backedBy: ["INTELLIGENCE_CHIEF"],
              },
            ),
            opt(
              "attribute",
              "Name and shame",
              "Publish the evidence with your allies.",
              { [`relations:${r.id}`]: -10, relationsAllies: 3, approval: 2 },
              { tensionDelta: 2, backedBy: ["FOREIGN_MINISTER"] },
            ),
            opt(
              "harden",
              "Harden defenses",
              "Invest in resilience. Unglamorous, durable.",
              { intel: 8, gdp: -0.1, pc: -1 },
              { backedBy: ["DEFENSE_MINISTER"] },
            ),
          ],
          defaultOptionId: "attribute",
        },
      };
    },
  },

  // --- Foreign interference detected (raised by the engine after covert damage) ---
  {
    id: "foreign_interference",
    weight: () => 0,
    build: (ctx) => {
      const suspects = ctx.world.countries
        .filter(
          (c) => alive(c) && c.id !== ctx.player.id && (ctx.player.relations[c.id] ?? 0) < -25,
        )
        .sort((a, b) => b.intelLevel - a.intelLevel)
        .slice(0, 2);
      const names = suspects.map((c) => c.name).join(" and ") || "hostile services";
      const main = suspects[0];
      return {
        headline: `${possessive(ctx.player.name)} spy chiefs warn of foreign meddling`,
        text: `Intelligence links the wave of unrest to ${names}.`,
        decision: {
          title: "Foreign interference",
          situation: `Your intelligence chief reports that the wave of unrest is not spontaneous: money, bots and agents traced to ${names} are fanning it. Every month this continues, the country gets harder to govern.`,
          affectedCountries: [ctx.player.id, ...suspects.map((c) => c.id)],
          urgency: "URGENT",
          options: [
            opt(
              "sweep",
              "Counter-intelligence sweep",
              "Roll up their networks at home. Quiet, effective.",
              { intel: 20, stability: 3, pc: -1 },
              { backedBy: ["INTELLIGENCE_CHIEF"] },
            ),
            opt(
              "expose",
              "Expose them publicly",
              "Publish the evidence. Your people rally; the meddlers lose deniability.",
              {
                approval: 4,
                stability: 2,
                ...(main ? { [`relations:${main.id}`]: -12 } : {}),
              },
              { tensionDelta: 3, backedBy: ["FOREIGN_MINISTER"] },
            ),
            ...(main
              ? [
                  opt(
                    "retaliate",
                    `Pay ${main.name} back in kind`,
                    "Destabilize them. Two can play this game.",
                    { pc: -1, intel: 8 },
                    {
                      actions: [{ type: "INTEL_DESTABILIZE", targetCountryId: main.id }],
                      tensionDelta: 2,
                      backedBy: ["DEFENSE_MINISTER"],
                    },
                  ),
                ]
              : []),
          ],
          defaultOptionId: "sweep",
        },
      };
    },
  },

  // ===== Shocks: the "almost lost" beats. The hit lands first; options mitigate. =====
  {
    id: "shock_market_crash",
    weight: () => 0,
    build: (ctx) => ({
      headline: `BLACK MONDAY: ${possessive(ctx.player.name)} markets in free fall`,
      text: "Stocks lose a fifth of their value in a day; two major banks halt withdrawals.",
      effects: { gdp: -1.5, growth: -0.8, approval: -7 },
      decision: {
        title: "Black Monday",
        situation:
          "Stocks lost a fifth of their value in a single day and two major banks have frozen withdrawals. Queues are forming outside branches. Whatever you do, do it before markets open.",
        affectedCountries: [ctx.player.id],
        urgency: "EXISTENTIAL",
        options: [
          opt(
            "bailout",
            "Bail out the banks",
            "Stops the bleeding. 'Bailing out bankers' will haunt you.",
            { growth: 0.5, approval: -3, legitimacy: -2 },
            { backedBy: ["FINANCE_MINISTER"] },
          ),
          opt(
            "stimulus",
            "Massive stimulus for families",
            "Cheques in the mail. Debt can wait.",
            { approval: 6, growth: 0.3, stability: 2 },
            { backedBy: ["DOMESTIC_ADVISOR"] },
          ),
          opt(
            "austerity",
            "Austerity to calm the markets",
            "Bond markets applaud. Voters do not.",
            { growth: 0.2, approval: -6, legitimacy: 3 },
            { followUp: { templateId: "general_strike", delay: 3 } },
          ),
        ],
        defaultOptionId: "bailout",
      },
    }),
  },
  {
    id: "shock_pandemic",
    weight: () => 0,
    build: (ctx) => ({
      headline: `New virus spreads rapidly in ${ctx.player.name}`,
      text: "Hospitals in three cities report they are at capacity.",
      effects: { stability: -6, approval: -4, growth: -0.6 },
      decision: {
        title: "Outbreak",
        situation:
          "A novel respiratory virus is spreading fast. Hospitals in three cities are at capacity and your health minister wants a decision tonight.",
        affectedCountries: [ctx.player.id],
        urgency: "EXISTENTIAL",
        options: [
          opt(
            "lockdown",
            "Lock the country down",
            "Flattens the curve. Flattens the economy too.",
            { growth: -0.5, stability: 5, approval: 3 },
            { backedBy: ["DOMESTIC_ADVISOR"] },
          ),
          opt(
            "open",
            "Keep the country open",
            "Business as usual — and hope.",
            { approval: 3, growth: 0.2, stability: -3 },
            {
              backedBy: ["FINANCE_MINISTER"],
              followUp: { templateId: "shock_second_wave", delay: 2 },
            },
          ),
          opt(
            "global",
            "Lead a global vaccine effort",
            "Expensive and slow, but the world will remember.",
            { relationsAllies: 6, approval: 2, gdp: -0.3, pc: -2 },
            { backedBy: ["FOREIGN_MINISTER"] },
          ),
        ],
        defaultOptionId: "open",
      },
    }),
  },
  {
    id: "shock_second_wave",
    weight: () => 0,
    build: (ctx) => ({
      headline: `Second wave overwhelms ${possessive(ctx.player.name)} hospitals`,
      text: "Critics blame the decision to stay open.",
      effects: { stability: -6, approval: -8, growth: -0.4 },
    }),
  },
  {
    id: "shock_terror",
    weight: () => 0,
    build: (ctx) => {
      const r = worstRival(ctx, -30);
      return {
        headline: `Massacre in ${possessive(ctx.player.name)} capital`,
        text: "Coordinated attacks on a stadium and a metro station kill scores.",
        effects: { stability: -7, approval: -3 },
        decision: {
          title: "Terror in the capital",
          situation: `Coordinated gunmen and bombs hit a stadium and a metro station. The country is in shock and looking to you. ${r ? `Some intelligence points to a network with ties to ${r.name}.` : ""}`,
          affectedCountries: [ctx.player.id, ...(r ? [r.id] : [])],
          urgency: "EXISTENTIAL",
          options: [
            opt(
              "unity",
              "Mourn with the nation",
              "Visit the victims, speak for the country. Grief unites.",
              { approval: 8, legitimacy: 4, stability: 2 },
              { backedBy: ["DOMESTIC_ADVISOR"] },
            ),
            opt(
              "powers",
              "Emergency powers",
              "Curfews, raids, detentions without charge. Safer streets, thinner freedoms.",
              { stability: 8, approval: 2, legitimacy: -4, insurgency: -1 },
              { backedBy: ["INTELLIGENCE_CHIEF"] },
            ),
            ...(r
              ? [
                  opt(
                    "retaliate",
                    `Strike the network's sponsors in ${r.name}`,
                    "Hit back hard. The public demands it; the region braces.",
                    { approval: 9 },
                    {
                      actions: [
                        {
                          type: "MILITARY_AIRSTRIKE",
                          targetCountryId: r.id,
                          params: { targetType: "MILITARY" },
                        },
                      ],
                      tensionDelta: 10,
                      backedBy: ["DEFENSE_MINISTER"],
                    },
                  ),
                ]
              : []),
          ],
          defaultOptionId: "powers",
        },
      };
    },
  },
  {
    id: "shock_disaster",
    weight: () => 0,
    build: (ctx) => {
      const kind = ctx.rng.pick([
        "A magnitude 7.8 earthquake",
        "Catastrophic floods",
        "A super-typhoon",
        "Record wildfires",
      ]);
      return {
        headline: `${kind} devastates ${ctx.player.name}`,
        text: "Thousands are dead or missing; whole districts are cut off.",
        effects: { stability: -6, gdp: -0.6, approval: -2 },
        decision: {
          title: "National disaster",
          situation: `${kind} has struck. Thousands are dead or missing and whole districts are cut off. The response will define how history sees you.`,
          affectedCountries: [ctx.player.id],
          urgency: "EXISTENTIAL",
          options: [
            opt(
              "relief",
              "All-out relief effort",
              "Army, money, presence. You are seen in the mud.",
              { approval: 8, stability: 4, growth: -0.2 },
              { backedBy: ["DOMESTIC_ADVISOR"] },
            ),
            opt(
              "aid",
              "Accept foreign aid",
              "Planes from your allies — and rivals — land with supplies.",
              { relationsAllies: 6, approval: 3, stability: 2 },
              { backedBy: ["FOREIGN_MINISTER"] },
            ),
            opt(
              "minimize",
              "Downplay it",
              "Protect the budget and the narrative. If the images get out…",
              { approval: -8, legitimacy: -4 },
              { backedBy: ["FINANCE_MINISTER"] },
            ),
          ],
          defaultOptionId: "minimize",
        },
      };
    },
  },

  // --- Election campaign finale (democracies) ---
  {
    id: "election_campaign",
    weight: (ctx) => {
      const next = ctx.player.politicalSystem.nextElectionTurn;
      return next !== null && next - ctx.world.turn >= 1 && next - ctx.world.turn <= 2 ? 20 : 0;
    },
    build: (ctx) => ({
      headline: `${ctx.player.name} heads to the polls`,
      text: `Polls put ${possessive(ctx.player.leader.name)} approval at ${Math.round(ctx.player.approval)}%.`,
      decision: {
        title: "Campaign endgame",
        situation: `The election is weeks away. Your approval is ${Math.round(ctx.player.approval)}%; you need roughly 45 to survive. Your strategists have three plays.`,
        affectedCountries: [ctx.player.id],
        urgency: "EXISTENTIAL",
        options: [
          opt(
            "giveaway",
            "Promise tax cuts",
            "Voters love it. Economists and bond markets do not.",
            { approval: 7, growth: -0.3 },
            { backedBy: ["DOMESTIC_ADVISOR"] },
          ),
          opt(
            "security",
            "Run on security",
            "Fear works best when the world feels dangerous.",
            { approval: ctx.world.globalTension > 55 ? 7 : 2 },
            { tensionDelta: 2, backedBy: ["DEFENSE_MINISTER"] },
          ),
          opt(
            "record",
            "Run on your record",
            "Steady and honest. Works if the economy does.",
            { approval: ctx.player.growthRate > 0.02 ? 6 : 1, legitimacy: 3 },
            { backedBy: ["CHIEF_OF_STAFF"] },
          ),
        ],
        defaultOptionId: "record",
      },
    }),
  },
];

// ----------------------------------------------------------------------------
// Eligibility helpers
// ----------------------------------------------------------------------------

function nuclearRival(ctx: Ctx): CountryState | undefined {
  return ctx.world.countries.find(
    (c) =>
      alive(c) &&
      c.id !== ctx.player.id &&
      c.nuclear.status === "DEVELOPING" &&
      (ctx.player.relations[c.id] ?? 0) < -20 &&
      (ctx.player.beliefs[c.id]?.nuclearProgress ?? 0) > 45,
  );
}

function refugeeSource(ctx: Ctx): CountryState | undefined {
  return ctx.world.countries.find(
    (c) =>
      c.id !== ctx.player.id &&
      (c.atWarWith.length > 0 || c.stability < 22 || c.collapsed) &&
      !c.atWarWith.includes(ctx.player.id) &&
      areNeighbors(c, ctx.player),
  );
}

function hostageTaker(ctx: Ctx): CountryState | undefined {
  return ctx.world.countries.find(
    (c) =>
      alive(c) &&
      c.id !== ctx.player.id &&
      (ctx.player.relations[c.id] ?? 0) < -40 &&
      (c.regimeType === "THEOCRACY" ||
        c.regimeType === "AUTOCRACY" ||
        c.insurgencyLevel === "GUERILLA"),
  );
}

function sanctionsTarget(ctx: Ctx): CountryState | undefined {
  return ctx.world.countries.find(
    (c) =>
      alive(c) &&
      c.id !== ctx.player.id &&
      (c.nuclear.status === "DEVELOPING" ||
        ctx.world.wars.some((w) => w.attackerId === c.id && w.defenderId !== ctx.player.id)),
  );
}

/** An ally of the player that is losing a war (front line under 45 on its side), and its enemy. */
function losingAlly(ctx: Ctx): { ally: CountryState; enemy: CountryState } | undefined {
  for (const id of ctx.player.alliances) {
    const ally = find(ctx.world, id);
    if (!ally || !alive(ally)) continue;
    for (const w of ctx.world.wars) {
      if (w.attackerId !== ally.id && w.defenderId !== ally.id) continue;
      const own = w.attackerId === ally.id ? w.frontline : 100 - w.frontline;
      const enemy = find(ctx.world, w.attackerId === ally.id ? w.defenderId : w.attackerId);
      if (own < 45 && enemy && alive(enemy)) return { ally, enemy };
    }
  }
  return undefined;
}

/** The country most eager for a defence pact with the player (it likes us, we don't hate it). */
function pactSuitor(ctx: Ctx): CountryState | undefined {
  return ctx.world.countries
    .filter(
      (c) =>
        alive(c) &&
        c.id !== ctx.player.id &&
        !ctx.player.alliances.includes(c.id) &&
        !ctx.player.atWarWith.includes(c.id) &&
        (c.relations[ctx.player.id] ?? 0) >= 60 &&
        (ctx.player.relations[c.id] ?? 0) >= 40,
    )
    .sort((a, b) => (b.relations[ctx.player.id] ?? 0) - (a.relations[ctx.player.id] ?? 0))[0];
}

function tradePartner(ctx: Ctx, any = false): CountryState | undefined {
  return ctx.world.countries
    .filter(
      (c) =>
        alive(c) &&
        c.id !== ctx.player.id &&
        c.gdp > 1.5e12 &&
        (any || ((ctx.player.relations[c.id] ?? 0) > -10 && !ctx.player.alliances.includes(c.id))),
    )
    .sort((a, b) => b.gdp - a.gdp)[0];
}

// ----------------------------------------------------------------------------
// Director
// ----------------------------------------------------------------------------

const COOLDOWN = 9;

function toEvent(
  world: WorldState,
  player: CountryState,
  templateId: string,
  draft: CrisisDraft,
  seq: number,
): GameEvent {
  const id = `evt_crisis_${templateId}_${world.turn}_${seq}`;
  const event: GameEvent = {
    id,
    type: "CRISIS",
    title: draft.headline,
    description: draft.text,
    affectedCountries: draft.decision?.affectedCountries ?? [player.id],
    turn: world.turn,
    severity: draft.decision?.urgency === "EXISTENTIAL" ? "CRITICAL" : "MAJOR",
  };
  if (draft.decision) {
    event.decision = {
      id: `dec_${templateId}_${world.turn}_${seq}`,
      turn: world.turn,
      title: draft.decision.title,
      situation: draft.decision.situation,
      affectedCountries: draft.decision.affectedCountries,
      options: draft.decision.options,
      deadlineTurn: world.turn + 1,
      templateId,
      urgency: draft.decision.urgency ?? "URGENT",
      defaultOptionId: draft.decision.defaultOptionId,
    };
  }
  return event;
}

export function applyEffects(
  world: WorldState,
  player: CountryState,
  effects: Record<string, number>,
): void {
  const clamp = (v: number) => Math.max(0, Math.min(100, v));
  const rel = (targetId: string, delta: number) => {
    const target = world.countries.find((c) => c.id === targetId);
    player.relations[targetId] = Math.max(
      -100,
      Math.min(100, (player.relations[targetId] ?? 0) + delta),
    );
    if (target) {
      target.relations[player.id] = Math.max(
        -100,
        Math.min(100, (target.relations[player.id] ?? 0) + delta),
      );
    }
  };
  for (const [key, value] of Object.entries(effects)) {
    if (key.startsWith("relations:")) rel(key.split(":")[1], value);
    else if (key === "relationsAllies") {
      for (const id of player.alliances) rel(id, value);
      for (const id of player.history.historicalAllies) {
        if (!player.alliances.includes(id)) rel(id, value / 2);
      }
    } else if (key === "relationsRivals") {
      for (const id of player.history.historicalRivals) rel(id, value);
    } else if (key === "stability") player.stability = clamp(player.stability + value);
    else if (key === "approval") player.approval = clamp(player.approval + value);
    else if (key === "legitimacy") player.legitimacy = clamp(player.legitimacy + value);
    else if (key === "gdp") player.gdp = Math.max(0, player.gdp * (1 + value / 100));
    else if (key === "growth") player.growthRate += value / 100;
    else if (key === "mobilization")
      player.mobilizationLevel = clamp(player.mobilizationLevel + value);
    else if (key === "intel") player.counterIntelLevel = clamp(player.counterIntelLevel + value);
    else if (key.startsWith("pact:")) {
      const other = world.countries.find((c) => c.id === key.split(":")[1]);
      if (other && value > 0 && !player.alliances.includes(other.id)) {
        player.alliances.push(other.id);
        other.alliances.push(player.id);
      }
    } else if (key === "pc") world.politicalCapital = Math.max(0, world.politicalCapital + value);
    else if (key === "coupShield")
      world.director.coupShieldUntil = Math.max(world.director.coupShieldUntil, world.turn + value);
    else if (key === "insurgency") {
      const levels = ["NONE", "UNREST", "REBELLION", "GUERILLA"] as const;
      const idx = levels.indexOf(player.insurgencyLevel);
      player.insurgencyLevel = levels[Math.max(0, Math.min(3, idx + value))];
    }
  }
}

/** Build a specific crisis right now (used by government.ts to telegraph coups). */
export function raiseCrisis(
  world: WorldState,
  templateId: string,
  rng: SeededRandom,
): GameEvent | null {
  const player = world.countries.find((c) => c.id === world.playerCountryId);
  const template = TEMPLATES.find((t) => t.id === templateId);
  if (!player || !template) return null;
  // Never stack the same crisis twice on one desk
  if (world.pendingDecisions.some((d) => d.templateId === templateId)) return null;
  const draft = template.build({ world, player, rng });
  if (!draft) return null;
  const event = toEvent(world, player, templateId, draft, 9);
  if (event.decision) world.pendingDecisions.push(event.decision);
  if (draft.effects) applyEffects(world, player, draft.effects);
  world.director.lastUsed[templateId] = world.turn;
  return event;
}

export interface DirectorOutput {
  events: GameEvent[];
  decisions: PendingDecision[];
}

/**
 * Runs once per turn, after world events. Produces the player's crises for
 * this month: due follow-ups and scripted crises first, then — if the mode's
 * cadence demands drama — a weighted pick among eligible templates.
 */
export function runDirector(world: WorldState, rng: SeededRandom): DirectorOutput {
  const player = world.countries.find((c) => c.id === world.playerCountryId);
  const out: DirectorOutput = { events: [], decisions: [] };
  if (!player || player.collapsed) return out;
  const ctx: Ctx = { world, player, rng };
  const director = world.director;
  let seq = 0;

  const emit = (templateId: string, draft: CrisisDraft) => {
    const event = toEvent(world, player, templateId, draft, seq++);
    out.events.push(event);
    if (event.decision) out.decisions.push(event.decision);
    if (draft.effects) {
      // Shocks hit hardest when a leader has grown comfortable
      const scale =
        templateId.startsWith("shock_") && Math.min(player.approval, player.stability) > 65
          ? 1.7
          : 1;
      applyEffects(
        world,
        player,
        Object.fromEntries(Object.entries(draft.effects).map(([k, v]) => [k, v * scale])),
      );
    }
    director.lastUsed[templateId] = world.turn;
  };

  // 1. Due follow-ups and authored (flashpoint) crises
  const due = director.scheduled.filter((s) => s.turn <= world.turn);
  director.scheduled = director.scheduled.filter((s) => s.turn > world.turn);
  for (const item of due) {
    if (item.decision) {
      const event: GameEvent = {
        id: `evt_scripted_${item.templateId}_${world.turn}`,
        type: "CRISIS",
        title: item.headline ?? item.decision.title,
        description: item.text ?? item.decision.situation,
        affectedCountries: item.decision.affectedCountries,
        turn: world.turn,
        severity: item.decision.urgency === "EXISTENTIAL" ? "CRITICAL" : "MAJOR",
        decision: {
          ...item.decision,
          id: `dec_${item.templateId}_${world.turn}`,
          turn: world.turn,
          deadlineTurn: world.turn + 1,
        },
      };
      out.events.push(event);
      if (event.decision) out.decisions.push(event.decision);
      director.lastUsed[item.templateId] = world.turn;
      continue;
    }
    const template = TEMPLATES.find((t) => t.id === item.templateId);
    const draft = template?.build(ctx, item);
    if (draft) emit(item.templateId, draft);
  }

  // 2. Shocks: a comfortable leader gets tested. Term: roughly every 16 months;
  //    Legacy: every 24. Flashpoints script their own escalation.
  const lastShock = director.lastUsed.shock ?? -99;
  const comfortable = Math.min(player.approval, player.stability) > 40;
  const shockGap = world.mode === "TERM" ? 14 : 22;
  if (
    world.mode !== "FLASHPOINT" &&
    out.decisions.length === 0 &&
    world.turn >= 8 &&
    world.turn - lastShock >= shockGap &&
    comfortable &&
    rng.nextBool(0.3)
  ) {
    const shockIds = [
      "shock_market_crash",
      "shock_pandemic",
      "shock_terror",
      "shock_disaster",
    ].filter((id) => world.turn - (director.lastUsed[id] ?? -99) >= 48);
    if (shockIds.length > 0) {
      const id = rng.pick(shockIds);
      const draft = TEMPLATES.find((t) => t.id === id)?.build(ctx);
      if (draft) {
        emit(id, draft);
        director.lastUsed.shock = world.turn;
      }
    }
  }

  // 3. Cadence: how badly does this month need a decision?
  const want =
    out.decisions.length > 0
      ? false
      : world.turn === 0 || world.mode === "FLASHPOINT"
        ? true
        : world.mode === "TERM"
          ? director.dramaDebt >= 2 || rng.nextBool(0.3)
          : director.dramaDebt >= 3 || rng.nextBool(0.2);
  // Hubris: leaders riding high attract trouble
  const hubris = Math.min(player.approval, player.stability) > 65 ? 2.5 : 1;

  if (want) {
    const flashpointLowPoint =
      world.mode === "FLASHPOINT" && world.turn >= 5 && world.turn <= 8 ? 1.8 : 1;
    const weighted = TEMPLATES.map((t) => {
      const last = director.lastUsed[t.id];
      if (last !== undefined && world.turn - last < COOLDOWN) return { t, w: 0 };
      let w = t.weight(ctx);
      // Mid-flashpoint: lean on whatever is currently the player's strength
      if (["corruption_scandal", "general_strike", "rival_ultimatum"].includes(t.id)) {
        w *= flashpointLowPoint * hubris;
      }
      return { t, w };
    }).filter((x) => x.w > 0);
    const total = weighted.reduce((s, x) => s + x.w, 0);
    if (total > 0) {
      let roll = rng.next() * total;
      for (const { t, w } of weighted) {
        roll -= w;
        if (roll <= 0) {
          const draft = t.build(ctx);
          if (draft) emit(t.id, draft);
          break;
        }
      }
    }
  }

  director.dramaDebt = out.decisions.length > 0 ? 0 : director.dramaDebt + 1;
  return out;
}

/** Schedule a follow-up chosen through a decision option. */
export function scheduleFollowUp(world: WorldState, templateId: string, delay: number): void {
  world.director.scheduled.push({ templateId, turn: world.turn + delay });
}

export const CRISIS_TEMPLATE_IDS = TEMPLATES.map((t) => t.id);
