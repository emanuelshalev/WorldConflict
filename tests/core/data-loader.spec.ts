import { describe, it, expect, beforeAll } from "vitest";
import { join } from "path";
import { DataLoader, createDataLoader } from "../../src/core/data-loader.js";
import { TIER1_COUNTRIES } from "../../src/core/types.js";

describe("DataLoader", () => {
  let dataLoader: DataLoader;

  beforeAll(() => {
    dataLoader = createDataLoader(join(process.cwd(), "data"));
  });

  describe("loadCountry", () => {
    it("should load USA country data", () => {
      const usa = dataLoader.loadCountry("USA");

      expect(usa.id).toBe("USA");
      expect(usa.name).toBe("United States");
      expect(usa.gdp).toBeGreaterThan(0);
      expect(usa.manpower).toBeGreaterThan(0);
      expect(usa.regimeType).toBe("DEMOCRACY");
    });

    it("should load China country data", () => {
      const china = dataLoader.loadCountry("CHN");

      expect(china.id).toBe("CHN");
      expect(china.name).toBe("China");
      expect(china.regimeType).toBe("COMMUNIST");
    });

    it("should cache loaded countries", () => {
      const usa1 = dataLoader.loadCountry("USA");
      const usa2 = dataLoader.loadCountry("USA");

      expect(usa1).toBe(usa2);
    });
  });

  describe("loadAllCountries", () => {
    it("should load all 25 Tier 1 countries", () => {
      const countries = dataLoader.loadAllCountries();

      expect(countries.length).toBe(25);

      for (const tier1 of TIER1_COUNTRIES) {
        const found = countries.find((c) => c.iso3 === tier1);
        expect(found).toBeDefined();
      }
    });

    it("should have valid data for all countries", () => {
      const countries = dataLoader.loadAllCountries();

      for (const country of countries) {
        expect(country.id).toBeTruthy();
        expect(country.name).toBeTruthy();
        expect(country.gdp).toBeGreaterThan(0);
        expect(country.population).toBeGreaterThan(0);
        expect(country.manpower).toBeGreaterThanOrEqual(0);
        expect(country.stability).toBeGreaterThan(0);
        expect(country.stability).toBeLessThanOrEqual(100);
      }
    });
  });

  describe("loadScenario", () => {
    it("should load 2025 scenario", () => {
      const scenario = dataLoader.loadScenario("2025");

      expect(scenario.id).toBe("2025");
      expect(scenario.startYear).toBe(2025);
      expect(scenario.globalTension).toBeGreaterThan(0);
      expect(scenario.initialRelations).toBeDefined();
    });

    it("should load 1990 scenario", () => {
      const scenario = dataLoader.loadScenario("1990");

      expect(scenario.id).toBe("1990");
      expect(scenario.startYear).toBe(1990);
    });
  });

  describe("initializeWorldState", () => {
    it("should create valid world state for 2025 scenario", () => {
      const worldState = dataLoader.initializeWorldState("2025", "USA", 12345);

      expect(worldState.turn).toBe(0);
      expect(worldState.date).toBe("2025-01");
      expect(worldState.playerCountryId).toBe("USA");
      expect(worldState.seed).toBe(12345);
      expect(worldState.countries.length).toBe(25);
    });

    it("should apply scenario relations", () => {
      const worldState = dataLoader.initializeWorldState("2025", "USA", 12345);

      const usa = worldState.countries.find((c) => c.id === "USA")!;
      const gbr = worldState.countries.find((c) => c.id === "GBR")!;

      expect(usa.relations["GBR"]).toBeGreaterThan(50);
      expect(usa.relations["RUS"]).toBeLessThan(0);
    });

    it("should apply scenario alliances", () => {
      const worldState = dataLoader.initializeWorldState("2025", "USA", 12345);

      const usa = worldState.countries.find((c) => c.id === "USA")!;

      expect(usa.alliances).toContain("GBR");
      expect(usa.alliances).toContain("CAN");
    });

    it("should set correct global tension", () => {
      const worldState = dataLoader.initializeWorldState("2025", "USA", 12345);

      expect(worldState.globalTension).toBe(55);
    });
  });

  describe("data validation", () => {
    it("should have realistic GDP/military ratios", () => {
      const countries = dataLoader.loadAllCountries();

      for (const country of countries) {
        const militaryBudget = country.gdp * (country.militaryBudgetPct / 100);
        const budgetPerSoldier = militaryBudget / country.manpower;

        expect(budgetPerSoldier).toBeGreaterThan(1000);
        expect(country.militaryBudgetPct).toBeLessThanOrEqual(20);
      }
    });

    it("should have NATO allies with positive relations", () => {
      const worldState = dataLoader.initializeWorldState("2025", "USA", 12345);

      const natoMembers = ["USA", "GBR", "DEU", "FRA", "CAN", "POL", "ITA", "TUR"];

      for (const member1 of natoMembers) {
        const country = worldState.countries.find((c) => c.id === member1);
        if (!country) continue;

        for (const member2 of natoMembers) {
          if (member1 === member2) continue;

          const relation = country.relations[member2];
          if (relation !== undefined) {
            expect(relation).toBeGreaterThanOrEqual(-20);
          }
        }
      }
    });
  });
});

describe("Integration: Load and Simulate", () => {
  it("should load 25 countries and run 5 turns successfully", async () => {
    const dataLoader = createDataLoader(join(process.cwd(), "data"));
    const worldState = dataLoader.initializeWorldState("2025", "USA", 12345);

    expect(worldState.countries.length).toBe(25);

    const { TurnEngine } = await import("../../src/core/turn.js");
    const engine = new TurnEngine(worldState.seed);

    let currentState = worldState;

    for (let i = 0; i < 5; i++) {
      const result = engine.executeTurn(currentState, [], []);
      currentState = result.newState;

      expect(currentState.turn).toBe(i + 1);
      expect(currentState.countries.length).toBe(25);

      for (const country of currentState.countries) {
        expect(country.stability).toBeGreaterThanOrEqual(0);
        expect(country.stability).toBeLessThanOrEqual(100);
      }
    }

    expect(currentState.turn).toBe(5);
  });
});
