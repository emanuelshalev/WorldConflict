import { describe, it, expect } from 'vitest';
import {
  CountryStateSchema,
  WorldStateSchema,
  ActionSchema,
  CountryIntentSchema,
  TIER1_COUNTRIES,
} from '../../src/core/types.js';

describe('Core Types', () => {
  describe('TIER1_COUNTRIES', () => {
    it('should have exactly 25 countries', () => {
      expect(TIER1_COUNTRIES.length).toBe(25);
    });

    it('should include major powers', () => {
      expect(TIER1_COUNTRIES).toContain('USA');
      expect(TIER1_COUNTRIES).toContain('CHN');
      expect(TIER1_COUNTRIES).toContain('RUS');
    });
  });

  describe('ActionSchema', () => {
    it('should validate a valid action', () => {
      const action = {
        type: 'DIPLOMACY_IMPROVE_RELATIONS',
        targetCountryId: 'CHN',
        value: 10,
      };
      const result = ActionSchema.safeParse(action);
      expect(result.success).toBe(true);
    });

    it('should reject invalid action type', () => {
      const action = {
        type: 'INVALID_ACTION',
        targetCountryId: 'CHN',
      };
      const result = ActionSchema.safeParse(action);
      expect(result.success).toBe(false);
    });
  });

  describe('CountryIntentSchema', () => {
    it('should validate a valid intent', () => {
      const intent = {
        countryId: 'USA',
        actions: [
          { type: 'DIPLOMACY_IMPROVE_RELATIONS', targetCountryId: 'GBR' },
        ],
        reasoning: 'Strengthen NATO alliance',
      };
      const result = CountryIntentSchema.safeParse(intent);
      expect(result.success).toBe(true);
    });
  });

  describe('CountryStateSchema', () => {
    it('should validate a valid country state', () => {
      const country = {
        id: 'USA',
        name: 'United States',
        iso3: 'USA',
        gdp: 25000000000000,
        growthRate: 0.02,
        debtGdpRatio: 1.2,
        militaryBudgetPercent: 3.5,
        manpower: 1400000,
        airpower: 13000,
        mobilizationLevel: 10,
        relations: { CHN: -20, GBR: 80, CAN: 90 },
        alliances: ['GBR', 'CAN', 'DEU'],
        atWarWith: [],
        stability: 75,
        regimeType: 'DEMOCRACY',
        legitimacy: 80,
        intelLevel: 95,
        goals: [],
        riskTolerance: 40,
      };
      const result = CountryStateSchema.safeParse(country);
      expect(result.success).toBe(true);
    });

    it('should reject invalid military budget percent', () => {
      const country = {
        id: 'USA',
        name: 'United States',
        iso3: 'USA',
        gdp: 25000000000000,
        growthRate: 0.02,
        debtGdpRatio: 1.2,
        militaryBudgetPercent: 25, // Invalid: max is 20
        manpower: 1400000,
        airpower: 13000,
        mobilizationLevel: 10,
        relations: {},
        alliances: [],
        atWarWith: [],
        stability: 75,
        regimeType: 'DEMOCRACY',
        legitimacy: 80,
        intelLevel: 95,
        goals: [],
        riskTolerance: 40,
      };
      const result = CountryStateSchema.safeParse(country);
      expect(result.success).toBe(false);
    });
  });

  describe('WorldStateSchema', () => {
    it('should validate a minimal world state', () => {
      const worldState = {
        turn: 0,
        date: '2025-01',
        countries: [],
        wars: [],
        globalTension: 50,
        eventQueue: [],
        seed: 12345,
        playerCountryId: 'USA',
      };
      const result = WorldStateSchema.safeParse(worldState);
      expect(result.success).toBe(true);
    });
  });
});
