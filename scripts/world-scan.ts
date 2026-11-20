/**
 * World scan: read news feeds (or a headline file), propose updates to the game's world data.
 *
 *   npm run world:scan                         # feeds in data/world-scan/sources.json
 *   npm run world:scan -- --input news.txt     # one headline per line ("2026-11-18 | headline | link")
 *   npm run world:scan -- --llm anthropic      # refine with an LLM (key from .env), add --draft for flashpoint files
 *
 * Writes data/world-scan/proposals/<date>.json (edit "accept": true) and <date>.md (the report).
 * Nothing in the game changes until `npm run world:apply -- <file>`.
 */
import "dotenv/config";
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createLLMClient } from "../src/agents/llmClient.js";
import { CRISIS_TEMPLATE_IDS } from "../src/core/crises.js";
import {
  buildMatchers,
  buildProposal,
  draftFlashpoint,
  type FeedItem,
  loadWorldContext,
  parseFeed,
  parseInput,
  type Proposal,
  proposalMarkdown,
  refineWithLLM,
  tagItems,
} from "../src/tools/worldScan.js";

const args = process.argv.slice(2);
const opt = (name: string) => {
  const i = args.indexOf(`--${name}`);
  if (i < 0) return undefined;
  const v = args[i + 1];
  return v && !v.startsWith("--") ? v : "";
};

const DATA = resolve("data");
const date = opt("date") || new Date().toISOString().slice(0, 10);
const outDir = opt("out") || join(DATA, "world-scan", "proposals");

async function gather(): Promise<{ items: FeedItem[]; sources: Proposal["sources"] }> {
  const input = opt("input");
  if (input) {
    const items = parseInput(readFileSync(input, "utf-8"), input);
    return { items, sources: [{ name: input, items: items.length }] };
  }
  const cfg = JSON.parse(readFileSync(opt("sources") || join(DATA, "world-scan", "sources.json"), "utf-8")) as {
    feeds: Array<{ name: string; url: string }>;
  };
  const items: FeedItem[] = [];
  const sources: Proposal["sources"] = [];
  for (const f of cfg.feeds) {
    try {
      const res = await fetch(f.url, { signal: AbortSignal.timeout(15000), headers: { "user-agent": "WorldConflict-world-scan/1.0" } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const got = parseFeed(await res.text(), f.name);
      items.push(...got);
      sources.push({ name: f.name, items: got.length });
    } catch (e) {
      sources.push({ name: f.name, items: 0, error: e instanceof Error ? e.message : String(e) });
    }
  }
  return { items, sources };
}

async function main() {
  const ctx = loadWorldContext(DATA, CRISIS_TEMPLATE_IDS);
  const aliases = (JSON.parse(readFileSync(join(DATA, "world-scan", "aliases.json"), "utf-8")) as { aliases: Record<string, string[]> }).aliases;
  const matchers = buildMatchers(ctx.names, aliases, ctx.leaders);
  const { items, sources } = await gather();
  for (const s of sources) console.log(`${s.error ? "x" : "+"} ${s.name}: ${s.error ?? `${s.items} items`}`);
  if (items.length === 0) {
    console.error("No items. Check the feeds (network) or pass --input <file>.");
    process.exit(1);
  }
  const tagged = tagItems(items, matchers);
  let proposal = buildProposal(tagged, ctx, date, sources);
  const provider = opt("llm");
  if (provider !== undefined) {
    const llm = createLLMClient((provider || process.env.LLM_PROVIDER || "anthropic") as "anthropic", { maxTokens: 6000, timeout: 120000 });
    try {
      proposal = await refineWithLLM(proposal, tagged, ctx, llm);
      if (opt("draft") !== undefined) {
        const example = JSON.parse(readFileSync(join(DATA, "flashpoints", "scarborough-line.json"), "utf-8"));
        delete example.scripted;
        for (const f of proposal.flashpoints.filter((x) => !x.coveredBy).slice(0, 2)) {
          try {
            f.draft = await draftFlashpoint(f, ctx, llm, example, date);
          } catch (e) {
            console.warn(`Draft for ${f.title} failed: ${e instanceof Error ? e.message : e}`);
          }
        }
      }
    } catch (e) {
      console.warn(`LLM step failed, keeping the heuristic proposal: ${e instanceof Error ? e.message : e}`);
    }
  }
  const json = join(outDir, `${date}.json`);
  writeFileSync(json, `${JSON.stringify(proposal, null, 2)}\n`);
  writeFileSync(join(outDir, `${date}.md`), proposalMarkdown(proposal, ctx.names));
  console.log(
    `\n${proposal.history.length} history entries, ${proposal.leaders.length} leader changes, ${proposal.crises.length} crisis patterns, ${proposal.flashpoints.length} flashpoint candidates.\nReview ${json} (set "accept": true), then: npm run world:apply -- ${json}`,
  );
}

void main();
