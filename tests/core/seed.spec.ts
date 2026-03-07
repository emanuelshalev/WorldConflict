import { describe, it, expect } from 'vitest';
import { SeededRandom, createSeed, combineSeed } from '../../src/core/seed.js';

describe('SeededRandom', () => {
  describe('determinism', () => {
    it('should produce same sequence with same seed', () => {
      const rng1 = new SeededRandom(12345);
      const rng2 = new SeededRandom(12345);

      for (let i = 0; i < 100; i++) {
        expect(rng1.next()).toBe(rng2.next());
      }
    });

    it('should produce different sequences with different seeds', () => {
      const rng1 = new SeededRandom(12345);
      const rng2 = new SeededRandom(54321);

      const seq1 = Array.from({ length: 10 }, () => rng1.next());
      const seq2 = Array.from({ length: 10 }, () => rng2.next());

      expect(seq1).not.toEqual(seq2);
    });
  });

  describe('next', () => {
    it('should return values between 0 and 1', () => {
      const rng = new SeededRandom(12345);

      for (let i = 0; i < 1000; i++) {
        const value = rng.next();
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('nextInt', () => {
    it('should return integers in range', () => {
      const rng = new SeededRandom(12345);

      for (let i = 0; i < 100; i++) {
        const value = rng.nextInt(0, 10);
        expect(Number.isInteger(value)).toBe(true);
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThan(10);
      }
    });
  });

  describe('nextFloat', () => {
    it('should return floats in range', () => {
      const rng = new SeededRandom(12345);

      for (let i = 0; i < 100; i++) {
        const value = rng.nextFloat(5.0, 10.0);
        expect(value).toBeGreaterThanOrEqual(5.0);
        expect(value).toBeLessThanOrEqual(10.0);
      }
    });
  });

  describe('nextBool', () => {
    it('should return boolean values', () => {
      const rng = new SeededRandom(12345);

      for (let i = 0; i < 100; i++) {
        const value = rng.nextBool();
        expect(typeof value).toBe('boolean');
      }
    });

    it('should respect probability', () => {
      const rng = new SeededRandom(12345);
      let trueCount = 0;
      const iterations = 10000;

      for (let i = 0; i < iterations; i++) {
        if (rng.nextBool(0.8)) trueCount++;
      }

      const ratio = trueCount / iterations;
      expect(ratio).toBeGreaterThan(0.75);
      expect(ratio).toBeLessThan(0.85);
    });
  });

  describe('shuffle', () => {
    it('should return array with same elements', () => {
      const rng = new SeededRandom(12345);
      const original = [1, 2, 3, 4, 5];
      const shuffled = rng.shuffle(original);

      expect(shuffled.sort()).toEqual(original.sort());
    });

    it('should be deterministic', () => {
      const rng1 = new SeededRandom(12345);
      const rng2 = new SeededRandom(12345);
      const array = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

      expect(rng1.shuffle([...array])).toEqual(rng2.shuffle([...array]));
    });
  });

  describe('pick', () => {
    it('should return element from array', () => {
      const rng = new SeededRandom(12345);
      const array = ['a', 'b', 'c', 'd'];

      for (let i = 0; i < 100; i++) {
        const picked = rng.pick(array);
        expect(array).toContain(picked);
      }
    });

    it('should throw on empty array', () => {
      const rng = new SeededRandom(12345);
      expect(() => rng.pick([])).toThrow('Cannot pick from empty array');
    });
  });

  describe('pickMultiple', () => {
    it('should return correct number of elements', () => {
      const rng = new SeededRandom(12345);
      const array = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const picked = rng.pickMultiple(array, 3);

      expect(picked.length).toBe(3);
      for (const item of picked) {
        expect(array).toContain(item);
      }
    });

    it('should throw when count exceeds array length', () => {
      const rng = new SeededRandom(12345);
      expect(() => rng.pickMultiple([1, 2, 3], 5)).toThrow();
    });
  });

  describe('clone', () => {
    it('should create independent copy', () => {
      const rng1 = new SeededRandom(12345);
      rng1.next();
      rng1.next();

      const rng2 = rng1.clone();

      expect(rng1.next()).toBe(rng2.next());
    });
  });
});

describe('createSeed', () => {
  it('should create deterministic seed from year and country', () => {
    const seed1 = createSeed(2025, 'USA');
    const seed2 = createSeed(2025, 'USA');

    expect(seed1).toBe(seed2);
  });

  it('should create different seeds for different inputs', () => {
    const seed1 = createSeed(2025, 'USA');
    const seed2 = createSeed(2025, 'CHN');
    const seed3 = createSeed(2024, 'USA');

    expect(seed1).not.toBe(seed2);
    expect(seed1).not.toBe(seed3);
  });
});

describe('combineSeed', () => {
  it('should combine seeds deterministically', () => {
    const combined1 = combineSeed(12345, 67890);
    const combined2 = combineSeed(12345, 67890);

    expect(combined1).toBe(combined2);
  });

  it('should produce different results for different inputs', () => {
    const combined1 = combineSeed(12345, 67890);
    const combined2 = combineSeed(12345, 11111);

    expect(combined1).not.toBe(combined2);
  });
});
