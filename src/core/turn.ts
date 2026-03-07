import { EventSystem } from "./events.js";
import { combineSeed, SeededRandom } from "./seed.js";
import type {
  Action,
  ActiveWar,
  CountryIntent,
  CountryState,
  GameEvent,
  NewspaperEntry,
  WorldState,
} from "./types.js";

export interface TurnResult {
  newState: WorldState;
  events: GameEvent[];
  newspaper: NewspaperEntry[];
  resolvedActions: Map<string, Action[]>;
}

export interface TurnContext {
  world: WorldState;
  playerActions: Action[];
  aiIntents: CountryIntent[];
  rng: SeededRandom;
}

export class TurnEngine {
  private eventSystem: EventSystem;

  constructor(seed: number) {
    this.eventSystem = new EventSystem(seed);
  }

  executeTurn(
    currentState: WorldState,
    playerActions: Action[],
    aiIntents: CountryIntent[],
  ): TurnResult {
    const turnSeed = combineSeed(currentState.seed, currentState.turn);
    const rng = new SeededRandom(turnSeed);
    this.eventSystem.setSeed(turnSeed);

    const context: TurnContext = {
      world: structuredClone(currentState),
      playerActions,
      aiIntents,
      rng,
    };

    const events = this.phase1_injectEvents(context);

    this.phase2_updateIntelligence(context);

    const resolvedActions = this.phase4_validateAndResolveActions(context);

    this.phase5_resolveWars(context);

    this.phase6_updateMetrics(context);

    const newspaper = this.phase7_generateNewspaper(context, events, resolvedActions);

    this.phase8_advanceTurn(context);

    return {
      newState: context.world,
      events,
      newspaper,
      resolvedActions,
    };
  }

  private phase1_injectEvents(context: TurnContext): GameEvent[] {
    const events = this.eventSystem.generateEvents(context.world, context.world.turn);

    for (const event of events) {
      context.world.eventQueue.push(event);
      this.applyEventEffects(context, event);
    }

    return events;
  }

  private applyEventEffects(context: TurnContext, event: GameEvent): void {
    if (!event.effects) return;

    for (const countryId of event.affectedCountries) {
      const countryIndex = context.world.countries.findIndex((c) => c.id === countryId);
      if (countryIndex === -1) continue;

      const country = context.world.countries[countryIndex];

      if (event.effects.stability !== undefined) {
        country.stability = Math.max(0, Math.min(100, country.stability + event.effects.stability));
      }

      if (event.effects.gdpGrowth !== undefined) {
        country.growthRate += event.effects.gdpGrowth;
      }

      if (event.effects.legitimacy !== undefined) {
        country.legitimacy = Math.max(
          0,
          Math.min(100, country.legitimacy + event.effects.legitimacy),
        );
      }
    }

    if (event.effects.globalTension !== undefined) {
      context.world.globalTension = Math.max(
        0,
        Math.min(100, context.world.globalTension + event.effects.globalTension),
      );
    }
  }

  private phase2_updateIntelligence(context: TurnContext): void {
    for (const country of context.world.countries) {
      const intelAccuracy = country.intelLevel / 100;

      country.beliefState = {};

      for (const other of context.world.countries) {
        if (other.id === country.id) continue;

        const noise = (context.rng.next() - 0.5) * 2 * (1 - intelAccuracy);
        const perceivedStability = Math.max(0, Math.min(100, other.stability + noise * 20));

        if (!country.beliefState) country.beliefState = {};
        country.beliefState[`${other.id}_stability`] = perceivedStability;
      }
    }
  }

  private phase4_validateAndResolveActions(context: TurnContext): Map<string, Action[]> {
    const resolvedActions = new Map<string, Action[]>();

    const playerIntent: CountryIntent = {
      countryId: context.world.playerCountryId,
      actions: context.playerActions,
    };

    const allIntents = [playerIntent, ...context.aiIntents];

    for (const intent of allIntents) {
      const validActions: Action[] = [];

      for (const action of intent.actions) {
        if (this.validateAction(context, intent.countryId, action)) {
          this.applyAction(context, intent.countryId, action);
          validActions.push(action);
        }
      }

      resolvedActions.set(intent.countryId, validActions);
    }

    return resolvedActions;
  }

  private validateAction(context: TurnContext, countryId: string, action: Action): boolean {
    const country = context.world.countries.find((c) => c.id === countryId);
    if (!country) return false;

    switch (action.type) {
      case "DIPLOMACY_DECLARE_WAR":
        if (!action.targetCountryId) return false;
        if (country.atWarWith.includes(action.targetCountryId)) return false;
        if (country.alliances.includes(action.targetCountryId)) return false;
        return true;

      case "DIPLOMACY_PROPOSE_ALLIANCE": {
        if (!action.targetCountryId) return false;
        if (country.alliances.includes(action.targetCountryId)) return false;
        if (country.atWarWith.includes(action.targetCountryId)) return false;
        const relation = country.relations[action.targetCountryId] ?? 0;
        return relation >= 60;
      }

      case "DIPLOMACY_PROPOSE_CEASEFIRE":
        if (!action.targetCountryId) return false;
        return country.atWarWith.includes(action.targetCountryId);

      case "MILITARY_MOBILIZE":
      case "MILITARY_DEMOBILIZE":
        return true;

      case "ECONOMY_ADJUST_MILITARY_BUDGET":
        if (action.value === undefined) return false;
        return action.value >= 0 && action.value <= 20;

      default:
        return true;
    }
  }

  private applyAction(context: TurnContext, countryId: string, action: Action): void {
    const countryIndex = context.world.countries.findIndex((c) => c.id === countryId);
    if (countryIndex === -1) return;

    const country = context.world.countries[countryIndex];

    switch (action.type) {
      case "DIPLOMACY_IMPROVE_RELATIONS":
        if (action.targetCountryId) {
          const current = country.relations[action.targetCountryId] ?? 0;
          country.relations[action.targetCountryId] = Math.min(100, current + 5);

          const targetIndex = context.world.countries.findIndex(
            (c) => c.id === action.targetCountryId,
          );
          if (targetIndex !== -1) {
            const target = context.world.countries[targetIndex];
            const targetCurrent = target.relations[countryId] ?? 0;
            target.relations[countryId] = Math.min(100, targetCurrent + 3);
          }
        }
        break;

      case "DIPLOMACY_DENOUNCE":
        if (action.targetCountryId) {
          const current = country.relations[action.targetCountryId] ?? 0;
          country.relations[action.targetCountryId] = Math.max(-100, current - 10);

          const targetIndex = context.world.countries.findIndex(
            (c) => c.id === action.targetCountryId,
          );
          if (targetIndex !== -1) {
            const target = context.world.countries[targetIndex];
            const targetCurrent = target.relations[countryId] ?? 0;
            target.relations[countryId] = Math.max(-100, targetCurrent - 15);
          }
        }
        break;

      case "DIPLOMACY_DECLARE_WAR":
        if (action.targetCountryId) {
          country.atWarWith.push(action.targetCountryId);
          country.relations[action.targetCountryId] = -100;

          const targetIndex = context.world.countries.findIndex(
            (c) => c.id === action.targetCountryId,
          );
          if (targetIndex !== -1) {
            const target = context.world.countries[targetIndex];
            target.atWarWith.push(countryId);
            target.relations[countryId] = -100;
          }

          const war: ActiveWar = {
            id: `war_${countryId}_${action.targetCountryId}_${context.world.turn}`,
            attackerId: countryId,
            defenderId: action.targetCountryId,
            startTurn: context.world.turn,
            attackerProgress: 50,
            defenderProgress: 50,
            attackerCasualties: 0,
            defenderCasualties: 0,
          };
          context.world.wars.push(war);
          context.world.globalTension = Math.min(100, context.world.globalTension + 15);
        }
        break;

      case "DIPLOMACY_PROPOSE_ALLIANCE":
        if (action.targetCountryId) {
          const targetIndex = context.world.countries.findIndex(
            (c) => c.id === action.targetCountryId,
          );
          if (targetIndex !== -1) {
            const target = context.world.countries[targetIndex];
            const targetRelation = target.relations[countryId] ?? 0;

            if (targetRelation >= 50) {
              country.alliances.push(action.targetCountryId);
              target.alliances.push(countryId);
              context.world.globalTension = Math.max(0, context.world.globalTension - 3);
            }
          }
        }
        break;

      case "DIPLOMACY_PROPOSE_CEASEFIRE":
        if (action.targetCountryId) {
          const warIndex = context.world.wars.findIndex(
            (w) =>
              (w.attackerId === countryId && w.defenderId === action.targetCountryId) ||
              (w.defenderId === countryId && w.attackerId === action.targetCountryId),
          );

          if (warIndex !== -1) {
            const targetIndex = context.world.countries.findIndex(
              (c) => c.id === action.targetCountryId,
            );
            if (targetIndex !== -1) {
              const target = context.world.countries[targetIndex];

              if (context.rng.next() > 0.4) {
                context.world.wars.splice(warIndex, 1);
                country.atWarWith = country.atWarWith.filter((w) => w !== action.targetCountryId);
                target.atWarWith = target.atWarWith.filter((w) => w !== countryId);
                country.relations[action.targetCountryId] = -20;
                target.relations[countryId] = -20;
                context.world.globalTension = Math.max(0, context.world.globalTension - 10);
              }
            }
          }
        }
        break;

      case "MILITARY_MOBILIZE":
        country.mobilizationLevel = Math.min(100, country.mobilizationLevel + 20);
        country.stability = Math.max(0, country.stability - 2);
        break;

      case "MILITARY_DEMOBILIZE":
        country.mobilizationLevel = Math.max(0, country.mobilizationLevel - 20);
        country.stability = Math.min(100, country.stability + 1);
        break;

      case "ECONOMY_ADJUST_MILITARY_BUDGET":
        if (action.value !== undefined) {
          country.militaryBudgetPercent = Math.max(0, Math.min(20, action.value));
        }
        break;

      case "DOMESTIC_PROPAGANDA":
        country.legitimacy = Math.min(100, country.legitimacy + 5);
        country.stability = Math.min(100, country.stability + 2);
        break;

      case "DOMESTIC_REFORM":
        country.stability = Math.min(100, country.stability + 8);
        country.legitimacy = Math.min(100, country.legitimacy + 3);
        break;
    }
  }

  private phase5_resolveWars(context: TurnContext): void {
    for (const war of context.world.wars) {
      const attacker = context.world.countries.find((c) => c.id === war.attackerId);
      const defender = context.world.countries.find((c) => c.id === war.defenderId);

      if (!attacker || !defender) continue;

      const attackerStrength = this.calculateMilitaryStrength(attacker);
      const defenderStrength = this.calculateMilitaryStrength(defender);
      const totalStrength = attackerStrength + defenderStrength;

      if (totalStrength === 0) continue;

      const attackerRatio = attackerStrength / totalStrength;
      const defenderRatio = defenderStrength / totalStrength;

      const battleResult = context.rng.next();
      const progressDelta = (battleResult - 0.5) * 10 * (attackerRatio - defenderRatio + 0.5);

      war.attackerProgress = Math.max(0, Math.min(100, war.attackerProgress + progressDelta));
      war.defenderProgress = 100 - war.attackerProgress;

      const attackerCasualties = Math.floor(attacker.manpower * 0.001 * defenderRatio);
      const defenderCasualties = Math.floor(defender.manpower * 0.001 * attackerRatio);

      war.attackerCasualties += attackerCasualties;
      war.defenderCasualties += defenderCasualties;

      attacker.manpower = Math.max(0, attacker.manpower - attackerCasualties);
      defender.manpower = Math.max(0, defender.manpower - defenderCasualties);

      attacker.stability = Math.max(0, attacker.stability - 5);
      defender.stability = Math.max(0, defender.stability - 5);

      attacker.gdp *= 0.98;
      defender.gdp *= 0.98;
    }
  }

  private calculateMilitaryStrength(country: CountryState): number {
    const mobilizationFactor = country.mobilizationLevel / 100;
    const manpowerStrength = country.manpower * mobilizationFactor;
    const airpowerStrength = country.airpower * 10;
    return manpowerStrength + airpowerStrength;
  }

  private phase6_updateMetrics(context: TurnContext): void {
    for (const country of context.world.countries) {
      const warPenalty = country.atWarWith.length * 0.02;
      const instabilityEffect = (100 - country.stability) / 1000;
      const debtDrag = Math.max(0, (country.debtGdpRatio - 1) * 0.01);

      const effectiveGrowth = country.growthRate - warPenalty - instabilityEffect - debtDrag;
      country.gdp *= 1 + effectiveGrowth;

      if (country.atWarWith.length === 0) {
        const regimeBonus = country.regimeType === "DEMOCRACY" ? 1 : 0;
        const growthBonus = Math.max(0, country.growthRate * 200);
        country.stability = Math.min(100, country.stability + regimeBonus + growthBonus);
      }

      if (country.stability <= 0) {
        country.legitimacy = 0;
      }
    }
  }

  private phase7_generateNewspaper(
    context: TurnContext,
    events: GameEvent[],
    resolvedActions: Map<string, Action[]>,
  ): NewspaperEntry[] {
    const newspaper: NewspaperEntry[] = [];

    for (const event of events) {
      newspaper.push({
        headline: event.title,
        description: event.description,
        relatedCountries: event.affectedCountries,
        impact: event.effects ? JSON.stringify(event.effects) : undefined,
        turn: context.world.turn,
      });
    }

    for (const war of context.world.wars) {
      if (war.startTurn === context.world.turn) {
        newspaper.push({
          headline: `War Erupts: ${war.attackerId} vs ${war.defenderId}`,
          description: `${war.attackerId} has declared war on ${war.defenderId}. The world watches as tensions escalate.`,
          relatedCountries: [war.attackerId, war.defenderId],
          impact: "GLOBAL_TENSION +15",
          turn: context.world.turn,
        });
      }
    }

    for (const [countryId, actions] of resolvedActions) {
      for (const action of actions) {
        if (action.type === "DIPLOMACY_PROPOSE_ALLIANCE" && action.targetCountryId) {
          const country = context.world.countries.find((c) => c.id === countryId);
          if (country?.alliances.includes(action.targetCountryId)) {
            newspaper.push({
              headline: `Alliance Formed: ${countryId} and ${action.targetCountryId}`,
              description: `A new military alliance has been established between ${countryId} and ${action.targetCountryId}.`,
              relatedCountries: [countryId, action.targetCountryId],
              turn: context.world.turn,
            });
          }
        }
      }
    }

    context.world.newspaper = newspaper;
    return newspaper;
  }

  private phase8_advanceTurn(context: TurnContext): void {
    context.world.turn += 1;

    const [year, month] = context.world.date.split("-").map(Number);
    let newMonth = month + 1;
    let newYear = year;

    if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    }

    context.world.date = `${newYear}-${String(newMonth).padStart(2, "0")}`;

    context.world.eventQueue = [];
  }
}
