// Loop controller (devloop/kit/loop.mjs) and the scripts that enforce it: transitions,
// preconditions, code-tree invalidation, overrides, merge/publish, verify recording, git hooks and
// the Claude Code bash guard. Every test works in a throwaway git repository.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { afterAll, afterEach, describe, expect, it } from "vitest";
// @ts-expect-error: plain ESM module without type declarations
import * as loop from "../../devloop/kit/loop.mjs";
// @ts-expect-error: plain ESM module without type declarations
import { merge } from "../../devloop/kit/merge.mjs";
// @ts-expect-error: plain ESM module without type declarations
import { publish } from "../../devloop/kit/publish.mjs";
// @ts-expect-error: plain ESM module without type declarations
import { recordInLoop } from "../../devloop/kit/verify-runner.mjs";
// @ts-expect-error: plain ESM module without type declarations
import { prePush } from "../../devloop/kit/hooks/pre-push.mjs";
// @ts-expect-error: plain ESM module without type declarations
import { findViolations, guard, isSharedCheckout } from "../../devloop/kit/hooks/guard-bash.mjs";
// @ts-expect-error: plain ESM module without type declarations
import { install } from "../../devloop/kit/install-hooks.mjs";

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

function commit(root: string, file: string, text: string, msg = `edit ${file}`) {
  write(root, file, text);
  git(root, "add", "--", file);
  git(root, "commit", "-q", "-m", msg);
  return git(root, "rev-parse", "HEAD");
}

const CFG = "inst/loop/config.json";

function baseConfig(extra: Record<string, unknown> = {}) {
  return {
    stages: ["Plan", "Design", "Build", "Verify", "Use", "Triage", "Report", "Gate"],
    transitions: {
      Plan: ["Design", "Build"],
      Verify: ["Use", "Build"],
    },
    gates: ["verify", "qa", "triage", "status-refresh"],
    rules: {
      "verify-before-use": { on: "enter:Use", gate: "verify", match: "code" },
      "qa-before-use": { on: "enter:Use", gate: "qa", match: "code", why: "QA first" },
      "triage-before-report": { on: "enter:Report", gate: "triage", match: "iteration" },
      "status-refresh-after-merge": { on: ["enter:Report", "enter:Gate"], gate: "status-refresh", match: "after-merge" },
      "verify-before-publish": { on: "publish", gate: "verify", match: "commit" },
      "verify-before-merge": { on: "merge", gate: "verify", match: "code" },
    },
    code: { include: ["src/**", "package.json"] },
    sharedBranch: "dev",
    publishBranch: "main",
    tagPrefix: "iter-",
    ledger: "../ledger.md",
    ...extra,
  };
}

/** A repository on branch `dev` (main at the first commit) with a loop config and a ledger. */
function makeRepo(extra: Record<string, unknown> = {}) {
  const root = mkdtempSync(join(tmpdir(), "devloop-loop-"));
  made.push(root);
  git(root, "init", "-q", "-b", "main");
  git(root, "config", "user.email", "t@example.com");
  git(root, "config", "user.name", "Test");
  git(root, "config", "commit.gpgsign", "false");
  git(root, "config", "tag.gpgsign", "false");
  write(root, "src/a.ts", "export const a = 1;\n");
  write(root, "docs/notes.md", "notes\n");
  write(root, "package.json", "{}\n");
  write(root, CFG, JSON.stringify(baseConfig(extra), null, 2));
  write(root, "inst/ledger.md", "| ID | Decision |\n|---|---|\n| D-7 | something |\n");
  write(root, "evidence.json", "{}\n");
  git(root, "add", "-A");
  git(root, "commit", "-q", "-m", "init");
  git(root, "checkout", "-q", "-b", "dev");
  const ctx = loop.loadLoop({ cwd: root, config: join(root, CFG) });
  return { root, ctx, ev: join(root, "evidence.json") };
}

const pass = (ctx: unknown, gate: string, ev: string, commitRef = "HEAD") =>
  loop.record(ctx, { gate, result: "pass", commit: commitRef, evidence: ev });

describe("loop controller: transitions", () => {
  it("moves through legal transitions, logs skipped stages and starts a new iteration after Gate", () => {
    const { ctx } = makeRepo();
    loop.init(ctx, { iteration: 4, stage: "Plan" });
    const r = loop.advance(ctx, "Build");
    expect(r.event.skipped).toEqual(["Design"]);
    expect(loop.readState(ctx).stage).toBe("Build");
    loop.advance(ctx); // default: the next stage
    expect(loop.readState(ctx).stage).toBe("Verify");
    expect(() => loop.advance(ctx, "Triage")).toThrow(/not a legal transition/);

    const st = loop.readState(ctx);
    st.stage = "Gate";
    loop.writeState(ctx, st);
    loop.advance(ctx);
    expect(loop.readState(ctx)).toMatchObject({ iteration: 5, stage: "Plan" });
    const kinds = loop.readEvents(ctx).map((e: { kind: string }) => e.kind);
    expect(kinds).toEqual(["init", "transition", "transition", "transition"]);
  });

  it("refuses to enter Use without verify and QA on the current code, then allows it", () => {
    const { ctx, ev } = makeRepo();
    loop.init(ctx, { iteration: 1, stage: "Verify" });
    expect(() => loop.advance(ctx, "Use")).toThrow(/verify-before-use[\s\S]*qa-before-use/);
    pass(ctx, "verify", ev);
    expect(() => loop.advance(ctx, "Use")).toThrow(/qa-before-use: no qa record/);
    pass(ctx, "qa", ev);
    loop.advance(ctx, "Use");
    expect(loop.readState(ctx).stage).toBe("Use");
  });

  it("needs triage in the current iteration before Report", () => {
    const { ctx, ev } = makeRepo();
    loop.init(ctx, { iteration: 2, stage: "Triage" });
    expect(() => loop.advance(ctx)).toThrow(/triage-before-report/);
    pass(ctx, "triage", ev);
    loop.advance(ctx);
    expect(loop.readState(ctx).stage).toBe("Report");
  });

  it("validates records: known gate, pass or fail, evidence that exists", () => {
    const { ctx, ev } = makeRepo();
    loop.init(ctx, { iteration: 1, stage: "Build" });
    expect(() => loop.record(ctx, { gate: "vrfy", result: "pass", evidence: ev })).toThrow(/unknown gate/);
    expect(() => loop.record(ctx, { gate: "qa", result: "ok", evidence: ev })).toThrow(/pass or fail/);
    expect(() => loop.record(ctx, { gate: "qa", result: "pass" })).toThrow(/evidence/);
    expect(() => loop.record(ctx, { gate: "qa", result: "pass", evidence: "/nope/x.json" })).toThrow(/does not exist/);
    expect(loop.record(ctx, { gate: "qa", result: "fail" }).result).toBe("fail");
  });
});

describe("loop controller: code tree and exact commit", () => {
  it("keeps a QA pass across docs-only commits and loses it when code changes", () => {
    const { root, ctx, ev } = makeRepo();
    loop.init(ctx, { iteration: 1, stage: "Verify" });
    pass(ctx, "verify", ev);
    pass(ctx, "qa", ev);
    commit(root, "docs/notes.md", "more notes\n");
    expect(loop.evaluate(ctx, "enter:Use").ok).toBe(true);
    commit(root, "src/a.ts", "export const a = 2;\n");
    const c = loop.evaluate(ctx, "enter:Use");
    expect(c.ok).toBe(false);
    expect(c.results.map((r: { rule: string; ok: boolean }) => r.ok)).toEqual([false, false]);
  });

  it("lets the latest record win: a fail after a pass on the same code blocks", () => {
    const { ctx, ev } = makeRepo();
    loop.init(ctx, { iteration: 1, stage: "Verify" });
    process.env.DEVLOOP_NOW = "2026-01-01T10:00:00Z";
    pass(ctx, "verify", ev);
    pass(ctx, "qa", ev);
    process.env.DEVLOOP_NOW = "2026-01-01T10:05:00Z";
    loop.record(ctx, { gate: "qa", result: "fail" });
    expect(loop.evaluate(ctx, "enter:Use").ok).toBe(false);
  });

  it("publish needs the exact commit; a commit of only the loop's own files keeps it", () => {
    const { root, ctx, ev } = makeRepo();
    loop.init(ctx, { iteration: 1, stage: "Report" });
    const c1 = git(root, "rev-parse", "HEAD");
    pass(ctx, "verify", ev);
    expect(loop.evaluate(ctx, "publish", { commit: c1 }).ok).toBe(true);
    commit(root, "inst/loop/state.json", readFileSync(join(root, "inst/loop/state.json"), "utf8"), "chore: loop state");
    expect(loop.evaluate(ctx, "publish").ok).toBe(true);
    commit(root, "docs/notes.md", "status\n");
    expect(loop.evaluate(ctx, "publish").ok).toBe(false); // docs-only, but not the verified commit
  });

  it("ignores the loop's own folder in the code tree hash", () => {
    const { root, ctx } = makeRepo({ code: { include: ["**"] } });
    const before = loop.codeTreeOf(ctx, "HEAD");
    commit(root, "inst/loop/events.jsonl", "{}\n");
    expect(loop.codeTreeOf(ctx, "HEAD")).toBe(before);
    commit(root, "docs/notes.md", "x\n");
    expect(loop.codeTreeOf(ctx, "HEAD")).not.toBe(before);
  });
});

describe("loop controller: overrides", () => {
  it("lets a rule pass with a reason, appends a ledger draft and expires", () => {
    const { ctx } = makeRepo();
    loop.init(ctx, { iteration: 3, stage: "Verify" });
    process.env.DEVLOOP_NOW = "2026-01-01T10:00:00Z";
    expect(() => loop.override(ctx, { rule: "qa-before-use", reason: " " })).toThrow(/reason/);
    expect(() => loop.override(ctx, { rule: "no-such-rule", reason: "x" })).toThrow(/unknown rule/);
    loop.override(ctx, { rule: "qa-before-use", reason: "CEO: ship the round tonight", ttl: 30 });
    loop.override(ctx, { rule: "verify-before-use", reason: "CEO: same call" });
    const ledger = readFileSync(ctx.paths.ledger, "utf8");
    expect(ledger).toMatch(/\| D-8 \| 2026-01-01 \| process \| DRAFT: override of loop rule `qa-before-use`/);
    expect(ledger).toMatch(/\| D-9 \|/);
    process.env.DEVLOOP_NOW = "2026-01-01T10:45:00Z"; // qa override (30 min) expired
    expect(loop.evaluate(ctx, "enter:Use").results.find((r: { rule: string }) => r.rule === "qa-before-use").ok).toBe(false);
    process.env.DEVLOOP_NOW = "2026-01-01T10:20:00Z";
    const r = loop.advance(ctx, "Use");
    expect(r.event.overrides).toHaveLength(2);
    expect(loop.readEvents(ctx).filter((e: { kind: string }) => e.kind === "override")).toHaveLength(2);
  });

  it("allows an illegal transition only through a transition override", () => {
    const { ctx } = makeRepo();
    loop.init(ctx, { iteration: 3, stage: "Use" });
    expect(() => loop.advance(ctx, "Report")).toThrow(/transition:Use->Report/);
    loop.override(ctx, { rule: "transition:Use->Report", reason: "no clusters this round" });
    loop.override(ctx, { rule: "triage-before-report", reason: "no clusters this round" });
    loop.advance(ctx, "Report");
    expect(loop.readState(ctx).stage).toBe("Report");
  });
});

describe("merge and publish scripts", () => {
  it("merges only with a verify pass on the merge result, then owes a status refresh", () => {
    const { root, ctx, ev } = makeRepo();
    loop.init(ctx, { iteration: 1, stage: "Triage" });
    pass(ctx, "triage", ev);
    git(root, "checkout", "-q", "-b", "work");
    commit(root, "src/b.ts", "export const b = 1;\n");
    git(root, "checkout", "-q", "dev");
    commit(root, "docs/notes.md", "shared moved on\n");
    const log = () => {};
    expect(() => merge({ cwd: root, config: join(root, CFG), branch: "work", log })).toThrow(/verify-before-merge/);
    // verify on the work branch after merging the shared branch into it: same code tree as the result
    git(root, "checkout", "-q", "work");
    git(root, "merge", "-q", "--no-edit", "dev");
    pass(ctx, "verify", ev);
    git(root, "checkout", "-q", "dev");
    const r = merge({ cwd: root, config: join(root, CFG), branch: "work", log });
    expect(r.commit).toBe(git(root, "rev-parse", "HEAD"));
    expect(loop.readState(ctx).merges[0]).toMatchObject({ branch: "work", treeMatches: true });
    expect(() => loop.advance(ctx, "Report")).toThrow(/status-refresh-after-merge/);
    pass(ctx, "status-refresh", ev);
    loop.advance(ctx, "Report");
  });

  it("refuses to merge from the wrong checkout or over dirty tracked files", () => {
    const { root, ev, ctx } = makeRepo();
    loop.init(ctx, { iteration: 1, stage: "Build" });
    git(root, "checkout", "-q", "-b", "work");
    commit(root, "src/b.ts", "1\n");
    pass(ctx, "verify", ev);
    expect(() => merge({ cwd: root, config: join(root, CFG), branch: "work", log: () => {} })).toThrow(/checkout of dev/);
    git(root, "checkout", "-q", "dev");
    write(root, "src/a.ts", "dirty\n");
    expect(() => merge({ cwd: root, config: join(root, CFG), branch: "work", log: () => {} })).toThrow(/uncommitted/);
  });

  it("publishes (fast-forward main, tag iter-N) only after verify on that commit", () => {
    const { root, ctx, ev } = makeRepo();
    loop.init(ctx, { iteration: 3, stage: "Report" });
    commit(root, "src/a.ts", "export const a = 3;\n");
    const opts = { cwd: root, config: join(root, CFG), push: false, log: () => {} };
    expect(() => publish(opts)).toThrow(/verify-before-publish/);
    pass(ctx, "verify", ev);
    const r = publish(opts);
    expect(r.tag).toBe("iter-3");
    expect(git(root, "rev-parse", "main")).toBe(git(root, "rev-parse", "dev"));
    expect(git(root, "rev-parse", "iter-3^{commit}")).toBe(git(root, "rev-parse", "dev"));
    expect(loop.readState(ctx).publishes).toHaveLength(1);
  });
});

describe("rules conditioned on the changed paths (when.paths) and the design-review gate", () => {
  const designRule = {
    "design-review-before-merge": { on: "merge", gate: "design-review", match: "code", when: { paths: ["ui/", "data/codex/**"] }, why: "UI merges need a design review" },
  };
  const extra = () => ({ gates: ["verify", "qa", "triage", "status-refresh", "design-review"], rules: { ...baseConfig().rules, ...designRule } });

  it("matches folder prefixes and globs", () => {
    expect(loop.pathMatches("ui/src/App.tsx", ["ui/"])).toBe(true);
    expect(loop.pathMatches("ui/src/App.tsx", ["ui"])).toBe(true);
    expect(loop.pathMatches("uikit/x.ts", ["ui/"])).toBe(false);
    expect(loop.pathMatches("data/codex/a.json", ["data/codex/**"])).toBe(true);
    expect(loop.pathMatches("data/countries/a.json", ["data/codex/**"])).toBe(false);
  });

  it("skips the rule when the merge touches none of the paths", () => {
    const { root, ctx, ev } = makeRepo(extra());
    loop.init(ctx, { iteration: 1, stage: "Build" });
    git(root, "checkout", "-q", "-b", "work");
    commit(root, "src/b.ts", "export const b = 1;\n");
    pass(ctx, "verify", ev);
    git(root, "checkout", "-q", "dev");
    const r = merge({ cwd: root, config: join(root, CFG), branch: "work", log: () => {} });
    expect(r.commit).toBe(git(root, "rev-parse", "HEAD"));
    const c = loop.evaluate(ctx, "merge", { commit: "HEAD", paths: ["src/b.ts"] });
    const d = c.results.find((x: { rule: string }) => x.rule === "design-review-before-merge");
    expect(d).toMatchObject({ ok: true, skipped: true });
    expect(loop.formatResults(c)).toMatch(/skip design-review-before-merge: not applicable/);
  });

  it("needs a design-review pass when the merge touches ui/, recorded with evidence on the code", () => {
    const { root, ctx, ev } = makeRepo({ ...extra(), code: { include: ["src/**", "ui/**", "package.json"] } });
    loop.init(ctx, { iteration: 1, stage: "Build" });
    git(root, "checkout", "-q", "-b", "work");
    commit(root, "ui/src/Desk.tsx", "export const Desk = 1;\n");
    pass(ctx, "verify", ev);
    git(root, "checkout", "-q", "dev");
    const log = () => {};
    expect(() => merge({ cwd: root, config: join(root, CFG), branch: "work", log })).toThrow(/design-review-before-merge/);
    // `loop check merge --commit work` from the work branch sees the same: base...commit touches ui/
    const c = loop.evaluate(ctx, "merge", { commit: "work" });
    expect(c.results.find((x: { rule: string }) => x.rule === "design-review-before-merge")).toMatchObject({ ok: false });
    expect(() => loop.record(ctx, { gate: "design-review", result: "pass", commit: "work" })).toThrow(/evidence/);
    write(root, "shots/layout-audit.json", "{}\n");
    loop.record(ctx, { gate: "design-review", result: "pass", commit: "work", evidence: join(root, "shots") });
    const r = merge({ cwd: root, config: join(root, CFG), branch: "work", log });
    expect(r.commit).toBe(git(root, "rev-parse", "HEAD"));
  });

  it("a later design-review fail blocks again", () => {
    const { root, ctx, ev } = makeRepo(extra());
    loop.init(ctx, { iteration: 1, stage: "Build" });
    git(root, "checkout", "-q", "-b", "work");
    commit(root, "data/codex/x.json", "{}\n");
    pass(ctx, "verify", ev);
    pass(ctx, "design-review", ev);
    expect(loop.evaluate(ctx, "merge", { commit: "work" }).ok).toBe(true);
    loop.record(ctx, { gate: "design-review", result: "fail", commit: "work" });
    expect(loop.evaluate(ctx, "merge", { commit: "work" }).ok).toBe(false);
  });
});

describe("shared state across worktrees", () => {
  it("records from a linked worktree land in the main worktree's state", () => {
    const { root, ctx, ev } = makeRepo();
    loop.init(ctx, { iteration: 1, stage: "Build" });
    const wt = `${root}-wt`;
    made.push(wt);
    git(root, "worktree", "add", "-q", "-b", "agent", wt);
    const wctx = loop.loadLoop({ cwd: wt, config: join(wt, CFG) });
    expect(wctx.paths.state).toBe(ctx.paths.state);
    pass(wctx, "verify", ev);
    expect(loop.readState(ctx).records).toHaveLength(1);
    expect(existsSync(join(wt, "inst/loop/state.json"))).toBe(false);
    expect(isSharedCheckout(root)).toBe(true);
    expect(isSharedCheckout(wt)).toBe(false);
  });
});

describe("verify runner records its result", () => {
  const parsed = (over: Record<string, unknown> = {}) => ({
    modes: new Set(["default"]),
    flags: new Set(),
    opts: { only: null, skip: new Set(), serve: false },
    ...over,
  });

  it("records a full run on HEAD, and not a quick, partial or dirty one", async () => {
    const { root, ctx, ev } = makeRepo();
    loop.init(ctx, { iteration: 1, stage: "Verify" });
    const head = git(root, "rev-parse", "HEAD");
    const config = { loop: { config: join(root, CFG) } };
    const base = { root, ok: true, evidence: ev, headAtStart: head, steps: ["test"] };
    expect(await recordInLoop(config, parsed({ modes: new Set(["quick"]) }), base)).toBeNull();
    expect(await recordInLoop(config, parsed({ opts: { only: new Set(["test"]), skip: new Set() } }), base)).toBeNull();
    expect(await recordInLoop({ loop: false }, parsed(), base)).toBeNull();
    write(root, "src/a.ts", "uncommitted\n");
    expect(await recordInLoop(config, parsed(), base)).toBeNull();
    git(root, "checkout", "--", "src/a.ts");
    const rec = await recordInLoop(config, parsed(), base);
    expect(rec).toMatchObject({ gate: "verify", result: "pass", commit: head });
    const fail = await recordInLoop(config, parsed({ modes: new Set(["full"]) }), { ...base, ok: false });
    expect(fail.result).toBe("fail");
  });

  it("is a no-op without a loop config", async () => {
    const root = mkdtempSync(join(tmpdir(), "devloop-noloop-"));
    made.push(root);
    git(root, "init", "-q");
    const prev = process.env.DEVLOOP_LOOP_CONFIG;
    delete process.env.DEVLOOP_LOOP_CONFIG;
    expect(await recordInLoop({}, parsed(), { root, ok: true, evidence: "x", headAtStart: "abc", steps: [] })).toBeNull();
    if (prev) process.env.DEVLOOP_LOOP_CONFIG = prev;
  });
});

describe("progress integration", () => {
  it("every transition writes a progress event and injects the status page", () => {
    const progressCfg = { stages: baseConfig().stages, log: "stages.jsonl", estimates: "estimates.jsonl" };
    const { root, ctx } = makeRepo({
      progress: { config: "../progress/config.json", inject: { page: "../../status.html", marker: "PROGRESS", args: ["--no-usage"] } },
    });
    write(root, "inst/progress/config.json", JSON.stringify(progressCfg));
    write(root, "status.html", "<script>/*PROGRESS:START*/const PROGRESS = null;/*PROGRESS:END*/</script>");
    loop.init(ctx, { iteration: 1, stage: "Plan" });
    loop.advance(ctx, "Build");
    const log = readFileSync(join(root, "inst/progress/stages.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l));
    expect(log.map((e) => `${e.kind}:${e.stage}`)).toEqual(["skip:Design", "start:Build"]);
    expect(readFileSync(join(root, "status.html"), "utf8")).toMatch(/const PROGRESS = \{"generated"/);
  });
});

describe("progress pass-through", () => {
  it("accepts a note with spaces and quotes, and a new iteration closes the previous one", () => {
    const progressCfg = { stages: baseConfig().stages, log: "stages.jsonl", estimates: "estimates.jsonl" };
    const { root, ctx } = makeRepo({ progress: { config: "../progress/config.json" } });
    write(root, "inst/progress/config.json", JSON.stringify(progressCfg));
    loop.init(ctx, { iteration: 3, stage: "Report" });
    loop.advance(ctx, "Gate");
    const cfgArgs = ["--config", join(root, CFG)];
    expect(loop.main([...cfgArgs, "progress", "--total", "4"], root)).toBe(0);
    const note = `two words, "quoted" and it's fine`;
    expect(loop.main([...cfgArgs, "progress", "--done", "2", "--note", note], root)).toBe(0);
    const read = () =>
      readFileSync(join(root, "inst/progress/stages.jsonl"), "utf8")
        .trim()
        .split("\n")
        .map((l) => JSON.parse(l));
    expect(read().find((e) => e.kind === "unit-done")?.note).toBe(note);
    loop.advance(ctx, "Plan");
    const log = read();
    expect(log.some((e) => e.kind === "end" && e.iteration === 3 && e.stage === "Gate")).toBe(true);
    expect(log.some((e) => e.kind === "start" && e.iteration === 4 && e.stage === "Plan")).toBe(true);
  });
});

describe("git pre-push hook", () => {
  it("blocks pushing main or an iter tag without verify on that commit; other refs pass", async () => {
    const { root, ctx, ev } = makeRepo();
    loop.init(ctx, { iteration: 1, stage: "Report" });
    const sha = git(root, "rev-parse", "HEAD");
    const zero = "0".repeat(40);
    const opts = { cwd: root, config: join(root, CFG) };
    expect((await prePush([`refs/heads/dev ${sha} refs/heads/dev ${zero}`], opts)).block).toBe(false);
    expect((await prePush([`refs/heads/main ${sha} refs/heads/main ${zero}`], opts)).block).toBe(true);
    expect((await prePush([`refs/tags/iter-1 ${sha} refs/tags/iter-1 ${zero}`], opts)).block).toBe(true);
    expect((await prePush([`(delete) ${zero} refs/heads/main ${sha}`], opts)).block).toBe(true);
    pass(ctx, "verify", ev);
    expect((await prePush([`refs/heads/main ${sha} refs/heads/main ${zero}`], opts)).block).toBe(false);
  });

  it("installs into the shared hooks folder and never replaces a foreign hook silently", () => {
    const { root } = makeRepo();
    const r = install(root);
    expect(r.action).toBe("installed");
    expect(readFileSync(r.file, "utf8")).toMatch(/pre-push\.mjs/);
    expect(install(root).action).toBe("updated");
    writeFileSync(r.file, "#!/bin/sh\necho mine\n");
    expect(() => install(root)).toThrow(/--force/);
    expect(install(root, { force: true }).action).toBe("updated");
  });
});

describe("bash guard (Claude Code PreToolUse)", () => {
  const rules = (cmd: string, cwd = "/tmp") => findViolations(cmd, cwd).map((v: { rule: string }) => v.rule);

  it("flags rebase pulls, autostash and multi-path theirs/ours checkouts", () => {
    expect(rules("git pull --rebase")).toEqual(["guard:pull-rebase"]);
    expect(rules("git pull -r origin dev")).toEqual(["guard:pull-rebase"]);
    expect(rules("git pull --rebase=merges")).toEqual(["guard:pull-rebase"]);
    expect(rules("git -c pull.rebase=true pull")).toEqual(["guard:pull-rebase"]);
    expect(rules("git pull --rebase --autostash")).toEqual(["guard:pull-rebase", "guard:autostash"]);
    expect(rules("git rebase --autostash origin/dev")).toEqual(["guard:autostash"]);
    expect(rules("git merge --autostash work")).toEqual(["guard:autostash"]);
    expect(rules("git -c rebase.autoStash=true rebase dev")).toEqual(["guard:autostash"]);
    expect(rules("cd /x && git fetch && git pull --rebase origin dev")).toEqual(["guard:pull-rebase"]);
    expect(rules("bash -c 'git pull --rebase'")).toEqual(["guard:pull-rebase"]);
    expect(rules("git checkout --theirs a.json b.json")).toEqual(["guard:multipath-checkout"]);
    expect(rules("git checkout --ours -- a.json b.json")).toEqual(["guard:multipath-checkout"]);
    expect(rules("git checkout --theirs .")).toEqual(["guard:multipath-checkout"]);
    expect(rules("git restore --theirs 'data/*.json'")).toEqual(["guard:multipath-checkout"]);
    expect(rules("git -C /repo checkout --theirs x y")).toEqual(["guard:multipath-checkout"]);
  });

  it("allows the safe forms (no false positives)", () => {
    for (const cmd of [
      "git pull --ff-only",
      "git pull",
      "git pull --no-rebase origin dev",
      "git pull --rebase=false",
      "git checkout --theirs data/benchmarks/a.json",
      "git checkout -- a.ts b.ts",
      "git checkout dev",
      "git rebase origin/dev",
      "git log --grep=--autostash",
      'echo "git pull --rebase --autostash"',
      "git commit -m 'never use git pull --rebase'",
      "grep -rn autostash docs",
      "npm run verify",
    ]) {
      expect(rules(cmd), cmd).toEqual([]);
    }
  });

  it("follows cd and -C to the directory each git command runs in", () => {
    const v = findViolations("cd /srv/repo && git -C sub pull --rebase", "/home");
    expect(v[0].dir).toBe(resolve("/srv/repo/sub")); // a drive-letter path on Windows
  });

  it("blocks only in the shared checkout and honours a guard override", async () => {
    const { root, ctx } = makeRepo();
    loop.init(ctx, { iteration: 1, stage: "Build" });
    const input = { cwd: root, tool_name: "Bash", tool_input: { command: "git pull --rebase --autostash" } };
    const blocked = await guard(input);
    expect(blocked.block).toBe(true);
    expect(blocked.reasons.join("\n")).toMatch(/guard:pull-rebase[\s\S]*guard:autostash/);
    expect((await guard(input, { shared: () => false })).block).toBe(false);
    expect((await guard({ ...input, tool_input: { command: "git pull --ff-only" } })).block).toBe(false);
    loop.override(ctx, { rule: "guard:pull-rebase", reason: "owner asked" });
    loop.override(ctx, { rule: "guard:autostash", reason: "owner asked" });
    const prev = process.env.DEVLOOP_LOOP_CONFIG;
    process.env.DEVLOOP_LOOP_CONFIG = join(root, CFG);
    expect((await guard(input)).block).toBe(false);
    if (prev) process.env.DEVLOOP_LOOP_CONFIG = prev;
    else delete process.env.DEVLOOP_LOOP_CONFIG;
  });

  it("exits 2 with the reason on stderr from the CLI", () => {
    const { root } = makeRepo();
    const script = join(process.cwd(), "devloop/kit/hooks/guard-bash.mjs");
    const input = JSON.stringify({ cwd: root, tool_name: "Bash", tool_input: { command: "git pull --rebase" } });
    let code = 0;
    let stderr = "";
    try {
      execFileSync(process.execPath, [script], { input, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] });
    } catch (e) {
      const err = e as { status: number; stderr: string };
      code = err.status;
      stderr = err.stderr;
    }
    expect(code).toBe(2);
    expect(stderr).toMatch(/--ff-only/);
  });
});

describe("two sizes of verify: the quick gate for tooling, the full gate for the product (when.outside)", () => {
  const cfg = () => ({
    gates: ["verify", "qa", "triage", "status-refresh", "verify-quick"],
    rules: {
      ...baseConfig().rules,
      "verify-before-merge": { on: "merge", gate: "verify", match: "code", when: { outside: ["kit/tool.mjs", "tests/kit/**"] } },
      "verify-quick-before-merge": { on: "merge", gate: "verify-quick", match: "code" },
    },
    code: { include: ["src/**", "kit/**", "tests/**", "package.json"] },
  });
  const log = () => {};

  it("a tooling-only merge needs the quick gate and not the full one", () => {
    const { root, ctx, ev } = makeRepo(cfg());
    loop.init(ctx, { iteration: 1, stage: "Build" });
    git(root, "checkout", "-q", "-b", "work");
    commit(root, "kit/tool.mjs", "export const t = 1;\n");
    commit(root, "tests/kit/tool.spec.ts", "export {};\n");
    commit(root, "notes.md", "docs are not code\n");
    git(root, "checkout", "-q", "dev");
    expect(() => merge({ cwd: root, config: join(root, CFG), branch: "work", log })).toThrow(/verify-quick-before-merge/);
    const c = loop.evaluate(ctx, "merge", { commit: "work" });
    expect(c.results.find((x: { rule: string }) => x.rule === "verify-before-merge")).toMatchObject({ ok: true, skipped: true });
    expect(loop.formatResults(c)).toMatch(/every code file it touches is within kit\/tool\.mjs, tests\/kit\/\*\*/);
    pass(ctx, "verify-quick", ev, "work");
    const r = merge({ cwd: root, config: join(root, CFG), branch: "work", log });
    expect(r.commit).toBe(git(root, "rev-parse", "HEAD"));
  });

  it("a merge that also touches the product or other kit files still needs the full gate", () => {
    const { root, ctx, ev } = makeRepo(cfg());
    loop.init(ctx, { iteration: 1, stage: "Build" });
    git(root, "checkout", "-q", "-b", "work");
    commit(root, "kit/tool.mjs", "export const t = 1;\n");
    commit(root, "kit/runner.mjs", "export const gate = 1;\n");
    pass(ctx, "verify-quick", ev, "work");
    git(root, "checkout", "-q", "dev");
    expect(() => merge({ cwd: root, config: join(root, CFG), branch: "work", log })).toThrow(/verify-before-merge/);
    pass(ctx, "verify", ev, "work");
    const r = merge({ cwd: root, config: join(root, CFG), branch: "work", log });
    expect(r.commit).toBe(git(root, "rev-parse", "HEAD"));
  });

  it("a quick run records verify-quick only; a full pass records both", async () => {
    const { root, ctx, ev } = makeRepo(cfg());
    loop.init(ctx, { iteration: 1, stage: "Verify" });
    const head = git(root, "rev-parse", "HEAD");
    const config = { loop: { config: join(root, CFG) } };
    const base = { root, ok: true, evidence: ev, headAtStart: head, steps: ["test"] };
    const run = (modes: string[], over: Record<string, unknown> = {}) =>
      recordInLoop(config, { modes: new Set(modes), flags: new Set(), opts: { only: null, skip: new Set(), serve: false }, ...over }, base);
    expect(await run(["quick"], { opts: { only: new Set(["test"]), skip: new Set(), serve: false } })).toBeNull();
    expect(await run(["quick"])).toMatchObject({ gate: "verify-quick", result: "pass", commit: head });
    const gatesOf = () => loop.readState(ctx).records.map((r: { gate: string }) => r.gate);
    expect(gatesOf()).toEqual(["verify-quick"]);
    expect(await run(["default"])).toMatchObject({ gate: "verify", result: "pass" });
    expect(gatesOf()).toEqual(["verify-quick", "verify", "verify-quick"]);
  });
});
