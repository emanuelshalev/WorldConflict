import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { AIConfigSchema, planTurn } from "../../agents/strategist.js";
import { addUsage } from "../../agents/usage.js";
import { createDataLoader } from "../../core/data-loader.js";
import { objectiveStatus } from "../../core/objectives.js";
import { previewAction } from "../../core/preview.js";
import { classifyLeadership } from "../../core/scoring.js";
import { createSeed } from "../../core/seed.js";
import { buildPlayerView } from "../../core/systems/intelligence.js";
import { TurnEngine } from "../../core/turn.js";
import {
  ActionSchema,
  DifficultySchema,
  GameModeSchema,
  type WorldState,
} from "../../core/types.js";
import { gameDb } from "../../infra/db.js";

const NewGameSchema = z.object({
  scenarioId: z.string().default("2026"),
  playerCountryId: z.string(),
  seed: z.number().optional(),
  saveName: z.string().optional(),
  playerId: z.string().optional(),
  leaderName: z.string().min(1).max(40).optional(),
  mode: GameModeSchema.default("FLASHPOINT"),
  difficulty: DifficultySchema.default("STATESMAN"),
  flashpointId: z.string().optional(),
  daily: z.boolean().optional(), // date-seeded daily challenge
});

const TurnRequestSchema = z.object({
  saveId: z.string(),
  playerActions: z.array(ActionSchema),
  decisions: z.array(z.object({ decisionId: z.string(), optionId: z.string() })).default([]),
  ai: AIConfigSchema.optional(),
});

const PreviewRequestSchema = z.object({
  saveId: z.string(),
  action: ActionSchema,
});

/**
 * What the client may know. Foreign countries' hidden ground truth (true GDP,
 * stability, military, nuclear progress, their beliefs and personalities) is
 * replaced by the player's intelligence estimates — the fog of war must not be
 * defeatable from devtools.
 */
export function publicWorldState(world: WorldState): WorldState {
  const me = world.countries.find((c) => c.id === world.playerCountryId);
  return {
    ...world,
    countries: world.countries.map((c) => {
      if (c.id === world.playerCountryId) return c;
      const b = me?.beliefs[c.id];
      const hiddenNuclear = c.nuclear.status === "DEVELOPING" || c.nuclear.status === "LATENT";
      return {
        ...c,
        gdp: b?.gdp ?? c.gdp,
        stability: b?.stability ?? 50,
        approval: 50,
        legitimacy: 50,
        manpower: 0,
        airpower: 0,
        mobilizationLevel: 0,
        intelLevel: 0,
        counterIntelLevel: 0,
        beliefs: {},
        borderDeployments: c.borderDeployments.filter((d) => d.targetCountryId === me?.id),
        personality: {
          warPropensity: 50,
          allianceLoyalty: 50,
          diplomaticFlexibility: 50,
          riskTolerance: 50,
          expansionism: 50,
          isolationism: 50,
          ideologicalRigidity: 50,
          prestigeEmphasis: 50,
        },
        goals: [],
        nuclear: {
          ...c.nuclear,
          status: hiddenNuclear && (b?.nuclearProgress ?? 0) < 20 ? "NONE" : c.nuclear.status,
          progress: Math.round(b?.nuclearProgress ?? 0),
          consecutiveStrikesTaken: c.nuclear.consecutiveStrikesTaken,
        },
        relations: Object.fromEntries(
          Object.entries(c.relations).map(([id, v]) => [id, Math.round(v / 10) * 10]),
        ),
      };
    }),
  };
}

function turnPayload(worldState: WorldState) {
  return {
    worldState: publicWorldState(worldState),
    playerView: buildPlayerView(worldState),
    objectiveStatus: objectiveStatus(worldState),
    pendingDecisions: worldState.pendingDecisions,
    score: worldState.score,
    gameOver: worldState.gameOver,
    playerBackstory: worldState.playerBackstory,
  };
}

/** How hard each nation is to lead (shown on the picker; tuned with scripts/simulate.ts). */
const COUNTRY_DIFFICULTY: Record<string, "STEADY" | "TOUGH" | "BRUTAL"> = {
  USA: "STEADY",
  CHN: "STEADY",
  IND: "STEADY",
  SAU: "STEADY",
  JPN: "STEADY",
  AUS: "STEADY",
  CAN: "STEADY",
  ARE: "STEADY",
  DEU: "TOUGH",
  FRA: "TOUGH",
  GBR: "TOUGH",
  ITA: "TOUGH",
  BRA: "TOUGH",
  MEX: "TOUGH",
  POL: "TOUGH",
  TUR: "TOUGH",
  EGY: "TOUGH",
  IDN: "TOUGH",
  KOR: "TOUGH",
  ZAF: "TOUGH",
  NGA: "TOUGH",
  RUS: "TOUGH",
  DNK: "TOUGH",
  PHL: "TOUGH",
  ISR: "BRUTAL",
  IRN: "BRUTAL",
  PRK: "BRUTAL",
  PAK: "BRUTAL",
  UKR: "BRUTAL",
  TWN: "BRUTAL",
  BLR: "TOUGH",
  SYR: "BRUTAL",
  IRQ: "BRUTAL",
  PSX: "BRUTAL",
  LBN: "BRUTAL",
  YEM: "BRUTAL",
  AFG: "BRUTAL",
  VEN: "BRUTAL",
  CUB: "BRUTAL",
  SDN: "BRUTAL",
  ETH: "BRUTAL",
};

/** The daily flashpoint: same scenario and country for everyone on a given date. */
function dailyChallenge(
  flashpoints: { id: string; title: string; playable: { countryId: string }[] }[],
): { date: string; flashpointId: string; countryId: string; title: string } | null {
  if (flashpoints.length === 0) return null;
  const date = new Date().toISOString().slice(0, 10);
  const h = createSeed(Number(date.slice(0, 4)), date);
  const fp = flashpoints[h % flashpoints.length];
  const country = fp.playable[Math.floor(h / 7) % fp.playable.length];
  return { date, flashpointId: fp.id, countryId: country.countryId, title: fp.title };
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
    const flashpoints = dataLoader.loadAvailableFlashpoints().map((f) => ({
      id: f.id,
      title: f.title,
      tagline: f.tagline,
      hook: f.hook,
      date: f.date,
      turns: f.turns,
      playable: f.playable,
      objectives: Object.fromEntries(
        Object.entries(f.objectives).map(([id, o]) => [
          id,
          { title: o.title, briefing: o.briefing },
        ]),
      ),
    }));
    return reply.send({
      success: true,
      scenarios,
      flashpoints,
      daily: dailyChallenge(flashpoints),
    });
  });

  // ------------------------------------------------------------------
  fastify.get("/countries", async (_request, reply: FastifyReply) => {
    const loader = createDataLoader();
    const countries = loader.loadAllCountries().map((c) => ({
      id: c.id,
      name: c.name,
      regimeType: c.regimeType,
      leaderTitle: c.politicalSystem.leaderTitle,
      difficulty: COUNTRY_DIFFICULTY[c.id] ?? "TOUGH",
      narrative: c.history.narrative ?? "",
      capital: c.geo?.capital,
      nuclear: c.military.nuclearStatus,
    }));
    return reply.send({ success: true, countries });
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
        const { scenarioId, playerCountryId, saveName, playerId, leaderName } = body;
        const dataLoader = createDataLoader();
        // Every game is different unless a seed is given; the daily challenge
        // is the same world for everyone that day.
        const today = new Date().toISOString().slice(0, 10);
        const seed = body.daily
          ? createSeed(Number(today.slice(0, 4)), today)
          : (body.seed ?? createSeed(Date.now() % 100000, `${playerCountryId}${Math.random()}`));

        const worldState = dataLoader.newGame({
          scenarioId,
          playerCountryId,
          seed,
          leaderName,
          mode: body.mode,
          difficulty: body.difficulty,
          flashpointId: body.flashpointId,
        });

        const label = body.flashpointId
          ? dataLoader.loadFlashpoint(body.flashpointId).title
          : `${body.mode.toLowerCase()} ${scenarioId}`;
        const name =
          saveName ??
          `${worldState.countries.find((c) => c.id === playerCountryId)?.name ?? playerCountryId} — ${label}`;
        const saveId = await gameDb.saveGame(name, worldState, [], playerId, leaderName);

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
        const { saveId, playerActions, decisions, ai } = body;

        const saveData = await gameDb.loadGame(saveId);
        if (!saveData) {
          return reply.status(404).send({ success: false, error: "Save game not found" });
        }

        const { worldState, llmUsage } = saveData;
        if (worldState.gameOver) {
          return reply.status(400).send({
            success: false,
            error: "The game is over. Start a new game or load an earlier save.",
          });
        }

        const engine = new TurnEngine();
        // AI intents come from the chosen tier; the engine stays deterministic given intents
        const plan = await planTurn(worldState, ai, { sessionSpentUsd: llmUsage.costUsd ?? 0 });
        const aiIntents = plan.intents;
        const result = engine.executeTurn(worldState, playerActions, aiIntents, decisions);
        const totalUsage = addUsage(llmUsage, plan.usage);

        await gameDb.updateSave(saveId, result.newState, totalUsage);
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
          ai: {
            tier: ai?.tier ?? "ALGORITHMIC",
            turnUsage: plan.usage,
            totalUsage,
            statements: plan.statements,
            llmCountries: plan.llmCountries,
            notice: plan.notice,
          },
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
            mode: world.mode,
            outcome: world.outcome,
            objective: world.objective,
            closeCalls: world.director.closeCalls,
            comebacks: world.director.rallies,
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
  fastify.get(
    "/saves",
    async (
      request: FastifyRequest<{ Querystring: { playerId?: string } }>,
      reply: FastifyReply,
    ) => {
      try {
        const saves = await gameDb.listSaves(request.query.playerId);
        return reply.send({ success: true, saves });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          success: false,
          error: error instanceof Error ? error.message : "Failed to list saves",
        });
      }
    },
  );

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
