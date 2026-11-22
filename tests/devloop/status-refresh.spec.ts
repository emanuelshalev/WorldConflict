// Status page protocol (devloop/kit/status-refresh.mjs, method/status-page.md): tier selection,
// generated sections, as-of stamps, owed hand fields, freshness, and the refreshes the loop
// controller owes after merges and stage exits. Every test works in a throwaway git repository.
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterAll, afterEach, describe, expect, it } from "vitest";
// @ts-expect-error: plain ESM module without type declarations
import * as loop from "../../devloop/kit/loop.mjs";
// @ts-expect-error: plain ESM module without type declarations
import * as sr from "../../devloop/kit/status-refresh.mjs";

const made: string[] = [];
afterAll(() => {
  for (const d of made) rmSync(d, { recursive: true, force: true });
});
afterEach(() => {
  delete process.env.DEVLOOP_NOW;
});

const git = (cwd: string, ...args: string[]) =>
  execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
function write(root: string, file: string, text: string) {
  mkdirSync(dirname(join(root, file)), { recursive: true });
  writeFileSync(join(root, file), text);
}

const LEDGER = [
  "| ID | Date | Type | Decision | Evidence | Alternatives | Expected effect | Reversal | Outcome |",
  "|---|---|---|---|---|---|---|---|---|",
  "| D-1 | 2026-01-01 | add | First call: do a thing | RS-1 | none | x | n/a | Done |",
  "| D-2 | 2026-01-02 | process | Use `code` and **bold**. More text | F-1 | none | y | z | Open |",
].join("\n");
const GOALS = [
  "# Goals",
  "## Track A: game",
  "| ID | Goal | Criteria | Source | Status |",
  "|---|---|---|---|---|",
  "| G1 | **Never blocked** | x | RS-1 | done |",
  "## Track B: practice",
  "| ID | Goal | Measured by | Source | Status |",
  "|---|---|---|---|---|",
  "| P1 | **Reusable** | y | CEO | doing |",
].join("\n");
const JOURNAL = [
  "# Journal",
  "intro",
  "## 2026-01-01 · Iteration 0 · Setup",
  "- **Observation.** One <thing>. **Change.** Another.",
  "- Second item",
  "## 2026-01-02 · Iteration 1 · Round",
  "- Third",
].join("\n");
const PAGE = "<html><script>/*GEN:START*/const GEN = {};/*GEN:END*/\n/*STAMPS:START*/const STAMPS = {};/*STAMPS:END*/</script></html>";

function makeRepo() {
  const root = mkdtempSync(join(tmpdir(), "devloop-status-"));
  made.push(root);
  git(root, "init", "-q", "-b", "dev");
  git(root, "config", "user.email", "t@example.com");
  git(root, "config", "user.name", "Test");
  git(root, "config", "commit.gpgsign", "false");
  write(root, "inst/ledger.md", LEDGER);
  write(root, "inst/goals.md", GOALS);
  write(root, "inst/journal.md", JOURNAL);
  write(root, "inst/gate.md", "# Gate\n- Recommend >= 7\n- No S1\n");
  write(root, "inst/regressions.yaml", "findings:\n  - id: F-1\n    title: x\n    guards:\n      - vitest: a.spec.ts\n      - script: b.mjs\n");
  write(root, "inst/runs/iter-02/work-packages.json", JSON.stringify([{ id: "WP-1", title: "Build it", status: "doing" }]));
  write(root, "HOW.md", "Version 1.5, x\n1. **First rule.** Do it.\n2. **Second**: more.\n");
  write(root, "status.html", PAGE);
  write(root, "inst/loop/config.json", JSON.stringify({
    stages: ["Plan", "Build", "Use", "Triage", "Report", "Gate"],
    gates: ["verify", "status-refresh", "triage"],
    rules: {
      "status-refresh-owed": { on: "enter:*", match: "owed" },
      "t3-before-plan": { on: "enter:Plan", gate: "status-refresh", match: "stage", minTier: "T3" },
    },
    owes: { merge: "T1", "exit:Use": "T2", "exit:Triage": "T2" },
    sharedBranch: "dev",
    statusProtocol: "../status-protocol.json",
  }));
  write(root, "inst/status-protocol.json", JSON.stringify({
    page: "status.html",
    loopConfig: "loop/config.json",
    tierEvents: {
      T0: [{ loop: ["init", "transition"] }],
      T1: [{ loop: ["merge"] }],
      T2: [{ loopTransitionFrom: ["Use", "Triage"] }],
      T3: [{ loopTransitionFrom: ["Gate"] }],
      T4: [],
    },
    sections: [
      { id: "loop-state", tier: "T0", source: "generated", el: "a", gen: { kind: "loop" } },
      { id: "now", tier: "T1", source: "hand", el: "b", fields: ["LOOP.now"] },
      { id: "decisions", tier: "T1", source: "generated", el: "c", gen: { kind: "ledger", from: "ledger.md" } },
      { id: "tasks", tier: "T1", source: "generated", gen: { kind: "tasks" } },
      { id: "stability", tier: "T1", source: "generated", gen: { kind: "stability", registry: "regressions.yaml" } },
      { id: "kpis", tier: "T1", source: "generated", gen: { kind: "kpis", items: [{ label: "Iteration", kind: "iteration" }, { label: "Guarded", kind: "stability" }, { label: "Last", kind: "ledger-last", from: "ledger.md" }] } },
      { id: "gate", tier: "T2", source: "generated", gen: { kind: "bullets", from: "gate.md" } },
      { id: "goals", tier: "T3", source: "generated", gen: { kind: "goals", from: "goals.md" } },
      { id: "journal", tier: "T3", source: "generated", gen: { kind: "journal", from: "journal.md" } },
      { id: "how", tier: "T4", source: "generated", gen: { kind: "how", from: "../HOW.md" } },
    ],
  }));
  git(root, "add", "-A");
  git(root, "commit", "-q", "-m", "init");
  const ctx = loop.loadLoop({ cwd: root, config: join(root, "inst/loop/config.json") });
  return { root, ctx, proto: join(root, "inst/status-protocol.json"), page: join(root, "status.html") };
}

const quiet = { check: false, log: () => {} };

describe("status refresh: tiers and generators", () => {
  it("selects the sections of a tier and every tier below it", () => {
    const proto = { sections: [{ id: "a", tier: "T0" }, { id: "b", tier: "T1" }, { id: "c", tier: "T2" }, { id: "d", tier: "T4" }] };
    expect(sr.selectSections(proto, "T0").map((s: { id: string }) => s.id)).toEqual(["a"]);
    expect(sr.selectSections(proto, "T2").map((s: { id: string }) => s.id)).toEqual(["a", "b", "c"]);
    expect(sr.selectSections(proto, "T4")).toHaveLength(4);
  });

  it("generates decisions, goals, journal, gate, how, tasks, stability and KPI cards from their sources", async () => {
    const { ctx, proto, page } = makeRepo();
    loop.init(ctx, { iteration: 2, stage: "Build" });
    await sr.refresh(proto, { tier: "T4", ...quiet, record: false });
    const gen = sr.readBlock(readFileSync(page, "utf8"), "GEN");
    expect(gen.decisions.map((d: { id: string }) => d.id)).toEqual(["D-2", "D-1"]);
    expect(gen.decisions[0]).toMatchObject({ open: true, outcome: "Open", title: "Use code and bold" });
    expect(gen.decisions[1].open).toBe(false);
    expect(gen.goals).toEqual([["G1", "A", "Never blocked", "RS-1", "done"], ["P1", "B", "Reusable", "CEO", "doing"]]);
    expect(gen.journal).toHaveLength(2);
    expect(gen.journal[0]).toMatchObject({ date: "2026-01-01", iter: 0, title: "Setup" });
    expect(gen.journal[0].items[0]).toBe("<b>Observation.</b> One &lt;thing&gt;. <b>Change.</b> Another.");
    expect(gen.gate).toEqual(["Recommend &gt;= 7", "No S1"]);
    expect(gen.how).toEqual({ version: "1.5", principles: [["First rule", "Do it."], ["Second", "more."]] });
    expect(gen.tasks[0]).toMatchObject({ id: "WP-1", s: "doing", m: "Iter 2" });
    expect(gen.stability).toMatchObject({ findings: 1, guards: 2, verify: null });
    expect(gen["loop-state"]).toMatchObject({ iteration: 2, stage: "Build", stageIndex: 2 });
    expect(gen.kpis).toEqual([["Iteration", "2"], ["Guarded", "1 <small>2 guards</small>"], ["Last", "D-2"]]);
  });
});

describe("status refresh: stamps, owed hand fields and freshness", () => {
  it("stamps only the refreshed tiers, lists owed hand fields and records once they are written", async () => {
    const { root, ctx, proto, page } = makeRepo();
    process.env.DEVLOOP_NOW = "2026-02-01T10:00:00Z";
    loop.init(ctx, { iteration: 2, stage: "Build" });
    const r1 = await sr.refresh(proto, { tier: "T1", ...quiet });
    const stamps = sr.readBlock(readFileSync(page, "utf8"), "STAMPS");
    expect(Object.keys(stamps).sort()).toEqual(["decisions", "kpis", "loop-state", "stability", "tasks"]);
    expect(stamps.decisions).toMatchObject({ t: "2026-02-01T10:00:00.000Z", commit: git(root, "rev-parse", "--short", "HEAD"), tier: "T1", source: "generated", el: "c" });
    expect(r1.owed).toEqual(["now"]);
    expect(r1.recorded).toBeNull();
    const r2 = await sr.refresh(proto, { tier: "T1", hand: ["now"], ...quiet });
    expect(r2.owed).toEqual([]);
    expect(r2.recorded).toMatchObject({ gate: "status-refresh", tier: "T1" });
    expect(sr.readBlock(readFileSync(page, "utf8"), "STAMPS").now.source).toBe("hand");
  });

  it("marks a section stale when its tier had an event after the stamp", async () => {
    const { ctx, proto, page } = makeRepo();
    process.env.DEVLOOP_NOW = "2026-02-01T10:00:00Z";
    loop.init(ctx, { iteration: 2, stage: "Build" });
    await sr.refresh(proto, { tier: "T3", hand: ["now"], ...quiet });
    const fresh = async () => {
      const c = await sr.loadProtocol(proto);
      return Object.fromEntries(sr.freshness(c, sr.readBlock(readFileSync(page, "utf8"), "STAMPS")).map((f: { id: string; stale: boolean }) => [f.id, f.stale]));
    };
    expect((await fresh()).decisions).toBe(false);
    process.env.DEVLOOP_NOW = "2026-02-01T11:00:00Z";
    loop.appendEvent(ctx, { kind: "merge", branch: "x" });
    const f = await fresh();
    expect(f.decisions).toBe(true);
    expect(f.now).toBe(true);
    expect(f.goals).toBe(false); // T3 had no event
    expect(f["loop-state"]).toBe(false); // T0 had no event
    expect(f.how).toBe(true); // T4 was not refreshed: a generated section without a stamp is stale
  });
});

describe("controller: refreshes owed by loop events", () => {
  it("a merge owes T1 and blocks the next transition until a T1 refresh is recorded", async () => {
    const { ctx, proto } = makeRepo();
    process.env.DEVLOOP_NOW = "2026-02-01T10:00:00Z";
    loop.init(ctx, { iteration: 2, stage: "Build" });
    process.env.DEVLOOP_NOW = "2026-02-01T10:01:00Z";
    loop.owe(ctx, "T1", "merge of x");
    expect(() => loop.advance(ctx)).toThrow(/status refresh owed: T1/);
    process.env.DEVLOOP_NOW = "2026-02-01T10:02:00Z";
    await sr.refresh(proto, { tier: "T1", hand: ["now"], ...quiet });
    loop.advance(ctx);
    expect(loop.readState(ctx).stage).toBe("Use");
  });

  it("Use and Triage done owe T2; a lower tier does not clear it", async () => {
    const { ctx, proto } = makeRepo();
    process.env.DEVLOOP_NOW = "2026-02-01T10:00:00Z";
    loop.init(ctx, { iteration: 2, stage: "Use" });
    process.env.DEVLOOP_NOW = "2026-02-01T10:01:00Z";
    loop.advance(ctx); // Use -> Triage, owes T2
    expect(loop.owedNow(loop.readState(ctx))).toMatchObject([{ tier: "T2", because: "Use done" }]);
    process.env.DEVLOOP_NOW = "2026-02-01T10:02:00Z";
    await sr.refresh(proto, { tier: "T1", hand: ["now"], ...quiet });
    expect(() => loop.advance(ctx)).toThrow(/owed: T2/);
    await sr.refresh(proto, { tier: "T2", hand: ["now"], ...quiet });
    expect(loop.owedNow(loop.readState(ctx))).toEqual([]);
  });

  it("Gate needs a T3 refresh during the Gate stage before the next Plan", async () => {
    const { ctx, proto } = makeRepo();
    process.env.DEVLOOP_NOW = "2026-02-01T10:00:00Z";
    loop.init(ctx, { iteration: 2, stage: "Gate" });
    process.env.DEVLOOP_NOW = "2026-02-01T10:01:00Z";
    await sr.refresh(proto, { tier: "T2", hand: ["now"], ...quiet });
    expect(() => loop.advance(ctx)).toThrow(/t3-before-plan/);
    await sr.refresh(proto, { tier: "T3", hand: ["now"], ...quiet });
    loop.advance(ctx);
    expect(loop.readState(ctx)).toMatchObject({ iteration: 3, stage: "Plan" });
  });
});
