import { combineSeed, SeededRandom } from "../seed.js";
import type { CountryState, GameEvent, Hotspot, HotspotPhase, WorldState } from "../types.js";

/**
 * Hot zones: places that are not states in the simulation but make the news every month.
 * Gaza and the West Bank each carry their own state (violence, humanitarian need, aid,
 * who holds the ground, civil order) and a phase (ceasefire, war, uprising...). Each month
 * they drift, flare up with an incident, can break or restore a ceasefire, and weigh on the
 * countries involved. Crises (crises.ts) move them through `hot:<ID>:<metric>` effects.
 *
 * Uses its own random stream, so adding a hot zone never changes the rest of the world.
 */

type Metric = "violence" | "humanitarian" | "aid" | "control" | "governance";
const METRICS: Metric[] = ["violence", "humanitarian", "aid", "control", "governance"];

interface Incident {
  kind: string;
  /** Where it can happen, when not anywhere in the zone. */
  places?: string[];
  /** Eligible this month? */
  when: (h: Hotspot, year: number, month: number) => boolean;
  title: (place: string) => string;
  text: (place: string, h: Hotspot) => string;
  delta: Partial<Record<Metric, number>>;
  type: GameEvent["type"];
}

const modern = (year: number) => year >= 2023;
const winter = (month: number) => month >= 11 || month <= 2;

const GAZA_PLACES = [
  "Rafah",
  "Khan Younis",
  "Deir al-Balah",
  "Gaza City",
  "Beit Lahia",
  "Jabalia",
  "Shujaiya",
  "Nuseirat",
];
const WEST_BANK_PLACES = [
  "Jenin",
  "Tulkarm",
  "Nablus",
  "Hebron",
  "Ramallah",
  "Qalqilya",
  "the Jordan Valley",
  "Masafer Yatta",
  "Bethlehem",
];

const GAZA: Incident[] = [
  // Fragile ceasefire (2025 onward): the yellow line, clans, crossings, the stabilization force
  {
    kind: "strike",
    when: (h, y) => h.phase === "CEASEFIRE" && modern(y),
    title: (p) => `Israeli strikes on ${p} after troops come under fire near the yellow line`,
    text: (p) =>
      `The army says gunmen approached its positions; health officials in ${p} report civilians among the dead. Both sides say the ceasefire still holds.`,
    delta: { violence: 9, humanitarian: 2 },
    type: "WAR",
  },
  {
    kind: "clash",
    when: (h, y) => h.phase === "CEASEFIRE" && modern(y),
    title: (p) => `Hamas and a clan militia fight for control of ${p}`,
    text: () =>
      `Armed families backed from outside the strip clash with Hamas police. The technocratic committee has no force of its own to stop them.`,
    delta: { violence: 5, governance: -3 },
    type: "STABILITY",
  },
  {
    kind: "aid",
    when: (h) => h.phase === "CEASEFIRE" && h.aid > 15,
    title: () => "Aid trucks held at Kerem Shalom as inspections tighten",
    text: () =>
      "UN agencies say fewer than half the agreed trucks entered this week. Israel says it is stopping items that could be used by Hamas.",
    delta: { aid: -9, humanitarian: 3 },
    type: "DIPLOMACY",
  },
  {
    kind: "crossing",
    when: (h, y) => h.phase === "CEASEFIRE" && h.violence < 55 && modern(y),
    title: () => "Rafah crossing reopens for the wounded and students",
    text: () =>
      "Egypt and European monitors process the first crossings in weeks. Hundreds wait at the gate.",
    delta: { aid: 7, humanitarian: -2 },
    type: "DIPLOMACY",
  },
  {
    kind: "storm",
    when: (_h, y, m) => winter(m) && modern(y),
    title: () => "Winter storm floods tent camps in Mawasi",
    text: () =>
      "Hundreds of thousands still live in tents on the coast. Aid groups say they have run out of tarpaulins and blankets.",
    delta: { humanitarian: 6 },
    type: "STABILITY",
  },
  {
    kind: "rebuild",
    when: (h, y) => h.phase === "CEASEFIRE" && h.violence < 45 && modern(y),
    title: (p) => `Rubble-clearing crews reach ${p}`,
    text: () =>
      "Engineers say clearing the strip will take years; the first funds from the reconstruction pledges are arriving.",
    delta: { governance: 4, humanitarian: -2 },
    type: "ECONOMY",
  },
  {
    kind: "isf",
    when: (h, y) => h.phase === "CEASEFIRE" && h.governance >= 25 && modern(y),
    title: (p) => `Stabilization force patrols reach ${p}`,
    text: () =>
      "Foreign troops and newly trained Palestinian police take over checkpoints. Hamas says it will not hand over its weapons to them.",
    delta: { governance: 4, violence: -3 },
    type: "DIPLOMACY",
  },
  {
    kind: "tunnel",
    when: (h, y) => h.phase === "CEASEFIRE" && modern(y),
    title: (p) => `Engineers uncover a tunnel network under ${p}`,
    text: () =>
      "Israel says it proves Hamas is rearming and refuses to pull back further until the group disarms.",
    delta: { violence: 3 },
    type: "WAR",
  },
  // Open war
  {
    kind: "strike",
    when: (h) => h.phase === "WAR",
    title: (p) => `Heavy bombardment of ${p}; dozens reported killed`,
    text: (p) =>
      `Residents of ${p} were ordered to move south again. Hospitals say they are treating the wounded on the floor.`,
    delta: { violence: 6, humanitarian: 5 },
    type: "WAR",
  },
  {
    kind: "rocket",
    when: (h) => h.phase === "WAR",
    title: () => "Rocket salvo from Gaza; sirens in Sderot and Ashkelon",
    text: () => "Most rockets are intercepted. The army answers with strikes across the strip.",
    delta: { violence: 5 },
    type: "WAR",
  },
  {
    kind: "ground",
    when: (h) => h.phase === "WAR" && h.control < 85,
    title: (p) => `Israeli armour pushes into ${p}`,
    text: () =>
      "The army says it is destroying tunnels and command posts. The UN says there is no safe place left in the strip.",
    delta: { control: 5, violence: 4 },
    type: "WAR",
  },
  {
    kind: "aid",
    when: (h) => h.phase === "WAR",
    title: () => "Aid convoys halted as fighting closes the crossings",
    text: () => "Trucks are lined up for miles on the Egyptian side of the border.",
    delta: { aid: -12, humanitarian: 4 },
    type: "DIPLOMACY",
  },
  {
    kind: "famine",
    when: (h) => h.humanitarian >= 65,
    title: () => "UN agencies warn of famine conditions in northern Gaza",
    text: () =>
      "Children are dying of malnutrition, doctors say. Governments around the world demand that the crossings open.",
    delta: { humanitarian: 4 },
    type: "STABILITY",
  },
  // Uprising (the 1987 to 1993 intifada)
  {
    kind: "clash",
    when: (h, y) => h.phase === "UPRISING" && !modern(y),
    title: (p) => `Curfew imposed on ${p} after stone-throwing clashes`,
    text: () =>
      "Troops fire tear gas and rubber bullets; the uprising's leaflets call for another strike day.",
    delta: { violence: 5 },
    type: "STABILITY",
  },
  {
    kind: "strike_day",
    when: (h, y) => h.phase === "UPRISING" && !modern(y),
    title: () => "General strike shuts the shops of Gaza",
    text: () => "Workers stay home from jobs in Israel. The economy of the strip grinds to a halt.",
    delta: { humanitarian: 3 },
    type: "ECONOMY",
  },
];

const WEST_BANK: Incident[] = [
  {
    kind: "settler",
    when: (_h, y) => y >= 2000,
    title: (p) => `Settlers attack villages near ${p}: homes and olive groves set on fire`,
    text: () =>
      "Residents say soldiers stood by. The army says it is investigating; no arrests have been reported.",
    delta: { violence: 6 },
    type: "STABILITY",
  },
  {
    kind: "raid",
    places: ["Jenin", "Tulkarm", "Nur Shams", "Balata", "Far'a"],
    when: (_h, y) => y >= 2000,
    title: (p) => `Israeli raid in ${p} ends in a deadly gunfight`,
    text: (p) =>
      `Armoured bulldozers tore up the streets of the ${p} refugee camp. Thousands have been displaced from the northern camps this year.`,
    delta: { violence: 7, humanitarian: 2 },
    type: "WAR",
  },
  {
    kind: "outpost",
    when: (h) => h.control < 95,
    title: (p) => `New settler outpost near ${p}; the army leaves it standing`,
    text: () =>
      "Ministers call it a response to calls for a Palestinian state. Allies of Israel call it a threat to any two-state solution.",
    delta: { control: 3, violence: 2 },
    type: "DIPLOMACY",
  },
  {
    kind: "attack",
    when: () => true,
    title: (p) => `Shooting attack at a junction near ${p}; checkpoints seal the area`,
    text: () => "Israel imposes closures on nearby towns while troops search for the gunmen.",
    delta: { violence: 7 },
    type: "WAR",
  },
  {
    kind: "salaries",
    when: (_h, y) => y >= 2019,
    title: () => "Palestinian Authority misses salaries again as tax transfers are withheld",
    text: () =>
      "Teachers and police go unpaid. Donors warn that the PA's finances are close to collapse.",
    delta: { humanitarian: 3, governance: -3 },
    type: "ECONOMY",
  },
  {
    kind: "demolition",
    when: () => true,
    title: (p) => `Homes demolished in ${p} for lack of building permits`,
    text: () => "Families say permits are almost never granted in Area C.",
    delta: { violence: 3, control: 1 },
    type: "STABILITY",
  },
  {
    kind: "calm",
    when: (h, _y, m) => h.violence < 50 && (m === 10 || m === 11),
    title: () => "Olive harvest passes with fewer attacks under international escort",
    text: () => "Volunteers and diplomats walked the groves with farmers this year.",
    delta: { violence: -5 },
    type: "DIPLOMACY",
  },
  {
    kind: "protest",
    when: (h) => h.phase === "UPRISING",
    title: () => "Mass protests and clashes across the West Bank",
    text: () => "Young men fight troops at every checkpoint from Jenin to Hebron.",
    delta: { violence: 5 },
    type: "STABILITY",
  },
];

const clamp = (v: number) => Math.max(0, Math.min(100, v));

function setPhase(h: Hotspot, phase: HotspotPhase, turn: number) {
  if (h.phase === phase) return;
  h.phase = phase;
  h.phaseSince = turn;
}

/** A crisis effect on a hot zone: `hot:GAZA:violence`, `hot:GAZA:war` (+1 war, -1 ceasefire). */
export function applyHotspotEffect(world: WorldState, key: string, value: number): void {
  const [, id, what] = key.split(":");
  const h = world.hotspots.find((x) => x.id === id);
  if (!h) return;
  if (what === "war") {
    if (value > 0 && h.phase !== "WAR") {
      setPhase(h, "WAR", world.turn);
      h.violence = Math.max(h.violence, 75);
    } else if (value < 0 && h.phase === "WAR") {
      setPhase(h, "CEASEFIRE", world.turn);
      h.violence = Math.min(h.violence, 45);
    }
    return;
  }
  if ((METRICS as string[]).includes(what)) h[what as Metric] = clamp(h[what as Metric] + value);
}

const alive = (c: CountryState | undefined): c is CountryState => !!c && !c.collapsed;

/** Countries whose public opinion turns on the occupier when the humanitarian picture is dire. */
const CRITICS = ["EGY", "TUR", "SAU", "ARE", "FRA", "GBR", "DEU", "ITA", "IDN", "ZAF", "BRA"];

/** Monthly drift, incidents, phase changes and the weight on the countries involved. */
export function updateHotspots(world: WorldState): GameEvent[] {
  if (world.hotspots.length === 0) return [];
  const rng = new SeededRandom(combineSeed(world.seed, 700_001 + world.turn));
  const [year, month] = world.date.split("-").map(Number);
  const events: GameEvent[] = [];
  const byId = (id: string) => world.countries.find((c) => c.id === id);
  for (const h of world.hotspots) {
    const occupier = byId(h.occupier);
    const people = byId(h.people);
    const gaza = h.id === "GAZA";
    const atWar = !!occupier?.atWarWith.includes(h.people);
    if (atWar && h.phase !== "WAR" && gaza) setPhase(h, "WAR", world.turn);

    // 1. Drift toward what the situation produces
    const target = !alive(occupier)
      ? 15
      : h.phase === "WAR"
        ? 80
        : gaza
          ? h.phase === "UPRISING"
            ? 55
            : 20 + (100 - h.governance) * 0.18 + (h.control > 50 ? 6 : 0)
          : 26 + h.control * 0.22 + (atWar ? 35 : 0) + (h.phase === "UPRISING" ? 15 : 0);
    h.violence = clamp(h.violence + (target - h.violence) * 0.25 + rng.nextFloat(-5, 5));
    const aidTarget =
      h.phase === "WAR" ? 18 : 35 + h.governance * 0.4 - Math.max(0, h.violence - 40) * 0.3;
    h.aid = clamp(h.aid + (aidTarget - h.aid) * 0.2);
    const needTarget = gaza
      ? 25 + h.violence * 0.4 + (100 - h.aid) * 0.35 - h.governance * 0.15
      : 15 + h.violence * 0.3 + (100 - h.aid) * 0.15;
    h.humanitarian = clamp(h.humanitarian + (needTarget - h.humanitarian) * 0.15);
    if (h.phase === "WAR") {
      h.governance = clamp(h.governance - 2.5);
      if (gaza) h.control = clamp(Math.min(85, h.control + 1.5));
    } else if (h.violence < 45) h.governance = clamp(h.governance + 0.6);
    if (!gaza && alive(occupier)) h.control = clamp(h.control + 0.25); // creeping settlement

    // 2. This month's incident (at most one per zone, so the paper is not all one story)
    const places = gaza ? GAZA_PLACES : WEST_BANK_PLACES;
    const pool = (gaza ? GAZA : WEST_BANK).filter((i) => i.when(h, year, month));
    let incident: Incident | null = null;
    if (pool.length > 0 && rng.nextBool(0.3 + h.violence / 220)) {
      incident = rng.pick(pool);
      const place = rng.pick(incident.places ?? places);
      for (const [k, v] of Object.entries(incident.delta))
        h[k as Metric] = clamp(h[k as Metric] + v);
      const title = incident.title(place);
      h.incidents = [{ turn: world.turn, kind: incident.kind, title }, ...h.incidents].slice(0, 6);
      events.push({
        id: `evt_hot_${h.id}_${world.turn}`,
        type: incident.type,
        title,
        description: incident.text(place, h),
        affectedCountries: [h.occupier, h.people],
        turn: world.turn,
        severity: h.violence >= 65 ? "MAJOR" : "NOTABLE",
      });
    }

    // 3. Phase changes
    const months = world.turn - h.phaseSince;
    if (gaza && h.phase === "CEASEFIRE" && h.violence >= 72 && rng.nextBool(0.3)) {
      setPhase(h, "WAR", world.turn);
      h.violence = Math.max(h.violence, 78);
      events.push({
        id: `evt_hot_${h.id}_war_${world.turn}`,
        type: "WAR",
        title: "Gaza ceasefire collapses as the war resumes",
        description:
          "After weeks of strikes and attacks along the yellow line, the army announces a new offensive. Mediators in Cairo and Doha say they were not warned.",
        affectedCountries: [h.occupier, h.people, "EGY"],
        turn: world.turn,
        severity: "MAJOR",
      });
    } else if (
      gaza &&
      h.phase === "WAR" &&
      !atWar &&
      months >= 3 &&
      rng.nextBool(0.12 + h.humanitarian / 400)
    ) {
      setPhase(h, "CEASEFIRE", world.turn);
      h.violence = Math.min(h.violence, 45);
      events.push({
        id: `evt_hot_${h.id}_truce_${world.turn}`,
        type: "DIPLOMACY",
        title: "Ceasefire in Gaza after mediators close a deal",
        description:
          "Egypt, Qatar and the United States announce a truce and an exchange of prisoners. Aid convoys line up at the crossings.",
        affectedCountries: [h.occupier, h.people, "EGY", "USA"],
        turn: world.turn,
        severity: "MAJOR",
      });
    } else if (!(gaza && (h.phase === "WAR" || h.phase === "CEASEFIRE"))) {
      // A ceasefire stays a ceasefire until it breaks; elsewhere the mood follows the violence
      const next: HotspotPhase =
        h.violence >= 75 || (h.phase === "UPRISING" && h.violence >= 55)
          ? "UPRISING"
          : h.violence < 20
            ? "CALM"
            : "TENSE";
      setPhase(h, next, world.turn);
    }

    // 4. The weight on the countries involved
    if (alive(occupier) && h.violence > 60) {
      occupier.stability = clamp(occupier.stability - 0.3);
    }
    if (alive(people)) {
      people.stability = clamp(people.stability - Math.max(0, h.violence - 40) * 0.02);
      people.gdp *= 1 - Math.max(0, h.violence - 50) * 0.0002;
    }
    if (gaza && h.phase === "WAR") {
      const egypt = byId("EGY");
      if (alive(egypt)) egypt.stability = clamp(egypt.stability - 0.2);
      world.globalTension = clamp(world.globalTension + 0.6);
    }
    if (alive(occupier) && h.humanitarian >= 70) {
      for (const id of CRITICS) {
        const c = byId(id);
        if (!alive(c)) continue;
        c.relations[occupier.id] = Math.max(-100, (c.relations[occupier.id] ?? 0) - 0.4);
        occupier.relations[id] = Math.max(-100, (occupier.relations[id] ?? 0) - 0.4);
      }
    }
  }
  return events;
}

/** One line for briefings, the dossier and the advisors. */
export function hotspotSummary(h: Hotspot): string {
  const phase =
    h.phase === "WAR"
      ? "at war"
      : h.phase === "CEASEFIRE"
        ? h.violence >= 55
          ? "a ceasefire close to breaking"
          : "a fragile ceasefire"
        : h.phase === "UPRISING"
          ? "in open revolt"
          : h.phase === "CALM"
            ? "calm for now"
            : "tense";
  const need =
    h.humanitarian >= 75
      ? "famine conditions"
      : h.humanitarian >= 55
        ? "a humanitarian emergency"
        : h.humanitarian >= 35
          ? "serious hardship"
          : "manageable needs";
  return `${h.name}: ${phase}, ${need}, aid ${h.aid >= 55 ? "flowing" : h.aid >= 30 ? "restricted" : "barely getting in"}.`;
}
