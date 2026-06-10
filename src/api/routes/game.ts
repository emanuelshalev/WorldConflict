import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { generateDeterministicIntents } from "../../agents/fallback.js";
import { createDataLoader } from "../../core/data-loader.js";
import { previewAction } from "../../core/preview.js";
import { classifyLeadership } from "../../core/scoring.js";
import { createSeed } from "../../core/seed.js";
import { buildPlayerView } from "../../core/systems/intelligence.js";
import { TurnEngine } from "../../core/turn.js";
import { ActionSchema, type WorldState } from "../../core/types.js";
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
  decisions: z.array(z.object({ decisionId: z.string(), optionId: z.string() })).default([]),
});

const PreviewRequestSchema = z.object({
  saveId: z.string(),
  action: ActionSchema,
});

function turnPayload(worldState: WorldState) {
  return {
    worldState,
    playerView: buildPlayerView(worldState),
    pendingDecisions: worldState.pendingDecisions,
    score: worldState.score,
    gameOver: worldState.gameOver,
    playerBackstory: worldState.playerBackstory,
  };
}

export async function gameRoutes(fastify: FastifyInstance): Promise<void> {
  // ------------------------------------------------------------------
  fastify.get("/scenarios", async (_request, reply: FastifyReply) => {
    const dataLoader = createDataLoader();
    const scenarios = dataLoader.loadAvailableScenarios().map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      startYear: s.startYear,
      globalTension: s.globalTension,
    }));
    return reply.send({ success: true, scenarios });
  });

  // ------------------------------------------------------------------
  fastify.post(
    "/new-game",
    async (
      request: FastifyRequest<{ Body: z.infer<typeof NewGameSchema> }>,
      reply: FastifyReply,
    ) => {
      try {
        const body = NewGameSchema.parse(request.body);
        const { scenarioId, playerCountryId, saveName } = body;
        const seed = body.seed ?? createSeed(Number.parseInt(scenarioId, 10), playerCountryId);

        const dataLoader = createDataLoader();
        const worldState = dataLoader.initializeWorldState(scenarioId, playerCountryId, seed);

        const name = saveName ?? `${playerCountryId} - ${scenarioId}`;
        const saveId = await gameDb.saveGame(name, worldState);

        return reply.send({ success: true, saveId, ...turnPayload(worldState) });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          success: false,
          error: error instanceof Error ? error.message : "Failed to create new game",
        });
      }
    },
  );

  // ------------------------------------------------------------------
  fastify.post(
    "/turn",
    async (
      request: FastifyRequest<{ Body: z.infer<typeof TurnRequestSchema> }>,
      reply: FastifyReply,
    ) => {
      try {
        const body = TurnRequestSchema.parse(request.body);
        const { saveId, playerActions, decisions } = body;

        const saveData = await gameDb.loadGame(saveId);
        if (!saveData) {
          return reply.status(404).send({ success: false, error: "Save game not found" });
        }

        const { worldState } = saveData;
        if (worldState.gameOver) {
          return reply.status(400).send({
            success: false,
            error: "The game is over. Start a new game or load an earlier save.",
          });
        }

        const engine = new TurnEngine();
        const aiIntents = generateDeterministicIntents(worldState);
        const result = engine.executeTurn(worldState, playerActions, aiIntents, decisions);

        await gameDb.updateSave(saveId, result.newState);
        await gameDb.addTurnLog(saveId, {
          number: result.newState.turn,
          date: result.newState.date,
          events: result.events,
          intents: aiIntents,
          playerActions,
          newspaper: result.newspaper,
        });

        return reply.send({
          success: true,
          saveId,
          ...turnPayload(result.newState),
          events: result.events,
          newspaper: result.newspaper,
          governmentChanges: result.governmentChanges,
          resolvedActions: Object.fromEntries(result.resolvedActions),
          rejectedActions: Object.fromEntries(result.rejectedActions),
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

  // ------------------------------------------------------------------
  fastify.post(
    "/preview-action",
    async (
      request: FastifyRequest<{ Body: z.infer<typeof PreviewRequestSchema> }>,
      reply: FastifyReply,
    ) => {
      try {
        const body = PreviewRequestSchema.parse(request.body);
        const saveData = await gameDb.loadGame(body.saveId);
        if (!saveData) {
          return reply.status(404).send({ success: false, error: "Save game not found" });
        }
        const preview = previewAction(saveData.worldState, body.action);
        return reply.send({ success: true, preview });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          success: false,
          error: error instanceof Error ? error.message : "Failed to preview action",
        });
      }
    },
  );

  // ------------------------------------------------------------------
  fastify.get(
    "/report/:saveId",
    async (request: FastifyRequest<{ Params: { saveId: string } }>, reply: FastifyReply) => {
      try {
        const saveData = await gameDb.loadGame(request.params.saveId);
        if (!saveData) {
          return reply.status(404).send({ success: false, error: "Save game not found" });
        }
        const world = saveData.worldState;
        const player = world.countries.find((c) => c.id === world.playerCountryId);
        const assessment = classifyLeadership(world);
        return reply.send({
          success: true,
          report: {
            country: player?.name ?? world.playerCountryId,
            leader: player?.leader ?? null,
            turnsServed: world.turn,
            finalDate: world.date,
            gameOver: world.gameOver,
            score: world.score,
            assessment,
            timeline: world.timeline,
            scoreHistory: world.scoreHistory,
            backstory: world.playerBackstory,
          },
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          success: false,
          error: error instanceof Error ? error.message : "Failed to build report",
        });
      }
    },
  );

  // ------------------------------------------------------------------
  fastify.get(
    "/load/:saveId",
    async (request: FastifyRequest<{ Params: { saveId: string } }>, reply: FastifyReply) => {
      try {
        const saveData = await gameDb.loadGame(request.params.saveId);
        if (!saveData) {
          return reply.status(404).send({ success: false, error: "Save game not found" });
        }
        return reply.send({
          success: true,
          saveId: request.params.saveId,
          ...turnPayload(saveData.worldState),
          newspaper: saveData.worldState.newspaper,
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

  // ------------------------------------------------------------------
  fastify.get("/saves", async (_request, reply: FastifyReply) => {
    try {
      const saves = await gameDb.listSaves();
      return reply.send({ success: true, saves });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : "Failed to list saves",
      });
    }
  });

  // ------------------------------------------------------------------
  fastify.delete(
    "/save/:saveId",
    async (request: FastifyRequest<{ Params: { saveId: string } }>, reply: FastifyReply) => {
      try {
        await gameDb.deleteSave(request.params.saveId);
        return reply.send({ success: true });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          success: false,
          error: error instanceof Error ? error.message : "Failed to delete save",
        });
      }
    },
  );
}
