import { PrismaClient } from "@prisma/client";
import { type Turn, type WorldState, WorldStateSchema } from "../core/types.js";

const prisma = new PrismaClient();

export interface SaveGameRecord {
  id: string;
  name: string;
  playerCountry: string;
  seed: number;
  turn: number;
  createdAt: Date;
  updatedAt: Date;
}

export class GameDatabase {
  async saveGame(name: string, worldState: WorldState, turnLogs: Turn[] = []): Promise<string> {
    const saveGame = await prisma.saveGame.create({
      data: {
        name,
        worldState: JSON.stringify(worldState),
        playerCountry: worldState.playerCountryId,
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

  async loadGame(saveId: string): Promise<{ worldState: WorldState; turnLogs: Turn[] } | null> {
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

    return { worldState, turnLogs };
  }

  async updateSave(saveId: string, worldState: WorldState): Promise<void> {
    await prisma.saveGame.update({
      where: { id: saveId },
      data: {
        worldState: JSON.stringify(worldState),
        turn: worldState.turn,
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

  async listSaves(): Promise<SaveGameRecord[]> {
    const saves = await prisma.saveGame.findMany({
      orderBy: { updatedAt: "desc" },
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
