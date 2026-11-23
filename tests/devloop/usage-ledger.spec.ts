// Usage ledger (devloop/kit/usage-ledger.mjs, D-82): per-model price math, the weighted number's
// ratios, agent classification (including auto iterations and work packages) and the package and
// trial tables, on a throwaway project directory of small fixture transcripts.
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

type Any = Record<string, any>;

const made: string[] = [];
afterAll(() => {
  for (const d of made) rmSync(d, { recursive: true, force: true });
});

const PRICES = {
  "claude-opus-5-5": { input: 4, cacheWrite5m: 5, cacheWrite1h: 8, cacheRead: 0.2, output: 20 },
  "claude-sonnet-5-5": { input: 2, cacheWrite5m: 2.5, cacheWrite1h: 4, cacheRead: 0.1, output: 10 },
};

function turn(id: string, t: string, model: string, usage: Any) {
  return JSON.stringify({
    type: "assistant",
    timestamp: t,
    message: { id, model, content: [], usage },
  });
}
const M = 1_000_000;
// 1M of each token type: input, 5 minute write (1M total minus 0.5M one hour), 1 hour write, read, output.
const usage1 = {
  input_tokens: M,
  cache_creation_input_tokens: M,
  cache_creation: { ephemeral_1h_input_tokens: M / 2 },
  cache_read_input_tokens: M,
  output_tokens: M,
};

function write(file: string, text: string) {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, text);
}

function fixture(agents: Array<{ label: string; model: string; t: string; usage?: Any }>) {
  const root = mkdtempSync(join(tmpdir(), "usage-ledger-"));
  made.push(root);
  const sid = "sess";
  write(join(root, `${sid}.jsonl`), `${turn("m1", "2026-01-01T00:10:00Z", "claude-opus-5-5", usage1)}\n`);
  agents.forEach((a, i) => {
    const f = join(root, sid, "subagents", `agent-${i}.jsonl`);
    write(f, `${turn(`a${i}`, a.t, a.model, a.usage ?? usage1)}\n${turn(`a${i}`, a.t, a.model, a.usage ?? usage1)}\n`);
    write(f.replace(/\.jsonl$/, ".meta.json"), JSON.stringify({ description: a.label }));
  });
  const reg = {
    projectDir: root,
    sessions: [sid],
    loopStart: "2026-01-01T00:00:00Z",
    orchestrator: { role: "Group Manager", windows: [{ from: "2026-01-01T00:00:00Z", iteration: 0, stage: "Plan" }] },
    iterationWindows: [
      { from: "2026-01-01T00:00:00Z", iteration: 1 },
      { from: "2026-01-02T00:00:00Z", iteration: 2 },
    ],
    prices: PRICES,
    rules: [
      { desc: "^Customer (\\w+) iter-(\\d+)", role: "Customer", group: "Customers", persona: "$1", iteration: "$2", stage: "Use" },
      { desc: "^Build: .*UI", role: "Frontend Engineer", group: "Engineers", iteration: "auto", stage: "Build", workPackage: "$label" },
      { desc: "^Build", role: "Engine Engineer", group: "Engineers", iteration: "auto", stage: "Build", workPackage: "$label" },
      { desc: "lookup$", role: "Researcher", group: "Research", iteration: "auto", stage: "Plan" },
    ],
  };
  const regFile = join(root, "registry.json");
  writeFileSync(regFile, JSON.stringify(reg));
  const out = execFileSync("node", ["devloop/kit/usage-ledger.mjs", regFile, "--json"], { encoding: "utf8" });
  return JSON.parse(out) as Any;
}

describe("usage ledger prices", () => {
  it("prices every token type at the model's own list price", () => {
    const o = fixture([{ label: "Build: engine", model: "claude-sonnet-5-5", t: "2026-01-01T01:00:00Z" }]);
    const a = o.agents[0];
    // Duplicated streaming responses count once: 1M of each type at Sonnet prices.
    expect(a.cost).toEqual({ input: 2, cacheWrite5m: 1.25, cacheWrite1h: 2, cacheRead: 0.1, output: 10 });
    expect(a.usd).toBeCloseTo(15.35, 2);
    // Opus orchestrator turn: 4 + 2.5 + 4 + 0.2 + 20.
    expect(o.byModel.find((m: Any) => m.key === "claude-opus-5-5").usd).toBeCloseTo(30.7, 2);
    expect(o.loop.usd).toBeCloseTo(46.05, 2);
    expect(o.unpricedModels).toEqual([]);
  });

  it("keeps the cache read to input ratio of the model in weighted", () => {
    const readOnly = { input_tokens: 0, cache_read_input_tokens: M, output_tokens: 0 };
    const inputOnly = { input_tokens: M, cache_read_input_tokens: 0, output_tokens: 0 };
    const o = fixture([
      { label: "Build: a", model: "claude-opus-5-5", t: "2026-01-01T01:00:00Z", usage: readOnly },
      { label: "Build: b", model: "claude-opus-5-5", t: "2026-01-01T01:00:00Z", usage: inputOnly },
    ]);
    const read = o.agents.find((a: Any) => a.label === "Build: a");
    const input = o.agents.find((a: Any) => a.label === "Build: b");
    expect(input.weighted).toBe(M);
    expect(read.weighted / input.weighted).toBeCloseTo(0.05, 5);
  });

  it("matches dated model ids by prefix and flags a model without a price", () => {
    const o = fixture([
      { label: "Build: dated", model: "claude-opus-5-5-20261101", t: "2026-01-01T01:00:00Z" },
      { label: "Build: unknown", model: "claude-mystery-1", t: "2026-01-01T01:00:00Z" },
    ]);
    expect(o.agents.find((a: Any) => a.label === "Build: dated").usd).toBeCloseTo(30.7, 2);
    expect(o.agents.find((a: Any) => a.label === "Build: unknown").usd).toBe(0);
    expect(o.unpricedModels).toEqual(["claude-mystery-1"]);
  });
});

describe("usage ledger classification and packages", () => {
  const agents = [
    { label: "Customer Dan iter-2 session", model: "claude-opus-5-5", t: "2026-01-01T02:00:00Z" },
    { label: "Build: month UI", model: "claude-opus-5-5", t: "2026-01-01T03:00:00Z" },
    { label: "Build: guards", model: "claude-sonnet-5-5", t: "2026-01-02T03:00:00Z" },
    { label: "Build WP1+WP3: glossary", model: "claude-sonnet-5-5", t: "2026-01-02T04:00:00Z" },
    { label: "Cost guidance lookup", model: "claude-haiku-5-5", t: "2026-01-01T05:00:00Z" },
    { label: "Something nobody ruled on", model: "claude-opus-5-5", t: "2026-01-01T06:00:00Z" },
  ];

  it("fills captures, resolves auto iterations by time and leaves unmatched labels visible", () => {
    const o = fixture(agents);
    const by = (l: string) => o.agents.find((a: Any) => a.label === l);
    expect(by("Customer Dan iter-2 session")).toMatchObject({ persona: "Dan", iteration: 2, stage: "Use" });
    expect(by("Build: month UI")).toMatchObject({ role: "Frontend Engineer", iteration: 1, workPackage: "month UI" });
    expect(by("Build: guards")).toMatchObject({ role: "Engine Engineer", iteration: 2, workPackage: "guards" });
    expect(by("Build WP1+WP3: glossary").workPackage).toBe("glossary");
    expect(by("Cost guidance lookup")).toMatchObject({ group: "Research", iteration: 1 });
    expect(by("Something nobody ruled on")).toMatchObject({ group: "Unclassified", role: "Unclassified" });
  });

  it("builds the package table and groups packages by model", () => {
    const o = fixture(agents);
    expect(o.byPackage.map((p: Any) => p.key).sort()).toEqual(["glossary", "guards", "month UI"]);
    const ui = o.byPackage.find((p: Any) => p.key === "month UI");
    expect(ui).toMatchObject({ model: "claude-opus-5-5", agents: 1, iteration: 1 });
    expect(ui.usd).toBeCloseTo(30.7, 2);
    const opus = o.trial.find((t: Any) => t.key === "claude-opus-5-5");
    const sonnet = o.trial.find((t: Any) => t.key === "claude-sonnet-5-5");
    expect(opus.packages).toBe(1);
    expect(sonnet.packages).toBe(2);
    expect(sonnet.usd).toBeCloseTo(30.7, 2);
    expect(sonnet.usdPerPackage).toBeCloseTo(15.35, 2);
  });
});
