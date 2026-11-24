// The API rate limit and its gate-only multiplier (RATE_LIMIT_SCALE): unset, /api/turn allows 4
// calls a second per client; the verify gate's server multiplies every limit so finding guards
// running in parallel against it do not use up each other's budget.
import Fastify from "fastify";
import { afterEach, describe, expect, it } from "vitest";
import { clearRateLimitStore, rateLimitScale, setupRateLimit } from "../../src/api/middleware/rateLimit.js";

async function burst(n: number) {
  const app = Fastify();
  setupRateLimit(app);
  app.post("/api/turn", async () => ({ ok: true }));
  await app.ready();
  const codes: number[] = [];
  for (let i = 0; i < n; i++) codes.push((await app.inject({ method: "POST", url: "/api/turn" })).statusCode);
  await app.close();
  return codes;
}

describe("rate limit", () => {
  afterEach(() => {
    delete process.env.RATE_LIMIT_SCALE;
    clearRateLimitStore();
  });

  it("allows 4 /api/turn calls a second by default", async () => {
    const codes = await burst(6);
    expect(codes.filter((c) => c === 200)).toHaveLength(4);
    expect(codes.slice(4)).toEqual([429, 429]);
  });

  it("multiplies the limits by RATE_LIMIT_SCALE, and ignores a value below 1 or not a number", async () => {
    process.env.RATE_LIMIT_SCALE = "3";
    expect((await burst(13)).filter((c) => c === 200)).toHaveLength(12);
    for (const v of ["0", "-2", "x", ""]) {
      process.env.RATE_LIMIT_SCALE = v;
      expect(rateLimitScale()).toBe(1);
    }
  });
});
