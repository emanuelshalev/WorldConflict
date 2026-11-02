/**
 * The leader's calendar: phone calls from other leaders, staff meetings, state visits and
 * interviews, generated each month from the state of the world. The player has a few slots
 * a month; meetings left unattended go to a deputy (a small snub for a leader who called).
 * Pure and deterministic: a dedicated seeded stream, so the calendar never perturbs the rest
 * of the simulation's randomness.
 */

import { sharesLandBorder } from "./geography.js";
import { combineSeed, SeededRandom } from "./seed.js";
import { hotspotSummary } from "./systems/hotspots.js";
import type { CountryState, DecisionOption, Meeting, WorldState } from "./types.js";

export const MEETING_SLOTS = 3;
const GREAT_POWERS = new Set([
  "USA",
  "CHN",
  "RUS",
  "IND",
  "DEU",
  "FRA",
  "GBR",
  "JPN",
  "TUR",
  "SAU",
]);

const opt = (
  id: string,
  label: string,
  description: string,
  effects: Record<string, number> = {},
  tensionDelta = 0,
): DecisionOption => ({ id, label, description, effects, tensionDelta, actions: [], backedBy: [] });

const pct = (v: number) => `${Math.round(v)}%`;
const strongest = (world: WorldState, exclude: string[]) =>
  world.countries
    .filter((c) => GREAT_POWERS.has(c.id) && !exclude.includes(c.id) && !c.collapsed)
    .sort((a, b) => b.gdp - a.gdp)[0];
const leaderOf = (c: CountryState) => `${c.leader.title} ${c.leader.name}`;

/** Who calls this month: the most salient governments for the player, varied by the stream. */
function callers(world: WorldState, player: CountryState, rng: SeededRandom): CountryState[] {
  const scored = world.countries
    .filter((c) => c.id !== player.id && !c.collapsed)
    .map((c) => {
      const rel = player.relations[c.id] ?? 0;
      const war = player.atWarWith.includes(c.id) ? 100 : 0;
      const ally = player.alliances.includes(c.id) ? 25 : 0;
      const big = GREAT_POWERS.has(c.id) ? 18 : 0;
      // Nobody calls every month: a leader who called in the last three months waits
      const recent =
        world.turn - (world.director.lastUsed[`meet:call:${c.id}`] ?? -99) <= 3
          ? war
            ? 60
            : 200
          : 0;
      return { c, score: Math.abs(rel) * 0.6 + war + ally + big + rng.next() * 25 - recent };
    })
    .sort((a, b) => b.score - a.score);
  const picked = scored.slice(0, 2).map((s) => s.c);
  for (const c of picked) world.director.lastUsed[`meet:call:${c.id}`] = world.turn;
  return picked;
}

function callMeeting(
  world: WorldState,
  player: CountryState,
  other: CountryState,
  n: number,
  rng: SeededRandom,
): Meeting {
  const rel = player.relations[other.id] ?? 0;
  const who = leaderOf(other);
  const id = `mtg_${world.turn}_${n}`;
  const atWar = player.atWarWith.includes(other.id);
  const facing = player.borderDeployments.some((d) => d.targetCountryId === other.id);
  const r = `relations:${other.id}`;
  const deputy = opt(
    "deputy",
    "Let the foreign ministry take it",
    `${other.name} notices you did not come to the phone.`,
    { [r]: -1 },
  );
  const base = {
    id,
    turn: world.turn,
    deadlineTurn: world.turn + 1,
    templateId: "meeting_call",
    urgency: "ROUTINE" as const,
    affectedCountries: [other.id],
    defaultOptionId: "deputy",
    kind: "CALL" as const,
    withCountry: other.id,
    speaker: who,
  };

  if (atWar) {
    return {
      ...base,
      title: `Secure line: ${who}`,
      situation: rng.pick([
        `"Every week this war costs us both. Name your terms, and let us see if there is a deal."`,
        `"My generals tell me we can hold for years. Can you? Let us talk before winter decides for us."`,
      ]),
      options: [
        opt(
          "talks",
          "Offer talks on a ceasefire",
          "Open a channel. Hawks at home will call it weakness.",
          { [r]: 4, approval: -0.5 },
          -2,
        ),
        opt(
          "firm",
          "Demand a full withdrawal",
          "No talks while their troops are on your soil.",
          { [r]: -4, approval: 0.5 },
          1,
        ),
        opt("hangup", "Hang up", "Let the guns do the talking.", { [r]: -6, approval: 0.5 }, 1),
        deputy,
      ],
    };
  }
  if (rel < -20) {
    return {
      ...base,
      title: `Phone call: ${who}`,
      situation: facing
        ? `"Your troops on our border are a provocation. Pull them back, or we will be forced to answer."`
        : rng.pick([
            `"Your speeches and your sanctions are pushing us into a corner. What exactly do you want from us?"`,
            `"We read what your ministers say about us. Do you speak for them, or should I stop listening?"`,
          ]),
      options: [
        opt(
          "reassure",
          "Reassure: no threat intended",
          "Lowers the temperature, and gives a little ground.",
          { [r]: 3 },
          -1,
        ),
        opt(
          "firm",
          "Stand firm",
          "Your voters like it. Their generals will remember it.",
          { [r]: -3, approval: 0.5 },
          2,
        ),
        opt(
          "hotline",
          "Propose a hotline and quiet talks",
          "Costs political capital, buys real trust.",
          { [r]: 5, pc: -1 },
          -1,
        ),
        deputy,
      ],
    };
  }
  if (rel > 30 || player.alliances.includes(other.id)) {
    return {
      ...base,
      title: `Phone call: ${who}`,
      situation: rng.pick([
        `"We need you with us at the vote in New York next week. Can we count on you?"`,
        `"Our parliament wants a sign that your commitment is real. A word from you would help me at home."`,
        `"There is talk in your capital of a deal with our rivals. Tell me it is just talk."`,
      ]),
      options: [
        opt(
          "support",
          "Promise full support",
          "A friend for life, and a commitment you will be held to.",
          {
            [r]: 4,
          },
        ),
        opt("quiet", "Offer quiet support", "Enough to keep them close without a public fight.", {
          [r]: 3,
        }),
        opt("neutral", "Stay neutral", "Your hands stay free. They feel let down.", {
          [r]: -4,
          approval: 0.5,
        }),
        deputy,
      ],
    };
  }
  return {
    ...base,
    title: `Phone call: ${who}`,
    situation: rng.pick([
      `"Our companies want a bigger share of your market. In return, we can talk about energy."`,
      `"We have no quarrel with you, and I would like to keep it that way. Shall we put that on paper?"`,
    ]),
    options: [
      opt(
        "deal",
        "Agree a trade deal",
        "Growth and goodwill, at a small political price at home.",
        { [r]: 3, growth: 0.1, approval: -0.5 },
      ),
      opt("more", "Hold out for more", "They may come back with a better offer, or not at all.", {
        [r]: -2,
        growth: 0.1,
      }),
      opt("decline", "Politely decline", "Keeps your options open.", { [r]: -3 }),
      deputy,
    ],
  };
}

type StaffTopic = {
  key: string;
  urgency: number;
  meeting: Omit<
    Meeting,
    | "id"
    | "turn"
    | "deadlineTurn"
    | "templateId"
    | "urgency"
    | "affectedCountries"
    | "defaultOptionId"
    | "kind"
  >;
};

/** Every staff topic the situation supports, with how pressing it is. */
function staffTopics(world: WorldState, player: CountryState): StaffTopic[] {
  const growth = (player.realGrowth ?? player.growthRate) * 100;
  const war = world.wars.find((w) => w.attackerId === player.id || w.defenderId === player.id);
  const deputy = opt("deputy", "Let them handle it", "Your staff muddle through without you.");
  const topics: StaffTopic[] = [];
  if (war)
    topics.push({
      key: "front",
      urgency: 90,
      meeting: {
        speaker: "Defence Minister",
        title: "Staff meeting: the front",
        situation: `"The front is stretched and the reserves are tired. I need a decision on more troops, or on allies."`,
        options: [
          opt(
            "mobilize",
            "Call up more reservists",
            "More strength at the front, fewer workers at home.",
            { mobilization: 10, approval: -2 },
          ),
          opt(
            "allies",
            "Ask the allies for help",
            "Political capital spent on the phone with friends.",
            { relationsAllies: 3, pc: -1 },
          ),
          opt("hold", "Hold the lines as they are", "No new costs, no new strength.", {}),
          deputy,
        ],
      },
    });
  topics.push({
    key: "polls",
    urgency: 70 - player.approval,
    meeting: {
      speaker: "Chief of Staff",
      title: "Staff meeting: the polls",
      situation: `"Approval is at ${pct(player.approval)}. The party wants a change of message before it becomes a change of leader."`,
      options: [
        opt(
          "reshuffle",
          "Reshuffle the cabinet",
          "Fresh faces. Some old ones will hold a grudge.",
          { approval: 2, stability: -1, pc: -1 },
        ),
        opt("tour", "Go on a national tour", "Hands shaken, promises made.", { approval: 1 }),
        opt("course", "Hold your course", "Results, not slogans.", {}),
        deputy,
      ],
    },
  });
  topics.push({
    key: "economy",
    urgency: (2.5 - growth) * 12,
    meeting: {
      speaker: "Finance Minister",
      title: "Staff meeting: the economy",
      situation: `"Growth is at ${growth.toFixed(1)}% and the markets want a plan. Stimulus or discipline: I need your call."`,
      options: [
        opt("stimulus", "Announce a stimulus", "Jobs now, debt later.", {
          growth: 0.2,
          approval: 1,
        }),
        opt("austerity", "Tighten the budget", "Markets cheer. Voters do not.", {
          growth: -0.1,
          approval: -3,
          legitimacy: 1,
        }),
        opt("wait", "Wait for the next figures", "Nothing breaks this month.", {}),
        deputy,
      ],
    },
  });
  topics.push({
    key: "unrest",
    urgency: 70 - player.stability,
    meeting: {
      speaker: "Interior Minister",
      title: "Staff meeting: unrest",
      situation: `"Three cities had protests this week. Stability is at ${pct(player.stability)}. Do we talk or do we clear the squares?"`,
      options: [
        opt("dialogue", "Open a dialogue", "Slower, but the anger cools.", {
          stability: 2,
          pc: -1,
        }),
        opt("crackdown", "Clear the squares", "Order returns. So do the cameras.", {
          stability: 5,
          approval: -3,
          legitimacy: -3,
        }),
        opt("wait", "Let it burn out", "It might.", { stability: -1 }),
        deputy,
      ],
    },
  });
  topics.push({
    key: "intel",
    urgency: 22,
    meeting: {
      speaker: "Intelligence Chief",
      title: "Staff meeting: intelligence",
      situation: `"We picked up foreign activity inside two ministries. I can sweep them now, or turn one of their people."`,
      options: [
        opt("sweep", "Sweep the ministries", "Loud, thorough, costly.", { intel: 10, pc: -1 }),
        opt("double", "Turn one of their agents", "Quiet, and useful if it works.", {
          intel: 5,
          relationsRivals: -1,
        }),
        opt("ignore", "Watch and wait", "Knowledge is leverage. So are leaks.", { intel: -3 }),
        deputy,
      ],
    },
  });
  topics.push({
    key: "backchannel",
    urgency: 20,
    meeting: {
      speaker: "Foreign Minister",
      title: "Staff meeting: a back channel",
      situation: `"An old contact offers a quiet channel to one of our rivals. Deniable, cheap, and our allies would hate it if it leaked."`,
      options: [
        opt("open", "Open the channel", "Rivals soften. Allies must never find out.", {
          relationsRivals: 2,
          relationsAllies: -1,
        }),
        opt("allies", "Brief the allies first", "Trust at home in the alliance, no deal.", {
          relationsAllies: 2,
        }),
        opt("refuse", "Refuse", "Nothing gained, nothing risked.", {}),
        deputy,
      ],
    },
  });
  topics.push({
    key: "leak",
    urgency: 18,
    meeting: {
      speaker: "Chief of Staff",
      title: "Staff meeting: a leak",
      situation: `"A minister has been briefing reporters against you. The story runs tomorrow unless we move tonight."`,
      options: [
        opt("fire", "Fire the minister", "A message to the cabinet. A martyr for the press.", {
          legitimacy: 2,
          stability: -1,
        }),
        opt("spin", "Get ahead of the story", "Your version first.", {
          approval: 1,
          legitimacy: -1,
        }),
        opt("ignore", "Let it run", "Stories die. Some do not.", { approval: -1 }),
        deputy,
      ],
    },
  });
  // Gaza and the West Bank: a standing item for the governments that carry them
  const gaza = world.hotspots.find((h) => h.id === "GAZA");
  const bank = world.hotspots.find((h) => h.id === "WEST_BANK");
  const zone = gaza ?? bank;
  if (zone && [zone.occupier, zone.people, "EGY", "USA"].includes(player.id)) {
    const hot = Math.max(gaza?.violence ?? 0, bank?.violence ?? 0, (gaza?.humanitarian ?? 0) - 10);
    const where = gaza && bank ? "Gaza and the West Bank" : zone.name;
    const read = [gaza, bank]
      .filter((h) => !!h)
      .map((h) => hotspotSummary(h))
      .join(" ");
    const options =
      player.id === zone.occupier
        ? [
            opt(
              "tighten",
              "Tighten the lines",
              "More raids and a firmer yellow line. The right applauds.",
              {
                approval: 1,
                ...(gaza ? { "hot:GAZA:violence": 4 } : {}),
                ...(bank ? { "hot:WEST_BANK:violence": 3 } : {}),
              },
            ),
            ...(gaza
              ? [
                  opt(
                    "crossings",
                    "Ease the crossings",
                    "More trucks in. Washington and Cairo notice.",
                    {
                      approval: -1,
                      "hot:GAZA:aid": 8,
                      "hot:GAZA:humanitarian": -3,
                      "relations:USA": 1,
                    },
                  ),
                ]
              : []),
            ...(bank
              ? [
                  opt(
                    "settlers",
                    "Rein in the settlers",
                    "Orders to the army and the police. Your coalition grumbles.",
                    {
                      approval: -1,
                      "hot:WEST_BANK:violence": -5,
                    },
                  ),
                ]
              : []),
            deputy,
          ]
        : player.id === zone.people
          ? [
              opt(
                "police",
                "Pay the police first",
                "Order on the streets before salaries elsewhere.",
                {
                  approval: -1,
                  ...(bank ? { "hot:WEST_BANK:governance": 4 } : {}),
                },
              ),
              opt(
                "strike",
                "Call a general strike",
                "Show the occupation the street. Popular, and costly.",
                {
                  approval: 2,
                  gdp: -0.2,
                  ...(bank ? { "hot:WEST_BANK:violence": 3 } : {}),
                },
              ),
              opt(
                "donors",
                "Appeal to the donors",
                "Calls to Riyadh, Brussels and Tokyo for money and aid.",
                {
                  ...(gaza ? { "hot:GAZA:aid": 5 } : {}),
                  "relations:SAU": 1,
                },
              ),
              deputy,
            ]
          : [
              opt("aid", "Push more aid through", "Diplomatic capital spent on trucks.", {
                ...(gaza ? { "hot:GAZA:aid": 8, "hot:GAZA:humanitarian": -3 } : {}),
                pc: -1,
              }),
              opt("force", "Back the stabilization force", "Money, trainers and logistics.", {
                ...(gaza ? { "hot:GAZA:governance": 4 } : {}),
                gdp: -0.05,
              }),
              opt("hold", "Keep the current line", "No new commitments.", {}),
              deputy,
            ];
    topics.push({
      key: "hotzone",
      urgency: hot - 5,
      meeting: {
        speaker: player.id === zone.people ? "Prime Minister" : "National Security Adviser",
        title: `Staff meeting: ${where}`,
        situation: `"${read} I need a line from you for the month."`,
        options,
      },
    });
  }
  return topics;
}

/** The most pressing staff topic that has not come up in the last two months. */
function staffMeeting(world: WorldState, player: CountryState, n: number): Meeting {
  const used = world.director.lastUsed;
  const topic = staffTopics(world, player)
    .map((t) => ({
      t,
      u: world.turn - (used[`meet:staff:${t.key}`] ?? -99) <= 2 ? t.urgency - 60 : t.urgency,
    }))
    .sort((a, b) => b.u - a.u)[0].t;
  used[`meet:staff:${topic.key}`] = world.turn;
  return {
    ...topic.meeting,
    id: `mtg_${world.turn}_${n}`,
    turn: world.turn,
    deadlineTurn: world.turn + 1,
    templateId: "meeting_staff",
    urgency: "ROUTINE",
    affectedCountries: [],
    defaultOptionId: "deputy",
    kind: "STAFF",
  };
}

function visitMeeting(
  world: WorldState,
  player: CountryState,
  other: CountryState,
  n: number,
): Meeting {
  const r = `relations:${other.id}`;
  return {
    id: `mtg_${world.turn}_${n}`,
    turn: world.turn,
    deadlineTurn: world.turn + 1,
    templateId: "meeting_visit",
    urgency: "ROUTINE",
    affectedCountries: [other.id],
    defaultOptionId: "deputy",
    kind: "VISIT",
    withCountry: other.id,
    speaker: leaderOf(other),
    title: `State visit: ${leaderOf(other)}`,
    situation: `${leaderOf(other)} would like to visit ${player.name} this month. The protocol office needs an answer.`,
    options: [
      opt("state", "Full state visit", "Honour guard, banquet, joint statement.", {
        [r]: 6,
        pc: -1,
      }),
      opt("working", "A working lunch", "Business, no ceremony.", { [r]: 3 }),
      opt(
        "decline",
        "Decline this month",
        "Your calendar is full. They will read it as a message.",
        { [r]: -3 },
      ),
      opt("deputy", "Let the foreign minister host", "Polite, forgettable.", { [r]: -1 }),
    ],
  };
}

function pressMeeting(world: WorldState, player: CountryState, n: number): Meeting {
  const story =
    world.newspaper.find((s) => s.relatedCountries.includes(player.id)) ?? world.newspaper[0];
  const topic = story ? `"${story.headline}"` : "the state of the country";
  return {
    id: `mtg_${world.turn}_${n}`,
    turn: world.turn,
    deadlineTurn: world.turn + 1,
    templateId: "meeting_press",
    urgency: "ROUTINE",
    affectedCountries: story?.relatedCountries.slice(0, 2) ?? [],
    defaultOptionId: "deputy",
    kind: "PRESS",
    speaker: "Prime-time interview",
    title: "Interview: the evening news",
    situation: `The anchor opens with ${topic}. "The country wants to know: are you in control?"`,
    options: [
      opt("confident", "Project confidence", "Strong on camera. Hostages to fortune.", {
        approval: 1,
        legitimacy: -1,
      }),
      opt("candid", "Be candid about the risks", "Respected, if not loved.", {
        legitimacy: 1,
        approval: -1,
      }),
      opt("attack", "Blame your opponents", "Your base loves it. Everyone else tunes out.", {
        approval: 1,
        stability: -1,
      }),
      opt("deputy", "Send a spokesperson", "No headlines, good or bad."),
    ],
  };
}

/** Next month's calendar: two calls, a staff meeting, and a visit or an interview. */
export function generateAgenda(world: WorldState): Meeting[] {
  const player = world.countries.find((c) => c.id === world.playerCountryId);
  if (!player) return [];
  const rng = new SeededRandom(combineSeed(world.seed, 900_001 + world.turn));
  // A world-changing event last month comes first: the emergency meetings it demands
  const out: Meeting[] = emergencyMeetings(world, player);
  const who = callers(world, player, rng).slice(0, out.length ? 1 : 2);
  for (const [i, c] of who.entries()) out.push(callMeeting(world, player, c, i, rng));
  out.push(staffMeeting(world, player, out.length));
  if (world.turn % 2 === 0) {
    const guest = world.countries
      .filter(
        (c) =>
          c.id !== player.id &&
          !who.includes(c) &&
          !player.atWarWith.includes(c.id) &&
          (player.relations[c.id] ?? 0) > 0,
      )
      .sort((a, b) => (player.relations[b.id] ?? 0) - (player.relations[a.id] ?? 0))[
      Math.floor(rng.next() * 3)
    ];
    if (guest) out.push(visitMeeting(world, player, guest, out.length));
  } else out.push(pressMeeting(world, player, out.length));
  return out;
}

/**
 * Shocks from last month (director.shocks) that the player must answer in person: the cabinet
 * convenes and the world's capitals call. Built from what actually happened, so the story
 * follows the player's actions.
 */
function emergencyMeetings(world: WorldState, player: CountryState): Meeting[] {
  const out: Meeting[] = [];
  // Gravest first: a nuclear strike, a new war, a lost ally, a collapsed state, a regime change
  const GRAVITY: Record<string, number> = {
    NUCLEAR_STRIKE: 5,
    WAR_START: 4,
    ALLY_LOST: 3,
    COLLAPSE: 2,
    REGIME_CHANGE: 1,
  };
  const recent = world.director.shocks
    .filter((s) => world.turn - s.turn <= 1 && world.turn - s.turn >= 0)
    .sort((a, b) => (GRAVITY[b.kind] ?? 0) - (GRAVITY[a.kind] ?? 0));
  const base = (n: number, kind: Meeting["kind"], templateId: string) => ({
    id: `mtg_${world.turn}_e${n}`,
    turn: world.turn,
    deadlineTurn: world.turn + 1,
    templateId,
    urgency: "URGENT" as const,
    defaultOptionId: "deputy",
    kind,
  });
  const name = (id?: string) => world.countries.find((c) => c.id === id)?.name ?? "the target";
  for (const s of recent) {
    if (out.length >= 2) break;
    if (s.kind === "WAR_START" && (s.by === player.id || s.target === player.id)) {
      const enemyId = s.by === player.id ? s.target : s.by;
      const enemy = world.countries.find((c) => c.id === enemyId);
      if (!enemy) continue;
      const attacking = s.by === player.id;
      out.push({
        ...base(out.length, "STAFF", "meeting_staff"),
        affectedCountries: [enemy.id],
        speaker: "Defence Minister",
        title: "War cabinet: day one",
        situation: attacking
          ? `"Our forces are across the line into ${enemy.name}. The first hours went to plan. Now you decide how far this goes."`
          : `"${enemy.name} has attacked us. Our forward units are holding, barely. The country wants to hear from you and the generals want orders."`,
        options: [
          opt(
            "total",
            "Full mobilization",
            "Every reservist, every factory. Total war footing.",
            { mobilization: 20, approval: 2, growth: -0.3 },
            3,
          ),
          opt(
            "limited",
            "Limited aims, keep the door to talks open",
            "A war you can end.",
            { [`relations:${enemy.id}`]: 4, approval: -1 },
            -3,
          ),
          opt("allies", "Call in the allies", "Capital spent on the phone; friends answer.", {
            relationsAllies: 4,
            pc: -1,
          }),
          opt("deputy", "Let the general staff run it", "The war runs without a political line."),
        ],
      });
      const power = strongest(world, [player.id, enemy.id]);
      if (power && out.length < 2) {
        const r = `relations:${power.id}`;
        out.push({
          ...base(out.length, "CALL", "meeting_call"),
          affectedCountries: [power.id, enemy.id],
          withCountry: power.id,
          speaker: leaderOf(power),
          title: `Phone call: ${leaderOf(power)}`,
          situation: attacking
            ? `"You started this. End it before it spreads, or do not expect us to stand aside."`
            : `"We saw what ${enemy.name} did. Tell us what you need, and what you will not do."`,
          options: attacking
            ? [
                opt(
                  "assure",
                  "Assure them the war has limited aims",
                  "Buys patience, not approval.",
                  { [r]: 5 },
                  -2,
                ),
                opt(
                  "brush",
                  "Tell them it is none of their business",
                  "They may make it their business.",
                  { [r]: -6, approval: 1 },
                  2,
                ),
                opt("deputy", "Let the foreign minister call back", "Noted, and not forgotten.", {
                  [r]: -2,
                }),
              ]
            : [
                opt(
                  "ask",
                  "Ask for weapons and sanctions on the aggressor",
                  "Help comes with expectations.",
                  { [r]: 4, [`relations:${enemy.id}`]: -3 },
                ),
                opt(
                  "restraint",
                  "Promise restraint in return for diplomatic support",
                  "The world remembers who was attacked.",
                  { [r]: 7, legitimacy: 2 },
                  -2,
                ),
                opt("deputy", "Let the foreign minister call back", "Help may come slower.", {
                  [r]: -1,
                }),
              ],
        });
      }
      continue;
    }
    const other = world.countries.find((c) => c.id === s.target);
    if (s.kind === "ALLY_LOST" && other) {
      const r = `relations:${other.id}`;
      const why = other.collapsed
        ? `${other.name} has collapsed, and our pact went down with its government`
        : player.atWarWith.includes(other.id)
          ? `we are now at war with ${other.name}, our own ally`
          : `${other.name} has walked away from our defence pact`;
      const partner = world.countries
        .filter(
          (c) =>
            c.id !== player.id &&
            c.id !== other.id &&
            !player.alliances.includes(c.id) &&
            !player.atWarWith.includes(c.id) &&
            !c.collapsed,
        )
        .sort((a, b) => (player.relations[b.id] ?? 0) - (player.relations[a.id] ?? 0))[0];
      out.push({
        ...base(out.length, "STAFF", "meeting_staff"),
        affectedCountries: [other.id],
        speaker: "Foreign Minister",
        title: `Emergency cabinet: we have lost ${other.name}`,
        situation: `"${why.charAt(0).toUpperCase()}${why.slice(1)}. Every partner we have left is asking whether they are next."`,
        options: [
          opt(
            "reassure",
            "Reassure the remaining allies",
            "Calls to every capital: our word still holds.",
            { relationsAllies: 4, pc: -1 },
          ),
          ...(partner
            ? [
                opt(
                  "partner",
                  `Court ${partner.name} as a new partner`,
                  "Fill the gap before a rival does.",
                  { [`relations:${partner.id}`]: 6 },
                ),
              ]
            : []),
          opt("alone", "We stand on our own", "Rearm and rely on no one.", {
            mobilization: 6,
            approval: 1,
            relationsAllies: -2,
          }),
          opt("deputy", "Let the ministry draft a statement", "Partners notice the silence.", {
            relationsAllies: -1,
          }),
        ],
      });
      if (!other.collapsed && !player.atWarWith.includes(other.id) && out.length < 2)
        out.push({
          ...base(out.length, "CALL", "meeting_call"),
          affectedCountries: [other.id],
          withCountry: other.id,
          speaker: leaderOf(other),
          title: `Phone call: ${leaderOf(other)}`,
          situation: `"The pact is over, but our countries do not have to be enemies. I wanted you to hear that from me."`,
          options: [
            opt("open", "Keep the door open", "Former allies, future partners.", { [r]: 5 }),
            opt(
              "blame",
              "Tell them they will regret it",
              "Satisfying, and remembered.",
              { [r]: -6, approval: 1 },
              1,
            ),
            opt("deputy", "Do not take the call", "A cold shoulder.", { [r]: -3 }),
          ],
        });
      continue;
    }
    if (s.kind === "COLLAPSE" && other) {
      const neighbour = sharesLandBorder(other.id, player.id) === true;
      out.push({
        ...base(out.length, "STAFF", "meeting_staff"),
        affectedCountries: [other.id],
        speaker: neighbour ? "Interior Minister" : "Defence Minister",
        title: `Emergency cabinet: ${other.name} has collapsed`,
        situation: neighbour
          ? `"There is no government left in ${other.name}. Armed factions, unguarded weapons depots, and a column of refugees already at our border."`
          : `"${other.name} has no functioning government. Militias are carving it up and its arsenal is up for grabs."`,
        options: [
          opt(
            "border",
            neighbour ? "Seal the border" : "Raise readiness",
            "Security first. The images will be hard to watch.",
            { mobilization: 8, stability: 2, legitimacy: -1 },
          ),
          opt(
            "corridor",
            "Open a humanitarian corridor",
            "Costs capital and stability, earns the world's respect.",
            { pc: -1, legitimacy: 2, stability: neighbour ? -2 : 0, relationsAllies: 2 },
          ),
          opt(
            "secure",
            "Send a team to secure the weapons",
            "Risky, quiet, and vital if it works.",
            { intel: 6, pc: -1 },
            1,
          ),
          opt("deputy", "Monitor the situation", "Let others move first."),
        ],
      });
      continue;
    }
    if (s.kind === "REGIME_CHANGE" && other) {
      const r = `relations:${other.id}`;
      const how =
        s.by === "COUP"
          ? "a military coup"
          : s.by === "REVOLUTION"
            ? "a revolution"
            : s.by === "ASSASSINATION"
              ? "an assassination"
              : "a foreign-backed takeover";
      const wasAlly = player.alliances.includes(other.id);
      out.push({
        ...base(out.length, "STAFF", "meeting_staff"),
        affectedCountries: [other.id],
        speaker: "Intelligence Chief",
        title: `Emergency cabinet: power changes hands in ${other.name}`,
        situation: `"${leaderOf(other)} has taken power in ${other.name} after ${how}. ${wasAlly ? "Our pact with them is suddenly in question." : "Everyone is waiting to see whether we recognise them."}"`,
        options: [
          opt(
            "recognise",
            `Recognise ${other.leader.name}`,
            "Pragmatic. Democrats at home will object.",
            { [r]: 8, legitimacy: -1 },
          ),
          opt("condemn", "Condemn and suspend aid", "Principled, and it closes a door.", {
            [r]: -8,
            approval: 1,
            legitimacy: 1,
          }),
          opt(
            "channel",
            "Open a quiet channel, say nothing in public",
            "Keep options on both sides.",
            { [r]: 3, intel: 3 },
          ),
          opt(
            "deputy",
            "Wait for the dust to settle",
            "Someone else will shape the new regime first.",
          ),
        ],
      });
      continue;
    }
    if (s.kind !== "NUCLEAR_STRIKE") continue;
    const target = world.countries.find((c) => c.id === s.target);
    if (s.by === player.id && target) {
      const t = `relations:${target.id}`;
      out.push({
        ...base(out.length, "STAFF", "meeting_staff"),
        affectedCountries: [target.id],
        speaker: "Chief of Staff",
        title: "Emergency cabinet: the day after",
        situation: `"The images from ${target.name} are on every screen in the world. Our allies are asking whether you will do it again. We need a line, today."`,
        options: [
          opt(
            "pledge",
            "Pledge no further use",
            "Allies breathe again. Hardliners call it weakness.",
            { relationsAllies: 6, approval: -2 },
            -12,
          ),
          opt(
            "aid",
            `Send humanitarian aid to ${target.name}`,
            "Field hospitals and iodine. It will not undo it, but it is noticed.",
            { [t]: 10, legitimacy: 2, pc: -1 },
            -6,
          ),
          opt(
            "open",
            "Keep every option open",
            "Deterrence through fear. The world believes you.",
            { relationsAllies: -5, approval: 1 },
            6,
          ),
          opt(
            "deputy",
            "Let the spokesperson handle it",
            "Silence, read as defiance.",
            { relationsAllies: -2 },
            2,
          ),
        ],
      });
      const power = strongest(world, [player.id, target.id]);
      if (power) {
        const r = `relations:${power.id}`;
        out.push({
          ...base(out.length, "CALL", "meeting_call"),
          affectedCountries: [power.id, target.id],
          withCountry: power.id,
          speaker: leaderOf(power),
          title: `Secure line: ${leaderOf(power)}`,
          situation: `"You have crossed a line no one has crossed in eighty years. The Security Council meets tonight. Agree to a ceasefire and inspectors, or face the consequences."`,
          options: [
            opt(
              "ceasefire",
              "Agree to a ceasefire and inspectors",
              "The war stops. So does your freedom of action.",
              { [r]: 10, [t]: 8, approval: -2, [`ceasefire:${target.id}`]: 1 },
              -10,
            ),
            opt("talks", "Offer talks, no inspectors", "Half a step back.", { [r]: 3 }, -3),
            opt(
              "defy",
              "Refuse: this is our war",
              "The pariah's path.",
              { [r]: -12, approval: 1 },
              8,
            ),
            opt("deputy", "Do not take the call", "Read as contempt.", { [r]: -6 }, 4),
          ],
        });
      }
    } else if (s.target === player.id) {
      const by = world.countries.find((c) => c.id === s.by);
      out.push({
        ...base(out.length, "STAFF", "meeting_staff"),
        affectedCountries: by ? [by.id] : [],
        speaker: "Interior Minister",
        title: "Emergency cabinet: we have been hit",
        situation: `"Casualty figures are still climbing. The hospitals in the blast zone are gone. The country is looking to you."`,
        options: [
          opt(
            "evacuate",
            "Evacuate and appeal for international aid",
            "Allies send planes. The nation sees you lead.",
            { relationsAllies: 6, stability: 4, pc: -1 },
          ),
          opt(
            "rally",
            "Address the nation: we will endure",
            "Grief turns into resolve.",
            { approval: 5, stability: 2 },
            3,
          ),
          opt(
            "peace",
            `Sue for peace with ${name(s.by)}`,
            "Stop the next one. Some will call it surrender.",
            {
              approval: -4,
              ...(by ? { [`relations:${by.id}`]: 6, [`ceasefire:${by.id}`]: 1 } : {}),
            },
            -8,
          ),
          opt("deputy", "Let the ministries cope", "The country notices who is missing.", {
            stability: -3,
          }),
        ],
      });
    } else {
      out.push({
        ...base(out.length, "STAFF", "meeting_staff"),
        affectedCountries: [s.by ?? "", s.target ?? ""].filter(Boolean),
        speaker: "Defence Minister",
        title: "Emergency cabinet: a nuclear weapon has been used",
        situation: `"${name(s.by)} has struck ${name(s.target)}. Fallout is drifting, markets are in free fall, and everyone is asking where we stand."`,
        options: [
          opt(
            "alert",
            "Raise the alert level",
            "Readiness reassures the public and alarms the neighbours.",
            { mobilization: 10, approval: 1 },
            2,
          ),
          opt(
            "sanctions",
            `Lead the call for sanctions on ${name(s.by)}`,
            "The moral high ground, and an enemy.",
            { ...(s.by ? { [`relations:${s.by}`]: -10 } : {}), approval: 2, legitimacy: 1 },
          ),
          opt("aid", `Send aid to ${name(s.target)}`, "Costs capital, earns gratitude.", {
            ...(s.target ? { [`relations:${s.target}`]: 8 } : {}),
            pc: -1,
          }),
          opt("deputy", "Wait and watch", "Others will decide the response."),
        ],
      });
    }
  }
  return out;
}
