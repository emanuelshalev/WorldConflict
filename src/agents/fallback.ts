import { combineSeed, createSeed, SeededRandom } from "../core/seed.js";
import { isNuclearOperational, shouldSeekNuclearWeapons } from "../core/systems/nuclear.js";
import type { Action, CountryIntent, CountryState, WorldState } from "../core/types.js";

/**
 * Deterministic personality-driven country AI.
 *
 * Every decision flows from the country's personality traits, historical
 * relationships, regime constraints, leader style and — critically — its
 * BELIEFS about other countries rather than ground truth. Two countries with
 * different intelligence pictures of the same rival will act differently.
 */

interface Candidate {
  action: Action;
  weight: number;
}

export class PersonalityAI {
  generateIntent(country: CountryState, world: WorldState, rng: SeededRandom): CountryIntent {
    const candidates: Candidate[] = [];
    const p = country.personality;
    const reasoning: string[] = [];

    const believedStability = (targetId: string): number =>
      country.beliefs[targetId]?.stability ?? 50;
    const believedStrength = (targetId: string): number =>
      country.beliefs[targetId]?.militaryStrength ?? Number.POSITIVE_INFINITY;
    const myStrength =
      country.manpower * (0.25 + (0.75 * country.mobilizationLevel) / 100) + country.airpower * 60;

    const electionSoon =
      country.politicalSystem.nextElectionTurn !== null &&
      country.politicalSystem.nextElectionTurn - world.turn < 10;

    // ------------------------------------------------------------------
    // 1. Domestic crisis management comes first — every regime fears its people
    // ------------------------------------------------------------------
    if (country.stability < 40 || country.legitimacy < 40) {
      const prefersForce =
        country.leader.style === "HARDLINER" ||
        country.regimeType === "AUTOCRACY" ||
        country.regimeType === "MILITARY_JUNTA";
      candidates.push({
        action: { type: prefersForce ? "DOMESTIC_PROPAGANDA" : "DOMESTIC_REFORM" },
        weight: 90 + (40 - Math.min(40, country.stability)),
      });
      reasoning.push("domestic crisis");
    }
    if (country.insurgencyLevel === "REBELLION" || country.insurgencyLevel === "GUERILLA") {
      const hard =
        country.leader.style === "HARDLINER" ||
        (country.regimeType !== "DEMOCRACY" && p.ideologicalRigidity > 60);
      candidates.push({
        action: { type: "DOMESTIC_POLICING", params: { tactic: hard ? "HARD" : "SOFT" } },
        weight: 85,
      });
    }

    // ------------------------------------------------------------------
    // 2. War conduct
    // ------------------------------------------------------------------
    for (const enemyId of country.atWarWith) {
      const war = world.wars.find(
        (w) =>
          (w.attackerId === country.id && w.defenderId === enemyId) ||
          (w.defenderId === country.id && w.attackerId === enemyId),
      );
      if (!war) continue;
      const iAmAttacker = war.attackerId === country.id;
      const myPosition = iAmAttacker ? war.frontline : 100 - war.frontline;

      if (country.mobilizationLevel < 75) {
        candidates.push({ action: { type: "MILITARY_MOBILIZE" }, weight: 80 });
      }
      // Losing: seek peace, the more flexibly-minded the sooner
      if (myPosition < 40) {
        candidates.push({
          action: { type: "DIPLOMACY_PROPOSE_CEASEFIRE", targetCountryId: enemyId },
          weight: 50 + p.diplomaticFlexibility / 2 + (40 - myPosition),
        });
        reasoning.push("losing war, seeking ceasefire");
      }
      // Exhausted stalemate: even hawks tire
      if (war.exhaustion > 60 && myPosition < 60) {
        candidates.push({
          action: { type: "DIPLOMACY_PROPOSE_CEASEFIRE", targetCountryId: enemyId },
          weight: 30 + war.exhaustion / 2,
        });
      }
      // Desperate hardliners with the bomb think the unthinkable
      if (
        myPosition < 18 &&
        country.nuclear.status === "ARMED" &&
        country.nuclear.warheads > 0 &&
        country.leader.style === "HARDLINER" &&
        p.riskTolerance > 80
      ) {
        const enemy = world.countries.find((c) => c.id === enemyId);
        if (enemy && !isNuclearOperational(enemy)) {
          candidates.push({
            action: { type: "NUCLEAR_STRIKE", targetCountryId: enemyId },
            weight: 25, // still usually outweighed — but the risk is real
          });
          reasoning.push("cornered nuclear hardliner");
        }
      }
    }

    // ------------------------------------------------------------------
    // 3. Red-line and threat responses
    // ------------------------------------------------------------------
    for (const other of world.countries) {
      if (other.id === country.id || other.collapsed) continue;

      // Troops on our border → respond in kind
      const deployedAgainstUs = other.borderDeployments.some(
        (d) => d.targetCountryId === country.id,
      );
      if (deployedAgainstUs && !country.atWarWith.includes(other.id)) {
        const alreadyDeployed = country.borderDeployments.some(
          (d) => d.targetCountryId === other.id,
        );
        if (!alreadyDeployed) {
          candidates.push({
            action: { type: "MILITARY_DEPLOY_BORDER", targetCountryId: other.id, value: 40000 },
            weight: 45 + p.warPropensity / 3,
          });
          candidates.push({
            action: { type: "DIPLOMACY_DENOUNCE", targetCountryId: other.id },
            weight: 40,
          });
        }
      }

      // Nuclear red line: rival's secret program detected through OUR intel
      const believedNuclearProgress = country.beliefs[other.id]?.nuclearProgress ?? 0;
      const nuclearRedLineSeverity = Math.max(
        0,
        ...country.redLines.filter((r) => r.type === "NUCLEAR").map((r) => r.severity),
      );
      const isRival = (country.history.historicalRivals ?? []).includes(other.id);
      if (
        isRival &&
        believedNuclearProgress > 45 &&
        other.nuclear.status === "DEVELOPING" &&
        (nuclearRedLineSeverity > 0 || p.warPropensity > 60)
      ) {
        // Open military strikes are a doctrine of last resort (Begin doctrine);
        // most powers prefer deniable sabotage (Stuxnet pattern)
        const willingToStrike =
          nuclearRedLineSeverity >= 9 || (p.warPropensity > 60 && p.riskTolerance > 60);
        if (willingToStrike && country.airpower > other.airpower * 0.8) {
          candidates.push({
            action: {
              type: "MILITARY_AIRSTRIKE",
              targetCountryId: other.id,
              params: { targetType: "NUCLEAR" },
            },
            weight: 45 + p.riskTolerance / 4 + (believedNuclearProgress > 70 ? 25 : 0),
          });
          reasoning.push(`${other.id} nuclear program nearing completion`);
        } else {
          candidates.push({
            action: { type: "INTEL_SABOTAGE", targetCountryId: other.id },
            weight: 55,
          });
        }
      }
    }

    // ------------------------------------------------------------------
    // 4. Opportunistic aggression — filtered through institutions and beliefs
    // ------------------------------------------------------------------
    if (
      country.atWarWith.length === 0 &&
      !electionSoon && // democracies avoid wars before elections
      country.stability > 45 &&
      p.warPropensity > 60 &&
      p.expansionism > 50
    ) {
      const targets = (country.history.historicalRivals ?? [])
        .map((id) => world.countries.find((c) => c.id === id))
        .filter(
          (t): t is CountryState =>
            !!t &&
            !t.collapsed &&
            (country.relations[t.id] ?? 0) < -55 &&
            believedStability(t.id) < 35 &&
            believedStrength(t.id) < myStrength * 0.6 &&
            !isNuclearOperational(t) &&
            !(isNuclearOperational(country) && isNuclearOperational(t)),
        );
      for (const target of targets) {
        // Pact allies of the target deter aggression
        const protectedByPact = target.alliances.some((aid) => {
          const ally = world.countries.find((c) => c.id === aid);
          return ally && (ally.beliefs ? believedStrength(aid) > myStrength : false);
        });
        if (protectedByPact && p.riskTolerance < 70) continue;
        candidates.push({
          action: { type: "DIPLOMACY_DECLARE_WAR", targetCountryId: target.id },
          weight:
            (p.warPropensity + p.expansionism + p.riskTolerance) / 6 +
            (40 - believedStability(target.id)) / 2,
        });
        reasoning.push(`${target.id} looks weak`);
      }
    }

    // ------------------------------------------------------------------
    // 5. Diplomacy: build the friendships history suggests
    // ------------------------------------------------------------------
    const friendCandidates = world.countries.filter(
      (o) =>
        o.id !== country.id &&
        !o.collapsed &&
        !country.atWarWith.includes(o.id) &&
        !country.alliances.includes(o.id),
    );
    for (const other of friendCandidates) {
      const relation = country.relations[other.id] ?? 0;
      const isHistoricalAlly = (country.history.historicalAllies ?? []).includes(other.id);
      const inSphere = (country.history.sphereOfInfluence ?? []).includes(other.id);
      if (relation >= 60) {
        candidates.push({
          action: { type: "DIPLOMACY_PROPOSE_ALLIANCE", targetCountryId: other.id },
          weight: 25 + p.allianceLoyalty / 4 + (isHistoricalAlly ? 20 : 0),
        });
      } else if (relation > 10 && (isHistoricalAlly || inSphere)) {
        candidates.push({
          action: { type: "DIPLOMACY_IMPROVE_RELATIONS", targetCountryId: other.id },
          weight: 30 + (isHistoricalAlly ? 15 : 8) - p.isolationism / 5,
        });
      }
    }
    // Hawkish leaders denounce rivals to play to the home crowd
    if (country.leader.style === "HAWKISH" || country.leader.style === "HARDLINER") {
      const rival = (country.history.historicalRivals ?? [])
        .map((id) => world.countries.find((c) => c.id === id))
        .find((c) => c && !c.collapsed && !country.atWarWith.includes(c.id));
      if (rival) {
        candidates.push({
          action: { type: "DIPLOMACY_DENOUNCE", targetCountryId: rival.id },
          weight: 18 + p.ideologicalRigidity / 8,
        });
      }
    }

    // ------------------------------------------------------------------
    // 6. Covert operations against rivals
    // ------------------------------------------------------------------
    if (country.intelLevel > 55 && !electionSoon) {
      for (const rid of country.history.historicalRivals ?? []) {
        const rival = world.countries.find((c) => c.id === rid);
        if (!rival || rival.collapsed) continue;
        const belief = country.beliefs[rid];
        if ((belief?.accuracy ?? 0) < 45) {
          candidates.push({
            action: { type: "INTEL_GATHER", targetCountryId: rid },
            weight: 35,
          });
        } else if (believedStability(rid) < 45 && p.expansionism > 45) {
          candidates.push({
            action: {
              type: rival.insurgencyLevel !== "NONE" ? "INTEL_SUPPORT_REBELS" : "INTEL_DESTABILIZE",
              targetCountryId: rid,
            },
            weight: 25 + p.riskTolerance / 5,
          });
        }
      }
    }

    // ------------------------------------------------------------------
    // 7. Nuclear ambitions
    // ------------------------------------------------------------------
    if (shouldSeekNuclearWeapons(world, country) && country.regimeType !== "DEMOCRACY") {
      candidates.push({
        action: { type: "NUCLEAR_FUND_PROGRAM" },
        weight: 40 + p.riskTolerance / 4,
      });
      reasoning.push("seeking nuclear deterrent");
    }
    if (country.nuclear.status === "DEVELOPING" && !country.nuclear.funded) {
      candidates.push({ action: { type: "NUCLEAR_FUND_PROGRAM" }, weight: 50 });
    }

    // ------------------------------------------------------------------
    // 8. Peacetime housekeeping
    // ------------------------------------------------------------------
    if (country.atWarWith.length === 0 && country.mobilizationLevel > 40) {
      candidates.push({ action: { type: "MILITARY_DEMOBILIZE" }, weight: 20 });
    }
    if (country.approval < 40) {
      candidates.push({ action: { type: "DOMESTIC_PROPAGANDA" }, weight: 25 });
    }

    // ------------------------------------------------------------------
    // Pick up to 3 actions by weighted, seeded sampling without replacement
    // ------------------------------------------------------------------
    const chosen: Action[] = [];
    const pool = [...candidates];
    const maxActions = 3;
    while (chosen.length < maxActions && pool.length > 0) {
      const totalWeight = pool.reduce((s, c) => s + Math.max(1, c.weight), 0);
      let roll = rng.next() * totalWeight;
      let pickedIndex = 0;
      for (let i = 0; i < pool.length; i++) {
        roll -= Math.max(1, pool[i].weight);
        if (roll <= 0) {
          pickedIndex = i;
          break;
        }
      }
      const picked = pool.splice(pickedIndex, 1)[0];
      // Never two of the same action type, never two wars at once
      if (chosen.some((a) => a.type === picked.action.type)) continue;
      if (
        picked.action.type === "DIPLOMACY_DECLARE_WAR" &&
        chosen.some((a) => a.type === "DIPLOMACY_DECLARE_WAR")
      ) {
        continue;
      }
      // War declarations need conviction, not a lucky roll
      if (picked.action.type === "DIPLOMACY_DECLARE_WAR" && picked.weight < 35) continue;
      if (picked.action.type === "NUCLEAR_STRIKE" && rng.next() > 0.3) continue; // second thoughts
      chosen.push(picked.action);
    }

    return {
      countryId: country.id,
      actions: chosen,
      reasoning: reasoning.join("; ") || undefined,
    };
  }
}

/** Backwards-compatible alias used by older imports. */
export const FallbackAI = PersonalityAI;

/**
 * Generate intents for every AI country, deterministically from the world seed.
 */
export function generateDeterministicIntents(world: WorldState): CountryIntent[] {
  const ai = new PersonalityAI();
  return world.countries
    .filter((c) => c.id !== world.playerCountryId && !c.collapsed)
    .map((country) => {
      const rng = new SeededRandom(
        combineSeed(combineSeed(world.seed, world.turn), createSeed(7, country.id)),
      );
      return ai.generateIntent(country, world, rng);
    });
}
