import { describe, it, expect } from 'vitest';
import { World, createEmptyCountryState } from '../../src/core/world.js';
import { TIER1_COUNTRIES } from '../../src/core/types.js';

describe('World', () => {
  describe('initialize', () => {
    it('should create a world with 25 countries', () => {
      const world = World.initialize({
        seed: 12345,
        playerCountryId: 'USA',
        startYear: 2025,
      });

      const state = world.getState();
      expect(state.countries.length).toBe(25);
    });

    it('should set correct initial values', () => {
      const world = World.initialize({
        seed: 12345,
        playerCountryId: 'USA',
        startYear: 2025,
        startMonth: 6,
      });

      const state = world.getState();
      expect(state.turn).toBe(0);
      expect(state.date).toBe('2025-06');
      expect(state.seed).toBe(12345);
      expect(state.playerCountryId).toBe('USA');
      expect(state.globalTension).toBe(30);
      expect(state.wars).toHaveLength(0);
    });

    it('should throw error for invalid player country', () => {
      expect(() => {
        World.initialize({
          seed: 12345,
          playerCountryId: 'INVALID',
          startYear: 2025,
        });
      }).toThrow('Invalid player country');
    });

    it('should include all Tier 1 countries', () => {
      const world = World.initialize({
        seed: 12345,
        playerCountryId: 'USA',
        startYear: 2025,
      });

      const state = world.getState();
      const countryIds = state.countries.map((c) => c.id);

      for (const tier1Country of TIER1_COUNTRIES) {
        expect(countryIds).toContain(tier1Country);
      }
    });
  });

  describe('getCountry', () => {
    it('should return country by ID', () => {
      const world = World.initialize({
        seed: 12345,
        playerCountryId: 'USA',
        startYear: 2025,
      });

      const usa = world.getCountry('USA');
      expect(usa).toBeDefined();
      expect(usa?.id).toBe('USA');
      expect(usa?.name).toBe('United States');
    });

    it('should return undefined for non-existent country', () => {
      const world = World.initialize({
        seed: 12345,
        playerCountryId: 'USA',
        startYear: 2025,
      });

      const invalid = world.getCountry('INVALID');
      expect(invalid).toBeUndefined();
    });
  });

  describe('getPlayerCountry', () => {
    it('should return player country', () => {
      const world = World.initialize({
        seed: 12345,
        playerCountryId: 'CHN',
        startYear: 2025,
      });

      const player = world.getPlayerCountry();
      expect(player.id).toBe('CHN');
    });
  });

  describe('serialization', () => {
    it('should serialize and deserialize correctly', () => {
      const world = World.initialize({
        seed: 12345,
        playerCountryId: 'USA',
        startYear: 2025,
      });

      const json = world.toJSON();
      const restored = World.fromJSON(json);

      expect(restored.getState()).toEqual(world.getState());
    });
  });
});

describe('createEmptyCountryState', () => {
  it('should create valid country state', () => {
    const country = createEmptyCountryState('USA');

    expect(country.id).toBe('USA');
    expect(country.name).toBe('United States');
    expect(country.iso3).toBe('USA');
    expect(country.stability).toBe(50);
    expect(country.regimeType).toBe('DEMOCRACY');
  });

  it('should handle unknown country codes', () => {
    const country = createEmptyCountryState('XYZ');

    expect(country.id).toBe('XYZ');
    expect(country.name).toBe('XYZ');
  });
});
