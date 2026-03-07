import { type CountryState, CountryStateSchema, type Goal, type RegimeType } from "./types.js";

export class Country {
  private state: CountryState;

  constructor(state: CountryState) {
    const validated = CountryStateSchema.parse(state);
    this.state = validated;
  }

  getState(): CountryState {
    return structuredClone(this.state);
  }

  getId(): string {
    return this.state.id;
  }

  getName(): string {
    return this.state.name;
  }

  getGdp(): number {
    return this.state.gdp;
  }

  getMilitaryBudget(): number {
    return this.state.gdp * (this.state.militaryBudgetPercent / 100);
  }

  getEffectiveMilitary(): number {
    const mobilizationFactor = this.state.mobilizationLevel / 100;
    return this.state.manpower * mobilizationFactor + this.state.airpower * 10;
  }

  getRelation(countryId: string): number {
    return this.state.relations[countryId] ?? 0;
  }

  isAtWarWith(countryId: string): boolean {
    return this.state.atWarWith.includes(countryId);
  }

  isAlliedWith(countryId: string): boolean {
    return this.state.alliances.includes(countryId);
  }

  canDeclareWar(targetId: string): boolean {
    if (this.isAtWarWith(targetId)) return false;
    if (this.isAlliedWith(targetId)) return false;
    const relation = this.getRelation(targetId);
    return relation <= -60;
  }

  canFormAlliance(targetId: string): boolean {
    if (this.isAlliedWith(targetId)) return false;
    if (this.isAtWarWith(targetId)) return false;
    const relation = this.getRelation(targetId);
    return relation >= 60;
  }

  getStability(): number {
    return this.state.stability;
  }

  isCollapsed(): boolean {
    return this.state.stability <= 0;
  }

  getRegimeType(): RegimeType {
    return this.state.regimeType;
  }

  getLegitimacy(): number {
    return this.state.legitimacy;
  }

  getIntelLevel(): number {
    return this.state.intelLevel;
  }

  getGoals(): Goal[] {
    return structuredClone(this.state.goals);
  }

  getRiskTolerance(): number {
    return this.state.riskTolerance;
  }

  getMobilizationLevel(): number {
    return this.state.mobilizationLevel;
  }

  setState(newState: CountryState): void {
    const validated = CountryStateSchema.parse(newState);
    this.state = validated;
  }

  applyRelationDelta(countryId: string, delta: number): CountryState {
    const newRelations = { ...this.state.relations };
    const current = newRelations[countryId] ?? 0;
    newRelations[countryId] = Math.max(-100, Math.min(100, current + delta));

    return {
      ...this.state,
      relations: newRelations,
    };
  }

  applyStabilityDelta(delta: number): CountryState {
    const newStability = Math.max(0, Math.min(100, this.state.stability + delta));
    return {
      ...this.state,
      stability: newStability,
    };
  }

  applyGdpGrowth(): CountryState {
    const growthFactor = 1 + this.state.growthRate;
    const newGdp = this.state.gdp * growthFactor;
    return {
      ...this.state,
      gdp: newGdp,
    };
  }

  applyWarAttrition(casualtyPercent: number): CountryState {
    const manpowerLoss = Math.floor(this.state.manpower * casualtyPercent);
    const stabilityLoss = 5;
    const gdpPenalty = 0.02;

    return {
      ...this.state,
      manpower: Math.max(0, this.state.manpower - manpowerLoss),
      stability: Math.max(0, this.state.stability - stabilityLoss),
      gdp: this.state.gdp * (1 - gdpPenalty),
    };
  }

  declareWar(targetId: string): CountryState {
    if (!this.canDeclareWar(targetId)) {
      throw new Error(`Cannot declare war on ${targetId}`);
    }

    return {
      ...this.state,
      atWarWith: [...this.state.atWarWith, targetId],
      relations: {
        ...this.state.relations,
        [targetId]: -100,
      },
    };
  }

  formAlliance(targetId: string): CountryState {
    if (!this.canFormAlliance(targetId)) {
      throw new Error(`Cannot form alliance with ${targetId}`);
    }

    return {
      ...this.state,
      alliances: [...this.state.alliances, targetId],
    };
  }

  breakAlliance(targetId: string): CountryState {
    if (!this.isAlliedWith(targetId)) {
      throw new Error(`Not allied with ${targetId}`);
    }

    const newRelations = { ...this.state.relations };
    newRelations[targetId] = Math.max(-100, (newRelations[targetId] ?? 0) - 30);

    return {
      ...this.state,
      alliances: this.state.alliances.filter((a) => a !== targetId),
      relations: newRelations,
    };
  }

  endWar(targetId: string): CountryState {
    if (!this.isAtWarWith(targetId)) {
      throw new Error(`Not at war with ${targetId}`);
    }

    const newRelations = { ...this.state.relations };
    newRelations[targetId] = -20;

    return {
      ...this.state,
      atWarWith: this.state.atWarWith.filter((w) => w !== targetId),
      relations: newRelations,
    };
  }

  mobilize(level: number): CountryState {
    const newLevel = Math.max(0, Math.min(100, level));
    return {
      ...this.state,
      mobilizationLevel: newLevel,
    };
  }

  adjustMilitaryBudget(percent: number): CountryState {
    const newPercent = Math.max(0, Math.min(20, percent));
    return {
      ...this.state,
      militaryBudgetPercent: newPercent,
    };
  }

  toJSON(): CountryState {
    return this.getState();
  }

  static fromJSON(json: CountryState): Country {
    return new Country(json);
  }

  static validate(state: unknown): CountryState {
    return CountryStateSchema.parse(state);
  }
}
