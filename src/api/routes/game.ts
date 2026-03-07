import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { createDataLoader } from "../../core/data-loader.js";
import { createSeed } from "../../core/seed.js";
import { TurnEngine } from "../../core/turn.js";
import {
  type Action,
  ActionSchema,
  type CountryIntent,
  type WorldState,
} from "../../core/types.js";
import { gameDb } from "../../infra/db.js";

const NewGameSchema = z.object({
  scenarioId: z.string().default("2025"),
  playerCountryId: z.string(),
  seed: z.number().optional(),
  saveName: z.string().optional(),
});

const TurnRequestSchema = z.object({
  saveId: z.string(),
  playerActions: z.array(ActionSchema),
});

const SaveRequestSchema = z.object({
  saveId: z.string().optional(),
  name: z.string(),
  worldState: z.any(),
});

let currentGameState: WorldState | null = null;
let currentSaveId: string | null = null;

export async function gameRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post(
    "/new-game",
    async (
      request: FastifyRequest<{ Body: z.infer<typeof NewGameSchema> }>,
      reply: FastifyReply,
    ) => {
      try {
        const body = NewGameSchema.parse(request.body);
        const { scenarioId, playerCountryId, saveName } = body;

        const seed = body.seed ?? createSeed(parseInt(scenarioId, 10), playerCountryId);

        const dataLoader = createDataLoader();
        const worldState = dataLoader.initializeWorldState(scenarioId, playerCountryId, seed);

        const name = saveName ?? `${playerCountryId} - ${scenarioId}`;
        const saveId = await gameDb.saveGame(name, worldState);

        currentGameState = worldState;
        currentSaveId = saveId;

        return reply.send({
          success: true,
          saveId,
          worldState,
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          success: false,
          error: error instanceof Error ? error.message : "Failed to create new game",
        });
      }
    },
  );

  fastify.post(
    "/turn",
    async (
      request: FastifyRequest<{ Body: z.infer<typeof TurnRequestSchema> }>,
      reply: FastifyReply,
    ) => {
      try {
        const body = TurnRequestSchema.parse(request.body);
        const { saveId, playerActions } = body;

        const saveData = await gameDb.loadGame(saveId);
        if (!saveData) {
          return reply.status(404).send({
            success: false,
            error: "Save game not found",
          });
        }

        const { worldState } = saveData;
        const engine = new TurnEngine(worldState.seed);

        const aiIntents: CountryIntent[] = generateHeuristicIntents(worldState);

        const result = engine.executeTurn(worldState, playerActions, aiIntents);

        await gameDb.updateSave(saveId, result.newState);

        currentGameState = result.newState;

        return reply.send({
          success: true,
          worldState: result.newState,
          events: result.events,
          newspaper: result.newspaper,
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          success: false,
          error: error instanceof Error ? error.message : "Failed to process turn",
        });
      }
    },
  );

  fastify.get("/state", async (_request: FastifyRequest, reply: FastifyReply) => {
    if (!currentGameState) {
      return reply.status(404).send({
        success: false,
        error: "No active game",
      });
    }

    return reply.send({
      success: true,
      worldState: currentGameState,
      saveId: currentSaveId,
    });
  });

  fastify.get(
    "/state/:saveId",
    async (request: FastifyRequest<{ Params: { saveId: string } }>, reply: FastifyReply) => {
      try {
        const { saveId } = request.params;
        const saveData = await gameDb.loadGame(saveId);

        if (!saveData) {
          return reply.status(404).send({
            success: false,
            error: "Save game not found",
          });
        }

        return reply.send({
          success: true,
          worldState: saveData.worldState,
          turnLogs: saveData.turnLogs,
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          success: false,
          error: error instanceof Error ? error.message : "Failed to load game state",
        });
      }
    },
  );

  fastify.post(
    "/save",
    async (
      request: FastifyRequest<{ Body: z.infer<typeof SaveRequestSchema> }>,
      reply: FastifyReply,
    ) => {
      try {
        const body = SaveRequestSchema.parse(request.body);

        if (body.saveId) {
          await gameDb.updateSave(body.saveId, body.worldState);
          return reply.send({
            success: true,
            saveId: body.saveId,
          });
        }

        const saveId = await gameDb.saveGame(body.name, body.worldState);
        return reply.send({
          success: true,
          saveId,
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          success: false,
          error: error instanceof Error ? error.message : "Failed to save game",
        });
      }
    },
  );

  fastify.get("/saves", async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      const saves = await gameDb.listSaves();
      return reply.send({
        success: true,
        saves,
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : "Failed to list saves",
      });
    }
  });

  fastify.get(
    "/load/:saveId",
    async (request: FastifyRequest<{ Params: { saveId: string } }>, reply: FastifyReply) => {
      try {
        const { saveId } = request.params;
        const saveData = await gameDb.loadGame(saveId);

        if (!saveData) {
          return reply.status(404).send({
            success: false,
            error: "Save game not found",
          });
        }

        currentGameState = saveData.worldState;
        currentSaveId = saveId;

        return reply.send({
          success: true,
          saveId,
          worldState: saveData.worldState,
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          success: false,
          error: error instanceof Error ? error.message : "Failed to load game",
        });
      }
    },
  );

  fastify.delete(
    "/game/:saveId",
    async (request: FastifyRequest<{ Params: { saveId: string } }>, reply: FastifyReply) => {
      try {
        const { saveId } = request.params;
        await gameDb.deleteSave(saveId);

        if (currentSaveId === saveId) {
          currentGameState = null;
          currentSaveId = null;
        }

        return reply.send({
          success: true,
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          success: false,
          error: error instanceof Error ? error.message : "Failed to delete game",
        });
      }
    },
  );
}

function generateHeuristicIntents(worldState: WorldState): CountryIntent[] {
  const intents: CountryIntent[] = [];

  for (const country of worldState.countries) {
    if (country.id === worldState.playerCountryId) continue;

    const actions: Action[] = [];

    if (country.stability < 40) {
      actions.push({ type: "DOMESTIC_REFORM" });
    } else if (country.legitimacy < 50) {
      actions.push({ type: "DOMESTIC_PROPAGANDA" });
    }

    if (country.atWarWith.length > 0 && country.mobilizationLevel < 80) {
      actions.push({ type: "MILITARY_MOBILIZE" });
    }

    if (country.atWarWith.length === 0 && country.mobilizationLevel > 30) {
      actions.push({ type: "MILITARY_DEMOBILIZE" });
    }

    for (const [otherId, relation] of Object.entries(country.relations)) {
      if (relation > 40 && relation < 60 && !country.alliances.includes(otherId)) {
        actions.push({ type: "DIPLOMACY_IMPROVE_RELATIONS", targetCountryId: otherId });
        break;
      }
    }

    intents.push({
      countryId: country.id,
      actions: actions.slice(0, 2),
    });
  }

  return intents;
}
