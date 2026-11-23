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
  // Month design WP-B (staff.ts)
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
  const rel = relative(ROOT, file).replaceAll("\\", "/");
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

  it("names the Recommended group, one verb Choose, and explains it in one line (RS-005, D-72, D-73)", () => {
    expect(TERMS.recommended.name).toBe("Recommended");
    expect(TERMS.recommended.definition).toBe("Your advisers recommend these for this month. A recommended order runs only if you choose it; a crisis or meeting you leave goes ahead on its recommended or usual answer.");
    expect(TERMS.staffPick.name).toBe("Recommended by {role}");
    // D-73: with the agenda's per-item Choose, the bulk button is "Choose all recommended" and defines itself
    expect(TERMS.approveAll.name).toBe("Choose all recommended ({n})");
    expect(TERMS.approveAll.definition).toBe("Chooses the recommended answer for every routine thing still to do.");
    // D-84: the calls are the player's; one glossary word names them
    expect(TERMS.yourCall.name).toBe("Your call");
    expect(TERMS.choose.name).toBe("Choose");
    expect(TERMS.reviewRecommended.name).toBe("Review {n} recommended");
    // The old phrasing is banned in UI strings and the gameplay guide
    const banned = BANNED.filter((b) => b.term === "staffPick" || b.term === "approveAll").map((b) => b.re);
    for (const old of ["Approve 4 staff picks", "Staff picks", "Approve all", "Accept all recommended (4)", "Accept order"]) expect(banned.some((re) => re.test(old)), old).toBe(true);
    for (const ok of ["Choose all recommended (4)", "Review 4 recommended", "Recommended by Foreign Minister"]) expect(banned.some((re) => re.test(ok)), ok).toBe(false);
  });

  it("bans the iteration 3 leftovers: one word Recommended, one verb Choose (QA3-S3-2, D-72, D-73, design-agenda 0.4)", () => {
    const hit = (text: string) => BANNED.some((b) => b.re.test(text));
    for (const old of ["Cabinet pick", "Accept cabinet pick", "Cabinet pick · good for your mission", "◆ 1 if approved", "On Approve, staff attend 3", "2 staff proposals to approve", "proposals wait for your approval", "Your advisors suggest", "Approve order",
      // D-73: Accept is gone for recommendations
      "Accept recommended", "◆ 1 if accepted", "Accepted: Abstain", "Orders and meetings wait for you to accept", "Accept answer",
      // design-agenda 0.4 / 0.12 WP-A6: the agenda's plain words
      "Send a deputy", "A deputy goes", "Handled by your staff", "Now: needs you", "Routine meetings (2)", "Proposed orders"])
      expect(hit(old), old).toBe(true);
    for (const ok of ["Recommended: Abstain", "Choose", "◆ 1 if chosen", "Recommended: staff attend 3", "Orders to consider (5)", "2 of them recommended", "Approval about +4", "You chose: Abstain", "Skip this call: your Foreign Minister answers", "Small meetings (2)", "Recommended orders (2)", "Accept the reforms"])
      expect(hit(ok), ok).toBe(false);
    expect(TERMS.orderIdeas.name).toBe("Orders to consider");
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

// QA3R-5e (F-02-5, RS-005, D-72, D-73): one verb for a recommended order on every mount point. The
// order card (tile on the desk and map, row in the phone sheet and dossier) chooses a recommended
// order with the same verb as the agenda's answer cards (Choose); the Plan's rows only Open.
describe("one verb for a recommended order on every surface (QA3R-5e)", () => {
  it("OrderCard tile and row use the agenda's verb, Choose", () => {
    const verb = "Choose order";
    expect(TERMS.choose.name).toBe("Choose");
    const card = readFileSync("ui/src/components/orders/OrderCard.tsx", "utf8");
    const tile = card.slice(card.indexOf("const proposalLine"), card.indexOf("const addLine"));
    expect(tile).toContain(`> ${verb}{`);
    expect(card).toMatch(new RegExp(`add: isProposal \\? '${verb}'`));
    expect(card).not.toMatch(/\bApprove\b|\bAccept order\b/);
    // The Plan's recommendation rows have Open, never their own Accept (D-72 D8)
    const plan = readFileSync("ui/src/components/desk/Plan.tsx", "utf8");
    expect(plan).toContain("aria-label={`Open: ${it.title}`}");
    expect(plan).not.toMatch(/>\s*Accept\b/);
  });
});
