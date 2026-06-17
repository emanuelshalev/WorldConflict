import { COVERT_COSTS_M } from "./systems/covert.js";
import { canDeclareWar } from "./systems/diplomacy.js";
import { effectiveForce, monthlyDefenseBudgetM } from "./systems/military.js";
import { isNuclearOperational } from "./systems/nuclear.js";
import { actionCostM } from "./turn.js";
import type { Action, WorldState } from "./types.js";

export interface PreviewEffect {
  target: string; // country name or "Global"
  metric: string; // "Relations", "Stability", "Tension"...
  delta: string; // "-15", "+5", "→ WAR"
  note: string;
}

export interface ActionPreview {
  summary: string;
  costM: number;
  budgetM: number;
  affordable: boolean;
  successChance: number | null; // null = certain
  effects: PreviewEffect[];
  risks: string[];
  blocked: string | null; // non-null = action invalid, with reason
}

/**
 * Predict the consequences of an action before the player commits.
 * Pure read — never mutates the world.
 */
export function previewAction(world: WorldState, action: Action): ActionPreview {
  const actor = world.countries.find((c) => c.id === world.playerCountryId);
  const target = action.targetCountryId
    ? world.countries.find((c) => c.id === action.targetCountryId)
    : undefined;

  const costM = actionCostM(action);
  const budgetM = actor ? monthlyDefenseBudgetM(actor) : 0;
  const base: ActionPreview = {
    summary: "",
    costM,
    budgetM: Math.round(budgetM),
    affordable: costM <= budgetM,
    successChance: null,
    effects: [],
    risks: [],
    blocked: null,
  };
  if (!actor) {
    base.blocked = "Player country not found";
    return base;
  }

  const tname = target?.name ?? "";
  const effects = base.effects;
  const risks = base.risks;

  switch (action.type) {
    case "DIPLOMACY_IMPROVE_RELATIONS": {
      if (!target) return blocked(base, "Select a target country");
      if (actor.atWarWith.includes(target.id))
        return blocked(base, "You are at war — propose a ceasefire instead");
      base.summary = `Open trade talks, cultural exchange and quiet diplomacy with ${tname} ($${costM}M/month).`;
      effects.push(eff(tname, "Relations", "+5 to +7", "Diminishing returns at high friendship"));
      if ((actor.history.historicalRivals ?? []).includes(target.id)) {
        risks.push(`${tname} is a historical rival — progress will be slow and fragile.`);
      }
      break;
    }
    case "DIPLOMACY_DENOUNCE": {
      if (!target) return blocked(base, "Select a target country");
      base.summary = `Publicly condemn ${tname} before the world.`;
      effects.push(eff(tname, "Relations", "-12 to -15", "They will not forget this"));
      effects.push(eff("Your public", "Approval", "+2", "Voters enjoy strength"));
      effects.push(eff("Global", "Tension", "+2", ""));
      for (const allyId of target.alliances) {
        const ally = world.countries.find((c) => c.id === allyId);
        if (ally) effects.push(eff(ally.name, "Relations", "-5", `Ally of ${tname}`));
      }
      break;
    }
    case "DIPLOMACY_PROPOSE_ALLIANCE": {
      if (!target) return blocked(base, "Select a target country");
      const relation = target.relations[actor.id] ?? 0;
      if (relation < 60) {
        return blocked(
          base,
          `${tname}'s government would refuse outright — relations are ${Math.round(relation)}, must be 60+ (PROFITABLE).`,
        );
      }
      const isRival = (target.history.historicalRivals ?? []).includes(actor.id);
      const loyalty = target.personality.allianceLoyalty / 100;
      base.successChance = Math.round(
        Math.min(0.9, (relation / 100) * (0.5 + loyalty * 0.5) * (isRival ? 0.4 : 1)) * 100,
      );
      base.summary = `Propose a mutual defense pact with ${tname}.`;
      effects.push(
        eff(tname, "Status", "→ MILITARY PACT", "An attack on one is an attack on both"),
      );
      risks.push(`A pact obliges you to join ${tname}'s defensive wars.`);
      break;
    }
    case "DIPLOMACY_BREAK_ALLIANCE": {
      if (!target) return blocked(base, "Select a target country");
      if (!actor.alliances.includes(target.id)) return blocked(base, "You are not allied");
      base.summary = `Abrogate the defense treaty with ${tname}.`;
      effects.push(eff(tname, "Relations", "-35", "Betrayal is remembered"));
      risks.push("Your other allies will trust you less (-8 relations each).");
      break;
    }
    case "DIPLOMACY_DECLARE_WAR": {
      if (!target) return blocked(base, "Select a target country");
      const check = canDeclareWar(actor, target);
      if (!check.allowed) return blocked(base, check.reason);
      const myForce = effectiveForce(actor, true);
      const theirForce = effectiveForce(target, false);
      const ratio = myForce / Math.max(1, theirForce);
      base.summary = `Order the invasion of ${tname}. There is no undo in geopolitics.`;
      effects.push(eff(tname, "Status", "→ WAR", ""));
      effects.push(eff("Global", "Tension", "+15", ""));
      effects.push(
        eff(
          "Military balance",
          "Force ratio",
          ratio > 1.5
            ? "Strong advantage"
            : ratio > 1
              ? "Slight advantage"
              : ratio > 0.7
                ? "Outmatched"
                : "Severely outmatched",
          `Your effective force vs theirs: ${(ratio).toFixed(2)}:1`,
        ),
      );
      const defenders = target.alliances
        .map((id) => world.countries.find((c) => c.id === id))
        .filter((c) => c && !c.collapsed);
      if (defenders.length > 0) {
        risks.push(
          `${tname} has defense pacts with ${defenders.map((d) => d?.name).join(", ")} — expect them to join the war.`,
        );
      }
      if (check.nuclearStandoff) {
        risks.push(
          "☢ ATTACK MEANS DISASTER: both arsenals are operational. This war can end civilization.",
        );
      } else if (isNuclearOperational(target)) {
        risks.push(`☢ ${tname} has nuclear weapons. You do not. Consider what losing looks like.`);
      }
      risks.push("Wars devastate approval, stability and GDP on both sides the longer they run.");
      break;
    }
    case "DIPLOMACY_PROPOSE_CEASEFIRE": {
      if (!target) return blocked(base, "Select a target country");
      const war = world.wars.find(
        (w) =>
          (w.attackerId === actor.id && w.defenderId === target.id) ||
          (w.attackerId === target.id && w.defenderId === actor.id),
      );
      if (!war) return blocked(base, `You are not at war with ${tname}`);
      const actorIsAttacker = war.attackerId === actor.id;
      const targetWinning = actorIsAttacker ? war.frontline < 45 : war.frontline > 55;
      let chance = 0.35 + war.exhaustion / 200;
      if (targetWinning) chance -= 0.25;
      chance += target.personality.diplomaticFlexibility / 400;
      base.successChance = Math.round(Math.max(0, Math.min(1, chance)) * 100);
      base.summary = `Seek an end to the war with ${tname} along current lines.`;
      effects.push(eff("Both nations", "War", "ends if accepted", "Mobilization winds down"));
      if (targetWinning) risks.push(`${tname} is winning — they have little reason to stop now.`);
      break;
    }
    case "MILITARY_MOBILIZE": {
      base.summary = "Call up reserves and surge readiness (+20% mobilization).";
      effects.push(eff(actor.name, "Mobilization", "+20", ""));
      effects.push(eff(actor.name, "Stability", "-2", "Conscription is unpopular"));
      risks.push("Rivals read mobilization as a threat (-3 relations with historical rivals).");
      break;
    }
    case "MILITARY_DEMOBILIZE": {
      base.summary = "Send the reserves home (-20% mobilization).";
      effects.push(eff(actor.name, "Mobilization", "-20", ""));
      effects.push(eff(actor.name, "Stability", "+1", ""));
      break;
    }
    case "MILITARY_PROCURE": {
      const spend = action.value ?? 500;
      base.summary = actor.underGlobalEmbargo
        ? `Buy arms on the black market — embargo prices, no questions asked ($${spend}M).`
        : `Purchase equipment from your arms suppliers ($${spend}M).`;
      effects.push(
        eff(
          actor.name,
          "Airpower",
          `+${Math.floor(spend / (actor.underGlobalEmbargo ? 100 : 50))}`,
          "",
        ),
      );
      if (actor.underGlobalEmbargo)
        risks.push("Embargo: private dealers charge double for inferior stock.");
      break;
    }
    case "MILITARY_AIRSTRIKE": {
      if (!target) return blocked(base, "Select a target country");
      const targetType = (action.params?.targetType as string) ?? "MILITARY";
      const offensive = actor.airpower;
      const defensive = target.airpower * 0.6 + target.intelLevel * 5;
      base.successChance = Math.round(
        Math.min(0.9, Math.max(0.25, 0.55 + (offensive - defensive) / 20000)) * 100,
      );
      base.summary = `Precision airstrike on ${tname}'s ${targetType.toLowerCase()} targets.`;
      effects.push(eff(tname, "Relations", "-30", "An act of war in all but name"));
      effects.push(eff("Global", "Tension", "+8", ""));
      if (targetType === "NUCLEAR") {
        if (target.nuclear.status === "DEVELOPING") {
          const strikes = target.nuclear.consecutiveStrikesTaken;
          effects.push(
            eff(
              tname,
              "Nuclear program",
              strikes >= 1 ? "CRIPPLED if successful" : "-25 progress",
              `Two-Strike Rule: ${strikes}/2 consecutive hits`,
            ),
          );
        } else if (isNuclearOperational(target)) {
          risks.push(
            `${tname}'s arsenal is already operational — hardened sites cannot be destroyed conventionally.`,
          );
        } else {
          risks.push("Intelligence shows no active nuclear program to strike.");
        }
      }
      risks.push(`${tname} may retaliate — militarily or through proxies.`);
      break;
    }
    case "MILITARY_DEPLOY_BORDER": {
      if (!target) return blocked(base, "Select a target country");
      base.summary = `Deploy ${(action.value ?? 50000).toLocaleString()} troops to the ${tname} border.`;
      effects.push(eff(tname, "Relations", "-8 now, -3/month", "Sustained pressure"));
      effects.push(eff("Global", "Tension", "+0.5/month", ""));
      risks.push(`${tname} will increase military spending in response.`);
      break;
    }
    case "MILITARY_WITHDRAW_BORDER": {
      if (!target) return blocked(base, "Select a target country");
      base.summary = `Withdraw border deployments facing ${tname}.`;
      effects.push(eff(tname, "Relations", "+5", "De-escalation noticed"));
      break;
    }
    case "NUCLEAR_FUND_PROGRAM": {
      const status = actor.nuclear.status;
      if (status === "TESTED") return blocked(base, "Weaponization is already underway");
      base.summary =
        status === "NONE" || status === "LATENT"
          ? `Begin a clandestine nuclear weapons program ($${costM}M/month).`
          : status === "ARMED"
            ? "Expand the arsenal."
            : "Continue funding the nuclear program.";
      effects.push(
        eff(
          actor.name,
          "Nuclear progress",
          "+2-5/month",
          "Faster with wealth and strong institutions",
        ),
      );
      risks.push(
        "If foreign intelligence detects the program, expect sabotage, airstrikes, or worse.",
      );
      risks.push("Two successful enemy strikes in a row would cripple the program.");
      break;
    }
    case "NUCLEAR_STRIKE": {
      if (!target) return blocked(base, "Select a target country");
      if (actor.nuclear.status !== "ARMED" || actor.nuclear.warheads < 1)
        return blocked(base, "No deliverable warheads");
      if (!actor.atWarWith.includes(target.id))
        return blocked(base, "Nuclear release is only authorized in wartime");
      base.summary = `AUTHORIZE NUCLEAR STRIKE ON ${tname.toUpperCase()}.`;
      effects.push(eff(tname, "Devastation", "Catastrophic", "Millions of casualties"));
      effects.push(eff("World", "Embargo", "Total arms embargo on you", "Universal revulsion"));
      effects.push(eff("All nations", "Relations", "-60", "You become a pariah"));
      if (isNuclearOperational(target) && target.nuclear.warheads > 0) {
        risks.push(
          "☢ CERTAIN RETALIATION: the target can strike back. This is mutual destruction.",
        );
      }
      const armedAllies = target.alliances.filter((id) => {
        const a = world.countries.find((c) => c.id === id);
        return a && isNuclearOperational(a);
      });
      if (armedAllies.length > 0)
        risks.push(`☢ ${tname}'s nuclear-armed allies may retaliate on its behalf.`);
      risks.push("There may be no world left to rule.");
      break;
    }
    case "ECONOMY_ADJUST_MILITARY_BUDGET": {
      const newPct = action.value ?? actor.militaryBudgetPercent;
      base.summary = `Set military spending to ${newPct}% of GDP (currently ${actor.militaryBudgetPercent.toFixed(1)}%).`;
      if (newPct > 6)
        effects.push(
          eff(actor.name, "Economy", "growth drag", "High military burden crowds out investment"),
        );
      if (newPct > actor.militaryBudgetPercent + 1)
        risks.push(
          "Sharp increases read as war preparation — the budget is a hostility indicator.",
        );
      break;
    }
    case "INTEL_GATHER":
    case "INTEL_SABOTAGE":
    case "INTEL_DESTABILIZE":
    case "INTEL_SUPPORT_REBELS":
    case "INTEL_MISINFORMATION":
    case "INTEL_PROPAGANDA":
    case "INTEL_ASSASSINATE":
    case "INTEL_COUP": {
      if (!target) return blocked(base, "Select a target country");
      const edge = actor.intelLevel - target.counterIntelLevel;
      const baseChances: Record<string, number> = {
        INTEL_GATHER: 0.75,
        INTEL_DESTABILIZE: 0.55,
        INTEL_SUPPORT_REBELS: target.insurgencyLevel !== "NONE" ? 0.65 : 0.35,
        INTEL_SABOTAGE: 0.45,
        INTEL_MISINFORMATION: target.regimeType === "DEMOCRACY" ? 0.65 : 0.5,
        INTEL_PROPAGANDA: 0.6,
        INTEL_ASSASSINATE: 0.25,
        INTEL_COUP: 0.3,
      };
      base.successChance = Math.round(
        Math.max(0.05, Math.min(0.95, (baseChances[action.type] ?? 0.5) + edge / 200)) * 100,
      );
      const summaries: Record<string, string> = {
        INTEL_GATHER: `Run an intelligence operation against ${tname} — sharpen our picture of their true capabilities.`,
        INTEL_DESTABILIZE: `Fund opposition media, strikes and scandal in ${tname}.`,
        INTEL_SUPPORT_REBELS: `Arm and finance insurgents inside ${tname}.`,
        INTEL_SABOTAGE: `Sabotage ${tname}'s infrastructure${target.nuclear.status === "DEVELOPING" ? " and nuclear facilities" : ""}.`,
        INTEL_MISINFORMATION: `Feed ${tname}'s intelligence services a false picture of our capabilities.`,
        INTEL_PROPAGANDA: `Broadcast propaganda to undermine faith in ${tname}'s government.`,
        INTEL_ASSASSINATE: `Eliminate ${target.leader.title} ${target.leader.name}.`,
        INTEL_COUP: `Back a coup faction to install a friendly government in ${tname}.`,
      };
      base.summary = summaries[action.type];
      if (action.type === "INTEL_ASSASSINATE") {
        const targetWeak = target.stability < 40 || target.insurgencyLevel !== "NONE";
        if (!targetWeak)
          return blocked(
            base,
            `${tname}'s leadership is too well protected (needs stability < 40 or active unrest).`,
          );
        effects.push(
          eff(tname, "Leadership", "eliminated if successful", "Successor may be worse"),
        );
      }
      if (action.type === "INTEL_COUP") {
        const coupPossible = target.insurgencyLevel === "GUERILLA" || target.stability < 25;
        if (!coupPossible)
          return blocked(
            base,
            `${tname} is too stable for a coup (needs GUERILLA insurgency or stability < 25).`,
          );
        effects.push(
          eff(tname, "Government", "friendly puppet regime if successful", "+70 relations"),
        );
      }
      if (action.type === "INTEL_DESTABILIZE") effects.push(eff(tname, "Stability", "-8", ""));
      if (action.type === "INTEL_SUPPORT_REBELS")
        effects.push(eff(tname, "Insurgency", "escalates one level", ""));
      risks.push(
        `Exposure risk: relations collapse${action.type === "INTEL_COUP" || action.type === "INTEL_ASSASSINATE" ? " worldwide — these operations outrage everyone" : ` with ${tname}`}.`,
      );
      base.costM = COVERT_COSTS_M[action.type] ?? base.costM;
      break;
    }
    case "DOMESTIC_PROPAGANDA": {
      base.summary = "Saturate the airwaves with the government's achievements.";
      effects.push(eff(actor.name, "Legitimacy", "+5", ""));
      effects.push(eff(actor.name, "Approval", "+4", ""));
      break;
    }
    case "DOMESTIC_REFORM": {
      base.summary = "Launch structural reforms: courts, markets, administration.";
      effects.push(eff(actor.name, "Stability", "+6", ""));
      effects.push(eff(actor.name, "Legitimacy", "+4", ""));
      if (actor.personality.ideologicalRigidity > 70)
        risks.push("Hardline factions resist reform (-2 legitimacy).");
      break;
    }
    case "DOMESTIC_POLICING": {
      const tactic = (action.params?.tactic as string) === "HARD" ? "HARD" : "SOFT";
      base.summary =
        tactic === "HARD"
          ? "Crack down on the insurgency with overwhelming force."
          : "Pursue patient policing and negotiation with the insurgency.";
      if (tactic === "HARD") {
        effects.push(eff(actor.name, "Insurgency", "suppressed faster (2 levels possible)", ""));
        risks.push(
          "International outcry: democracies downgrade relations every month of hard policing.",
        );
        risks.push("Short-term stability dip from the violence.");
      } else {
        effects.push(eff(actor.name, "Insurgency", "slowly de-escalates", "No backlash"));
      }
      break;
    }
    default:
      base.summary = "Unknown action";
  }

  return base;
}

function eff(target: string, metric: string, delta: string, note: string): PreviewEffect {
  return { target, metric, delta, note };
}

function blocked(preview: ActionPreview, reason: string): ActionPreview {
  preview.blocked = reason;
  return preview;
}
