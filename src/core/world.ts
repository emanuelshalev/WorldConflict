import {
  type ActiveWar,
  type CountryState,
  type NewspaperEntry,
  TIER1_COUNTRIES,
  type WorldState,
  WorldStateSchema,
} from "./types.js";

export class World {
  private state: WorldState;

  constructor(state: WorldState) {
    const validated = WorldStateSchema.parse(state);
    this.state = validated;
  }

  static initialize(options: {
    seed: number;
    playerCountryId: string;
    startYear: number;
    startMonth?: number;
  }): World {
    const { seed, playerCountryId, startYear, startMonth = 1 } = options;

    if (!TIER1_COUNTRIES.includes(playerCountryId as (typeof TIER1_COUNTRIES)[number])) {
      throw new Error(
        `Invalid player country: ${playerCountryId}. Must be one of Tier 1 countries.`,
      );
    }

    const date = `${startYear}-${String(startMonth).padStart(2, "0")}`;

    const countries: CountryState[] = TIER1_COUNTRIES.map((iso3) => createEmptyCountryState(iso3));

    const initialState: WorldState = {
      turn: 0,
      date,
      countries,
      wars: [],
      globalTension: 30,
      eventQueue: [],
      seed,
      playerCountryId,
      newspaper: [],
    };

    return new World(initialState);
  }

  getState(): WorldState {
    return structuredClone(this.state);
  }

  getCountry(countryId: string): CountryState | undefined {
    return this.state.countries.find((c) => c.id === countryId);
  }

  getPlayerCountry(): CountryState {
    const country = this.getCountry(this.state.playerCountryId);
    if (!country) {
      throw new Error(`Player country ${this.state.playerCountryId} not found`);
    }
    return country;
  }

  getAllCountries(): CountryState[] {
    return structuredClone(this.state.countries);
  }

  getWars(): ActiveWar[] {
    return structuredClone(this.state.wars);
  }

  getTurn(): number {
    return this.state.turn;
  }

  getDate(): string {
    return this.state.date;
  }

  getSeed(): number {
    return this.state.seed;
  }

  getGlobalTension(): number {
    return this.state.globalTension;
  }

  getNewspaper(): NewspaperEntry[] {
    return structuredClone(this.state.newspaper ?? []);
  }

  setState(newState: WorldState): void {
    const validated = WorldStateSchema.parse(newState);
    this.state = validated;
  }

  toJSON(): WorldState {
    return this.getState();
  }

  static fromJSON(json: WorldState): World {
    return new World(json);
  }
}

function createEmptyCountryState(iso3: string): CountryState {
  const countryNames: Record<string, string> = {
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

  return {
    id: iso3,
    name: countryNames[iso3] ?? iso3,
    iso3,
    gdp: 0,
    growthRate: 0,
    debtGdpRatio: 0,
    militaryBudgetPercent: 2,
    manpower: 0,
    airpower: 0,
    mobilizationLevel: 0,
    relations: {},
    alliances: [],
    atWarWith: [],
    stability: 50,
    regimeType: "DEMOCRACY",
    legitimacy: 50,
    intelLevel: 50,
    goals: [],
    riskTolerance: 50,
  };
}

export { createEmptyCountryState };
