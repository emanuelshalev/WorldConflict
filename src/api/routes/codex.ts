import { createHash } from "node:crypto";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { type CodexPayload, codexForGame } from "../../core/codex.js";
import { createDataLoader, type DataLoader } from "../../core/data-loader.js";

const QuerySchema = z.object({
  scenario: z
    .string()
    .regex(/^[\w-]+$/)
    .optional(),
  flashpoint: z
    .string()
    .regex(/^[\w-]+$/)
    .optional(),
});

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/**
 * `GET /api/codex?scenario=2026&flashpoint=ceasefire-or-collapse` (design-learn.md §7.3):
 * the codex entries valid at the game's start month with era overrides applied, and the
 * situation briefings for the flashpoint and the scenario. Static content, so it is cached by
 * content hash (`ETag`, `If-None-Match` → 304) for a day.
 */
export async function codexRoutes(
  fastify: FastifyInstance,
  opts: { loader?: DataLoader } = {},
): Promise<void> {
  const loader = opts.loader ?? createDataLoader();
  const payloads = new Map<string, { body: CodexPayload & { success: true }; etag: string }>();

  fastify.get("/codex", async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = QuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({ success: false, error: "Bad scenario or flashpoint id" });
    }
    const { scenario, flashpoint } = parsed.data;
    const key = `${scenario ?? ""}|${flashpoint ?? ""}`;
    let cached = payloads.get(key);
    if (!cached) {
      let scenarioId = scenario ?? "2026";
      let date: string | undefined;
      if (flashpoint) {
        const fp = loader.loadAvailableFlashpoints().find((f) => f.id === flashpoint);
        if (!fp) return reply.status(404).send({ success: false, error: "Unknown flashpoint" });
        scenarioId = scenario ?? fp.scenarioId;
        date = fp.date;
      }
      const sc = loader.loadAvailableScenarios().find((s) => s.id === scenarioId);
      if (!sc) return reply.status(404).send({ success: false, error: "Unknown scenario" });
      date ??= `${sc.startYear}-${pad(sc.startMonth)}`;
      const game = codexForGame(loader.loadCodex(), {
        scenarioId,
        date,
        flashpointId: flashpoint ?? null,
      });
      const version = createHash("sha256").update(JSON.stringify(game)).digest("hex").slice(0, 16);
      cached = { body: { success: true, version, ...game }, etag: `"${version}"` };
      payloads.set(key, cached);
    }
    reply.header("ETag", cached.etag);
    reply.header("Cache-Control", "public, max-age=86400");
    if (request.headers["if-none-match"] === cached.etag) return reply.status(304).send();
    return cached.body;
  });
}
