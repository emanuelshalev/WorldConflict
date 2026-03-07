import { describe, it, expect } from 'vitest';
import { World } from '../../src/core/world.js';
import { TurnEngine } from '../../src/core/turn.js';
import { Action, CountryIntent, WorldState } from '../../src/core/types.js';

describe('Determinism', () => {
  const runSimulation = (
    seed: number,
    playerCountryId: string,
    startYear: number,
    turns: number,
    playerActionsPerTurn: Action[][],
    aiIntentsPerTurn: CountryIntent[][]
  ): WorldState[] => {
    const world = World.initialize({ seed, playerCountryId, startYear });
    const engine = new TurnEngine(seed);
    const states: WorldState[] = [world.getState()];

    let currentState = world.getState();

    for (let i = 0; i < turns; i++) {
      const playerActions = playerActionsPerTurn[i] ?? [];
      const aiIntents = aiIntentsPerTurn[i] ?? [];

      const result = engine.executeTurn(currentState, playerActions, aiIntents);
      currentState = result.newState;
      states.push(currentState);
    }

    return states;
  };

  describe('same seed produces identical results', () => {
    it('should produce identical 24-turn simulation with same seed', () => {
      const seed = 12345;
      const playerCountryId = 'USA';
      const startYear = 2025;
      const turns = 24;

      const playerActions: Action[][] = Array(turns).fill([
        { type: 'DOMESTIC_PROPAGANDA' as const },
      ]);

      const aiIntents: CountryIntent[][] = Array(turns).fill([
        { countryId: 'CHN', actions: [{ type: 'MILITARY_MOBILIZE' as const }] },
        { countryId: 'RUS', actions: [{ type: 'DOMESTIC_PROPAGANDA' as const }] },
      ]);

      const simulation1 = runSimulation(
        seed,
        playerCountryId,
        startYear,
        turns,
        playerActions,
        aiIntents
      );

      const simulation2 = runSimulation(
        seed,
        playerCountryId,
        startYear,
        turns,
        playerActions,
        aiIntents
      );

      expect(simulation1.length).toBe(simulation2.length);

      for (let i = 0; i < simulation1.length; i++) {
        expect(simulation1[i]).toEqual(simulation2[i]);
      }
    });

    it('should produce different results with different seeds', () => {
      const playerCountryId = 'USA';
      const startYear = 2025;
      const turns = 10;

      const playerActions: Action[][] = Array(turns).fill([]);
      const aiIntents: CountryIntent[][] = Array(turns).fill([]);

      const simulation1 = runSimulation(
        12345,
        playerCountryId,
        startYear,
        turns,
        playerActions,
        aiIntents
      );

      const simulation2 = runSimulation(
        54321,
        playerCountryId,
        startYear,
        turns,
        playerActions,
        aiIntents
      );

      const finalState1 = simulation1[simulation1.length - 1];
      const finalState2 = simulation2[simulation2.length - 1];

      expect(finalState1).not.toEqual(finalState2);
    });
  });

  describe('state consistency', () => {
    it('should maintain valid state throughout simulation', () => {
      const seed = 99999;
      const turns = 24;

      const playerActions: Action[][] = [
        [{ type: 'DIPLOMACY_DECLARE_WAR', targetCountryId: 'CHN' }],
        ...Array(turns - 1).fill([{ type: 'MILITARY_MOBILIZE' as const }]),
      ];

      const aiIntents: CountryIntent[][] = Array(turns).fill([]);

      const states = runSimulation(seed, 'USA', 2025, turns, playerActions, aiIntents);

      for (const state of states) {
        expect(state.turn).toBeGreaterThanOrEqual(0);
        expect(state.countries.length).toBe(25);
        expect(state.globalTension).toBeGreaterThanOrEqual(0);
        expect(state.globalTension).toBeLessThanOrEqual(100);

        for (const country of state.countries) {
          expect(country.stability).toBeGreaterThanOrEqual(0);
          expect(country.stability).toBeLessThanOrEqual(100);
          expect(country.legitimacy).toBeGreaterThanOrEqual(0);
          expect(country.legitimacy).toBeLessThanOrEqual(100);
          expect(country.mobilizationLevel).toBeGreaterThanOrEqual(0);
          expect(country.mobilizationLevel).toBeLessThanOrEqual(100);
          expect(country.gdp).toBeGreaterThanOrEqual(0);
        }
      }
    });

    it('should correctly track war state', () => {
      const seed = 11111;
      const turns = 5;

      const playerActions: Action[][] = [
        [{ type: 'DIPLOMACY_DECLARE_WAR', targetCountryId: 'RUS' }],
        ...Array(turns - 1).fill([]),
      ];

      const states = runSimulation(seed, 'USA', 2025, turns, playerActions, []);

      const stateAfterWar = states[1];
      const usa = stateAfterWar.countries.find((c) => c.id === 'USA')!;
      const rus = stateAfterWar.countries.find((c) => c.id === 'RUS')!;

      expect(usa.atWarWith).toContain('RUS');
      expect(rus.atWarWith).toContain('USA');
      expect(stateAfterWar.wars.length).toBeGreaterThan(0);
    });
  });

  describe('turn progression', () => {
    it('should correctly advance through 24 turns (2 years)', () => {
      const states = runSimulation(12345, 'USA', 2025, 24, [], []);

      expect(states[0].turn).toBe(0);
      expect(states[0].date).toBe('2025-01');

      expect(states[12].turn).toBe(12);
      expect(states[12].date).toBe('2026-01');

      expect(states[24].turn).toBe(24);
      expect(states[24].date).toBe('2027-01');
    });
  });

  describe('performance', () => {
    it('should complete 24-turn simulation in reasonable time', () => {
      const start = performance.now();

      runSimulation(
        12345,
        'USA',
        2025,
        24,
        Array(24).fill([{ type: 'DOMESTIC_PROPAGANDA' as const }]),
        Array(24).fill([
          { countryId: 'CHN', actions: [{ type: 'MILITARY_MOBILIZE' as const }] },
        ])
      );

      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(5000);
    });
  });
});
