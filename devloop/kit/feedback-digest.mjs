// Build a compact digest of one iteration's customer feedback for status pages.
// Reads <runDir>/sessions/*.json (method/report.schema.json), <runDir>/interviews/*.json,
// optional <runDir>/patterns.json (hand-curated cross-customer patterns from triage)
// and panel weights from <instance>/panel/panel.yaml.
//
//   node devloop/kit/feedback-digest.mjs <instanceDir> <iteration> [--inject <html> <MARKER>]
//
// With --inject, replaces the text between /*<MARKER>:START*/ and /*<MARKER>:END*/ in the HTML
// with `<MARKER>[<iteration>] = {...};` entries for every iteration found under runs/.
//
// Also a module: `digest(instanceDir, iteration)`, `panelWeights(instanceDir)`, `iterations(instanceDir)`
// and `sessionsOf(instanceDir, iteration)` (raw session reports) are used by kit/evaluate.mjs.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

/** Persona weights from <instance>/panel/panel.yaml: { id: weight }. */
export function panelWeights(instanceDir) {
  const weights = {};
  const file = path.join(instanceDir, 'panel', 'panel.yaml');
  if (!fs.existsSync(file)) return weights;
  const panel = fs.readFileSync(file, 'utf8');
  for (const m of panel.matchAll(/id:\s*(\w+),\s*file:\s*[\w.]+,\s*weight:\s*([\d.]+)/g)) weights[m[1]] = Number(m[2]);
  return weights;
}

export const runDirOf = (instanceDir, iter) => path.join(instanceDir, 'runs', `iter-${String(iter).padStart(2, '0')}`);

/** Raw session reports of one iteration (method/report.schema.json). */
export const sessionsOf = (instanceDir, iter) => readJson(path.join(runDirOf(instanceDir, iter), 'sessions'));

const readJson = (dir) =>
  fs.existsSync(dir)
    ? fs
        .readdirSync(dir)
        .filter((f) => f.endsWith('.json'))
        .map((f) => {
          try {
            return JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
          } catch {
            return null;
          }
        })
        .filter(Boolean)
    : [];

const short = (s, n = 220) => {
  const t = String(s ?? '').replace(/\s*\((?:devloop|shots)\/[^)]*\)/g, '').replace(/\s+/g, ' ').trim();
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
};

export function digest(instanceDir, iter, weights = panelWeights(instanceDir)) {
  const runDir = runDirOf(instanceDir, iter);
  const sessions = readJson(path.join(runDir, 'sessions'));
  const interviews = readJson(path.join(runDir, 'interviews'));
  const customers = sessions
    .map((s) => {
      const id = s.persona.toLowerCase();
      const scores = Object.fromEntries(Object.entries(s.scores ?? {}).map(([k, v]) => [k, v?.value ?? v]));
      const iv = interviews.find((i) => (i.persona ?? '').toLowerCase() === id) ?? {};
      return {
        id,
        variant: s.variant,
        weight: weights[id] ?? 0,
        minutes: s.minutes_played ?? null,
        scores,
        quit: s.quit_point && !/^\s*(none|null|n\/a|no)\b/i.test(s.quit_point) ? short(s.quit_point, 200) : null,
        verbatim: short(s.verbatim, 260),
        wish: short(s.suggestions?.[0]?.what, 200),
        delight: (s.delight ?? []).slice(0, 2).map((d) => short(d, 160)),
        friction: (s.friction ?? []).slice(0, 3).map((f) => short(`${f.where}: ${f.happened}`, 170)),
        bugs: (s.bugs ?? []).map((b) => ({ sev: b.severity, title: short(b.title, 120) })),
        scenarios: (s.scenarios ?? []).map((x) => ({ id: x.id, outcome: x.outcome })),
        interview: iv.points ? { top: Object.entries(iv.points).sort((a, b) => b[1] - a[1]).slice(0, 3), cut: iv.cut ?? [] } : null,
      };
    })
    .sort((a, b) => b.weight - a.weight);
  const wsum = customers.reduce((a, c) => a + c.weight, 0) || 1;
  const avg = (k) => Math.round((10 * customers.reduce((a, c) => a + c.weight * (c.scores[k] ?? 0), 0)) / wsum) / 10;
  const keys = ['recommend', 'fun', 'clarity', 'visual', 'feels_like_a_game', 'agency', 'realism', 'replay'];
  const tradeoff = {};
  for (const i of interviews) {
    const w = weights[(i.persona ?? '').toLowerCase()] ?? 0;
    for (const [k, v] of Object.entries(i.points ?? {})) tradeoff[k] = (tradeoff[k] ?? 0) + w * v;
  }
  const patternsFile = path.join(runDir, 'patterns.json');
  return {
    iteration: Number(iter),
    weighted: Object.fromEntries(keys.map((k) => [k, avg(k)])),
    quitters: customers.filter((c) => c.quit).length,
    total: customers.length,
    tradeoff: Object.entries(tradeoff)
      .map(([k, v]) => [k, Math.round(v * 10) / 10])
      .sort((a, b) => b[1] - a[1]),
    patterns: fs.existsSync(patternsFile) ? JSON.parse(fs.readFileSync(patternsFile, 'utf8')) : null,
    customers,
  };
}

/** Iterations that have session reports, ascending. */
export function iterations(instanceDir) {
  const runs = path.join(instanceDir, 'runs');
  if (!fs.existsSync(runs)) return [];
  return fs
    .readdirSync(runs)
    .map((d) => /^iter-(\d+)$/.exec(d)?.[1])
    .filter((x) => x != null && fs.existsSync(path.join(runs, `iter-${x}`, 'sessions')))
    .map(Number)
    .sort((a, b) => a - b);
}

function cli(argv) {
  const [instanceDir, iteration, ...rest] = argv;
  const iters = iterations(instanceDir);
  const injectAt = rest.indexOf('--inject');
  if (injectAt >= 0) {
    const [html, marker] = rest.slice(injectAt + 1);
    const body = iters.map((i) => `${marker}[${i}] = ${JSON.stringify(digest(instanceDir, i))};`).join('\n');
    const src = fs.readFileSync(html, 'utf8');
    const re = new RegExp(`/\\*${marker}:START\\*/[\\s\\S]*?/\\*${marker}:END\\*/`);
    if (!re.test(src)) throw new Error(`markers /*${marker}:START*/ ... /*${marker}:END*/ not found in ${html}`);
    fs.writeFileSync(html, src.replace(re, () => `/*${marker}:START*/\n${body}\n/*${marker}:END*/`));
    console.log(`injected iterations ${iters.join(', ')} into ${html}`);
  } else {
    console.log(JSON.stringify(digest(instanceDir, iteration), null, 1));
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) cli(process.argv.slice(2));
