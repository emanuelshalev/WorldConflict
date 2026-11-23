// Quality evaluation (devloop/kit/evaluate.mjs, devloop/method/quality.md): verdict rules (within
// noise, staleness, veto, not measured), the trend, the adapters on a throwaway instance in a
// throwaway git repository, recording the verdict with the loop controller and the Gate rule that
// reads it, and the World Conflict spec itself.
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
// @ts-expect-error: plain ESM module without type declarations
import * as q from "../../devloop/kit/evaluate.mjs";
// @ts-expect-error: plain ESM module without type declarations
import * as loop from "../../devloop/kit/loop.mjs";

type Any = Record<string, any>;

const made: string[] = [];
afterAll(() => {
  for (const d of made) rmSync(d, { recursive: true, force: true });
});

const git = (cwd: string, ...args: string[]) =>
  execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();

function write(root: string, file: string, text: string) {
  mkdirSync(dirname(join(root, file)), { recursive: true });
  writeFileSync(join(root, file), text);
}

const m = (over: Any = {}) => ({ id: "x", label: "X", direction: "higher", threshold: 6, cadence: "per-iteration", noise: { kind: "none", why: "t" }, ...over });

// a judging context without git: commits are equal when their names are
const jctx = (over: Any = {}) => ({
  iteration: 3,
  commit: "c3",
  now: Date.parse("2026-11-22T12:00:00Z"),
  sameCode: (a: string, b: string) => a === b,
  iterationAt: (t: string) => (Date.parse(t) <= Date.parse("2026-11-22T00:00:00Z") ? 2 : 3),
  releaseSince: null,
  ...over,
});

describe("quality: status of one metric", () => {
  it("higher, lower and bool pass and fail at the threshold", () => {
    expect(q.classify(6, m())).toBe("pass");
    expect(q.classify(5.9, m())).toBe("fail");
    expect(q.classify(0, m({ direction: "lower", threshold: 0 }))).toBe("pass");
    expect(q.classify(1, m({ direction: "lower", threshold: 0 }))).toBe("fail");
    expect(q.classify(true, m({ direction: "bool" }))).toBe("pass");
    expect(q.classify(false, m({ direction: "bool" }))).toBe("fail");
    expect(q.classify(Number.NaN, m())).toBe("fail");
  });

  it("is within noise, neither pass nor fail, inside the band", () => {
    // persona scores +/- 1 (D-59): 6 against a floor of 6 is undecided, 5 fails, 7 passes
    expect(q.classify(6, m(), 1)).toBe("noise");
    expect(q.classify(5, m(), 1)).toBe("fail");
    expect(q.classify(7, m(), 1)).toBe("pass");
    expect(q.classify(6.9, m({ threshold: 7 }), 0.25)).toBe("noise");
    expect(q.classify(7.2, m({ threshold: 7 }), 0.25)).toBe("noise");
    expect(q.classify(7.25, m({ threshold: 7 }), 0.25)).toBe("pass");
    expect(q.classify(6.7, m({ threshold: 7 }), 0.25)).toBe("fail");
    expect(q.classify(2, m({ direction: "lower", threshold: 1 }), 2)).toBe("noise");
  });

  it("derives the band from the source's standard error; a veto ignores the band", () => {
    expect(q.noiseBand(m({ noise: { kind: "fixed", band: 1, why: "t" } })).band).toBe(1);
    expect(q.noiseBand(m({ noise: { kind: "derived", k: 2, why: "t" } }), { se: 0.2 }).band).toBe(0.4);
    expect(q.noiseBand(m({ noise: { kind: "derived", why: "t" } }), {}).band).toBe(0);
    expect(q.noiseBand(m({ veto: true, noise: { kind: "fixed", band: 3, why: "t" } })).band).toBe(0);
  });
});

describe("quality: staleness", () => {
  it("per-commit needs the evaluated commit (or the same code)", () => {
    expect(q.freshnessOf(m({ cadence: "per-commit" }), { commit: "c3" }, jctx()).fresh).toBe(true);
    const r = q.freshnessOf(m({ cadence: "per-commit" }), { commit: "c2", iteration: 3 }, jctx());
    expect(r.fresh).toBe(false);
    expect(r.reason).toMatch(/stale: measured on commit c2/);
    expect(q.freshnessOf(m({ cadence: "per-commit" }), { commit: "c2" }, jctx({ sameCode: () => true })).fresh).toBe(true);
    expect(q.freshnessOf(m({ cadence: "per-commit" }), { iteration: 3 }, jctx()).fresh).toBe(false);
  });

  it("per-iteration takes the measurement's iteration, else its commit, else its time", () => {
    expect(q.freshnessOf(m(), { iteration: 3 }, jctx()).fresh).toBe(true);
    expect(q.freshnessOf(m(), { iteration: 2 }, jctx()).fresh).toBe(false);
    expect(q.freshnessOf(m(), { iteration: 4 }, jctx()).fresh).toBe(false);
    expect(q.freshnessOf(m(), { commit: "c3", iteration: 2 }, jctx()).fresh).toBe(true);
    expect(q.freshnessOf(m(), { at: "2026-11-22T06:00:00Z" }, jctx()).fresh).toBe(true);
    expect(q.freshnessOf(m(), { at: "2026-11-21T06:00:00Z" }, jctx()).fresh).toBe(false);
  });

  it("per-release accepts anything since the last release, nothing from a later iteration", () => {
    const rel = m({ cadence: "per-release" });
    expect(q.freshnessOf(rel, { iteration: 1, at: "2026-11-20T00:00:00Z" }, jctx()).fresh).toBe(true);
    expect(q.freshnessOf(rel, { iteration: 1, at: "2026-11-20T00:00:00Z" }, jctx({ releaseSince: Date.parse("2026-11-21T00:00:00Z") })).fresh).toBe(false);
    expect(q.freshnessOf(rel, { iteration: 4, at: "2026-11-22T06:00:00Z" }, jctx()).fresh).toBe(false);
  });

  it("a stale measurement is not measured, never a pass, and keeps its age", () => {
    const r = q.judge(m({ cadence: "per-commit", blocking: true }), { value: 9, commit: "c2", iteration: 2, at: "2026-11-22T06:00:00Z" }, jctx());
    expect(r.status).toBe("not-measured");
    expect(r.reason).toMatch(/stale/);
    expect(r.measured).toMatchObject({ ageHours: 6, iterationsBehind: 1 });
    expect(q.judge(m(), { missing: "no file" }, jctx())).toMatchObject({ status: "not-measured", reason: "no file" });
    expect(q.judge(m(), { value: 7, iteration: 3, at: "2026-11-22T11:00:00Z" }, jctx()).status).toBe("pass");
  });
});

describe("quality: verdict", () => {
  const r = (status: string, over: Any = {}) => ({ id: `${status}-${Math.random()}`, status, blocking: true, veto: false, value: 1, threshold: 0, direction: "lower", ...over });

  it("is met when every blocking metric passes; informative metrics never decide", () => {
    expect(q.verdictOf([r("pass"), r("fail", { blocking: false }), r("not-measured", { blocking: false })]).verdict).toBe("met");
  });

  it("is not met on a blocking failure or a veto, whatever else holds", () => {
    expect(q.verdictOf([r("pass"), r("fail")]).verdict).toBe("not-met");
    const v = q.verdictOf([r("pass"), r("noise"), r("fail", { veto: true, id: "signals" })]);
    expect(v.verdict).toBe("not-met");
    expect(v.reasons[0]).toMatch(/^veto signals failed/);
  });

  it("is undecided when a blocking metric is within noise and nothing fails", () => {
    const v = q.verdictOf([r("pass"), r("noise", { id: "rec", band: 0.25 })]);
    expect(v.verdict).toBe("undecided");
    expect(v.reasons[0]).toMatch(/rec within noise .*\+\/- 0.25/);
  });

  it("treats a blocking metric that was not measured as not met (or undecided by choice)", () => {
    expect(q.verdictOf([r("pass"), r("not-measured"), r("noise")]).verdict).toBe("not-met");
    expect(q.verdictOf([r("pass"), r("not-measured")], { notMeasured: "undecided" }).verdict).toBe("undecided");
  });
});

describe("quality: trend", () => {
  it("counts statuses per dimension and keeps each metric's values per iteration", () => {
    const card = (n: number, statuses: string[]) => ({
      iteration: n,
      verdict: statuses.includes("fail") ? "not-met" : "met",
      commit: null,
      dimensions: [{ id: "ux", label: "UX", metrics: statuses.map((s, i) => ({ id: `m${i}`, status: s, value: n + i })) }],
    });
    const t = q.trendOf([card(2, ["pass", "pass", "noise"]), card(1, ["fail", "not-measured", "pass"])]);
    expect(t.iterations).toEqual([1, 2]);
    expect(t.verdicts.map((v: Any) => v.verdict)).toEqual(["not-met", "met"]);
    expect(t.dimensions.ux.points).toEqual([
      { iteration: 1, pass: 1, fail: 1, noise: 0, notMeasured: 1, total: 3 },
      { iteration: 2, pass: 2, fail: 0, noise: 1, notMeasured: 0, total: 3 },
    ]);
    expect(t.metrics.m0).toEqual([
      { iteration: 1, value: 1, status: "fail" },
      { iteration: 2, value: 2, status: "pass" },
    ]);
  });
});

// ---------------------------------------------------------------- a throwaway instance
const session = (persona: string, rec: number, over: Any = {}) =>
  JSON.stringify({
    persona,
    variant: `${persona}-x`,
    panel_version: "1",
    build: "abc1234",
    iteration: 0,
    scenarios: [{ id: "S1", outcome: "achieved", turns: 12, steps: [] }],
    friction: [{ where: "a", expected: "b", happened: "c", kind: "naming" }],
    bugs: [],
    suggestions: [],
    scores: { recommend: { value: rec, reason: "" }, agency: { value: rec, reason: "" } },
    quit_point: null,
    verbatim: "",
    ...over,
  });

const SPEC = {
  product: "Toy",
  loopConfig: "loop/config.json",
  adapters: ["adapters.mjs"],
  trend: { from: 1 },
  dimensions: [
    {
      id: "functional",
      label: "Functional",
      metrics: [
        { id: "verify-green", label: "Verify", source: { adapter: "verify" }, direction: "bool", noise: { kind: "none", why: "t" }, cadence: "per-commit", blocking: true },
        { id: "unguarded", label: "Unguarded", source: { adapter: "registry", args: { metric: "unguarded" } }, direction: "lower", threshold: 0, noise: { kind: "none", why: "t" }, cadence: "per-commit", blocking: true },
        { id: "custom", label: "Custom", source: { adapter: "toy", args: { v: 3 } }, direction: "higher", threshold: 2, noise: { kind: "none", why: "t" }, cadence: "per-iteration" },
      ],
    },
    {
      id: "ux",
      label: "UX",
      metrics: [
        { id: "rec", label: "Recommend", source: { adapter: "feedback", args: { metric: "weighted", key: "recommend" } }, direction: "higher", threshold: 7, noise: { kind: "derived", k: 1, why: "t" }, cadence: "per-iteration", blocking: true },
        { id: "floor", label: "Floor", source: { adapter: "feedback", args: { metric: "min", key: "recommend" } }, direction: "higher", threshold: 6, noise: { kind: "fixed", band: 1, why: "t" }, cadence: "per-iteration", blocking: true },
        { id: "done", label: "Ann completes", source: { adapter: "feedback", args: { metric: "completed", personas: ["ann"] } }, direction: "bool", noise: { kind: "none", why: "t" }, cadence: "per-iteration", blocking: true },
        { id: "naming", label: "Naming", source: { adapter: "feedback", args: { metric: "friction", kind: "naming" } }, direction: "lower", threshold: 1, noise: { kind: "none", why: "t" }, cadence: "per-iteration" },
        { id: "second", label: "Second game", source: { adapter: "table", args: { file: "runs/iter-{NN}/triage.md", header: ["Persona", "Second game"], where: { "Second game": "^Yes" }, agg: "share" } }, direction: "higher", threshold: 0.5, format: "percent", noise: { kind: "none", why: "t" }, cadence: "per-iteration" },
        { id: "s2", label: "Open S2", source: { adapter: "table", args: { file: "runs/iter-{NN}/triage.md", header: ["Cluster", "Sev"], where: { Sev: "^S[12]" }, agg: "count" } }, direction: "lower", threshold: 0, noise: { kind: "none", why: "t" }, cadence: "per-iteration", blocking: true },
        { id: "signals", label: "Signals", source: { adapter: "real-signals" }, direction: "lower", threshold: 0, noise: { kind: "none", why: "t" }, cadence: "per-commit", veto: true },
      ],
    },
  ],
};

function makeInstance() {
  const root = mkdtempSync(join(tmpdir(), "devloop-quality-"));
  made.push(root);
  git(root, "init", "-q", "-b", "dev");
  git(root, "config", "user.email", "t@example.com");
  git(root, "config", "user.name", "Test");
  git(root, "config", "commit.gpgsign", "false");
  git(root, "config", "tag.gpgsign", "false");
  write(root, "src/a.ts", "export const a = 1;\n");
  write(root, "inst/quality.json", JSON.stringify(SPEC, null, 2));
  write(root, "inst/adapters.mjs", "export const adapters = { toy: (args, ctx) => ({ value: args.v, iteration: ctx.iteration, at: new Date(ctx.now).toISOString() }) };\n");
  write(root, "inst/panel/panel.yaml", "personas:\n  - { id: ann, file: ann.yaml, weight: 0.5, kind: core }\n  - { id: bob, file: bob.yaml, weight: 0.3, kind: core }\n  - { id: cy, file: cy.yaml, weight: 0.2, kind: core }\n");
  write(root, "inst/regressions.yaml", "findings:\n  - id: F-1\n    title: t\n    guards:\n      - vitest: tests/x.spec.ts\n");
  write(root, "inst/ledger.md", "| ID | Decision |\n|---|---|\n| D-1 | x |\n");
  write(root, "inst/real-signals/RS-001-owner.md", "# RS-001\n\nSeverity: S2\nStatus: addressed\n");
  write(root, "inst/real-signals/RS-002-owner.md", "# RS-002\n\nverbatim only\n");
  write(root, "inst/loop/config.json", JSON.stringify({
    stages: ["Plan", "Build", "Report", "Gate"],
    gates: ["verify", "quality", "status-refresh"],
    rules: { "quality-gate": { on: "enter:Gate", gate: "quality", match: "code", accept: ["pass"], why: "scorecard" } },
    code: { include: ["src/**"] },
    sharedBranch: "dev",
    tagPrefix: "iter-",
    ledger: "../ledger.md",
  }));
  // iteration 1: rec 6,6,6 ; iteration 2: 8,7,6 (retest pairs give the persona sd)
  write(root, "inst/runs/iter-01/sessions/ann.json", session("Ann", 6));
  write(root, "inst/runs/iter-01/sessions/bob.json", session("Bob", 6));
  write(root, "inst/runs/iter-01/sessions/cy.json", session("Cy", 6, { quit_point: "month 2" }));
  write(root, "inst/runs/iter-02/sessions/ann.json", session("Ann", 8));
  write(root, "inst/runs/iter-02/sessions/bob.json", session("Bob", 7));
  write(root, "inst/runs/iter-02/sessions/cy.json", session("Cy", 6));
  write(root, "inst/runs/iter-02/triage.md", "# Triage\n\n## 2. Clusters\n\n| ID | Cluster | Sev |\n|---|---|---|\n| F-1 | **a** | S3 |\n\n## 4. Control\n\n| Persona | Second game |\n|---|---|\n| Ann | Yes, from the end |\n| Bob | No |\n| Cy | Yes |\n");
  write(root, "evidence.json", "{}\n");
  git(root, "add", "-A");
  git(root, "commit", "-q", "-m", "iteration 1");
  git(root, "tag", "iter-1");
  write(root, "src/a.ts", "export const a = 2;\n");
  git(root, "add", "-A");
  git(root, "commit", "-q", "-m", "iteration 2");
  const lctx = loop.loadLoop({ cwd: root, config: join(root, "inst/loop/config.json") });
  loop.init(lctx, { iteration: 2, stage: "Report" });
  return { root, lctx, spec: join(root, "inst/quality.json") };
}

const byId = (card: Any) => Object.fromEntries(card.dimensions.flatMap((d: Any) => d.metrics).map((r: Any) => [r.id, r]));

describe("quality: evaluate on an instance", () => {
  it("measures every adapter, derives the band and reports what is not measured", async () => {
    const { root, lctx, spec } = makeInstance();
    loop.record(lctx, { gate: "verify", result: "pass", commit: "HEAD", evidence: join(root, "evidence.json") });
    const card = await q.evaluate(spec, { iteration: 2 });
    const r = byId(card);
    expect(card.commit).toBe(git(root, "rev-parse", "HEAD"));
    expect(r["verify-green"]).toMatchObject({ status: "pass", value: true });
    expect(r.unguarded).toMatchObject({ status: "pass", value: 0 });
    expect(r.custom).toMatchObject({ status: "pass", value: 3 });
    // weighted 0.5*8 + 0.3*7 + 0.2*6 = 7.3; persona retest diffs 2, 1, 0 -> sd 1/sqrt2
    expect(r.rec.value).toBeCloseTo(7.3, 5);
    const se = (1 / Math.SQRT2) * Math.sqrt(0.25 + 0.09 + 0.04);
    expect(r.rec.band).toBeCloseTo(se, 2);
    expect(r.rec.status).toBe("noise");
    expect(r.floor).toMatchObject({ value: 6, status: "noise" });
    expect(r.done).toMatchObject({ value: true, status: "pass" });
    expect(r.naming).toMatchObject({ value: 3, status: "fail", blocking: false });
    expect(r.second.status).toBe("pass");
    expect(r.second.value).toBeCloseTo(2 / 3, 2);
    expect(r.s2).toMatchObject({ value: 0, status: "pass" });
    expect(r.signals.status).toBe("not-measured");
    expect(r.signals.reason).toMatch(/RS-002/);
    expect(card.verdict).toBe("not-met");
    expect(card.reasons[0]).toMatch(/veto signals not measured/);
    // trend from iteration 1 (tag iter-1): its sessions count, the verify record is on later code
    expect(card.trend.iterations).toEqual([1, 2]);
    const it1 = card.trend.metrics.done.find((p: Any) => p.iteration === 1);
    expect(it1).toMatchObject({ status: "pass" });
    expect(card.trend.metrics["verify-green"][0]).toMatchObject({ iteration: 1, status: "not-measured" });
  });

  it("is undecided within noise once signals are classified, and a code change makes per-commit metrics stale", async () => {
    const { root, lctx, spec } = makeInstance();
    write(root, "inst/real-signals/RS-002-owner.md", "# RS-002\n\nSeverity: S3\nStatus: open\n");
    git(root, "add", "-A");
    git(root, "commit", "-q", "-m", "classify");
    loop.record(lctx, { gate: "verify", result: "pass", commit: "HEAD", evidence: join(root, "evidence.json") });
    let card = await q.evaluate(spec, { iteration: 2, trend: false });
    expect(byId(card).signals).toMatchObject({ status: "pass", value: 0 });
    expect(card.verdict).toBe("undecided");
    write(root, "src/a.ts", "export const a = 3;\n");
    git(root, "add", "-A");
    git(root, "commit", "-q", "-m", "code change");
    card = await q.evaluate(spec, { iteration: 2, trend: false });
    expect(byId(card)["verify-green"].status).toBe("not-measured");
    expect(byId(card)["verify-green"].reason).toMatch(/stale/);
    expect(card.verdict).toBe("not-met");
    // an open S2 signal vetoes
    write(root, "inst/real-signals/RS-003-owner.md", "Severity: S2\nStatus: open\n");
    git(root, "add", "-A");
    git(root, "commit", "-q", "-m", "new signal");
    loop.record(lctx, { gate: "verify", result: "pass", commit: "HEAD", evidence: join(root, "evidence.json") });
    card = await q.evaluate(spec, { iteration: 2, trend: false });
    expect(byId(card).signals).toMatchObject({ status: "fail", value: 1 });
    expect(card.reasons[0]).toMatch(/^veto signals failed/);
  });

  it("records the verdict with the controller; entering Gate needs gate met or an override", async () => {
    const { root, lctx, spec } = makeInstance();
    loop.record(lctx, { gate: "verify", result: "pass", commit: "HEAD", evidence: join(root, "evidence.json") });
    const card = await q.evaluate(spec, { iteration: 2, trend: false });
    expect(card.verdict).not.toBe("met");
    const { file, rec } = await q.recordVerdict(spec, card);
    expect(JSON.parse(readFileSync(file, "utf8")).verdict).toBe(card.verdict);
    expect(rec).toMatchObject({ gate: "quality", result: "fail", verdict: card.verdict });
    expect(() => loop.advance(lctx, "Gate")).toThrow(/quality-gate: quality fail \((not-met|undecided)\)/);
    loop.override(lctx, { rule: "quality-gate", reason: "close the iteration with the gate not met" });
    loop.advance(lctx, "Gate");
    expect(loop.readState(lctx).stage).toBe("Gate");
    // a met scorecard passes the rule
    const st = loop.readState(lctx);
    st.stage = "Report";
    st.overrides = [];
    loop.writeState(lctx, st);
    await q.recordVerdict(spec, { ...card, verdict: "met" });
    expect(loop.evaluate(lctx, "enter:Gate").ok).toBe(true);
    // a scorecard for another iteration is refused without --force
    await expect(q.recordVerdict(spec, { ...card, iteration: 1 })).rejects.toThrow(/iteration 1 but the loop is in iteration 2/);
  });
});

// ---------------------------------------------------------------- the World Conflict spec
describe("quality: World Conflict spec", () => {
  const specPath = "devloop/instances/world-conflict/quality.json";
  const spec = JSON.parse(readFileSync(specPath, "utf8"));
  const schema = JSON.parse(readFileSync("devloop/method/quality.schema.json", "utf8"));
  const metricDef = schema.$defs.metric;

  it("follows the schema's required fields and enums, and every band says why", () => {
    for (const k of schema.required) expect(spec).toHaveProperty(k);
    for (const d of spec.dimensions) {
      for (const met of d.metrics) {
        for (const k of metricDef.required) expect(met, `${met.id} ${k}`).toHaveProperty(k);
        expect(metricDef.properties.direction.enum).toContain(met.direction);
        expect(metricDef.properties.cadence.enum).toContain(met.cadence);
        expect(metricDef.properties.noise.properties.kind.enum).toContain(met.noise.kind);
        expect(met.noise.why.length).toBeGreaterThan(3);
        if (met.direction !== "bool") expect(typeof met.threshold).toBe("number");
        for (const k of Object.keys(met)) expect(Object.keys(metricDef.properties)).toContain(k);
      }
    }
  });

  it("encodes the release gate of gate.md as blocking metrics, with the real-signal veto", () => {
    const all = spec.dimensions.flatMap((d: Any) => d.metrics);
    const blocking = all.filter((x: Any) => x.blocking || x.veto).map((x: Any) => x.id);
    for (const id of ["verify-green", "guards-pass", "balance-in-bands", "open-s1-s2", "regressed", "guard-gaps", "recommend-weighted", "recommend-floor", "game-feel", "agency", "olivia-ruth-complete", "goals-open"]) expect(blocking).toContain(id);
    expect(all.find((x: Any) => x.id === "real-signals-open").veto).toBe(true);
    expect(all.find((x: Any) => x.id === "recommend-floor").noise).toMatchObject({ kind: "fixed", band: 1 });
  });

  it("scores iteration 3 from the committed sessions, triage and QA repro", async () => {
    const card = await q.evaluate(specPath, { iteration: 3, trend: false });
    const r = byId(card);
    expect(r["recommend-weighted"].value).toBeCloseTo(6.22, 1);
    expect(r["recommend-weighted"].status).toBe("fail");
    expect(r["recommend-floor"]).toMatchObject({ value: 5, status: "fail" });
    expect(r["olivia-ruth-complete"]).toMatchObject({ value: true, status: "pass" });
    expect(r.regressed).toMatchObject({ value: 1, status: "fail" });
    expect(r["guard-gaps"]).toMatchObject({ value: 16, status: "fail" });
    expect(r["open-s1-s2"]).toMatchObject({ value: 9, status: "fail" });
    expect(r["control-second-game"].value).toBeCloseTo(5 / 9, 2);
    expect(card.verdict).toBe("not-met");
  });
});
