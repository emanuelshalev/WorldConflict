import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client";
import { emptyUsage, type UsageTotals } from "../agents/usage.js";
import { type Turn, type WorldState, WorldStateSchema } from "../core/types.js";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL || "file:./dev.db",
});

const prisma = new PrismaClient({ adapter });

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

export class GameDatabase {
  async saveGame(
    name: string,
    worldState: WorldState,
    turnLogs: Turn[] = [],
    playerId?: string,
    leaderName?: string,
  ): Promise<string> {
    const saveGame = await prisma.saveGame.create({
      data: {
        name,
        worldState: JSON.stringify(worldState),
        playerCountry: worldState.playerCountryId,
        playerId: playerId ?? null,
        leaderName: leaderName ?? null,
        seed: worldState.seed,
        turn: worldState.turn,
      },
    });

    for (const turn of turnLogs) {
      await prisma.turnLog.create({
        data: {
          saveGameId: saveGame.id,
          turn: turn.number,
          events: JSON.stringify(turn.events),
          actions: JSON.stringify(turn.intents),
        },
      });
    }

    return saveGame.id;
  }

  async loadGame(
    saveId: string,
  ): Promise<{ worldState: WorldState; turnLogs: Turn[]; llmUsage: UsageTotals } | null> {
    const saveGame = await prisma.saveGame.findUnique({
      where: { id: saveId },
    });

    if (!saveGame) {
      return null;
    }

    const worldState = WorldStateSchema.parse(JSON.parse(saveGame.worldState));

    const turnLogRecords = await prisma.turnLog.findMany({
      where: { saveGameId: saveId },
      orderBy: { turn: "asc" },
    });

    const turnLogs: Turn[] = turnLogRecords.map((record) => ({
      number: record.turn,
      date: "",
      events: JSON.parse(record.events),
      intents: JSON.parse(record.actions),
      playerActions: [],
      newspaper: [],
    }));

    const llmUsage = saveGame.llmUsage
      ? (JSON.parse(saveGame.llmUsage) as UsageTotals)
      : emptyUsage();

    return { worldState, turnLogs, llmUsage };
  }

  async updateSave(saveId: string, worldState: WorldState, llmUsage?: UsageTotals): Promise<void> {
    await prisma.saveGame.update({
      where: { id: saveId },
      data: {
        worldState: JSON.stringify(worldState),
        turn: worldState.turn,
        ...(llmUsage ? { llmUsage: JSON.stringify(llmUsage) } : {}),
      },
    });
  }

  async deleteSave(saveId: string): Promise<void> {
    await prisma.turnLog.deleteMany({
      where: { saveGameId: saveId },
    });

    await prisma.saveGame.delete({
      where: { id: saveId },
    });
  }

  async listSaves(playerId?: string): Promise<SaveGameRecord[]> {
    const saves = await prisma.saveGame.findMany({
      where: playerId ? { playerId } : undefined,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        playerCountry: true,
        leaderName: true,
        seed: true,
        turn: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return saves;
  }

  async getSaveById(saveId: string): Promise<SaveGameRecord | null> {
    return prisma.saveGame.findUnique({
      where: { id: saveId },
      select: {
        id: true,
        name: true,
        playerCountry: true,
        seed: true,
        turn: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async addTurnLog(saveId: string, turn: Turn): Promise<void> {
    await prisma.turnLog.create({
      data: {
        saveGameId: saveId,
        turn: turn.number,
        events: JSON.stringify(turn.events),
        actions: JSON.stringify(turn.intents),
      },
    });
  }

  async disconnect(): Promise<void> {
    await prisma.$disconnect();
  }
}

export const gameDb = new GameDatabase();

export { prisma };
