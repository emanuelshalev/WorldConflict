import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";

// The UI store reads window.location at import; a bare stand-in is enough for these pure helpers
vi.hoisted(() => {
  (globalThis as unknown as { window: unknown }).window ??= { location: { search: "" }, innerWidth: 1440 };
});
import { buildPages, yourMoveCard } from "../ui/src/lib/debrief.js";
import { resultBig, resultWord, statusOf } from "../ui/src/lib/outcome.js";
import { drawRevealCard, drawRevealPortrait, type RevealCardData } from "../ui/src/lib/shareCard.js";
import type { TurnReport, WorldState } from "../ui/src/store/gameStore.js";

/**
 * F-02-2: every surface renders the engine's status, never its own guess. Dan saw a staff meeting
 * stamped FAILED while it raised mobilization 85 to 95; Marcus saw FAILED on his vote and on China's
 * and Russia's moves; Priya saw a -9 labelled "A step forward"; Maya and QA S2-1 saw a front move
 * told as "What your choice did".
 */

const world = { playerCountryId: "USA", globalTension: 47, countries: [] } as unknown as WorldState;
const report = (over: Partial<TurnReport> = {}): TurnReport =>
  ({ turn: 3, orders: [], decisions: [], deltas: {}, causes: [], moments: [], ...over }) as TurnReport;

describe("debrief cards carry the engine's status", () => {
  it("Dan: a staff meeting that applied, at a cost, is DONE (good), not FAILED", () => {
    const r = report({
      decisions: [
        {
          title: "Staff meeting: the front",
          choice: "Call up more reservists",
          kind: "STAFF",
          attended: true,
          headline: "Defence Minister: Call up more reservists",
          facts: [
            { label: "Mobilization", before: 85, after: 95, unit: "%", good: false },
            { label: "Approval", before: 50, after: 48, unit: "%" },
          ],
          status: "DONE",
          reason: "Your answer took effect, at a cost: Approval -2",
        },
      ],
    });
    const cards = buildPages(r, world).flatMap((p) => p.cards);
    const c = cards.find((x) => x.headline.includes("reservists"));
    expect(c?.status).toBe("DONE");
    expect(c?.verdict).toBe("good");
  });

  it("Marcus: a vote cast is DONE; a card of only their moves has no status (no stamp)", () => {
    const r = report({
      decisions: [
        { title: "Sanctions on Iran", choice: "Vote for sanctions", kind: "CRISIS", withCountry: "IRN", attended: true, facts: [{ label: "Iran's view of you", before: -40, after: -55 }], status: "DONE" },
      ],
      world: [
        { actor: "CHN", type: "DIPLOMACY_DENOUNCE", target: "USA", label: "China: Denounce United States", status: "DONE" },
        { actor: "RUS", type: "DIPLOMACY_DENOUNCE", target: "USA", label: "Russia: Denounce United States", status: "DONE" },
      ],
    });
    const cards = buildPages(r, world).flatMap((p) => p.cards);
    expect(cards.find((c) => c.country === "IRN")?.status).toBe("DONE");
    for (const id of ["CHN", "RUS"]) {
      const c = cards.find((x) => x.country === id);
      expect(c?.status).toBeUndefined();
      expect(c?.kicker).toMatch(/their move/);
    }
  });

  it("a failed order and a refused one keep their own words", () => {
    const r = report({
      orders: [
        { label: "Propose ceasefire to Russia", ok: false, detail: "Russia rejected", type: "DIPLOMACY_PROPOSE_CEASEFIRE", target: "RUS", status: "FAILED", reason: "Russia rejected the ceasefire proposal" },
        { label: "Reform program", ok: false, detail: "Not enough political capital", type: "DOMESTIC_REFORM", code: "NO_CAPITAL", status: "REFUSED" },
      ],
    });
    const cards = buildPages(r, world).flatMap((p) => p.cards);
    expect(cards.find((c) => c.country === "RUS")?.status).toBe("FAILED");
    expect(cards.find((c) => c.headline.startsWith("Reform"))?.status).toBe("REFUSED");
  });

  it("fronts and hot zones are never stamped as the player's result", () => {
    const r = report({ wars: [{ vs: "RUS", frontBefore: 47, frontAfter: 50, ended: false }] });
    for (const c of buildPages(r, world).flatMap((p) => p.cards)) expect(c.status).toBeUndefined();
  });

  it("old saves without a status fall back to the item's own flags, never to the facts", () => {
    expect(statusOf({ ok: true })).toBe("DONE");
    expect(statusOf({ ok: false, code: "NO_CAPITAL" })).toBe("REFUSED");
    expect(statusOf({ ok: false })).toBe("FAILED");
    expect(statusOf({})).toBe("DONE"); // a decision: the answer applied
  });
});

describe("the result card", () => {
  it("QA S2-1 and Maya: a war highlight is never 'What your choice did'", () => {
    const r = report({
      decisions: [{ title: "The January clock", choice: "More escorts, no strikes", kind: "CRISIS", attended: true, facts: [{ label: "Approval", before: 44, after: 41 }], status: "DONE" }],
      wars: [{ vs: "IRN", frontBefore: 55, frontAfter: 60, ended: false }],
      highlight: { ref: "war", index: 0 },
      yourMove: { ref: "decision", index: 0 },
    });
    const own = yourMoveCard(r);
    expect(own?.headline).not.toMatch(/gain ground/);
    expect(own?.lines[0]?.text).toMatch(/More escorts/);
    // Without an engine yourMove, a war highlight still never becomes the choice
    expect(yourMoveCard({ ...r, yourMove: undefined, decisions: [] })).toBeNull();
  });

  it("C2-2 (design-rereview-your-call.md): a crisis left open is never the leader's answer or the player's choice", () => {
    const r = report({
      decisions: [{ title: "General strike", choice: "Break the strike (no decision taken)", kind: "CRISIS", attended: true, headline: "Trump's answer: Break the strike", facts: [], status: "DONE" }],
      yourMove: { ref: "decision", index: 0 },
    });
    const own = yourMoveCard(r);
    expect(own?.headline).toBe("Left open: Break the strike");
    expect(own?.lines[0]?.text).toBe("You left it open: Break the strike went ahead by default");
    const all = buildPages(r, world).flatMap((p) => p.cards);
    for (const c of all) expect(`${c.headline} ${c.lines.map((l) => l.text).join(" ")}`).not.toMatch(/Trump's answer|^You: /);
    // The result card's "You chose" line reads "Left open" for it (ResultCard.tsx leftOpen)
    expect(readFileSync("ui/src/scenes/ResultCard.tsx", "utf-8")).toContain("{leftOpen ? 'Left open' : `You ${ho ? 'ordered' : 'chose'}`}");
  });

  it("Priya: a -9 under a done choice reads 'Done, at a cost', never 'A step forward'", () => {
    const w = resultWord("DONE", { label: "United States' view of you", before: 45, after: 36 });
    expect(w).toBe("Done, at a cost");
    expect(resultWord("DONE", { label: "Approval", before: 44, after: 50 })).toBe("Done");
    expect(resultWord("FAILED", { label: "Approval", before: 44, after: 50 })).toBe("Failed");
    // ...and the -9 is red: a rise-is-good fact that fell is bad for the player
    expect(resultBig({ label: "United States' view of you", before: 45, after: 36, good: true }, "DONE")).toEqual({ word: "Done, at a cost", good: false });
    expect(resultBig({ label: "Front (your side)", before: 55, after: 60 }, undefined).word).toBe("This month");
  });
});

// ---- Share card: a fake 2D canvas that records every line of text with its box --------------
type Drawn = { text: string; x: number; y: number; w: number; size: number; align: string };
function fakeCanvas(drawn: Drawn[]) {
  const stack: unknown[][] = [];
  const g = {
    font: "10px sans-serif",
    textAlign: "left",
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 1,
    lineCap: "",
    lineJoin: "",
    globalAlpha: 1,
    measureText(t: string) {
      const size = Number(/(\d+(?:\.\d+)?)px/.exec(g.font)?.[1] ?? 10);
      // Mono and display faces are about 0.6 em per character; emoji count double
      return { width: [...t].reduce((s, ch) => s + (/\p{Extended_Pictographic}|\p{Regional_Indicator}/u.test(ch) ? 1 : 0.6), 0) * size };
    },
    fillText(text: string, x: number, y: number) {
      const size = Number(/(\d+(?:\.\d+)?)px/.exec(g.font)?.[1] ?? 10);
      drawn.push({ text, x, y, w: g.measureText(text).width, size, align: g.textAlign });
    },
    createLinearGradient: () => ({ addColorStop() {} }),
    createRadialGradient: () => ({ addColorStop() {} }),
    fillRect() {},
    strokeRect() {},
    beginPath() {},
    closePath() {},
    moveTo() {},
    lineTo() {},
    arc() {},
    rect() {},
    roundRect() {},
    fill() {},
    stroke() {},
    save() { stack.push([g.font, g.textAlign, g.globalAlpha]); },
    restore() { const s = stack.pop(); if (s) [g.font, g.textAlign, g.globalAlpha] = s as [string, string, number]; },
    translate() {},
    scale() {},
  };
  return { width: 0, height: 0, getContext: () => g, toDataURL: () => "data:image/png;base64," };
}

const longCard: RevealCardData = {
  title: "Hormuz Convoy",
  country: "United States",
  flagEmoji: "🇺🇸",
  verdict: "MISSION FAILED",
  victory: false,
  dateLabel: "OCT 2027",
  subtitle: "Shadow Operator · You missed Voters stay on side by 5.8 points and Israel stays on side by 3.2",
  bestMoment: "Buy weapons, month 1, and a long tail of words that runs past the edge of the card",
  grade: "D",
  stars: 0,
  score: 587,
  rankLines: ["Better than 4% of simulated competent leaders", "Your first run on this seat"],
  seals: [],
  cells: Array.from({ length: 12 }, () => "g" as const),
  conditions: [{ met: false, bonus: false }],
  seedCode: "HC-USA-LE41R8",
  daily: null,
  site: "worldconflict.game",
};

describe("the share card (F-02-3, Leo: clipped lines)", () => {
  for (const [name, draw, W, H] of [
    ["landscape 1200 x 630", drawRevealCard, 1200, 630],
    ["portrait 1080 x 1350", drawRevealPortrait, 1080, 1350],
  ] as const) {
    it(`${name}: every line inside the card, nothing truncated`, () => {
      const drawn: Drawn[] = [];
      vi.stubGlobal("document", { createElement: () => fakeCanvas(drawn) });
      vi.stubGlobal("Path2D", class {});
      expect(draw(longCard)).toMatch(/^data:image\/png/);
      vi.unstubAllGlobals();
      expect(drawn.length).toBeGreaterThan(8);
      for (const d of drawn) {
        const left = d.align === "center" ? d.x - d.w / 2 : d.align === "right" ? d.x - d.w : d.x;
        expect(left, d.text).toBeGreaterThanOrEqual(0);
        expect(left + d.w, d.text).toBeLessThanOrEqual(W);
        expect(d.y, d.text).toBeLessThanOrEqual(H);
        expect(d.y - d.size, d.text).toBeGreaterThanOrEqual(0);
        expect(d.text, "no ellipsis").not.toMatch(/…$/);
      }
      // The rank line and the subtitle are shown in full (wrapped if need be)
      const all = drawn.map((d) => d.text).join(" ");
      expect(all).toContain("simulated");
      expect(all).toContain("3.2");
    });
  }
});
