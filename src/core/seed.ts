export class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
    return this.seed / 0x7fffffff;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min)) + min;
  }

  nextFloat(min: number, max: number): number {
    return this.next() * (max - min) + min;
  }

  nextBool(probability = 0.5): boolean {
    return this.next() < probability;
  }

  shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i + 1);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  pick<T>(array: T[]): T {
    if (array.length === 0) {
      throw new Error("Cannot pick from empty array");
    }
    return array[this.nextInt(0, array.length)];
  }

  pickMultiple<T>(array: T[], count: number): T[] {
    if (count > array.length) {
      throw new Error("Cannot pick more items than array length");
    }
    const shuffled = this.shuffle(array);
    return shuffled.slice(0, count);
  }

  getSeed(): number {
    return this.seed;
  }

  clone(): SeededRandom {
    return new SeededRandom(this.seed);
  }
}

export function createSeed(year: number, countryId: string): number {
  let hash = year;
  for (let i = 0; i < countryId.length; i++) {
    hash = ((hash << 5) - hash + countryId.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function combineSeed(seed1: number, seed2: number): number {
  return (seed1 * 31 + seed2) | 0;
}
