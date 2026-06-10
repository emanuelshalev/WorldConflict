import { describe, expect, it } from "vitest";
import { createDataLoader } from "../../src/core/data-loader.js";
import { TIER1_COUNTRIES, WorldStateSchema } from "../../src/core/types.js";

describe("DataLoader", () => {
  const loader = createDataLoader();

  it("initializes a valid 2025 world with 25 countries", () => {
    const world = loader.initializeWorldState("2025", "USA", 42);
    expect(() => WorldStateSchema.parse(world)).not.toThrow();
    expect(world.countries.length).toBe(TIER1_COUNTRIES.length);
    expect(world.date).toBe("2025-01");
  });

  it("applies era leaders from the scenario", () => {
    const world = loader.initializeWorldState("1960", "ISR", 7);
    const rus = world.countries.find((c) => c.id === "RUS");
    expect(rus?.leader.name).toBe("Nikita Khrushchev");
    expect(rus?.name).toBe("Soviet Union");
    expect(rus?.regimeType).toBe("COMMUNIST");
  });

  it("applies era nuclear overrides", () => {
    const world1960 = loader.initializeWorldState("1960", "USA", 7);
    const fra = world1960.countries.find((c) => c.id === "FRA");
    expect(fra?.nuclear.status).toBe("DEVELOPING");
    expect(fra?.nuclear.progress).toBeGreaterThan(90); // weeks from first test

    const chn = world1960.countries.find((c) => c.id === "CHN");
    expect(chn?.nuclear.status).toBe("DEVELOPING");

    const world2025 = loader.initializeWorldState("2025", "USA", 7);
    expect(world2025.countries.find((c) => c.id === "PRK")?.nuclear.status).toBe("ARMED");
    expect(world2025.countries.find((c) => c.id === "IRN")?.nuclear.status).toBe("DEVELOPING");
  });

  it("the player's country gets a generated leader and backstory", () => {
    const world = loader.initializeWorldState("2025", "DEU", 99);
    const player = world.countries.find((c) => c.id === "DEU");
    expect(player?.leader.name).toBe("You");
    expect(world.playerBackstory.length).toBeGreaterThan(50);
  });

  it("fills relations for every country pair", () => {
    const world = loader.initializeWorldState("2025", "USA", 42);
    for (const country of world.countries) {
      for (const other of world.countries) {
        if (country.id === other.id) continue;
        expect(country.relations[other.id], `${country.id}→${other.id}`).toBeTypeOf("number");
      }
    }
  });

  it("applies scenario alliances symmetrically", () => {
    const world = loader.initializeWorldState("2025", "USA", 42);
    const usa = world.countries.find((c) => c.id === "USA");
    const gbr = world.countries.find((c) => c.id === "GBR");
    expect(usa?.alliances).toContain("GBR");
    expect(gbr?.alliances).toContain("USA");
  });

  it("schedules elections only for electoral systems", () => {
    const world = loader.initializeWorldState("2025", "USA", 42);
    const usa = world.countries.find((c) => c.id === "USA");
    const sau = world.countries.find((c) => c.id === "SAU");
    expect(usa?.politicalSystem.nextElectionTurn).not.toBeNull();
    expect(sau?.politicalSystem.nextElectionTurn).toBeNull();
  });

  it("initializes beliefs so the player view works at turn 0", () => {
    const world = loader.initializeWorldState("2025", "USA", 42);
    const usa = world.countries.find((c) => c.id === "USA");
    expect(Object.keys(usa?.beliefs ?? {}).length).toBe(24);
  });
});
