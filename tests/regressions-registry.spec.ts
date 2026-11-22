// Meta-test for the findings regression registry (devloop/instances/world-conflict/regressions.yaml):
// every addressed finding has a guard, every guard file and test name still exists, and every
// backlog item marked Done is listed. The guards themselves run in `npm run verify`.
import path from "node:path";
import { describe, expect, it } from "vitest";
// @ts-expect-error: plain ESM module without type declarations
import { checkRegistry, loadRegistry } from "../devloop/kit/regressions.mjs";

const root = path.resolve(__dirname, "..");
const file = path.join(root, "devloop/instances/world-conflict/regressions.yaml");

describe("findings regression registry", () => {
  it("lists every addressed finding with a guard that still exists", () => {
    const reg = loadRegistry(file);
    expect(reg.findings.length).toBeGreaterThan(0);
    expect(checkRegistry(reg, root)).toEqual([]);
  });
});
