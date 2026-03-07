import { describe, it, expect } from 'vitest';
import { Country } from '../../src/core/country.js';
import { CountryState } from '../../src/core/types.js';

const createTestCountry = (overrides: Partial<CountryState> = {}): CountryState => ({
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
  alliances: ['GBR', 'CAN'],
  atWarWith: [],
  stability: 75,
  regimeType: 'DEMOCRACY',
  legitimacy: 80,
  intelLevel: 95,
  goals: [],
  riskTolerance: 40,
  ...overrides,
});

describe('Country', () => {
  describe('constructor', () => {
    it('should create country from valid state', () => {
      const state = createTestCountry();
      const country = new Country(state);

      expect(country.getId()).toBe('USA');
      expect(country.getName()).toBe('United States');
    });

    it('should throw on invalid state', () => {
      expect(() => {
        new Country({ id: 'USA' } as CountryState);
      }).toThrow();
    });
  });

  describe('getMilitaryBudget', () => {
    it('should calculate military budget correctly', () => {
      const country = new Country(createTestCountry({
        gdp: 1000000000000,
        militaryBudgetPercent: 5,
      }));

      expect(country.getMilitaryBudget()).toBe(50000000000);
    });
  });

  describe('getEffectiveMilitary', () => {
    it('should calculate effective military strength', () => {
      const country = new Country(createTestCountry({
        manpower: 1000000,
        airpower: 1000,
        mobilizationLevel: 50,
      }));

      const strength = country.getEffectiveMilitary();
      expect(strength).toBe(500000 + 10000);
    });
  });

  describe('relations', () => {
    it('should get relation with country', () => {
      const country = new Country(createTestCountry());

      expect(country.getRelation('GBR')).toBe(80);
      expect(country.getRelation('CHN')).toBe(-20);
      expect(country.getRelation('UNKNOWN')).toBe(0);
    });

    it('should check war status', () => {
      const country = new Country(createTestCountry({
        atWarWith: ['RUS'],
      }));

      expect(country.isAtWarWith('RUS')).toBe(true);
      expect(country.isAtWarWith('GBR')).toBe(false);
    });

    it('should check alliance status', () => {
      const country = new Country(createTestCountry());

      expect(country.isAlliedWith('GBR')).toBe(true);
      expect(country.isAlliedWith('CHN')).toBe(false);
    });
  });

  describe('canDeclareWar', () => {
    it('should allow war declaration on non-allied hostile country', () => {
      const country = new Country(createTestCountry({
        relations: { RUS: -70 },
        alliances: [],
        atWarWith: [],
      }));

      expect(country.canDeclareWar('RUS')).toBe(true);
    });

    it('should not allow war on ally', () => {
      const country = new Country(createTestCountry({
        alliances: ['GBR'],
      }));

      expect(country.canDeclareWar('GBR')).toBe(false);
    });

    it('should not allow war on country already at war with', () => {
      const country = new Country(createTestCountry({
        atWarWith: ['RUS'],
      }));

      expect(country.canDeclareWar('RUS')).toBe(false);
    });
  });

  describe('canFormAlliance', () => {
    it('should allow alliance with friendly country', () => {
      const country = new Country(createTestCountry({
        relations: { JPN: 70 },
        alliances: [],
      }));

      expect(country.canFormAlliance('JPN')).toBe(true);
    });

    it('should not allow alliance with hostile country', () => {
      const country = new Country(createTestCountry({
        relations: { RUS: -50 },
      }));

      expect(country.canFormAlliance('RUS')).toBe(false);
    });

    it('should not allow alliance with existing ally', () => {
      const country = new Country(createTestCountry({
        alliances: ['GBR'],
        relations: { GBR: 80 },
      }));

      expect(country.canFormAlliance('GBR')).toBe(false);
    });
  });

  describe('applyRelationDelta', () => {
    it('should modify relations correctly', () => {
      const country = new Country(createTestCountry({
        relations: { CHN: 0 },
      }));

      const newState = country.applyRelationDelta('CHN', 20);
      expect(newState.relations.CHN).toBe(20);
    });

    it('should clamp relations to valid range', () => {
      const country = new Country(createTestCountry({
        relations: { CHN: 90 },
      }));

      const newState = country.applyRelationDelta('CHN', 50);
      expect(newState.relations.CHN).toBe(100);
    });
  });

  describe('applyStabilityDelta', () => {
    it('should modify stability correctly', () => {
      const country = new Country(createTestCountry({ stability: 50 }));

      const newState = country.applyStabilityDelta(10);
      expect(newState.stability).toBe(60);
    });

    it('should clamp stability to valid range', () => {
      const country = new Country(createTestCountry({ stability: 95 }));

      const newState = country.applyStabilityDelta(20);
      expect(newState.stability).toBe(100);
    });
  });

  describe('applyGdpGrowth', () => {
    it('should apply growth rate to GDP', () => {
      const country = new Country(createTestCountry({
        gdp: 1000000000000,
        growthRate: 0.05,
      }));

      const newState = country.applyGdpGrowth();
      expect(newState.gdp).toBe(1050000000000);
    });
  });

  describe('applyWarAttrition', () => {
    it('should reduce manpower, stability, and GDP', () => {
      const country = new Country(createTestCountry({
        manpower: 1000000,
        stability: 80,
        gdp: 1000000000000,
      }));

      const newState = country.applyWarAttrition(0.01);

      expect(newState.manpower).toBe(990000);
      expect(newState.stability).toBe(75);
      expect(newState.gdp).toBe(980000000000);
    });
  });

  describe('declareWar', () => {
    it('should add target to atWarWith and set relations to -100', () => {
      const country = new Country(createTestCountry({
        relations: { RUS: -70 },
        alliances: [],
        atWarWith: [],
      }));

      const newState = country.declareWar('RUS');

      expect(newState.atWarWith).toContain('RUS');
      expect(newState.relations.RUS).toBe(-100);
    });

    it('should throw when cannot declare war', () => {
      const country = new Country(createTestCountry({
        alliances: ['GBR'],
      }));

      expect(() => country.declareWar('GBR')).toThrow();
    });
  });

  describe('formAlliance', () => {
    it('should add target to alliances', () => {
      const country = new Country(createTestCountry({
        relations: { JPN: 70 },
        alliances: [],
      }));

      const newState = country.formAlliance('JPN');
      expect(newState.alliances).toContain('JPN');
    });
  });

  describe('breakAlliance', () => {
    it('should remove target from alliances and reduce relations', () => {
      const country = new Country(createTestCountry({
        alliances: ['GBR'],
        relations: { GBR: 80 },
      }));

      const newState = country.breakAlliance('GBR');

      expect(newState.alliances).not.toContain('GBR');
      expect(newState.relations.GBR).toBe(50);
    });
  });

  describe('mobilize', () => {
    it('should set mobilization level', () => {
      const country = new Country(createTestCountry({ mobilizationLevel: 10 }));

      const newState = country.mobilize(50);
      expect(newState.mobilizationLevel).toBe(50);
    });

    it('should clamp mobilization to valid range', () => {
      const country = new Country(createTestCountry());

      expect(country.mobilize(150).mobilizationLevel).toBe(100);
      expect(country.mobilize(-10).mobilizationLevel).toBe(0);
    });
  });

  describe('serialization', () => {
    it('should serialize and deserialize correctly', () => {
      const state = createTestCountry();
      const country = new Country(state);

      const json = country.toJSON();
      const restored = Country.fromJSON(json);

      expect(restored.getState()).toEqual(country.getState());
    });
  });
});
