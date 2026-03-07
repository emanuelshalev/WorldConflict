import {
  type Action,
  type ActiveWar,
  type GameEvent,
  type NewspaperEntry,
  NewspaperEntrySchema,
  type WorldState,
} from "./types.js";

export interface NewspaperContext {
  turn: number;
  events: GameEvent[];
  wars: ActiveWar[];
  actions: Map<string, Action[]>;
  previousState: WorldState;
  currentState: WorldState;
}

export class NewspaperGenerator {
  static generate(context: NewspaperContext): NewspaperEntry[] {
    const entries: NewspaperEntry[] = [];

    entries.push(...NewspaperGenerator.generateEventHeadlines(context));

    entries.push(...NewspaperGenerator.generateWarHeadlines(context));

    entries.push(...NewspaperGenerator.generateDiplomacyHeadlines(context));

    entries.push(...NewspaperGenerator.generateEconomyHeadlines(context));

    entries.push(...NewspaperGenerator.generateStabilityHeadlines(context));

    return entries.map((entry) => NewspaperEntrySchema.parse(entry));
  }

  private static generateEventHeadlines(context: NewspaperContext): NewspaperEntry[] {
    return context.events.map((event) => ({
      headline: event.title,
      description: event.description,
      relatedCountries: event.affectedCountries,
      impact: event.effects ? NewspaperGenerator.formatEffects(event.effects) : undefined,
      turn: context.turn,
    }));
  }

  private static generateWarHeadlines(context: NewspaperContext): NewspaperEntry[] {
    const entries: NewspaperEntry[] = [];

    for (const war of context.wars) {
      if (war.startTurn === context.turn) {
        entries.push({
          headline: `WAR: ${NewspaperGenerator.getCountryName(war.attackerId)} Declares War on ${NewspaperGenerator.getCountryName(war.defenderId)}`,
          description: `In a dramatic escalation of tensions, ${NewspaperGenerator.getCountryName(war.attackerId)} has officially declared war on ${NewspaperGenerator.getCountryName(war.defenderId)}. The international community watches with concern as military forces mobilize.`,
          relatedCountries: [war.attackerId, war.defenderId],
          impact: "GLOBAL_TENSION +15",
          turn: context.turn,
        });
      } else {
        const progressChange = NewspaperGenerator.getWarProgressChange(war, context);
        if (Math.abs(progressChange) > 5) {
          const advancing = progressChange > 0 ? war.attackerId : war.defenderId;
          entries.push({
            headline: `${NewspaperGenerator.getCountryName(advancing)} Forces Advance in ${NewspaperGenerator.getCountryName(war.attackerId)}-${NewspaperGenerator.getCountryName(war.defenderId)} Conflict`,
            description: `Military analysts report significant territorial changes as ${NewspaperGenerator.getCountryName(advancing)} forces make gains on the battlefield.`,
            relatedCountries: [war.attackerId, war.defenderId],
            turn: context.turn,
          });
        }
      }
    }

    const _previousWarIds = new Set(context.previousState.wars.map((w) => w.id));
    const currentWarIds = new Set(context.currentState.wars.map((w) => w.id));

    for (const prevWar of context.previousState.wars) {
      if (!currentWarIds.has(prevWar.id)) {
        entries.push({
          headline: `PEACE: ${NewspaperGenerator.getCountryName(prevWar.attackerId)} and ${NewspaperGenerator.getCountryName(prevWar.defenderId)} End Hostilities`,
          description: `After months of conflict, a ceasefire has been declared between ${NewspaperGenerator.getCountryName(prevWar.attackerId)} and ${NewspaperGenerator.getCountryName(prevWar.defenderId)}. Diplomatic efforts have finally borne fruit.`,
          relatedCountries: [prevWar.attackerId, prevWar.defenderId],
          impact: "GLOBAL_TENSION -10",
          turn: context.turn,
        });
      }
    }

    return entries;
  }

  private static generateDiplomacyHeadlines(context: NewspaperContext): NewspaperEntry[] {
    const entries: NewspaperEntry[] = [];

    for (const current of context.currentState.countries) {
      const previous = context.previousState.countries.find((c) => c.id === current.id);
      if (!previous) continue;

      const newAlliances = current.alliances.filter((a) => !previous.alliances.includes(a));
      for (const allyId of newAlliances) {
        if (current.id < allyId) {
          entries.push({
            headline: `ALLIANCE: ${NewspaperGenerator.getCountryName(current.id)} and ${NewspaperGenerator.getCountryName(allyId)} Form Military Pact`,
            description: `In a significant diplomatic development, ${NewspaperGenerator.getCountryName(current.id)} and ${NewspaperGenerator.getCountryName(allyId)} have announced a formal military alliance, pledging mutual defense.`,
            relatedCountries: [current.id, allyId],
            turn: context.turn,
          });
        }
      }

      const brokenAlliances = previous.alliances.filter((a) => !current.alliances.includes(a));
      for (const formerAllyId of brokenAlliances) {
        if (current.id < formerAllyId && !current.atWarWith.includes(formerAllyId)) {
          entries.push({
            headline: `DIPLOMACY: ${NewspaperGenerator.getCountryName(current.id)} Ends Alliance with ${NewspaperGenerator.getCountryName(formerAllyId)}`,
            description: `The alliance between ${NewspaperGenerator.getCountryName(current.id)} and ${NewspaperGenerator.getCountryName(formerAllyId)} has been dissolved, marking a shift in regional power dynamics.`,
            relatedCountries: [current.id, formerAllyId],
            turn: context.turn,
          });
        }
      }
    }

    return entries;
  }

  private static generateEconomyHeadlines(context: NewspaperContext): NewspaperEntry[] {
    const entries: NewspaperEntry[] = [];

    for (const current of context.currentState.countries) {
      const previous = context.previousState.countries.find((c) => c.id === current.id);
      if (!previous) continue;

      const gdpChange = (current.gdp - previous.gdp) / previous.gdp;

      if (gdpChange > 0.05) {
        entries.push({
          headline: `ECONOMY: ${NewspaperGenerator.getCountryName(current.id)} Experiences Economic Boom`,
          description: `${NewspaperGenerator.getCountryName(current.id)}'s economy shows remarkable growth this month, with GDP increasing by ${(gdpChange * 100).toFixed(1)}%.`,
          relatedCountries: [current.id],
          turn: context.turn,
        });
      } else if (gdpChange < -0.05) {
        entries.push({
          headline: `ECONOMY: ${NewspaperGenerator.getCountryName(current.id)} Faces Economic Downturn`,
          description: `${NewspaperGenerator.getCountryName(current.id)} reports significant economic contraction, with GDP falling by ${(Math.abs(gdpChange) * 100).toFixed(1)}%.`,
          relatedCountries: [current.id],
          turn: context.turn,
        });
      }
    }

    return entries;
  }

  private static generateStabilityHeadlines(context: NewspaperContext): NewspaperEntry[] {
    const entries: NewspaperEntry[] = [];

    for (const current of context.currentState.countries) {
      const previous = context.previousState.countries.find((c) => c.id === current.id);
      if (!previous) continue;

      if (current.stability <= 0 && previous.stability > 0) {
        entries.push({
          headline: `CRISIS: Government Collapse in ${NewspaperGenerator.getCountryName(current.id)}`,
          description: `The government of ${NewspaperGenerator.getCountryName(current.id)} has collapsed amid widespread instability. The international community calls for calm as the nation faces an uncertain future.`,
          relatedCountries: [current.id],
          impact: "GOVERNMENT_COLLAPSE",
          turn: context.turn,
        });
      } else if (current.stability < 20 && previous.stability >= 20) {
        entries.push({
          headline: `UNREST: ${NewspaperGenerator.getCountryName(current.id)} Faces Growing Instability`,
          description: `Reports of civil unrest and political turmoil emerge from ${NewspaperGenerator.getCountryName(current.id)} as stability reaches critical levels.`,
          relatedCountries: [current.id],
          turn: context.turn,
        });
      }
    }

    return entries;
  }

  private static getCountryName(iso3: string): string {
    const names: Record<string, string> = {
      USA: "United States",
      CHN: "China",
      RUS: "Russia",
      DEU: "Germany",
      IND: "India",
      BRA: "Brazil",
      CAN: "Canada",
      MEX: "Mexico",
      FRA: "France",
      GBR: "United Kingdom",
      POL: "Poland",
      TUR: "Turkey",
      SAU: "Saudi Arabia",
      IRN: "Iran",
      ISR: "Israel",
      EGY: "Egypt",
      JPN: "Japan",
      IDN: "Indonesia",
      KOR: "South Korea",
      PRK: "North Korea",
      AUS: "Australia",
      PAK: "Pakistan",
      NGA: "Nigeria",
      ZAF: "South Africa",
      ITA: "Italy",
    };
    return names[iso3] ?? iso3;
  }

  private static formatEffects(effects: Record<string, number>): string {
    return Object.entries(effects)
      .map(([key, value]) => `${key.toUpperCase()} ${value >= 0 ? "+" : ""}${value}`)
      .join(", ");
  }

  private static getWarProgressChange(war: ActiveWar, context: NewspaperContext): number {
    const previousWar = context.previousState.wars.find((w) => w.id === war.id);
    if (!previousWar) return 0;
    return war.attackerProgress - previousWar.attackerProgress;
  }
}
