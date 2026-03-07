import { describe, it, expect } from 'vitest';
import { TurnEngine } from '../../src/core/turn.js';
import { World } from '../../src/core/world.js';
import { Action, CountryIntent } from '../../src/core/types.js';

describe('TurnEngine', () => {
  const createTestWorld = () => {
    return World.initialize({
      seed: 12345,
      playerCountryId: 'USA',
      startYear: 2025,
    });
  };

  describe('executeTurn', () => {
    it('should advance turn number', () => {
      const world = createTestWorld();
      const engine = new TurnEngine(world.getSeed());

      const result = engine.executeTurn(world.getState(), [], []);

      expect(result.newState.turn).toBe(1);
    });

    it('should advance date by one month', () => {
      const world = createTestWorld();
      const engine = new TurnEngine(world.getSeed());

      const result = engine.executeTurn(world.getState(), [], []);

      expect(result.newState.date).toBe('2025-02');
    });

    it('should handle year rollover', () => {
      const world = World.initialize({
        seed: 12345,
        playerCountryId: 'USA',
        startYear: 2025,
        startMonth: 12,
      });
      const engine = new TurnEngine(world.getSeed());

      const result = engine.executeTurn(world.getState(), [], []);

      expect(result.newState.date).toBe('2026-01');
    });

    it('should return newspaper entries', () => {
      const world = createTestWorld();
      const engine = new TurnEngine(world.getSeed());

      const result = engine.executeTurn(world.getState(), [], []);

      expect(Array.isArray(result.newspaper)).toBe(true);
    });

    it('should return resolved actions map', () => {
      const world = createTestWorld();
      const engine = new TurnEngine(world.getSeed());

      const playerActions: Action[] = [
        { type: 'DOMESTIC_PROPAGANDA' },
      ];

      const result = engine.executeTurn(world.getState(), playerActions, []);

      expect(result.resolvedActions.has('USA')).toBe(true);
    });
  });

  describe('action resolution', () => {
    it('should apply DOMESTIC_PROPAGANDA action', () => {
      const world = createTestWorld();
      const engine = new TurnEngine(world.getSeed());

      const initialState = world.getState();
      const usaInitial = initialState.countries.find((c) => c.id === 'USA')!;

      const playerActions: Action[] = [
        { type: 'DOMESTIC_PROPAGANDA' },
      ];

      const result = engine.executeTurn(initialState, playerActions, []);
      const usaFinal = result.newState.countries.find((c) => c.id === 'USA')!;

      expect(usaFinal.legitimacy).toBeGreaterThanOrEqual(usaInitial.legitimacy);
    });

    it('should apply MILITARY_MOBILIZE action', () => {
      const world = createTestWorld();
      const engine = new TurnEngine(world.getSeed());

      const initialState = world.getState();
      const usaInitial = initialState.countries.find((c) => c.id === 'USA')!;

      const playerActions: Action[] = [
        { type: 'MILITARY_MOBILIZE' },
      ];

      const result = engine.executeTurn(initialState, playerActions, []);
      const usaFinal = result.newState.countries.find((c) => c.id === 'USA')!;

      expect(usaFinal.mobilizationLevel).toBeGreaterThan(usaInitial.mobilizationLevel);
    });

    it('should apply DIPLOMACY_IMPROVE_RELATIONS action', () => {
      const world = createTestWorld();
      const engine = new TurnEngine(world.getSeed());

      const initialState = world.getState();

      const playerActions: Action[] = [
        { type: 'DIPLOMACY_IMPROVE_RELATIONS', targetCountryId: 'CHN' },
      ];

      const result = engine.executeTurn(initialState, playerActions, []);
      const usaFinal = result.newState.countries.find((c) => c.id === 'USA')!;

      expect(usaFinal.relations['CHN']).toBeDefined();
    });

    it('should process AI intents', () => {
      const world = createTestWorld();
      const engine = new TurnEngine(world.getSeed());

      const initialState = world.getState();

      const aiIntents: CountryIntent[] = [
        {
          countryId: 'CHN',
          actions: [{ type: 'MILITARY_MOBILIZE' }],
        },
      ];

      const result = engine.executeTurn(initialState, [], aiIntents);
      const chnFinal = result.newState.countries.find((c) => c.id === 'CHN')!;
      const chnInitial = initialState.countries.find((c) => c.id === 'CHN')!;

      expect(chnFinal.mobilizationLevel).toBeGreaterThan(chnInitial.mobilizationLevel);
    });
  });

  describe('war declaration', () => {
    it('should create war when declaring war', () => {
      const world = createTestWorld();
      const engine = new TurnEngine(world.getSeed());

      const initialState = world.getState();

      const playerActions: Action[] = [
        { type: 'DIPLOMACY_DECLARE_WAR', targetCountryId: 'CHN' },
      ];

      const result = engine.executeTurn(initialState, playerActions, []);

      expect(result.newState.wars.length).toBeGreaterThan(0);
      
      const usaFinal = result.newState.countries.find((c) => c.id === 'USA')!;
      expect(usaFinal.atWarWith).toContain('CHN');
    });

    it('should increase global tension on war declaration', () => {
      const world = createTestWorld();
      const engine = new TurnEngine(world.getSeed());

      const initialState = world.getState();

      const playerActions: Action[] = [
        { type: 'DIPLOMACY_DECLARE_WAR', targetCountryId: 'CHN' },
      ];

      const result = engine.executeTurn(initialState, playerActions, []);

      expect(result.newState.globalTension).toBeGreaterThan(initialState.globalTension);
    });
  });

  describe('determinism', () => {
    it('should produce identical results with same inputs', () => {
      const world1 = createTestWorld();
      const world2 = createTestWorld();
      const engine1 = new TurnEngine(world1.getSeed());
      const engine2 = new TurnEngine(world2.getSeed());

      const playerActions: Action[] = [
        { type: 'DOMESTIC_PROPAGANDA' },
        { type: 'MILITARY_MOBILIZE' },
      ];

      const aiIntents: CountryIntent[] = [
        {
          countryId: 'CHN',
          actions: [{ type: 'MILITARY_MOBILIZE' }],
        },
      ];

      const result1 = engine1.executeTurn(world1.getState(), playerActions, aiIntents);
      const result2 = engine2.executeTurn(world2.getState(), playerActions, aiIntents);

      expect(result1.newState).toEqual(result2.newState);
    });
  });
});
