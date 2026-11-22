/**
 * Era map: what the title globe shows for a scenario (design-worldmap.md 4.3).
 *
 * Pure: no RNG, no I/O, no clock. Built from the scenario file and the static
 * country profiles only. Display data: the engine never reads it.
 */
import {
  type Bloc,
  type EraStatus,
  initialStability,
  type MapLabel,
  type ScenarioData,
  type Situation,
} from "./data-loader.js";
import { type CountryProfile, TIER1_COUNTRIES } from "./types.js";

export interface EraMapCountry {
  id: string;
  name: string; // era name ("Soviet Union") or the game name
  leader?: { name: string; title: string; sinceDate?: string }; // absent: invented for this era
  stability: number;
  bloc?: string; // bloc id
  status: "STATE" | "PART_OF" | "NOT_INDEPENDENT";
  partOf?: string;
  label?: string; // era label when not a state ("Ukrainian SSR")
  note?: string;
  nuclear: string;
}

export interface EraMap {
  scenarioId: string;
  year: number;
  month: number;
  name: string;
  tension: number;
  focus: [number, number];
  countries: EraMapCountry[];
  blocs: Bloc[];
  situations: Situation[]; // heaviest first (stable), the calm view takes the first five
  wars: Array<{ a: string; b: string }>; // startingWars: drawn as fronts
  rivals: Array<{ a: string; b: string; relation: number }>; // top 8, <= -60, not at war
  merged: Array<{ id: string; partOf: string }>; // ADM0 polygons painted as their parent
  hotspots: Array<{ id: string; name: string; center: [number, number]; phase: string }>;
  labels: MapLabel[];
  labelAllow?: string[];
}

export const RIVAL_THRESHOLD = -60;
export const MAX_RIVALS = 8;
const DEFAULT_FOCUS: [number, number] = [20, 30];

const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

/** Every roster pair at -60 or worse (the worse of both directions), not at war. */
function eraRivals(scenario: ScenarioData): EraMap["rivals"] {
  const atWar = new Set(scenario.startingWars.map((w) => pairKey(w.attackerId, w.defenderId)));
  const roster = new Set<string>(TIER1_COUNTRIES);
  const worst = new Map<string, number>();
  for (const [a, row] of Object.entries(scenario.initialRelations)) {
    for (const [b, value] of Object.entries(row)) {
      if (a === b || !roster.has(a) || !roster.has(b)) continue;
      const k = pairKey(a, b);
      const prev = worst.get(k);
      worst.set(k, prev === undefined ? value : Math.min(prev, value));
    }
  }
  return [...worst.entries()]
    .filter(([k, v]) => v <= RIVAL_THRESHOLD && !atWar.has(k))
    .sort(([ka, va], [kb, vb]) => va - vb || (ka < kb ? -1 : ka > kb ? 1 : 0))
    .slice(0, MAX_RIVALS)
    .map(([k, relation]) => {
      const [a, b] = k.split("|");
      return { a, b, relation };
    });
}

function eraMerged(scenario: ScenarioData): EraMap["merged"] {
  const out = new Map<string, string>();
  for (const [parent, ids] of Object.entries(scenario.merged)) {
    for (const id of ids) if (id !== parent) out.set(id, parent);
  }
  for (const [id, s] of Object.entries(scenario.eraStatus)) {
    if (s.status === "PART_OF" && s.partOf && s.partOf !== id) out.set(id, s.partOf);
  }
  return [...out.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([id, partOf]) => ({ id, partOf }));
}

function countryRow(
  profile: CountryProfile,
  scenario: ScenarioData,
  blocOf: Map<string, string>,
): EraMapCountry {
  const override = scenario.countryOverrides[profile.id] ?? {};
  const lead = scenario.leaders[profile.id];
  const era: EraStatus | undefined = scenario.eraStatus[profile.id];
  const row: EraMapCountry = {
    id: profile.id,
    name: override.name ?? profile.name,
    stability: Math.round(initialStability(profile, override, scenario.multipliers)),
    status: era?.status ?? "STATE",
    nuclear: override.nuclearStatus ?? profile.military.nuclearStatus,
  };
  if (lead) {
    row.leader = {
      name: lead.name,
      title: lead.title ?? override.leaderTitle ?? profile.politicalSystem.leaderTitle,
      ...(lead.sinceDate ? { sinceDate: lead.sinceDate } : {}),
    };
  }
  const bloc = blocOf.get(profile.id) ?? (era?.partOf ? blocOf.get(era.partOf) : undefined);
  if (bloc) row.bloc = bloc;
  if (era) {
    if (era.partOf) row.partOf = era.partOf;
    row.label = era.label;
    if (era.note) row.note = era.note;
  }
  return row;
}

/** The era map payload for a scenario. `profiles` may hold any countries; only the roster is used. */
export function buildEraMap(scenario: ScenarioData, profiles: CountryProfile[]): EraMap {
  const blocOf = new Map<string, string>();
  for (const b of scenario.blocs) {
    for (const m of b.members) if (!blocOf.has(m)) blocOf.set(m, b.id);
  }

  const byId = new Map(profiles.map((p) => [p.id, p]));
  const countries = TIER1_COUNTRIES.flatMap((id) => {
    const p = byId.get(id);
    return p ? [countryRow(p, scenario, blocOf)] : [];
  });

  // Heaviest first; Array.prototype.sort is stable, so file order breaks ties
  const situations = structuredClone(scenario.situations).sort((a, b) => b.weight - a.weight);
  const focus: [number, number] = scenario.mapFocus
    ? [scenario.mapFocus[0], scenario.mapFocus[1]]
    : situations[0]
      ? [situations[0].at[0], situations[0].at[1]]
      : DEFAULT_FOCUS;

  const map: EraMap = {
    scenarioId: scenario.id,
    year: scenario.startYear,
    month: scenario.startMonth,
    name: scenario.name,
    tension: scenario.globalTension,
    focus,
    countries,
    blocs: structuredClone(scenario.blocs),
    situations,
    wars: scenario.startingWars.map((w) => ({ a: w.attackerId, b: w.defenderId })),
    rivals: eraRivals(scenario),
    merged: eraMerged(scenario),
    hotspots: scenario.hotspots.map((h) => ({
      id: h.id,
      name: h.name,
      center: [h.center[0], h.center[1]],
      phase: h.phase,
    })),
    labels: structuredClone(scenario.mapLabels),
  };
  if (scenario.labelAllow) map.labelAllow = [...scenario.labelAllow];
  return map;
}
