import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { AdvisorAgent } from "../../agents/advisorAgent.js";
import { createLLMClient } from "../../agents/llmClient.js";
import { ADVISOR_ROLES, type AdvisorRole } from "../../agents/schemas.js";
import { addUsage, DEFAULT_MODELS, type LLMProvider, MeteredClient } from "../../agents/usage.js";
import { gameDb } from "../../infra/db.js";

const LLMConfigSchema = z.object({
  provider: z.enum(["openai", "gemini", "anthropic", "ollama", "local"]),
  apiKey: z.string().optional(),
  model: z.string().optional(),
  baseUrl: z.string().optional(),
});
export type LLMConfigInput = z.infer<typeof LLMConfigSchema>;

const ChatRequestSchema = z.object({
  saveId: z.string(),
  role: z.enum([
    "FOREIGN_MINISTER",
    "DEFENSE_MINISTER",
    "FINANCE_MINISTER",
    "INTELLIGENCE_CHIEF",
    "DOMESTIC_ADVISOR",
    "CHIEF_OF_STAFF",
  ]),
  message: z.string().optional(),
  llm: LLMConfigSchema.optional(),
});

const advisorAgents: Map<string, { agent: AdvisorAgent; client: MeteredClient | null }> = new Map();

function agentKey(saveId: string, llm?: LLMConfigInput): string {
  if (!llm) return `${saveId}:env`;
  return `${saveId}:${llm.provider}:${llm.model ?? "default"}:${llm.apiKey?.slice(0, 8) ?? "nokey"}`;
}

function getAdvisorAgent(
  saveId: string,
  llm?: LLMConfigInput,
): { agent: AdvisorAgent; client: MeteredClient | null } {
  const key = agentKey(saveId, llm);
  let entry = advisorAgents.get(key);
  if (!entry) {
    if (llm) {
      const client = new MeteredClient(
        createLLMClient(llm.provider, {
          apiKey: llm.apiKey,
          model: llm.model ?? defaultModel(llm.provider),
          baseUrl: llm.baseUrl,
        }),
        llm.provider,
        "advisor",
      );
      entry = { agent: new AdvisorAgent(client), client };
    } else {
      const provider = (process.env.LLM_PROVIDER as "openai" | "ollama" | "mock") ?? "mock";
      entry = { agent: new AdvisorAgent(createLLMClient(provider)), client: null };
    }
    advisorAgents.set(key, entry);
  }
  return entry;
}

function defaultModel(provider: LLMProvider): string {
  return DEFAULT_MODELS[provider];
}

export async function chatRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post(
    "/advisor",
    async (
      request: FastifyRequest<{ Body: z.infer<typeof ChatRequestSchema> }>,
      reply: FastifyReply,
    ) => {
      try {
        const body = ChatRequestSchema.parse(request.body);
        const { saveId, role, message, llm } = body;

        const saveData = await gameDb.loadGame(saveId);
        if (!saveData) {
          return reply.status(404).send({
            success: false,
            error: "Save game not found",
          });
        }

        const { worldState } = saveData;
        const playerCountry = worldState.countries.find((c) => c.id === worldState.playerCountryId);

        if (!playerCountry) {
          return reply.status(400).send({
            success: false,
            error: "Player country not found in world state",
          });
        }

        const { agent, client } = getAdvisorAgent(saveId, llm);
        const response = await agent.chat(role, playerCountry, worldState, message);

        // Advisor LLM calls count toward the save's usage meter
        let usage: { turnUsage: unknown; totalUsage: unknown } | undefined;
        if (client) {
          const turnUsage = client.drain();
          const totalUsage = addUsage(saveData.llmUsage, turnUsage);
          await gameDb.updateSave(saveId, worldState, totalUsage);
          usage = { turnUsage, totalUsage };
        }

        return reply.send({
          success: true,
          response,
          usage,
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          success: false,
          error: error instanceof Error ? error.message : "Failed to get advisor response",
        });
      }
    },
  );

  // Connection test for the Settings screen: sends a tiny prompt, reports success
  fastify.post(
    "/test",
    async (
      request: FastifyRequest<{ Body: z.infer<typeof LLMConfigSchema> }>,
      reply: FastifyReply,
    ) => {
      try {
        const llm = LLMConfigSchema.parse(request.body);
        const client = createLLMClient(llm.provider, {
          apiKey: llm.apiKey,
          model: llm.model ?? defaultModel(llm.provider),
          baseUrl: llm.baseUrl,
          maxTokens: 300,
          timeout: 15000,
        });
        const response = await client.chat([{ role: "user", content: "Reply with exactly: OK" }]);
        return reply.send({
          success: true,
          model: client.getConfig().model,
          sample: response.content.slice(0, 60),
        });
      } catch (error) {
        return reply.send({
          success: false,
          error: error instanceof Error ? error.message : "Connection failed",
        });
      }
    },
  );

  fastify.get("/advisor/roles", async (_request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({
      success: true,
      roles: ADVISOR_ROLES.map((role) => ({
        id: role,
        name: role
          .replace(/_/g, " ")
          .toLowerCase()
          .replace(/\b\w/g, (c) => c.toUpperCase()),
      })),
    });
  });

  fastify.post(
    "/advisor/clear",
    async (
      request: FastifyRequest<{ Body: { saveId: string; role?: AdvisorRole } }>,
      reply: FastifyReply,
    ) => {
      try {
        const { saveId, role } = request.body;
        // Agents are keyed by save + LLM config, so clear every one for this save
        for (const [key, { agent }] of advisorAgents) {
          if (!key.startsWith(`${saveId}:`)) continue;
          if (role) {
            agent.clearSession(saveId, role);
          } else {
            agent.clearAllSessions(saveId);
          }
        }

        return reply.send({ success: true });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          success: false,
          error: error instanceof Error ? error.message : "Failed to clear session",
        });
      }
    },
  );

  fastify.delete(
    "/advisor/:saveId",
    async (request: FastifyRequest<{ Params: { saveId: string } }>, reply: FastifyReply) => {
      const { saveId } = request.params;
      for (const key of [...advisorAgents.keys()]) {
        if (key.startsWith(`${saveId}:`)) advisorAgents.delete(key);
      }

      return reply.send({ success: true });
    },
  );
}
