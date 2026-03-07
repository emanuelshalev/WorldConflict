import type { CountryState, WorldState } from "../core/types.js";
import type { LLMClient } from "./llmClient.js";
import {
  type AdvisorPromptContext,
  generateAdvisorSystemPrompt,
  generateAdvisorUserPrompt,
} from "./prompts/advisor.js";
import { type AdvisorResponse, AdvisorResponseSchema, type AdvisorRole } from "./schemas.js";

export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AdvisorSession {
  advisorRole: AdvisorRole;
  countryId: string;
  history: ConversationMessage[];
  createdAt: Date;
  lastMessageAt: Date;
}

export class AdvisorAgent {
  private llmClient: LLMClient;
  private sessions: Map<string, AdvisorSession> = new Map();
  private maxRetries: number;

  constructor(llmClient: LLMClient, maxRetries = 3) {
    this.llmClient = llmClient;
    this.maxRetries = maxRetries;
  }

  private getSessionKey(countryId: string, role: AdvisorRole): string {
    return `${countryId}:${role}`;
  }

  getOrCreateSession(countryId: string, role: AdvisorRole): AdvisorSession {
    const key = this.getSessionKey(countryId, role);
    let session = this.sessions.get(key);

    if (!session) {
      session = {
        advisorRole: role,
        countryId,
        history: [],
        createdAt: new Date(),
        lastMessageAt: new Date(),
      };
      this.sessions.set(key, session);
    }

    return session;
  }

  clearSession(countryId: string, role: AdvisorRole): void {
    const key = this.getSessionKey(countryId, role);
    this.sessions.delete(key);
  }

  clearAllSessions(countryId: string): void {
    for (const key of this.sessions.keys()) {
      if (key.startsWith(`${countryId}:`)) {
        this.sessions.delete(key);
      }
    }
  }

  async chat(
    role: AdvisorRole,
    playerCountry: CountryState,
    world: WorldState,
    userMessage?: string,
  ): Promise<AdvisorResponse> {
    const session = this.getOrCreateSession(playerCountry.id, role);

    if (userMessage) {
      session.history.push({ role: "user", content: userMessage });
    }

    const context: AdvisorPromptContext = {
      role,
      playerCountry,
      world,
      userQuestion: userMessage,
      conversationHistory: session.history.slice(-6),
    };

    const systemPrompt = generateAdvisorSystemPrompt(role, playerCountry);
    const userPrompt = generateAdvisorUserPrompt(context);

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const response = await this.llmClient.chatWithSchema<AdvisorResponse>(
          [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          AdvisorResponseSchema,
        );

        session.history.push({
          role: "assistant",
          content: JSON.stringify(response),
        });
        session.lastMessageAt = new Date();

        return response;
      } catch (error) {
        console.error(`Advisor chat attempt ${attempt + 1} failed:`, error);

        if (attempt === this.maxRetries - 1) {
          return this.generateFallbackResponse(role, playerCountry, world);
        }
      }
    }

    return this.generateFallbackResponse(role, playerCountry, world);
  }

  async getInitialBriefing(
    role: AdvisorRole,
    playerCountry: CountryState,
    world: WorldState,
  ): Promise<AdvisorResponse> {
    this.clearSession(playerCountry.id, role);
    return this.chat(role, playerCountry, world);
  }

  private generateFallbackResponse(
    role: AdvisorRole,
    country: CountryState,
    world: WorldState,
  ): AdvisorResponse {
    const fallbackResponses: Record<AdvisorRole, () => AdvisorResponse> = {
      FOREIGN_MINISTER: () => this.foreignMinisterFallback(country, world),
      DEFENSE_MINISTER: () => this.defenseMinisterFallback(country, world),
      FINANCE_MINISTER: () => this.financeMinisterFallback(country),
      INTELLIGENCE_CHIEF: () => this.intelligenceChiefFallback(country, world),
      DOMESTIC_ADVISOR: () => this.domesticAdvisorFallback(country),
      CHIEF_OF_STAFF: () => this.chiefOfStaffFallback(country, world),
    };

    return fallbackResponses[role]();
  }

  private foreignMinisterFallback(country: CountryState, world: WorldState): AdvisorResponse {
    const recommendations: AdvisorResponse["recommendations"] = [];
    const warnings: string[] = [];
    const opportunities: string[] = [];

    const hostileCountries = Object.entries(country.relations)
      .filter(([_, v]) => v < -50)
      .map(([id]) => id);

    if (hostileCountries.length > 0) {
      warnings.push(`Hostile relations with: ${hostileCountries.join(", ")}`);
    }

    const potentialAllies = Object.entries(country.relations)
      .filter(([id, v]) => v >= 40 && v < 60 && !country.alliances.includes(id))
      .slice(0, 2);

    for (const [allyId] of potentialAllies) {
      recommendations.push({
        action: { type: "DIPLOMACY_IMPROVE_RELATIONS", targetCountryId: allyId },
        rationale: `Improving relations with ${allyId} could lead to alliance`,
        riskLevel: "LOW",
        expectedOutcome: "Relations improve by +5",
      });
      opportunities.push(`Potential alliance with ${allyId}`);
    }

    return {
      role: "FOREIGN_MINISTER",
      analysis: `Current diplomatic situation: ${country.alliances.length} allies, ${hostileCountries.length} hostile nations. Global tension at ${world.globalTension}%.`,
      recommendations,
      warnings: warnings.length > 0 ? warnings : undefined,
      opportunities: opportunities.length > 0 ? opportunities : undefined,
    };
  }

  private defenseMinisterFallback(country: CountryState, world: WorldState): AdvisorResponse {
    const recommendations: AdvisorResponse["recommendations"] = [];
    const warnings: string[] = [];

    if (country.atWarWith.length > 0) {
      warnings.push(`Active conflicts: ${country.atWarWith.join(", ")}`);

      if (country.mobilizationLevel < 70) {
        recommendations.push({
          action: { type: "MILITARY_MOBILIZE" },
          rationale: "Increase military readiness during wartime",
          riskLevel: "MEDIUM",
          expectedOutcome: "Mobilization increases, stability may decrease",
        });
      }
    } else if (country.mobilizationLevel > 40) {
      recommendations.push({
        action: { type: "MILITARY_DEMOBILIZE" },
        rationale: "Reduce peacetime military burden",
        riskLevel: "LOW",
        expectedOutcome: "Reduced costs, improved stability",
      });
    }

    const threats = world.countries.filter(
      (c) => c.id !== country.id && (country.relations[c.id] ?? 0) < -60,
    );

    if (threats.length > 0) {
      warnings.push(`Potential military threats: ${threats.map((t) => t.id).join(", ")}`);
    }

    return {
      role: "DEFENSE_MINISTER",
      analysis: `Military status: ${country.manpower.toLocaleString()} personnel, ${country.mobilizationLevel}% mobilized. ${country.atWarWith.length > 0 ? "WARTIME" : "Peacetime"} posture.`,
      recommendations,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  private financeMinisterFallback(country: CountryState): AdvisorResponse {
    const recommendations: AdvisorResponse["recommendations"] = [];
    const warnings: string[] = [];

    if (country.growthRate < 0) {
      warnings.push("Economy in recession");
    }

    if (country.debtGdpRatio > 1.0) {
      warnings.push("High debt levels affecting growth");
    }

    if (country.militaryBudgetPercent > 8) {
      recommendations.push({
        action: {
          type: "ECONOMY_ADJUST_MILITARY_BUDGET",
          value: country.militaryBudgetPercent - 1,
        },
        rationale: "High military spending is straining the economy",
        riskLevel: "LOW",
        expectedOutcome: "Improved economic growth",
      });
    }

    return {
      role: "FINANCE_MINISTER",
      analysis: `Economic overview: GDP $${(country.gdp / 1e12).toFixed(2)}T, growth ${(country.growthRate * 100).toFixed(1)}%, military budget ${country.militaryBudgetPercent}% of GDP.`,
      recommendations,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  private intelligenceChiefFallback(country: CountryState, world: WorldState): AdvisorResponse {
    const warnings: string[] = [];

    const hostileNations = world.countries.filter(
      (c) => c.id !== country.id && (country.relations[c.id] ?? 0) < -50,
    );

    for (const hostile of hostileNations.slice(0, 3)) {
      if (hostile.mobilizationLevel > 50) {
        warnings.push(
          `${hostile.id} has elevated military readiness (${hostile.mobilizationLevel}%)`,
        );
      }
      if (hostile.stability < 30) {
        warnings.push(`${hostile.id} is unstable - may act unpredictably`);
      }
    }

    return {
      role: "INTELLIGENCE_CHIEF",
      analysis: `Intelligence assessment: Monitoring ${hostileNations.length} potentially hostile nations. Our intel capability: ${country.intelLevel}%.`,
      recommendations: [],
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  private domesticAdvisorFallback(country: CountryState): AdvisorResponse {
    const recommendations: AdvisorResponse["recommendations"] = [];
    const warnings: string[] = [];

    if (country.stability < 40) {
      warnings.push("CRITICAL: Stability dangerously low");
      recommendations.push({
        action: { type: "DOMESTIC_REFORM" },
        rationale: "Urgent reforms needed to prevent collapse",
        riskLevel: "HIGH",
        expectedOutcome: "Stability improves significantly",
      });
    } else if (country.legitimacy < 50) {
      recommendations.push({
        action: { type: "DOMESTIC_PROPAGANDA" },
        rationale: "Boost government legitimacy",
        riskLevel: "LOW",
        expectedOutcome: "Legitimacy and stability improve",
      });
    }

    if (country.atWarWith.length > 0) {
      warnings.push("War is straining domestic stability");
    }

    return {
      role: "DOMESTIC_ADVISOR",
      analysis: `Domestic situation: Stability ${country.stability}%, Legitimacy ${country.legitimacy}%. ${country.stability < 50 ? "Concerning trends observed." : "Situation manageable."}`,
      recommendations,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  private chiefOfStaffFallback(country: CountryState, world: WorldState): AdvisorResponse {
    const recommendations: AdvisorResponse["recommendations"] = [];
    const warnings: string[] = [];
    const opportunities: string[] = [];

    if (country.stability < 50) {
      warnings.push("Internal stability should be priority");
      recommendations.push({
        action: { type: "DOMESTIC_REFORM" },
        rationale: "Stabilize before external adventures",
        riskLevel: "MEDIUM",
        expectedOutcome: "Improved foundation for all policies",
      });
    }

    if (country.atWarWith.length > 0) {
      warnings.push("Active conflicts require focused attention");
    } else if (country.alliances.length < 2) {
      opportunities.push("Opportunity to build alliance network");
    }

    return {
      role: "CHIEF_OF_STAFF",
      analysis: `Strategic overview: ${country.atWarWith.length > 0 ? "Wartime" : "Peacetime"} posture. Stability ${country.stability}%, ${country.alliances.length} allies. Global tension ${world.globalTension}%.`,
      recommendations,
      warnings: warnings.length > 0 ? warnings : undefined,
      opportunities: opportunities.length > 0 ? opportunities : undefined,
    };
  }
}
