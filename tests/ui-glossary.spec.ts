import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { TERMS } from "../ui/src/lib/glossary.js";

/**
 * One vocabulary (design-orders.md §8, goal G3): no player-facing string may use a banned
 * synonym from `ui/src/lib/glossary.ts`. Scans string literals and JSX text in `ui/src`
 * (parsed with the TypeScript compiler, so comments and apostrophes can't confuse it),
 * flashpoint objective labels, data-loader objective labels and docs/GAMEPLAY.md.
 * Skips identifier-like literals, className/key/id values, type literals, imports and any
 * line ending in `// glossary-ok` (the allow-list for code-only strings).
 */
const ROOT = join(__dirname, "..");
const UI_SRC = join(ROOT, "ui/src");

interface Hit {
  where: string;
  text: string;
  term: string;
  pattern: string;
}

/**
 * Strings in files that other iteration-1 work packages own and are rewriting. Each entry is
 * `file :: exact text`; remove it when that package lands. The test prints any entry that no
 * longer matches, so the list can't rot.
 */
const PENDING: ReadonlySet<string> = new Set<string>([
  // WP5 (orders design): HUD and rail vocabulary
  "ui/src/components/Hud.tsx :: Appr",
  "ui/src/components/Hud.tsx :: Stab",
  "ui/src/components/Hud.tsx :: Legit",
  "ui/src/components/Hud.tsx :: GDP",
  "ui/src/components/Hud.tsx :: Capital",
  "ui/src/components/Hud.tsx :: Cap",
  "ui/src/components/Hud.tsx :: Tens",
  "ui/src/components/desk/CommandRail.tsx :: ◆ Capital",
  "ui/src/components/desk/CommandRail.tsx :: Defense",
  "ui/src/components/desk/CommandRail.tsx :: Orders",
  "ui/src/components/desk/CommandRail.tsx :: In person",
  "ui/src/components/desk/CommandRail.tsx :: Staff",
  "ui/src/components/desk/CommandRail.tsx :: Approve",
  "ui/src/components/desk/CommandRail.tsx :: /6 · In person",
  "ui/src/lib/budget.ts :: meetings in person",
  // WP4 (orders design): queueOrder() stops raising duplicate errors
  "ui/src/store/gameStore.ts :: \" is already on your desk this month",
  // WP6 (orders design): desk catalog, staff picks, map menu
  "ui/src/components/desk/Detail.tsx :: % def",
  "ui/src/components/desk/Detail.tsx :: Your calendar is full (3 in person). Send a deputy to another meeting to take this one.",
  "ui/src/components/desk/Detail.tsx :: Staff suggests",
  "ui/src/components/desk/Detail.tsx :: months left · leadership score",
  "ui/src/components/MapActionMenu.tsx :: Already on your desk",
  // Month design WP-D (Navigator) and WP-B (staff.ts)
  "ui/src/components/desk/Navigator.tsx :: /3 in person",
  "ui/src/components/desk/Navigator.tsx :: Suggested",
  "ui/src/components/desk/Navigator.tsx :: Orders",
  "ui/src/lib/staff.ts :: Mission: leadership score",
  // Reveal design (EndGameReport moves into the report view)
  "ui/src/components/EndGameReport.tsx :: Leadership score over time (",
]);

/** Genuine uses that only look like a banned synonym: a GDP figure is labelled GDP. */
const ALLOWED: ReadonlySet<string> = new Set<string>([
  "ui/src/components/Chronicle.tsx :: GDP",
  "ui/src/components/CountryDetailPanel.tsx :: GDP",
  "ui/src/scenes/art/EconTv.tsx :: GDP",
]);

const BANNED = Object.values(TERMS).flatMap((t) =>
  t.banned.map((re) => ({ term: t.id, re: re as RegExp })),
);

function check(where: string, text: string, out: Hit[]) {
  for (const { term, re } of BANNED)
    if (re.test(text)) out.push({ where, text: text.trim(), term, pattern: String(re) });
}

/** Literals that are identifiers, keys, paths or CSS, not words a player reads. */
function identifierLike(s: string): boolean {
  const t = s.trim();
  if (t === "") return true;
  if (/^[A-Z0-9]+(_[A-Z0-9]+)+$/.test(t)) return true; // ACTION_TYPE
  if (/^[a-z0-9][\w\-.:/#?=&%@[\]()]*$/.test(t)) return true; // camelCase, kebab-case, paths
  return false;
}

const SKIP_ATTRS = new Set(["className", "key", "id", "htmlFor", "style", "src", "href", "role"]);

function scanTsx(file: string, out: Hit[]) {
  const code = readFileSync(file, "utf8");
  const lines = code.split("\n");
  const src = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const rel = relative(ROOT, file);
  const okLine = (node: ts.Node) => {
    const { line } = src.getLineAndCharacterOfPosition(node.getStart(src));
    return /\/\/\s*glossary-ok\s*$/.test(lines[line] ?? "");
  };
  const skipped = (node: ts.Node): boolean => {
    for (let p: ts.Node | undefined = node.parent; p; p = p.parent) {
      if (ts.isImportDeclaration(p) || ts.isExportDeclaration(p) || ts.isLiteralTypeNode(p))
        return true;
      if (ts.isJsxAttribute(p)) {
        const name = p.name.getText(src);
        if (SKIP_ATTRS.has(name) || name.startsWith("data-")) return true;
        break;
      }
      if (ts.isCallExpression(p) && /^(require|import)$/.test(p.expression.getText(src)))
        return true;
      if (ts.isStatement(p)) break;
    }
    // Object keys and element access keys are identifiers
    const parent = node.parent;
    if (parent && ts.isPropertyAssignment(parent) && parent.name === node) return true;
    if (parent && ts.isElementAccessExpression(parent) && parent.argumentExpression === node)
      return true;
    return false;
  };
  const visit = (node: ts.Node) => {
    let text: string | null = null;
    if (
      ts.isStringLiteral(node) ||
      ts.isNoSubstitutionTemplateLiteral(node) ||
      ts.isTemplateHead(node) ||
      ts.isTemplateMiddle(node) ||
      ts.isTemplateTail(node)
    )
      text = node.text;
    else if (ts.isJsxText(node)) text = node.text;
    if (text !== null && !identifierLike(text) && !skipped(node) && !okLine(node)) {
      const { line } = src.getLineAndCharacterOfPosition(node.getStart(src));
      check(`${rel}:${line + 1}`, text, out);
    }
    ts.forEachChild(node, visit);
  };
  visit(src);
}

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return walk(p);
    return /\.(tsx?|mts)$/.test(name) && !/\.d\.ts$/.test(name) ? [p] : [];
  });
}

function scanAll(): Hit[] {
  const hits: Hit[] = [];
  for (const file of walk(UI_SRC)) {
    // The glossary itself spells out the banned words as patterns
    if (file.endsWith(join("lib", "glossary.ts"))) continue;
    scanTsx(file, hits);
  }
  // Objective labels the player reads on the mission card
  const fpDir = join(ROOT, "data/flashpoints");
  for (const name of readdirSync(fpDir).filter((n) => n.endsWith(".json"))) {
    const raw = readFileSync(join(fpDir, name), "utf8");
    for (const m of raw.matchAll(/"label"\s*:\s*"([^"]*)"/g))
      check(`data/flashpoints/${name}`, m[1], hits);
  }
  const loader = readFileSync(join(ROOT, "src/core/data-loader.ts"), "utf8");
  for (const m of loader.matchAll(/label:\s*"([^"]*)"/g)) check("src/core/data-loader.ts", m[1], hits);
  // Player docs: words only (code spans name identifiers)
  const docs = readFileSync(join(ROOT, "docs/GAMEPLAY.md"), "utf8").split("\n");
  docs.forEach((line, i) => {
    if (/glossary-ok/.test(line)) return;
    check(`docs/GAMEPLAY.md:${i + 1}`, line.replace(/`[^`]*`/g, ""), hits);
  });
  return hits;
}

describe("UI glossary", () => {
  it("defines each concept once, with a name and a compact form", () => {
    const names = Object.values(TERMS).map((t) => t.name.toLowerCase());
    expect(new Set(names).size).toBe(names.length);
    for (const t of Object.values(TERMS)) {
      expect(t.compact.length).toBeGreaterThan(0);
      // A term's own name must never be banned by another term
      for (const { term, re } of BANNED) expect(re.test(t.name), `${t.id} vs ${term}`).toBe(false);
    }
    expect(TERMS.capital.definition).toContain("◆ 6");
  });

  it("catches a banned word in a UI string", () => {
    const out: Hit[] = [];
    check("probe", "Not enough political credit", out);
    check("probe", "APPR", out);
    check("probe", "Orders 2/6", out);
    check("probe", "Leadership score of 110+", out);
    check("probe", "Capital", out);
    check("probe", "Capital city (yours in amber)", out);
    expect(out.map((h) => h.term)).toEqual(["capital", "approval", "orders", "score", "capital"]);
    expect(identifierLike("DIPLOMACY_DECLARE_WAR")).toBe(true);
    expect(identifierLike("Capital")).toBe(false);
  });

  it("finds no banned synonym in UI strings, objective labels or the gameplay guide", () => {
    const hits = scanAll();
    const key = (h: Hit) => `${h.where.replace(/:\d+$/, "")} :: ${h.text}`;
    const stale = [...PENDING].filter((p) => !hits.some((h) => key(h) === p));
    if (stale.length)
      console.info(`glossary: pending entries now fixed, remove them:\n${stale.join("\n")}`);
    const open = hits.filter((h) => !PENDING.has(key(h)) && !ALLOWED.has(key(h)));
    expect(open.map((h) => `${h.where} [${h.term} ${h.pattern}] ${h.text}`)).toEqual([]);
  });
});
