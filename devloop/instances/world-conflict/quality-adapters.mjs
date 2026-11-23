// World Conflict quality adapters (product-specific; the generic ones are in devloop/kit/evaluate.mjs).
// Loaded through `adapters` in quality.json. An adapter is (args, ctx) => measurement, see
// devloop/method/quality.md.
import path from 'node:path';

const stripAnsi = (s) => String(s).replace(/\x1b\[[0-9;]*m/g, '');

export const adapters = {
  /**
   * Balance bands from the reduced harness (`npm run verify -- --balance`, tests/balance/bands.spec.ts):
   * the log lists every band as "ok", "FAIL" or "EXEMPT" (CLAUDE.md balance targets).
   * args.metric: failed (bands out of range, default) | exempt | smart-pooled (percent) | tension-median
   * | staff-pooled (share, D-84) | guided-in-band (bool, 65-90%) | call-trap (points, callhold minus
   * callpush, pooled; D-84 revision) | call-gap (points, callpush minus callhold, informative)
   * | real-decisions (per month, control seeds).
   */
  balance(args, ctx) {
    const art = ctx.artifact(args.log ?? '.verify/balance.log');
    if (!art) return { missing: 'no balance log (.verify/balance.log): run npm run verify -- --balance' };
    const text = stripAnsi(art.text());
    const rows = [...text.matchAll(/^(ok|FAIL|EXEMPT)\s+(.+)$/gm)].map((m) => ({ status: m[1], what: m[2].trim() }));
    if (!rows.length) return { missing: `no band lines in ${path.basename(art.path)}` };
    const failed = rows.filter((r) => r.status === 'FAIL');
    const exempt = rows.filter((r) => r.status === 'EXEMPT');
    const metric = args.metric ?? 'failed';
    let value;
    if (metric === 'failed') value = failed.length;
    else if (metric === 'exempt') value = exempt.length;
    else if (metric === 'smart-pooled') value = Number(/smart pooled ([\d.]+)%/.exec(text)?.[1] ?? Number.NaN) / 100;
    else if (metric === 'tension-median') value = Number(/tension median of seat medians ([\d.]+)/.exec(text)?.[1] ?? Number.NaN);
    else if (metric === 'staff-pooled') value = Number(/staff pooled ([\d.]+)%/.exec(text)?.[1] ?? Number.NaN) / 100;
    else if (metric === 'guided-in-band') {
      const g = Number(/guided pooled ([\d.]+)%/.exec(text)?.[1] ?? Number.NaN);
      value = Number.isNaN(g) ? g : g >= 65 && g <= 90;
    } else if (metric === 'call-trap') value = Number(/call trap (-?[\d.]+) points/.exec(text)?.[1] ?? Number.NaN);
    else if (metric === 'call-gap') value = Number(/call gap (-?[\d.]+) points/.exec(text)?.[1] ?? Number.NaN);
    else if (metric === 'real-decisions') value = Number(/real decisions per month ([\d.]+)/.exec(text)?.[1] ?? Number.NaN);
    else return { missing: `unknown balance metric ${metric}` };
    if (Number.isNaN(value)) return { missing: `${metric} not found in the balance log` };
    const games = /Balance bands, (\d+) games per seat/.exec(text)?.[1];
    return {
      value,
      at: art.at,
      commit: art.commit,
      iteration: null,
      evidence: path.relative(ctx.root, art.path),
      detail: `${rows.length} bands${games ? ` at ${games} games per seat` : ''}: ${rows.length - failed.length - exempt.length} ok, ${failed.length} failed${failed.length ? ` (${failed.map((r) => r.what).join('; ')})` : ''}, ${exempt.length} exempt`,
    };
  },
};
