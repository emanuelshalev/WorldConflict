import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore: Map<string, RateLimitEntry> = new Map();

function getClientId(request: FastifyRequest): string {
  const forwarded = request.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0].trim();
  }
  return request.ip ?? "unknown";
}

function checkRateLimit(clientId: string, path: string, config: RateLimitConfig): boolean {
  const key = `${clientId}:${path}`;
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetTime) {
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + config.windowMs,
    });
    return true;
  }

  if (entry.count >= config.maxRequests) {
    return false;
  }

  entry.count++;
  return true;
}

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  "/api/turn": { windowMs: 1000, maxRequests: 1 },
  "/api/chat/advisor": { windowMs: 1000, maxRequests: 5 },
  default: { windowMs: 1000, maxRequests: 10 },
};

export function setupRateLimit(fastify: FastifyInstance): void {
  fastify.addHook("preHandler", async (request: FastifyRequest, reply: FastifyReply) => {
    const clientId = getClientId(request);
    const path = request.url.split("?")[0];

    const config = RATE_LIMITS[path] ?? RATE_LIMITS.default;

    if (!checkRateLimit(clientId, path, config)) {
      return reply.status(429).send({
        success: false,
        error: "Too many requests",
        code: "RATE_LIMIT_EXCEEDED",
        retryAfter: Math.ceil(config.windowMs / 1000),
      });
    }
  });
}

export function clearRateLimitStore(): void {
  rateLimitStore.clear();
}

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 60000);
