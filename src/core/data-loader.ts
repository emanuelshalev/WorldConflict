import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  type CountryState,
  CountryStateSchema,
  type Goal,
  type RegimeType,
  TIER1_COUNTRIES,
  type WorldState,
} from "./types.js";

export interface CountryData {
  id: string;
  iso3: string;
  name: string;
  population: number;
  gdp: number;
  gdpGrowth: number;
  militaryBudgetPct: number;
  manpower: number;
  airpower: number;
  regimeType: RegimeType;
  riskTolerance: number;
  stability: number;
  legitimacy: number;
  intelLevel: number;
  goals: Goal[];
  geo: {
    bounds: [number, number, number, number];
    capital: { name: string; coordinates: [number, number] };
  };
}

export interface ScenarioData {
  id: string;
  name: string;
  description: string;
  startYear: number;
  globalTension: number;
  multipliers: {
    gdpGrowth: number;
    militarySpending: number;
    stability: number;
  };
  initialRelations: Record<string, Record<string, number>>;
  alliances: string[][];
}

export class DataLoader {
  private dataPath: string;
  private countriesCache: Map<string, CountryData> = new Map();
  private scenariosCache: Map<string, ScenarioData> = new Map();

  constructor(dataPath: string) {
    this.dataPath = dataPath;
  }

  loadCountry(iso3: string): CountryData {
    if (this.countriesCache.has(iso3)) {
      return this.countriesCache.get(iso3)!;
    }

    const filePath = join(this.dataPath, "countries", `${iso3}.json`);
    const data = JSON.parse(readFileSync(filePath, "utf-8")) as CountryData;
    this.countriesCache.set(iso3, data);
    return data;
  }

  loadAllCountries(): CountryData[] {
    const countriesDir = join(this.dataPath, "countries");
    const files = readdirSync(countriesDir).filter((f) => f.endsWith(".json"));

    return files.map((file) => {
      const iso3 = file.replace(".json", "");
      return this.loadCountry(iso3);
    });
  }

  loadScenario(scenarioId: string): ScenarioData {
    if (this.scenariosCache.has(scenarioId)) {
      return this.scenariosCache.get(scenarioId)!;
    }

    const filePath = join(this.dataPath, "scenarios", `${scenarioId}.json`);
    const data = JSON.parse(readFileSync(filePath, "utf-8")) as ScenarioData;
    this.scenariosCache.set(scenarioId, data);
    return data;
  }

  loadAvailableScenarios(): ScenarioData[] {
    const scenariosDir = join(this.dataPath, "scenarios");
    const files = readdirSync(scenariosDir).filter((f) => f.endsWith(".json"));

    return files.map((file) => {
      const scenarioId = file.replace(".json", "");
      return this.loadScenario(scenarioId);
    });
  }

  createCountryState(countryData: CountryData, scenario: ScenarioData): CountryState {
    const { multipliers } = scenario;

    return CountryStateSchema.parse({
      id: countryData.id,
      name: countryData.name,
      iso3: countryData.iso3,
      gdp: countryData.gdp,
      growthRate: countryData.gdpGrowth * multipliers.gdpGrowth,
      debtGdpRatio: 0.6,
      militaryBudgetPercent: Math.min(
        20,
        countryData.militaryBudgetPct * multipliers.militarySpending,
      ),
      manpower: countryData.manpower,
      airpower: countryData.airpower,
      mobilizationLevel: 10,
      relations: {},
      alliances: [],
      atWarWith: [],
      stability: Math.min(100, countryData.stability * multipliers.stability),
      regimeType: countryData.regimeType,
      legitimacy: countryData.legitimacy,
      intelLevel: countryData.intelLevel,
      goals: countryData.goals,
      riskTolerance: countryData.riskTolerance,
    });
  }

  initializeWorldState(scenarioId: string, playerCountryId: string, seed: number): WorldState {
    const scenario = this.loadScenario(scenarioId);
    const allCountries = this.loadAllCountries();

    const tier1Countries = allCountries.filter((c) =>
      TIER1_COUNTRIES.includes(c.iso3 as (typeof TIER1_COUNTRIES)[number]),
    );

    const countries: CountryState[] = tier1Countries.map((countryData) =>
      this.createCountryState(countryData, scenario),
    );

    this.applyScenarioRelations(countries, scenario);
    this.applyScenarioAlliances(countries, scenario);

    const date = `${scenario.startYear}-01`;

    return {
      turn: 0,
      date,
      countries,
      wars: [],
      globalTension: scenario.globalTension,
      eventQueue: [],
      seed,
      playerCountryId,
      newspaper: [],
    };
  }

  private applyScenarioRelations(countries: CountryState[], scenario: ScenarioData): void {
    for (const country of countries) {
      const scenarioRelations = scenario.initialRelations[country.id];
      if (scenarioRelations) {
        country.relations = { ...scenarioRelations };
      } else {
        country.relations = this.generateDefaultRelations(country, countries);
      }
    }

    for (const country of countries) {
      for (const other of countries) {
        if (country.id === other.id) continue;

        if (country.relations[other.id] === undefined) {
          const otherRelation = other.relations[country.id];
          if (otherRelation !== undefined) {
            country.relations[other.id] = Math.round(otherRelation * 0.8);
          } else {
            country.relations[other.id] = 0;
          }
        }
      }
    }
  }

  private generateDefaultRelations(
    country: CountryState,
    allCountries: CountryState[],
  ): Record<string, number> {
    const relations: Record<string, number> = {};

    for (const other of allCountries) {
      if (other.id === country.id) continue;

      let baseRelation = 0;

      if (country.regimeType === other.regimeType) {
        baseRelation += 15;
      }

      if (
        (country.regimeType === "DEMOCRACY" && other.regimeType === "AUTOCRACY") ||
        (country.regimeType === "AUTOCRACY" && other.regimeType === "DEMOCRACY")
      ) {
        baseRelation -= 10;
      }

      relations[other.id] = Math.max(-100, Math.min(100, baseRelation));
    }

    return relations;
  }

  private applyScenarioAlliances(countries: CountryState[], scenario: ScenarioData): void {
    for (const allianceGroup of scenario.alliances) {
      for (let i = 0; i < allianceGroup.length; i++) {
        for (let j = i + 1; j < allianceGroup.length; j++) {
          const country1 = countries.find((c) => c.id === allianceGroup[i]);
          const country2 = countries.find((c) => c.id === allianceGroup[j]);

          if (country1 && country2) {
            if (!country1.alliances.includes(country2.id)) {
              country1.alliances.push(country2.id);
            }
            if (!country2.alliances.includes(country1.id)) {
              country2.alliances.push(country1.id);
            }

            if (
              country1.relations[country2.id] === undefined ||
              country1.relations[country2.id] < 60
            ) {
              country1.relations[country2.id] = 70;
            }
            if (
              country2.relations[country1.id] === undefined ||
              country2.relations[country1.id] < 60
            ) {
              country2.relations[country1.id] = 70;
            }
          }
        }
      }
    }
  }

  clearCache(): void {
    this.countriesCache.clear();
    this.scenariosCache.clear();
  }
}

export function createDataLoader(dataPath?: string): DataLoader {
  const path = dataPath ?? join(process.cwd(), "data");
  return new DataLoader(path);
}
