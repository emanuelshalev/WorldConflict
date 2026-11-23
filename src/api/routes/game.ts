import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";

/** Saves with a turn in flight: a second /turn for the same save is refused, not run twice. */
const turnsInFlight = new Set<string>();

/** Malformed requests are the client's fault (400), not the server's (500). */
function errorStatus(error: unknown): number {
  return error instanceof z.ZodError || error instanceof UnplayableNationError ? 400 : 500;
}

import { generateDeterministicIntents } from "../../agents/fallback.js";
import { AIConfigSchema, planTurn } from "../../agents/strategist.js";
import { addUsage } from "../../agents/usage.js";
import {
  type Advice,
  buildAdvice,
  deskImpact,
  missionStatus,
  suggestionImpact,
} from "../../core/advisors.js";
import { BUDGET_SHARE, PC_CAP, politicalCapitalIncome } from "../../core/costs.js";
import {
  createDataLoader,
  type DataLoader,
  UnplayableNationError,
} from "../../core/data-loader.js";
import { buildEraMap } from "../../core/era-map.js";
import { objectiveStatus } from "../../core/objectives.js";
import { ENGINE_ORDERS } from "../../core/orders.js";
import { previewAction } from "../../core/preview.js";
import { branchRefusal, monthInput, recordMonth, replayTo } from "../../core/replay.js";
import { buildReveal, parseSeedCode, type RevealPayload, seatKeyOf } from "../../core/reveal.js";
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
import { loadAchievementRarity, loadSeatBenchmark } from "../../infra/benchmarks.js";
import { gameDb, type RunResultRecord } from "../../infra/db.js";

const NewGameSchema = z.object({
  scenarioId: z.string().default("2026"),
  playerCountryId: z.string().optional(), // required unless seedCode names the seat
  seed: z.number().optional(),
  seedCode: z.string().max(40).optional(), // "HC-USA-1A2B3": Play this seed (seat + seed)
  saveName: z.string().optional(),
  playerId: z.string().optional(),
  leaderName: z.string().min(1).max(40).optional(),
  mode: GameModeSchema.default("FLASHPOINT"),
  difficulty: DifficultySchema.default("STATESMAN"),
  flashpointId: z.string().optional(),
  daily: z.boolean().optional(), // date-seeded daily challenge
  // D-56: lead a nation that is not a state in the era, as alternate history (off by default)
  whatIf: z.boolean().optional(),
  // One Term "Start with": an active era situation the opening crisis is about (opening.ts)
  opening: z.string().max(40).optional(),
});

const BranchRequestSchema = z.object({
  saveId: z.string(),
  month: z.number().int().min(0),
  playerId: z.string().max(80).optional(),
});

const TurnRequestSchema = z.object({
  saveId: z.string(),
  playerActions: z.array(ActionSchema),
  decisions: z.array(z.object({ decisionId: z.string(), optionId: z.string() })).default([]),
  ai: AIConfigSchema.optional(),
});

const OrdersMenuRequestSchema = z.object({
  saveId: z.string(),
  targetCountryId: z.string().nullable().default(null),
});

const PreviewRequestSchema = z.object({
  saveId: z.string(),
  action: ActionSchema,
});

/**
 * What the client may know. Foreign countries' hidden ground truth (true GDP,
 * stability, military, nuclear progress, their beliefs and personalities) is
 * replaced by the player's intelligence estimates: the fog of war must not be
 * defeatable from devtools.
 */
export function publicWorldState(world: WorldState): WorldState {
  const me = world.countries.find((c) => c.id === world.playerCountryId);
  // The chronicle's ground truth (rivals' programs at the start, who plotted against you) is
  // declassified only by the end reveal (GET /reveal/:saveId)
  const chronicle = world.chronicle
    ? { ...world.chronicle, start: undefined, plots: {} }
    : undefined;
  return {
    ...world,
    chronicle,
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

/**
 * The month's advice (design-month 6.3): the staff's suggestions, cabinet and mission picks,
 * meeting picks and staff orders, plus the mission impact of every option on the desk and of
 * each suggested order. Computed from the player's own picture (beliefs), never ground truth.
 */
export function monthAdvice(world: WorldState) {
  if (world.gameOver) {
    return {
      advice: {
        suggestions: [],
        cabinetPicks: {},
        missionPicks: {},
        meetingPicks: {},
        deputies: [],
        staffOrders: [],
        missionNotes: {},
      } as Advice,
      missionImpact: {},
      orderImpact: {},
      objectiveStatus: objectiveStatus(world),
    };
  }
  const advice = buildAdvice(world);
  return {
    advice,
    missionImpact: deskImpact(world),
    orderImpact: suggestionImpact(world, advice.suggestions),
    objectiveStatus: missionStatus(world, advice.suggestions),
  };
}

/** This month's capital refill and the bank's cap, for the "+2 next month" line (design-orders §3.3). */
function capitalTerms(world: WorldState) {
  const me = world.countries.find((c) => c.id === world.playerCountryId);
  return { pcIncome: me ? politicalCapitalIncome(world, me) : 0, pcCap: PC_CAP };
}

/**
 * The order menu for one target (design-orders.md §6): one entry per engine order that acts on
 * that country, or every untargeted order when `targetId` is null. Each entry carries the rule
 * layer (`block`, from `orderRules` via the preview), cost, chance and the preview text, so a
 * menu or catalog opens with one request. The month layer (capital left, order slots, defense
 * budget left, duplicates) is applied on the client from the unsent month.
 */
export function orderMenu(world: WorldState, targetId: string | null) {
  const target = targetId ? world.countries.find((c) => c.id === targetId) : undefined;
  if (targetId && !target) throw new Error(`Unknown country ${targetId}`);
  return ENGINE_ORDERS.filter((o) => o.targeted === !!target).map((o) => {
    const action = {
      type: o.type,
      ...(o.params ? { params: o.params } : {}),
      ...(target ? { targetCountryId: target.id } : {}),
    };
    const p = previewAction(world, action);
    return {
      id: o.id,
      type: o.type,
      params: o.params ?? null,
      label: target ? `${o.verb} ${target.name}` : o.verb,
      targeted: o.targeted,
      costPC: p.costPC,
      costM: p.costM,
      budgetM: p.budgetM,
      defenseShare: BUDGET_SHARE[o.type] ?? 0,
      chance: p.successChance,
      block: p.block,
      irreversible: p.irreversible,
      missionWarning: p.missionWarning,
      summary: p.summary,
      effects: p.effects,
      risks: p.risks,
    };
  });
}

function turnPayload(worldState: WorldState) {
  return {
    worldState: publicWorldState(worldState),
    ...capitalTerms(worldState),
    playerView: buildPlayerView(worldState),
    ...monthAdvice(worldState),
    pendingDecisions: worldState.pendingDecisions,
    score: worldState.score,
    gameOver: worldState.gameOver,
    playerBackstory: worldState.playerBackstory,
  };
}

/**
 * What kind of fire a flashpoint is, for its pin on the title globe: nuclear rivals, an open war,
 * a standoff at sea, or a regime in crisis. Keyword-based so scanned flashpoints get one too.
 */
function flashpointKind(f: {
  title: string;
  tagline: string;
  hook: string;
  setup: { wars: unknown[] };
}) {
  const text = `${f.title} ${f.tagline} ${f.hook}`.toLowerCase();
  if (/nuclear/.test(text)) return "NUCLEAR";
  if (f.setup.wars.length > 0) return "WAR";
  if (/coup|regime|dictator|junta|generals|civil war|uprising/.test(text)) return "REGIME";
  if (/strait|shoal|convoy|blockade|quarantine|naval|coast guard|sea\b/.test(text)) return "SEA";
  return "WAR";
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
  // WC_DAILY_DATE pins the daily (YYYY-MM-DD) for reproducible test runs; players get today's date
  const pinned = process.env.WC_DAILY_DATE;
  const date =
    pinned && /^\d{4}-\d{2}-\d{2}$/.test(pinned) ? pinned : new Date().toISOString().slice(0, 10);
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
      kind: flashpointKind(f),
      // Who is fighting whom when it opens (the title globe draws these as live lines)
      rivals: f.setup.wars.length
        ? f.setup.wars.map((w) => [w.attackerId, w.defenderId])
        : [[f.playable[0]?.countryId, f.playable[1]?.countryId]].filter((p) => p[0] && p[1]),
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
  // Era map for the title globe (display data, see src/core/era-map.ts)
  fastify.get(
    "/scenarios/:id/map",
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const loader = createDataLoader();
      const { id } = request.params;
      const known = loader.loadAvailableScenarios().some((s) => s.id === id);
      if (!known) return reply.code(404).send({ success: false, error: "Unknown scenario" });
      const map = buildEraMap(loader.loadScenario(id), loader.loadAllCountries());
      reply.header("Cache-Control", "public, max-age=3600");
      return reply.send({ success: true, map });
    },
  );

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
        const dataLoader = createDataLoader();
        // "Play this seed": a seed code names the seat and the seed
        if (body.seedCode) {
          const parsed = parseSeedCode(body.seedCode, dataLoader.loadAvailableFlashpoints());
          if (!parsed) {
            return reply
              .status(400)
              .send({ success: false, error: `Unknown seed code ${body.seedCode}` });
          }
          body.seed = parsed.seed;
          body.playerCountryId = parsed.playerCountryId;
          body.mode = parsed.mode;
          body.flashpointId = parsed.flashpointId;
          if (parsed.scenarioId) body.scenarioId = parsed.scenarioId;
          body.daily = false;
        }
        const { scenarioId, saveName, playerId, leaderName } = body;
        const playerCountryId = body.playerCountryId;
        if (!playerCountryId) {
          return reply.status(400).send({ success: false, error: "playerCountryId is required" });
        }
        if (!dataLoader.loadAllCountries().some((c) => c.id === playerCountryId)) {
          return reply
            .status(400)
            .send({ success: false, error: `Unknown country ${playerCountryId}` });
        }
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
          whatIf: body.whatIf === true,
          opening: body.opening,
        });

        const label = body.flashpointId
          ? dataLoader.loadFlashpoint(body.flashpointId).title
          : `${body.mode.toLowerCase()} ${scenarioId}`;
        const name =
          saveName ??
          `${worldState.countries.find((c) => c.id === playerCountryId)?.name ?? playerCountryId}, ${label}${worldState.origin?.whatIf ? " (what if)" : ""}`;
        const saveId = await gameDb.saveGame(name, worldState, [], playerId, leaderName);

        return reply.send({ success: true, saveId, ...turnPayload(worldState) });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(errorStatus(error)).send({
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
        if (turnsInFlight.has(saveId)) {
          return reply
            .status(409)
            .send({ success: false, error: "This month is already being resolved" });
        }
        turnsInFlight.add(saveId);
        try {
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
          // The month's inputs, copied before the engine sees them (replay and branch)
          const input = monthInput(playerActions, decisions);
          const result = engine.executeTurn(worldState, playerActions, aiIntents, decisions);
          const totalUsage = addUsage(llmUsage, plan.usage);
          // Which AI tier drove the rivals (route-level: the engine never sees it). A replay is
          // only exact when every month ran ALGORITHMIC.
          const tier = plan.llmCountries?.length ? (ai?.tier ?? "ALGORITHMIC") : "ALGORITHMIC";
          recordMonth(result.newState, input, tier);

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
            // Fog of war: only the player's own orders come back, never the AI's plans
            resolvedActions: ownActions(result.resolvedActions, result.newState.playerCountryId),
            rejectedActions: ownActions(result.rejectedActions, result.newState.playerCountryId),
            ai: {
              tier: ai?.tier ?? "ALGORITHMIC",
              turnUsage: plan.usage,
              totalUsage,
              statements: plan.statements,
              llmCountries: plan.llmCountries,
              notice: plan.notice,
            },
          });
        } finally {
          turnsInFlight.delete(saveId);
        }
      } catch (error) {
        fastify.log.error(error);
        return reply.status(errorStatus(error)).send({
          success: false,
          error: error instanceof Error ? error.message : "Failed to process turn",
        });
      }
    },
  );

  // ------------------------------------------------------------------
  // Every order for one target at once, with its rule-layer availability (design-orders §6)
  fastify.post(
    "/orders/menu",
    async (
      request: FastifyRequest<{ Body: z.infer<typeof OrdersMenuRequestSchema> }>,
      reply: FastifyReply,
    ) => {
      try {
        const body = OrdersMenuRequestSchema.parse(request.body);
        const saveData = await gameDb.loadGame(body.saveId);
        if (!saveData) {
          return reply.status(404).send({ success: false, error: "Save game not found" });
        }
        const world = saveData.worldState;
        if (body.targetCountryId && !world.countries.some((c) => c.id === body.targetCountryId)) {
          return reply
            .status(400)
            .send({ success: false, error: `Unknown country ${body.targetCountryId}` });
        }
        return reply.send({
          success: true,
          turn: world.turn,
          targetCountryId: body.targetCountryId,
          ...capitalTerms(world),
          orders: orderMenu(world, body.targetCountryId),
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(errorStatus(error)).send({
          success: false,
          error: error instanceof Error ? error.message : "Failed to build the order menu",
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
        return reply.status(errorStatus(error)).send({
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
  // The end-of-session reveal: only for finished games (the declassified cards are the one
  // place foreign ground truth reaches the client)
  fastify.get(
    "/reveal/:saveId",
    async (
      request: FastifyRequest<{
        Params: { saveId: string };
        Querystring: { playerId?: string; guestId?: string };
      }>,
      reply: FastifyReply,
    ) => {
      try {
        const saveData = await gameDb.loadGame(request.params.saveId);
        if (!saveData) {
          return reply.status(404).send({ success: false, error: "Save game not found" });
        }
        const world = saveData.worldState;
        if (!world.gameOver) {
          return reply
            .status(409)
            .send({ success: false, error: "The reveal opens when the session is over" });
        }
        const reveal = await revealFor(world, request.params.saveId, request.query);
        return reply.send({ success: true, reveal });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          success: false,
          error: error instanceof Error ? error.message : "Failed to build the reveal",
        });
      }
    },
  );

  // ------------------------------------------------------------------
  // Record a finished run (derived server-side from the save: the client only names it)
  fastify.post(
    "/runs",
    async (
      request: FastifyRequest<{ Body: z.infer<typeof RunRequestSchema> }>,
      reply: FastifyReply,
    ) => {
      try {
        const body = RunRequestSchema.parse(request.body);
        const saveData = await gameDb.loadGame(body.saveId);
        if (!saveData) {
          return reply.status(404).send({ success: false, error: "Save game not found" });
        }
        const world = saveData.worldState;
        if (!world.gameOver) {
          return reply
            .status(409)
            .send({ success: false, error: "Only finished sessions can be recorded" });
        }
        const owner = await gameDb.getSaveOwner(body.saveId);
        const reveal = await revealFor(world, body.saveId, {});
        const run = reveal.run;
        const stored = await gameDb.saveRun({
          saveId: body.saveId,
          playerId: owner ?? body.playerId ?? null,
          guestId: body.guestId ?? null,
          seatKey: run.seatKey,
          difficulty: run.difficulty,
          seed: run.seed,
          score: run.presidencyScore,
          grade: run.grade,
          stars: run.stars,
          verdict: run.verdict,
          parts: JSON.stringify(run.parts),
          achievements: JSON.stringify(run.achievements),
          detail: JSON.stringify({
            seedCode: run.seedCode,
            mode: run.mode,
            countryId: run.countryId,
            victory: run.victory,
            series: run.series,
            choices: run.choices,
            aiTier: run.aiTier,
          }),
        });
        const mine = await gameDb.listRuns({
          seatKey: run.seatKey,
          ...(stored.playerId ? { playerId: stored.playerId } : {}),
          ...(!stored.playerId && stored.guestId ? { guestId: stored.guestId } : {}),
        });
        const sameOwner = stored.playerId || stored.guestId ? mine : [stored];
        const rank = 1 + sameOwner.filter((r) => r.score > stored.score).length;
        return reply.send({
          success: true,
          run: publicRun(stored),
          rank: { position: rank, of: sameOwner.length },
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(errorStatus(error)).send({
          success: false,
          error: error instanceof Error ? error.message : "Failed to record the run",
        });
      }
    },
  );

  // ------------------------------------------------------------------
  // Personal history on a seat, and the seat's top 20 among signed-in players
  fastify.get(
    "/runs",
    async (
      request: FastifyRequest<{
        Querystring: { seat?: string; playerId?: string; guestId?: string; limit?: string };
      }>,
      reply: FastifyReply,
    ) => {
      try {
        const { seat, playerId, guestId } = request.query;
        const limit = Math.max(1, Math.min(200, Number(request.query.limit ?? 50) || 50));
        const runs =
          playerId || guestId
            ? await gameDb.listRuns({
                seatKey: seat,
                ...(playerId ? { playerId } : { guestId }),
                limit,
              })
            : [];
        const top = seat
          ? (await gameDb.listRuns({ seatKey: seat, limit: 1000 }))
              .filter((r) => r.playerId)
              .sort((a, b) => b.score - a.score || a.createdAt.getTime() - b.createdAt.getTime())
              .slice(0, 20)
          : [];
        return reply.send({
          success: true,
          runs: runs.map(publicRun),
          top: top.map(publicRun),
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          success: false,
          error: error instanceof Error ? error.message : "Failed to list runs",
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
  // "Branch from this month": a new save that starts from an earlier month of this one, rebuilt
  // from the same seed and the recorded inputs (core/replay.ts)
  fastify.post(
    "/branch",
    async (
      request: FastifyRequest<{ Body: z.infer<typeof BranchRequestSchema> }>,
      reply: FastifyReply,
    ) => {
      try {
        const body = BranchRequestSchema.parse(request.body);
        const saveData = await gameDb.loadGame(body.saveId);
        if (!saveData) {
          return reply.status(404).send({ success: false, error: "Save game not found" });
        }
        const source = saveData.worldState;
        const refusal = branchRefusal(source, body.month);
        if (refusal) return reply.status(400).send({ success: false, error: refusal });
        // The rivals' intents as they were (exact even when LLMs drove them), else PersonalityAI
        const logged = new Map(saveData.turnLogs.map((t) => [t.number, t.intents]));
        const world = replayTo(
          createDataLoader(),
          source,
          body.month,
          (i, w) => logged.get(i + 1) ?? generateDeterministicIntents(w),
        );
        const meta = await gameDb.getSaveById(body.saveId);
        const base = (meta?.name ?? "Game").replace(BRANCH_SUFFIX, "");
        const owner = body.playerId ?? (await gameDb.getSaveOwner(body.saveId)) ?? undefined;
        // Named in HUD months (QA3-S3-4): a branch at N months done opens month N + 1
        const saveId = await gameDb.saveGame(
          `${base} (branch from month ${body.month + 1})`,
          world,
          [],
          owner,
          meta?.leaderName ?? undefined,
        );
        return reply.send({
          success: true,
          saveId,
          branchedFrom: { saveId: body.saveId, month: body.month },
          ...turnPayload(world),
          newspaper: world.newspaper,
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(errorStatus(error)).send({
          success: false,
          error: error instanceof Error ? error.message : "Failed to branch the game",
        });
      }
    },
  );

  // ------------------------------------------------------------------
  // Saved games: the account's and this browser's guest saves together (a guest who signs in
  // keeps seeing the games played before signing in)
  fastify.get(
    "/saves",
    async (
      request: FastifyRequest<{ Querystring: { playerId?: string; guestId?: string } }>,
      reply: FastifyReply,
    ) => {
      try {
        const owners = [request.query.playerId, request.query.guestId].filter(
          (x): x is string => !!x,
        );
        const saves = await gameDb.listSaves(owners.length ? owners : undefined);
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

const BRANCH_SUFFIX = / \(branch from month \d+\)$/;

const RunRequestSchema = z.object({
  saveId: z.string(),
  playerId: z.string().max(80).optional(),
  guestId: z.string().max(80).optional(),
});

/** A run as the client sees it: JSON columns parsed, owner ids left out. */
function publicRun(r: RunResultRecord) {
  const parse = <T>(s: string | null, fallback: T): T => {
    try {
      return s ? (JSON.parse(s) as T) : fallback;
    } catch {
      return fallback;
    }
  };
  return {
    id: r.id,
    saveId: r.saveId,
    seatKey: r.seatKey,
    difficulty: r.difficulty,
    seed: r.seed,
    score: r.score,
    grade: r.grade,
    stars: r.stars,
    verdict: r.verdict,
    parts: parse<number[]>(r.parts, []),
    achievements: parse<string[]>(r.achievements, []),
    detail: parse<Record<string, unknown> | null>(r.detail, null),
    createdAt: r.createdAt.toISOString(),
  };
}

/**
 * Everything the reveal needs besides the world: the flashpoint's reality rows, signature and
 * sources (read fresh, so content fixes reach old saves), benchmarks, rarity and personal best.
 */
async function revealFor(
  world: WorldState,
  saveId: string,
  owner: { playerId?: string; guestId?: string },
  loader: DataLoader = createDataLoader(),
): Promise<RevealPayload> {
  let fp: ReturnType<DataLoader["loadFlashpoint"]> | null = null;
  if (world.flashpointId) {
    try {
      fp = loader.loadFlashpoint(world.flashpointId);
    } catch {
      fp = null; // a flashpoint removed since the game was played: no truth table
    }
  }
  const side = fp?.objectives[world.playerCountryId];
  const seatKey = seatKeyOf(world);
  let personalBest: number | null = null;
  if (owner.playerId || owner.guestId) {
    const previous = (
      await gameDb.listRuns({
        seatKey,
        ...(owner.playerId ? { playerId: owner.playerId } : { guestId: owner.guestId }),
      })
    ).filter((r) => r.saveId !== saveId);
    if (previous.length) personalBest = Math.max(...previous.map((r) => r.score));
  }
  return buildReveal(world, {
    benchmarks: loadSeatBenchmark(seatKey),
    rarity: loadAchievementRarity(),
    reality: side?.reality ?? null,
    signature: side?.signature ?? null,
    sources: fp?.sources ?? [],
    seatDifficulty:
      fp?.playable.find((p) => p.countryId === world.playerCountryId)?.difficulty ?? null,
    personalBest,
    saveId,
    date: new Date().toISOString(),
  });
}

/** Keep only the player's entry of a per-country action map. */
export function ownActions<T>(byCountry: Map<string, T[]>, playerId: string): Record<string, T[]> {
  const mine = byCountry.get(playerId);
  return mine ? { [playerId]: mine } : {};
}
