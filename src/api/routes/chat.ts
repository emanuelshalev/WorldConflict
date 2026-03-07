import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { AdvisorAgent } from "../../agents/advisorAgent.js";
import { createLLMClient } from "../../agents/llmClient.js";
import { ADVISOR_ROLES, type AdvisorRole } from "../../agents/schemas.js";
import { gameDb } from "../../infra/db.js";

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
});

const advisorAgents: Map<string, AdvisorAgent> = new Map();

function getAdvisorAgent(saveId: string): AdvisorAgent {
  if (!advisorAgents.has(saveId)) {
    const llmProvider = (process.env.LLM_PROVIDER as "openai" | "ollama" | "mock") ?? "mock";
    const llmClient = createLLMClient(llmProvider);
    advisorAgents.set(saveId, new AdvisorAgent(llmClient));
  }
  return advisorAgents.get(saveId)!;
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
        const { saveId, role, message } = body;

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

        const agent = getAdvisorAgent(saveId);
        const response = await agent.chat(role, playerCountry, worldState, message);

        return reply.send({
          success: true,
          response,
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
        const agent = advisorAgents.get(saveId);

        if (agent) {
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
      advisorAgents.delete(saveId);

      return reply.send({ success: true });
    },
  );
}
