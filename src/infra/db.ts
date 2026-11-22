import { randomUUID } from "node:crypto";
import { mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { emptyUsage, type UsageTotals } from "../agents/usage.js";
import { type Turn, type WorldState, WorldStateSchema } from "../core/types.js";

/**
 * Save games and accounts. Two interchangeable stores:
 * - SQLite through Prisma and better-sqlite3 (the default when its native module is installed);
 * - plain JSON files in `saves/` (no native code at all), used when `DB_DRIVER=json` or whenever
 *   SQLite cannot load, so a machine that cannot build better-sqlite3 still plays and saves.
 * Both keep the same rules: a world state is validated before it is written and after it is read.
 */

export interface SaveGameRecord {
  id: string;
  name: string;
  playerCountry: string;
  leaderName?: string | null;
  seed: number;
  turn: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlayerRecord {
  id: string;
  name: string;
  passwordHash: string;
}

interface StoredSave extends SaveGameRecord {
  worldState: string;
  playerId: string | null;
  llmUsage: string | null;
}

/** A finished session's result (one per save), for personal history and per-seat rankings. */
export interface RunResultRecord {
  id: string;
  saveId: string;
  playerId: string | null;
  guestId: string | null;
  seatKey: string;
  difficulty: string;
  seed: number;
  score: number;
  grade: string;
  stars: number;
  verdict: string;
  parts: string; // JSON [mission, timing, leadership, finish]
  achievements: string; // JSON string[]
  detail: string | null; // JSON { seedCode, series, choices, aiTier, ... } for Compare runs
  createdAt: Date;
}
export type NewRunResult = Omit<RunResultRecord, "id" | "createdAt">;
export interface RunQuery {
  seatKey?: string;
  playerId?: string;
  guestId?: string;
  limit?: number;
}

/** Newest first, filtered by seat and owner; `limit` caps the result. */
function filterRuns(runs: RunResultRecord[], q: RunQuery): RunResultRecord[] {
  return runs
    .filter(
      (r) =>
        (!q.seatKey || r.seatKey === q.seatKey) &&
        (!q.playerId || r.playerId === q.playerId) &&
        (!q.guestId || r.guestId === q.guestId),
    )
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, q.limit ?? 200);
}

interface Store {
  readonly kind: "sqlite" | "json";
  createSave(data: Omit<StoredSave, "id" | "createdAt" | "updatedAt">): Promise<string>;
  getSave(id: string): Promise<StoredSave | null>;
  updateSave(
    id: string,
    data: Partial<Pick<StoredSave, "worldState" | "turn" | "llmUsage">>,
  ): Promise<void>;
  deleteSave(id: string): Promise<void>;
  /** Saves owned by any of `owners` (account or guest ids), newest first; all saves without. */
  listSaves(owners?: string[]): Promise<StoredSave[]>;
  addTurnLog(saveId: string, turn: number, events: string, actions: string): Promise<void>;
  turnLogs(saveId: string): Promise<Array<{ turn: number; events: string; actions: string }>>;
  findPlayer(name: string): Promise<PlayerRecord | null>;
  createPlayer(name: string, passwordHash: string): Promise<PlayerRecord>;
  saveRun(run: NewRunResult): Promise<RunResultRecord>;
  listRuns(query: RunQuery): Promise<RunResultRecord[]>;
  disconnect(): Promise<void>;
}

// ----------------------------------------------------------------------------
// JSON file store: one file per save, one for accounts, atomic writes
// ----------------------------------------------------------------------------

export class JsonStore implements Store {
  readonly kind = "json" as const;
  private dir: string;

  constructor(dir = process.env.SAVES_DIR || resolve("saves")) {
    this.dir = dir;
    mkdirSync(this.dir, { recursive: true });
  }

  private file(id: string) {
    if (!/^[\w-]+$/.test(id)) throw new Error("Bad save id");
    return join(this.dir, `${id}.json`);
  }
  private read<T>(path: string): T | null {
    try {
      return JSON.parse(readFileSync(path, "utf-8")) as T;
    } catch {
      return null;
    }
  }
  private write(path: string, data: unknown) {
    const tmp = `${path}.tmp`;
    writeFileSync(tmp, JSON.stringify(data));
    renameSync(tmp, path);
  }
  private revive(raw: StoredSave & { turnLogs?: unknown }): StoredSave {
    const { turnLogs: _t, ...s } = raw;
    return { ...s, createdAt: new Date(s.createdAt), updatedAt: new Date(s.updatedAt) };
  }

  async createSave(data: Omit<StoredSave, "id" | "createdAt" | "updatedAt">): Promise<string> {
    const id = randomUUID();
    const now = new Date().toISOString();
    this.write(this.file(id), { ...data, id, createdAt: now, updatedAt: now, turnLogs: [] });
    return id;
  }
  async getSave(id: string) {
    const raw = this.read<StoredSave>(this.file(id));
    return raw ? this.revive(raw) : null;
  }
  async updateSave(
    id: string,
    data: Partial<Pick<StoredSave, "worldState" | "turn" | "llmUsage">>,
  ) {
    const raw = this.read<Record<string, unknown>>(this.file(id));
    if (!raw) throw new Error(`Save ${id} not found`);
    this.write(this.file(id), { ...raw, ...data, updatedAt: new Date().toISOString() });
  }
  async deleteSave(id: string) {
    rmSync(this.file(id), { force: true });
  }
  async listSaves(owners?: string[]) {
    const out: StoredSave[] = [];
    for (const f of readdirSync(this.dir)) {
      if (!f.endsWith(".json") || f === "players.json" || f === "runs.json") continue;
      const raw = this.read<StoredSave>(join(this.dir, f));
      if (raw?.id && (!owners || (raw.playerId && owners.includes(raw.playerId))))
        out.push(this.revive(raw));
    }
    return out.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }
  async addTurnLog(saveId: string, turn: number, events: string, actions: string) {
    const raw = this.read<{ turnLogs?: unknown[] } & Record<string, unknown>>(this.file(saveId));
    if (!raw) return;
    this.write(this.file(saveId), {
      ...raw,
      turnLogs: [...(raw.turnLogs ?? []), { turn, events, actions }],
    });
  }
  async turnLogs(saveId: string) {
    const raw = this.read<{ turnLogs?: Array<{ turn: number; events: string; actions: string }> }>(
      this.file(saveId),
    );
    return [...(raw?.turnLogs ?? [])].sort((a, b) => a.turn - b.turn);
  }
  async findPlayer(name: string) {
    const players = this.read<PlayerRecord[]>(join(this.dir, "players.json")) ?? [];
    return players.find((p) => p.name === name) ?? null;
  }
  async createPlayer(name: string, passwordHash: string) {
    const path = join(this.dir, "players.json");
    const players = this.read<PlayerRecord[]>(path) ?? [];
    const player = { id: randomUUID(), name, passwordHash };
    this.write(path, [...players, player]);
    return player;
  }
  /** One result per save: finishing the same save again replaces its result. */
  async saveRun(run: NewRunResult) {
    const path = join(this.dir, "runs.json");
    const runs =
      this.read<Array<Omit<RunResultRecord, "createdAt"> & { createdAt: string }>>(path) ?? [];
    const existing = runs.find((r) => r.saveId === run.saveId);
    const stored = {
      ...run,
      id: existing?.id ?? randomUUID(),
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    };
    this.write(path, [...runs.filter((r) => r.saveId !== run.saveId), stored]);
    return { ...stored, createdAt: new Date(stored.createdAt) };
  }
  async listRuns(query: RunQuery) {
    const runs =
      this.read<Array<Omit<RunResultRecord, "createdAt"> & { createdAt: string }>>(
        join(this.dir, "runs.json"),
      ) ?? [];
    return filterRuns(
      runs.map((r) => ({ ...r, createdAt: new Date(r.createdAt) })),
      query,
    );
  }
  async disconnect() {}
}

// ----------------------------------------------------------------------------
// SQLite store through Prisma (loaded lazily: its native module is optional)
// ----------------------------------------------------------------------------

// biome-ignore lint/suspicious/noExplicitAny: the generated Prisma client is optional at build time
type AnyPrisma = any;

class SqliteStore implements Store {
  readonly kind = "sqlite" as const;
  /** Run results go to saves/runs.json while the RunResult table is missing (`prisma db push`). */
  private runsFallback: JsonStore | null = null;
  private runsChecked = false;
  constructor(private prisma: AnyPrisma) {}

  private async runs(): Promise<JsonStore | null> {
    if (this.runsChecked) return this.runsFallback;
    this.runsChecked = true;
    try {
      await this.prisma.runResult.count();
    } catch {
      console.warn(
        "[db] RunResult table missing (run `npx prisma db push`); keeping run results in ./saves/runs.json.",
      );
      this.runsFallback = new JsonStore();
    }
    return this.runsFallback;
  }

  static async open(): Promise<SqliteStore> {
    const { PrismaBetterSqlite3 } = await import("@prisma/adapter-better-sqlite3");
    const { PrismaClient } = await import("@prisma/client");
    const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL || "file:./dev.db" });
    const prisma = new PrismaClient({ adapter });
    // Fails here (not mid-game) when the native module or the tables are missing
    await prisma.saveGame.count();
    return new SqliteStore(prisma);
  }

  async createSave(data: Omit<StoredSave, "id" | "createdAt" | "updatedAt">) {
    return (await this.prisma.saveGame.create({ data })).id as string;
  }
  async getSave(id: string) {
    return this.prisma.saveGame.findUnique({ where: { id } });
  }
  async updateSave(
    id: string,
    data: Partial<Pick<StoredSave, "worldState" | "turn" | "llmUsage">>,
  ) {
    await this.prisma.saveGame.update({ where: { id }, data });
  }
  async deleteSave(id: string) {
    await this.prisma.turnLog.deleteMany({ where: { saveGameId: id } });
    await this.prisma.saveGame.delete({ where: { id } });
  }
  async listSaves(owners?: string[]) {
    return this.prisma.saveGame.findMany({
      where: owners ? { playerId: { in: owners } } : undefined,
      orderBy: { updatedAt: "desc" },
    });
  }
  async addTurnLog(saveId: string, turn: number, events: string, actions: string) {
    await this.prisma.turnLog.create({ data: { saveGameId: saveId, turn, events, actions } });
  }
  async turnLogs(saveId: string) {
    return this.prisma.turnLog.findMany({
      where: { saveGameId: saveId },
      orderBy: { turn: "asc" },
    });
  }
  async findPlayer(name: string) {
    return this.prisma.player.findUnique({ where: { name } });
  }
  async createPlayer(name: string, passwordHash: string) {
    return this.prisma.player.create({ data: { name, passwordHash } });
  }
  async saveRun(run: NewRunResult) {
    const fallback = await this.runs();
    if (fallback) return fallback.saveRun(run);
    return this.prisma.runResult.upsert({
      where: { saveId: run.saveId },
      create: run,
      update: run,
    });
  }
  async listRuns(query: RunQuery) {
    const fallback = await this.runs();
    if (fallback) return fallback.listRuns(query);
    return this.prisma.runResult.findMany({
      where: {
        ...(query.seatKey ? { seatKey: query.seatKey } : {}),
        ...(query.playerId ? { playerId: query.playerId } : {}),
        ...(query.guestId ? { guestId: query.guestId } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: query.limit ?? 200,
    });
  }
  async disconnect() {
    await this.prisma.$disconnect();
  }
}

let storePromise: Promise<Store> | null = null;

/** SQLite when it works, JSON files otherwise (or when DB_DRIVER=json). */
function store(): Promise<Store> {
  storePromise ??= (async () => {
    if ((process.env.DB_DRIVER ?? "").toLowerCase() === "json") return new JsonStore();
    try {
      return await SqliteStore.open();
    } catch (e) {
      const why = e instanceof Error ? e.message.split("\n")[0] : String(e);
      console.warn(
        `[db] SQLite unavailable (${why}); saving games as JSON files in ./saves instead.`,
      );
      return new JsonStore();
    }
  })();
  return storePromise;
}

const record = (s: StoredSave): SaveGameRecord => ({
  id: s.id,
  name: s.name,
  playerCountry: s.playerCountry,
  leaderName: s.leaderName ?? null,
  seed: s.seed,
  turn: s.turn,
  createdAt: s.createdAt,
  updatedAt: s.updatedAt,
});

/** A row of Saved games: the record plus what Replay and Branch need from its world. */
export interface SaveListing extends SaveGameRecord {
  mode?: string;
  scenarioId?: string;
  flashpointId?: string | null;
  difficulty?: string;
  maxTurns?: number;
  gameOver?: boolean;
  /** False for saves made before the replay record existed (no Branch). */
  branchable: boolean;
  whatIf?: boolean;
  opening?: string;
  /** The world's current date (YYYY-MM), for the branch picker's month names. */
  date?: string;
}

function listing(s: StoredSave): SaveListing {
  const base = record(s);
  try {
    const w = JSON.parse(s.worldState) as Partial<WorldState>;
    return {
      ...base,
      mode: w.mode,
      scenarioId: w.scenarioId,
      flashpointId: w.flashpointId ?? null,
      difficulty: w.difficulty,
      maxTurns: w.maxTurns,
      gameOver: !!w.gameOver,
      ...(typeof w.date === "string" ? { date: w.date } : {}),
      branchable: !!w.origin,
      ...(w.origin?.whatIf ? { whatIf: true } : {}),
      ...(w.origin?.opening ? { opening: w.origin.opening } : {}),
    };
  } catch {
    return { ...base, branchable: false };
  }
}

export class GameDatabase {
  async saveGame(
    name: string,
    worldState: WorldState,
    turnLogs: Turn[] = [],
    playerId?: string,
    leaderName?: string,
  ): Promise<string> {
    const db = await store();
    const id = await db.createSave({
      name,
      // Never persist a state that could not be loaded again
      worldState: JSON.stringify(WorldStateSchema.parse(worldState)),
      playerCountry: worldState.playerCountryId,
      playerId: playerId ?? null,
      leaderName: leaderName ?? null,
      llmUsage: null,
      seed: worldState.seed,
      turn: worldState.turn,
    });
    for (const turn of turnLogs)
      await db.addTurnLog(
        id,
        turn.number,
        JSON.stringify(turn.events),
        JSON.stringify(turn.intents),
      );
    return id;
  }

  async loadGame(
    saveId: string,
  ): Promise<{ worldState: WorldState; turnLogs: Turn[]; llmUsage: UsageTotals } | null> {
    const db = await store();
    const save = await db.getSave(saveId);
    if (!save) return null;
    const worldState = WorldStateSchema.parse(JSON.parse(save.worldState));
    const turnLogs: Turn[] = (await db.turnLogs(saveId)).map((r) => ({
      number: r.turn,
      date: "",
      events: JSON.parse(r.events),
      intents: JSON.parse(r.actions),
      playerActions: [],
      newspaper: [],
    }));
    const llmUsage = save.llmUsage ? (JSON.parse(save.llmUsage) as UsageTotals) : emptyUsage();
    return { worldState, turnLogs, llmUsage };
  }

  async updateSave(saveId: string, worldState: WorldState, llmUsage?: UsageTotals): Promise<void> {
    await (await store()).updateSave(saveId, {
      // Never persist a state that could not be loaded again
      worldState: JSON.stringify(WorldStateSchema.parse(worldState)),
      turn: worldState.turn,
      ...(llmUsage ? { llmUsage: JSON.stringify(llmUsage) } : {}),
    });
  }

  async deleteSave(saveId: string): Promise<void> {
    await (await store()).deleteSave(saveId);
  }

  /** Saves of one owner or several (an account and this browser's guest id), newest first. */
  async listSaves(owners?: string | string[]): Promise<SaveListing[]> {
    const ids = owners === undefined ? undefined : Array.isArray(owners) ? owners : [owners];
    return (await (await store()).listSaves(ids)).map(listing);
  }

  /** The account that owns a save (null for guest saves). */
  async getSaveOwner(saveId: string): Promise<string | null> {
    return (await (await store()).getSave(saveId))?.playerId ?? null;
  }

  async getSaveById(saveId: string): Promise<SaveGameRecord | null> {
    const s = await (await store()).getSave(saveId);
    return s ? record(s) : null;
  }

  async addTurnLog(saveId: string, turn: Turn): Promise<void> {
    await (await store()).addTurnLog(
      saveId,
      turn.number,
      JSON.stringify(turn.events),
      JSON.stringify(turn.intents),
    );
  }

  async findPlayer(name: string): Promise<PlayerRecord | null> {
    return (await store()).findPlayer(name);
  }

  async createPlayer(name: string, passwordHash: string): Promise<PlayerRecord> {
    return (await store()).createPlayer(name, passwordHash);
  }

  /** Record a finished session's result (replaces an earlier result for the same save). */
  async saveRun(run: NewRunResult): Promise<RunResultRecord> {
    return (await store()).saveRun(run);
  }

  async listRuns(query: RunQuery): Promise<RunResultRecord[]> {
    return (await store()).listRuns(query);
  }

  /** Which store is in use ("sqlite" or "json"), for the health check and the setup script. */
  async driver(): Promise<"sqlite" | "json"> {
    return (await store()).kind;
  }

  async disconnect(): Promise<void> {
    if (storePromise) await (await storePromise).disconnect();
  }
}

export const gameDb = new GameDatabase();
