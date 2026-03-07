import type { CountryState, WorldState } from "../../core/types.js";
import type { AdvisorRole } from "../schemas.js";

export interface AdvisorPromptContext {
  role: AdvisorRole;
  playerCountry: CountryState;
  world: WorldState;
  userQuestion?: string;
  conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>;
}

export function generateAdvisorSystemPrompt(role: AdvisorRole, country: CountryState): string {
  const roleDescriptions: Record<AdvisorRole, string> = {
    FOREIGN_MINISTER: `You are the Foreign Minister of ${country.name}. You are an expert in international relations, diplomacy, and geopolitics. You advise on:
- Bilateral and multilateral relations
- Alliance management and formation
- Diplomatic initiatives and negotiations
- International treaties and agreements
- Regional and global power dynamics

You speak with diplomatic precision and always consider the international implications of actions.`,

    DEFENSE_MINISTER: `You are the Defense Minister of ${country.name}. You are an expert in military strategy, defense policy, and national security. You advise on:
- Military readiness and mobilization
- War strategy and conflict management
- Defense spending and procurement
- Military alliances and cooperation
- Threat assessment and deterrence

You speak with military directness and focus on security implications.`,

    FINANCE_MINISTER: `You are the Finance Minister of ${country.name}. You are an expert in economics, fiscal policy, and resource management. You advise on:
- Economic growth and stability
- Military budget allocation
- Trade policy and sanctions
- Debt management and fiscal sustainability
- Economic warfare and leverage

You speak with analytical precision and always consider the economic costs and benefits.`,

    INTELLIGENCE_CHIEF: `You are the Intelligence Chief of ${country.name}. You are an expert in intelligence analysis, covert operations, and threat assessment. You advise on:
- Foreign government intentions and capabilities
- Hidden threats and opportunities
- Covert action recommendations
- Counter-intelligence concerns
- Information warfare

You speak carefully, often noting uncertainty levels and intelligence gaps.`,

    DOMESTIC_ADVISOR: `You are the Domestic Policy Advisor of ${country.name}. You are an expert in internal politics, public opinion, and governance. You advise on:
- Political stability and legitimacy
- Public support and propaganda
- Internal reforms and policies
- Regime security and opposition
- Social and economic welfare

You speak with awareness of domestic political constraints and public sentiment.`,

    CHIEF_OF_STAFF: `You are the Chief of Staff of ${country.name}. You coordinate all aspects of national strategy and provide holistic advice. You advise on:
- Overall strategic direction
- Balancing competing priorities
- Risk assessment across all domains
- Long-term planning and vision
- Crisis management and coordination

You speak with broad perspective, synthesizing inputs from all other advisors.`,
  };

  return `${roleDescriptions[role]}

Current National Situation:
- Regime: ${country.regimeType}
- Stability: ${country.stability}/100 ${country.stability < 40 ? "(CRITICAL)" : country.stability < 60 ? "(concerning)" : ""}
- Legitimacy: ${country.legitimacy}/100
- GDP: $${(country.gdp / 1e12).toFixed(2)} trillion (growth: ${(country.growthRate * 100).toFixed(1)}%)
- Military: ${country.manpower.toLocaleString()} personnel, ${country.airpower} aircraft
- Mobilization: ${country.mobilizationLevel}%
- Military Budget: ${country.militaryBudgetPercent}% of GDP
- At War: ${country.atWarWith.length > 0 ? country.atWarWith.join(", ") : "No active conflicts"}
- Allies: ${country.alliances.length > 0 ? country.alliances.join(", ") : "No formal alliances"}

You must provide analysis and recommendations in your area of expertise. Be specific, actionable, and consider both risks and opportunities. Always respond with a JSON object containing your analysis and recommendations.`;
}

export function generateAdvisorUserPrompt(context: AdvisorPromptContext): string {
  const { role, playerCountry, world, userQuestion, conversationHistory } = context;

  let prompt = `Turn ${world.turn} - ${world.date}\nGlobal Tension: ${world.globalTension}/100\n\n`;

  if (role === "FOREIGN_MINISTER" || role === "CHIEF_OF_STAFF") {
    const keyRelations = Object.entries(playerCountry.relations)
      .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
      .slice(0, 8)
      .map(([id, value]) => {
        const otherCountry = world.countries.find((c) => c.id === id);
        return `${id} (${otherCountry?.name ?? id}): ${value > 0 ? "+" : ""}${value}`;
      })
      .join("\n");
    prompt += `Key Relations:\n${keyRelations}\n\n`;
  }

  if (role === "DEFENSE_MINISTER" || role === "CHIEF_OF_STAFF") {
    const activeWars = world.wars.filter(
      (w) => w.attackerId === playerCountry.id || w.defenderId === playerCountry.id,
    );
    if (activeWars.length > 0) {
      prompt += "Active Conflicts:\n";
      for (const war of activeWars) {
        const isAttacker = war.attackerId === playerCountry.id;
        const enemy = isAttacker ? war.defenderId : war.attackerId;
        prompt += `- War with ${enemy}: ${isAttacker ? war.attackerProgress : war.defenderProgress}% progress\n`;
      }
      prompt += "\n";
    }

    const threats = world.countries
      .filter((c) => c.id !== playerCountry.id && (playerCountry.relations[c.id] ?? 0) < -40)
      .map(
        (c) =>
          `${c.id}: ${c.manpower.toLocaleString()} troops, relation ${playerCountry.relations[c.id]}`,
      )
      .slice(0, 5);
    if (threats.length > 0) {
      prompt += `Potential Threats:\n${threats.join("\n")}\n\n`;
    }
  }

  if (role === "FINANCE_MINISTER") {
    const militaryBudget = playerCountry.gdp * (playerCountry.militaryBudgetPercent / 100);
    prompt += `Economic Overview:
- GDP: $${(playerCountry.gdp / 1e12).toFixed(2)}T
- Growth Rate: ${(playerCountry.growthRate * 100).toFixed(1)}%
- Debt/GDP: ${(playerCountry.debtGdpRatio * 100).toFixed(0)}%
- Military Budget: $${(militaryBudget / 1e9).toFixed(0)}B (${playerCountry.militaryBudgetPercent}% of GDP)
\n`;
  }

  if (role === "INTELLIGENCE_CHIEF") {
    prompt += `Intelligence Assessment (confidence varies):\n`;
    const hostileCountries = world.countries
      .filter((c) => c.id !== playerCountry.id && (playerCountry.relations[c.id] ?? 0) < -30)
      .slice(0, 5);
    for (const hostile of hostileCountries) {
      const intelAccuracy = playerCountry.intelLevel / 100;
      const stabilityEstimate = Math.round(
        hostile.stability + (Math.random() - 0.5) * 20 * (1 - intelAccuracy),
      );
      prompt += `- ${hostile.id}: Est. stability ${stabilityEstimate}, mobilization ~${hostile.mobilizationLevel}%\n`;
    }
    prompt += "\n";
  }

  if (role === "DOMESTIC_ADVISOR") {
    prompt += `Domestic Situation:
- Stability: ${playerCountry.stability}/100
- Legitimacy: ${playerCountry.legitimacy}/100
- Regime Type: ${playerCountry.regimeType}
- War Weariness: ${playerCountry.atWarWith.length > 0 ? "Active conflicts affecting stability" : "No war burden"}
\n`;
  }

  if (conversationHistory && conversationHistory.length > 0) {
    prompt += "Previous conversation:\n";
    for (const msg of conversationHistory.slice(-4)) {
      prompt += `${msg.role === "user" ? "Leader" : "You"}: ${msg.content}\n`;
    }
    prompt += "\n";
  }

  if (userQuestion) {
    prompt += `The leader asks: "${userQuestion}"\n\n`;
  } else {
    prompt += `Provide your assessment and recommendations for this turn.\n\n`;
  }

  prompt += `Respond with JSON:
{
  "role": "${role}",
  "analysis": "your analysis of the current situation",
  "recommendations": [
    {
      "action": { "type": "ACTION_TYPE", "targetCountryId": "XXX" },
      "rationale": "why this action",
      "riskLevel": "LOW|MEDIUM|HIGH|CRITICAL",
      "expectedOutcome": "what you expect to happen"
    }
  ],
  "warnings": ["any urgent concerns"],
  "opportunities": ["any opportunities to exploit"]
}`;

  return prompt;
}
