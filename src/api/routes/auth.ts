import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { prisma } from "../../infra/db.js";

const CredentialsSchema = z.object({
  name: z.string().min(2).max(32).trim(),
  password: z.string().min(3).max(128),
});

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

export async function authRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post(
    "/register",
    async (
      request: FastifyRequest<{ Body: z.infer<typeof CredentialsSchema> }>,
      reply: FastifyReply,
    ) => {
      try {
        const { name, password } = CredentialsSchema.parse(request.body);
        const existing = await prisma.player.findUnique({ where: { name } });
        if (existing) {
          return reply.status(409).send({ success: false, error: "That name is already taken" });
        }
        const player = await prisma.player.create({
          data: { name, passwordHash: hashPassword(password) },
        });
        return reply.send({ success: true, player: { id: player.id, name: player.name } });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(400).send({
          success: false,
          error:
            error instanceof z.ZodError
              ? "Name must be 2-32 characters and password at least 3"
              : "Registration failed",
        });
      }
    },
  );

  fastify.post(
    "/login",
    async (
      request: FastifyRequest<{ Body: z.infer<typeof CredentialsSchema> }>,
      reply: FastifyReply,
    ) => {
      try {
        const { name, password } = CredentialsSchema.parse(request.body);
        const player = await prisma.player.findUnique({ where: { name } });
        if (!player || !verifyPassword(password, player.passwordHash)) {
          return reply.status(401).send({ success: false, error: "Wrong name or password" });
        }
        return reply.send({ success: true, player: { id: player.id, name: player.name } });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(400).send({ success: false, error: "Login failed" });
      }
    },
  );
}
