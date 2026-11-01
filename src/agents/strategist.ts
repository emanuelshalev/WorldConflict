import { z } from "zod";
import {
  type Action,
  ActionSchema,
  type CountryIntent,
  type CountryState,
  relationToLevel,
  type WorldState,
} from "../core/types.js";
import { generateDeterministicIntents } from "./fallback.js";
import { createLLMClient, type LLMClient } from "./llmClient.js";
import {
  DEFAULT_MODELS,
  emptyUsage,
  type LLMProvider,
  type ModelPrice,
  UsageMeter,
  type UsageTotals,
} from "./usage.js";

/**
 * AI tiers (player's choice):
 *  - ALGORITHMIC:   PersonalityAI for every country. Free, offline, reproducible.
 *  - KEY_DECISIONS: PersonalityAI every turn; an LLM leader reviews only the
 *                   high-stakes moves (war, nukes, coups, ceasefires) and the
 *                   countries fighting the player.
 *  - FULL_LLM:      the most relevant countries each turn are led by an LLM.
 *
 * LLM output is only ever a proposed CountryIntent: it is validated here and
 * resolved by the deterministic engine like any other intent. Any failure,
 * timeout or budget overrun silently falls back to the algorithmic intent.
 */
export const AITierSchema = z.enum(["ALGORITHMIC", "KEY_DECISIONS", "FULL_LLM"]);
export type AITier = z.infer<typeof AITierSchema>;

export const AIConfigSchema = z.object({
  tier: AITierSchema.default("ALGORITHMIC"),
  provider: z.enum(["openai", "gemini", "anthropic", "ollama", "local"]).optional(),
  apiKey: z.string().optional(),
  model: z.string().optional(),
  baseUrl: z.string().optional(),
  maxCallsPerTurn: z.number().min(0).max(25).optional(),
  budgetUsd: z.number().min(0).optional(), // session spending cap; 0/undefined = no cap
  price: z.object({ input: z.number(), output: z.number() }).optional(),
});
export type AIConfig = z.infer<typeof AIConfigSchema>;

export interface LeaderStatement {
  countryId: string;
  leader: string;
  text: string;
}

export interface StrategistResult {
  intents: CountryIntent[];
  usage: UsageTotals;
  statements: LeaderStatement[];
  llmCountries: string[];
  notice?: string; // e.g. "Budget cap reached, algorithmic AI this turn"
}

const HIGH_STAKES: Action["type"][] = [
  "DIPLOMACY_DECLARE_WAR",
  "DIPLOMACY_PROPOSE_CEASEFIRE",
  "DIPLOMACY_BREAK_ALLIANCE",
  "NUCLEAR_STRIKE",
  "NUCLEAR_FUND_PROGRAM",
  "MILITARY_AIRSTRIKE",
  "INTEL_COUP",
  "INTEL_ASSASSINATE",
];

const ACTION_GUIDE: Record<string, string> = {
  DIPLOMACY_IMPROVE_RELATIONS: "warm relations with target",
  DIPLOMACY_DENOUNCE: "publicly condemn target",
  DIPLOMACY_PROPOSE_ALLIANCE: "offer a mutual-defense pact to target",
  DIPLOMACY_BREAK_ALLIANCE: "end pact with target",
  DIPLOMACY_DECLARE_WAR: "invade target (huge consequences)",
  DIPLOMACY_PROPOSE_CEASEFIRE: "offer ceasefire to a country you are at war with",
  MILITARY_MOBILIZE: "raise readiness",
  MILITARY_DEMOBILIZE: "lower readiness",
  MILITARY_DEPLOY_BORDER: "mass troops on target's border",
  MILITARY_WITHDRAW_BORDER: "pull troops back from target's border",
  MILITARY_AIRSTRIKE:
    "strike target; params.targetType MILITARY|INDUSTRIAL|NUCLEAR (two hits cripple a developing nuclear program)",
  NUCLEAR_FUND_PROGRAM: "advance own nuclear program",
  NUCLEAR_STRIKE: "nuclear attack on a wartime enemy (risks global holocaust)",
  INTEL_GATHER: "spy on target",
  INTEL_DESTABILIZE: "covertly weaken target's government",
  INTEL_SUPPORT_REBELS: "arm target's insurgents",
  INTEL_SABOTAGE: "sabotage target's economy/military",
  INTEL_MISINFORMATION: "corrupt target's intelligence picture",
  INTEL_COUNTER_INTEL: "harden own security services",
  DOMESTIC_PROPAGANDA: "rally domestic opinion",
  DOMESTIC_REFORM: "reforms: stability and legitimacy",
  DOMESTIC_POLICING: "params.tactic SOFT|HARD against insurgency",
};

const LLMDecisionSchema = z.object({
  actions: z.array(z.unknown()).default([]),
  statement: z.string().optional(),
  reasoning: z.string().optional(),
});

export interface PlanOptions {
  sessionSpentUsd?: number;
  client?: LLMClient; // injectable for tests
  timeoutMs?: number;
}

export async function planTurn(
  world: WorldState,
  config: AIConfig | undefined,
  options: PlanOptions = {},
): Promise<StrategistResult> {
  const baseline = generateDeterministicIntents(world);
  if (!config || config.tier === "ALGORITHMIC" || !config.provider) {
    return { intents: baseline, usage: emptyUsage(), statements: [], llmCountries: [] };
  }

  const provider = config.provider as LLMProvider;
  const model = config.model || DEFAULT_MODELS[provider];
  const meter = new UsageMeter(provider, model, config.price as ModelPrice | undefined);
  const client =
    options.client ??
    createLLMClient(provider, {
      apiKey: config.apiKey,
      model,
      baseUrl: config.baseUrl,
      maxTokens: 700,
      timeout: options.timeoutMs ?? 25000,
    });

  const picks = pickCountries(world, baseline, config);
  const budget = config.budgetUsd ?? 0;
  if (budget > 0 && (options.sessionSpentUsd ?? 0) >= budget) {
    for (const _ of picks) meter.recordFallback();
    return {
      intents: baseline,
      usage: meter.turn,
      statements: [],
      llmCountries: [],
      notice: `LLM budget cap ($${budget.toFixed(2)}) reached, algorithmic AI this turn`,
    };
  }

  const statements: LeaderStatement[] = [];
  const llmCountries: string[] = [];
  const byId = new Map(baseline.map((i) => [i.countryId, i]));

  await Promise.all(
    picks.map(async (countryId) => {
      const country = world.countries.find((c) => c.id === countryId);
      const proposal = byId.get(countryId);
      if (!country || !proposal) return;
      try {
        const response = await withTimeout(
          client.chat(buildMessages(world, country, proposal, config.tier)),
          options.timeoutMs ?? 25000,
        );
        meter.record(
          "country-ai",
          response.usage?.promptTokens ?? estimateTokens(JSON.stringify(proposal)) + 900,
          response.usage?.completionTokens ?? estimateTokens(response.content),
        );
        const decision = parseDecision(response.content, world, country);
        if (!decision) {
          meter.recordFallback();
          return;
        }
        byId.set(countryId, {
          countryId,
          actions: decision.actions,
          reasoning: decision.reasoning ?? "LLM leader decision",
        });
        llmCountries.push(countryId);
        if (decision.statement) {
          statements.push({
            countryId,
            leader: `${country.leader.title} ${country.leader.name}`,
            text: decision.statement.slice(0, 280),
          });
        }
      } catch {
        meter.recordFallback();
      }
    }),
  );

  // Preserve the deterministic ordering of intents
  return {
    intents: baseline.map((i) => byId.get(i.countryId) ?? i),
    usage: meter.turn,
    statements: statements.sort((a, b) => a.countryId.localeCompare(b.countryId)),
    llmCountries: llmCountries.sort(),
  };
}

// ----------------------------------------------------------------------
export function pickCountries(
  world: WorldState,
  baseline: CountryIntent[],
  config: AIConfig,
): string[] {
  const player = world.countries.find((c) => c.id === world.playerCountryId);
  const maxCalls = config.maxCallsPerTurn ?? (config.tier === "FULL_LLM" ? 6 : 3);
  const score = new Map<string, number>();
  for (const intent of baseline) {
    const c = world.countries.find((x) => x.id === intent.countryId);
    if (!c || c.collapsed) continue;
    let s = 0;
    if (intent.actions.some((a) => HIGH_STAKES.includes(a.type))) s += 100;
    if (player?.atWarWith.includes(c.id)) s += 80;
    if (config.tier === "FULL_LLM") {
      if (player?.history.historicalRivals.includes(c.id)) s += 40;
      if (c.atWarWith.length > 0) s += 30;
      s += Math.min(30, Math.log10(Math.max(1, c.gdp)) * 2); // great powers matter
      s += Math.max(0, -(player?.relations[c.id] ?? 0)) / 5;
    }
    if (config.tier === "KEY_DECISIONS" && s < 80) continue;
    score.set(c.id, s);
  }
  return [...score.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, maxCalls)
    .map(([id]) => id);
}

function buildMessages(
  world: WorldState,
  country: CountryState,
  proposal: CountryIntent,
  tier: AITier,
) {
  const name = (id: string) => world.countries.find((c) => c.id === id)?.name ?? id;
  const p = country.personality;
  const relations = Object.entries(country.relations)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .slice(0, 10)
    .map(([id, v]) => {
      const lvl = relationToLevel(
        v,
        country.atWarWith.includes(id),
        country.alliances.includes(id),
      );
      const b = country.beliefs[id];
      const intel = b
        ? `; believed strength ${Math.round(b.militaryStrength)}, stability ~${Math.round(b.stability)}%, nuclear progress ~${Math.round(b.nuclearProgress)}% (confidence ${Math.round(b.accuracy)}%)`
        : "";
      return `- ${id} ${name(id)}: ${lvl} (${Math.round(v)})${intel}`;
    })
    .join("\n");
  const headlines = world.newspaper
    .slice(0, 6)
    .map((n) => `- ${n.headline}`)
    .join("\n");
  const allowed = Object.entries(ACTION_GUIDE)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");

  const system = `You are ${country.leader.title} ${country.leader.name} of ${country.name} (${country.regimeType.toLowerCase()}, leadership style ${country.leader.style.toLowerCase()}). Decide your country's moves for this month in a geopolitical strategy game. Stay true to your nation's history and interests: ${country.history.narrative ?? ""}
Personality (0-100): war propensity ${p.warPropensity}, risk tolerance ${p.riskTolerance}, diplomatic flexibility ${p.diplomaticFlexibility}, alliance loyalty ${p.allianceLoyalty}, expansionism ${p.expansionism}.
Red lines: ${country.redLines.map((r) => r.description).join("; ") || "none"}.
You only know what your intelligence services believe; act on that. Be decisive but plausible, real leaders rarely take reckless gambles.
Reply with ONLY a JSON object: {"actions":[{"type":"ACTION_TYPE","targetCountryId":"ISO3","params":{}}],"statement":"one short public statement in your voice","reasoning":"one sentence"}. At most 3 actions; an empty list is allowed.`;

  const user = `Date ${world.date}. Global tension ${Math.round(world.globalTension)}/100.
Your state: stability ${Math.round(country.stability)}%, approval ${Math.round(country.approval)}%, legitimacy ${Math.round(country.legitimacy)}%, GDP $${(country.gdp / 1e9).toFixed(0)}B, mobilization ${Math.round(country.mobilizationLevel)}%, nuclear ${country.nuclear.status}${country.insurgencyLevel !== "NONE" ? `, insurgency ${country.insurgencyLevel}` : ""}.
At war with: ${country.atWarWith.map(name).join(", ") || "nobody"}. Allies: ${country.alliances.map(name).join(", ") || "none"}.
Key relations (-100..100) and intelligence estimates:
${relations}
Last month's headlines:
${headlines || "- (quiet month)"}
Your advisors propose: ${JSON.stringify(proposal.actions)}${tier === "KEY_DECISIONS" ? "\nThis is a high-stakes moment. Approve, modify or overrule your advisors." : ""}
Allowed action types:
${allowed}`;

  return [
    { role: "system" as const, content: system },
    { role: "user" as const, content: user },
  ];
}

export function parseDecision(
  content: string,
  world: WorldState,
  country: CountryState,
): { actions: Action[]; statement?: string; reasoning?: string } | null {
  const match = content.match(/\{[\s\S]*\}/);
  if (!match) return null;
  let raw: unknown;
  try {
    raw = JSON.parse(match[0]);
  } catch {
    return null;
  }
  const parsed = LLMDecisionSchema.safeParse(raw);
  if (!parsed.success) return null;
  const actions: Action[] = [];
  for (const candidate of parsed.data.actions) {
    const action = ActionSchema.safeParse(candidate);
    if (!action.success) continue;
    const a = action.data;
    if (!(a.type in ACTION_GUIDE)) continue;
    if (a.targetCountryId) {
      if (a.targetCountryId === country.id) continue;
      if (!world.countries.some((c) => c.id === a.targetCountryId && !c.collapsed)) continue;
    }
    actions.push(a);
    if (actions.length === 3) break;
  }
  return { actions, statement: parsed.data.statement, reasoning: parsed.data.reasoning };
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("LLM timeout")), ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}
