import { z } from "zod";
import { ActionTypeSchema } from "../core/types.js";

export const AgentActionSchema = z.object({
  type: ActionTypeSchema,
  targetCountryId: z.string().optional(),
  value: z.number().optional(),
  reasoning: z.string().optional(),
});

export const CountryIntentResponseSchema = z.object({
  countryId: z.string(),
  actions: z.array(AgentActionSchema),
  reasoning: z.string().optional(),
  priorities: z
    .array(
      z.object({
        goal: z.string(),
        urgency: z.number().min(0).max(100),
      }),
    )
    .optional(),
});

export const AdvisorResponseSchema = z.object({
  role: z.enum([
    "FOREIGN_MINISTER",
    "DEFENSE_MINISTER",
    "FINANCE_MINISTER",
    "INTELLIGENCE_CHIEF",
    "DOMESTIC_ADVISOR",
    "CHIEF_OF_STAFF",
  ]),
  analysis: z.string(),
  recommendations: z.array(
    z.object({
      action: AgentActionSchema,
      rationale: z.string(),
      riskLevel: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
      expectedOutcome: z.string(),
    }),
  ),
  warnings: z.array(z.string()).optional(),
  opportunities: z.array(z.string()).optional(),
});

export const HeadlineResponseSchema = z.object({
  headline: z.string(),
  subheadline: z.string().optional(),
  tone: z.enum(["NEUTRAL", "POSITIVE", "NEGATIVE", "ALARMING", "HOPEFUL"]),
  relatedCountries: z.array(z.string()),
  category: z.enum(["WAR", "DIPLOMACY", "ECONOMY", "DOMESTIC", "INTERNATIONAL"]),
});

export const LeadershipNarrativeSchema = z.object({
  introduction: z.string(),
  challenges: z.array(z.string()),
  opportunities: z.array(z.string()),
  advisorBriefing: z.string(),
  initialPriorities: z.array(z.string()),
});

export const CountryAnalysisSchema = z.object({
  countryId: z.string(),
  threatLevel: z.enum(["NONE", "LOW", "MODERATE", "HIGH", "CRITICAL"]),
  relationshipTrend: z.enum(["IMPROVING", "STABLE", "DETERIORATING", "HOSTILE"]),
  keyInterests: z.array(z.string()),
  potentialActions: z.array(z.string()),
  recommendedResponse: z.string().optional(),
});

export type AgentAction = z.infer<typeof AgentActionSchema>;
export type CountryIntentResponse = z.infer<typeof CountryIntentResponseSchema>;
export type AdvisorResponse = z.infer<typeof AdvisorResponseSchema>;
export type HeadlineResponse = z.infer<typeof HeadlineResponseSchema>;
export type LeadershipNarrative = z.infer<typeof LeadershipNarrativeSchema>;
export type CountryAnalysis = z.infer<typeof CountryAnalysisSchema>;
export type AdvisorRole = AdvisorResponse["role"];

export const ADVISOR_ROLES: AdvisorRole[] = [
  "FOREIGN_MINISTER",
  "DEFENSE_MINISTER",
  "FINANCE_MINISTER",
  "INTELLIGENCE_CHIEF",
  "DOMESTIC_ADVISOR",
  "CHIEF_OF_STAFF",
];

export const ADVISOR_DESCRIPTIONS: Record<AdvisorRole, string> = {
  FOREIGN_MINISTER: "Handles diplomatic relations, alliances, and international negotiations",
  DEFENSE_MINISTER: "Oversees military strategy, mobilization, and defense planning",
  FINANCE_MINISTER: "Manages economic policy, military budget, and fiscal strategy",
  INTELLIGENCE_CHIEF: "Provides intelligence analysis and covert operation recommendations",
  DOMESTIC_ADVISOR: "Focuses on internal stability, legitimacy, and domestic reforms",
  CHIEF_OF_STAFF: "Coordinates overall strategy and provides holistic recommendations",
};
