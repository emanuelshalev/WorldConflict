// Shared helpers for the regression guards in this folder (registry: ../../regressions.yaml).
// Every guard is called as `node <guard>.mjs <outDir> <baseUrl> <apiUrl>` and exits non-zero on failure.
import fs from 'node:fs';
import path from 'node:path';
import { launch } from '../../../../kit/kit.mjs';

export function args(id) {
  const out = path.resolve(process.argv[2] ?? `.verify/reg-scratch/${id}`);
  const base = (process.argv[3] ?? process.env.DEVLOOP_BASE_URL ?? 'http://localhost:5173/').replace(/#.*$/, '');
  const api = (process.argv[4] ?? process.env.DEVLOOP_API_URL ?? 'http://localhost:8080/api').replace(/\/$/, '');
  fs.mkdirSync(out, { recursive: true });
  return { out, base, api };
}

/** Named checks, one summary line, the exit code. */
export function guard(id) {
  const checks = [];
  return {
    check(ok, what) {
      checks.push({ ok: !!ok, what });
      console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`);
      return !!ok;
    },
    finish() {
      const bad = checks.filter((c) => !c.ok);
      if (!checks.length) {
        console.log(`${id} FAIL: no checks ran`);
        process.exitCode = 1;
      } else if (bad.length) {
        console.log(`${id} FAIL: ${bad.map((c) => c.what).join('; ')}`.slice(0, 400));
        process.exitCode = 1;
      } else console.log(`${id} PASS (${checks.length} checks)`);
    },
  };
}

/** The seat every guard plays unless it says otherwise: the customers' default (Hormuz Convoy as
 *  the United States) with a fixed seed, so a guard does not change with the date or the dice. */
export const SEAT = { flashpointId: 'hormuz-convoy', countryId: 'USA', title: 'Hormuz Convoy', seed: 4242 };

/** Pin "today's crisis" on the title and the new game's seed (the server picks both by date / at random). */
export async function pinSeat(page, seat = SEAT) {
  await page.route(/\/api\/scenarios(\?.*)?$/, async (r) => {
    // Ask for the full body (a revalidation would answer 304 with nothing to rewrite)
    const headers = { ...r.request().headers() };
    delete headers['if-none-match'];
    delete headers['if-modified-since'];
    const res = await r.fetch({ headers });
    let j;
    try {
      j = await res.json();
    } catch {
      return r.fulfill({ response: res });
    }
    if (j.daily) j.daily = { ...j.daily, flashpointId: seat.flashpointId, countryId: seat.countryId, title: seat.title };
    await r.fulfill({ response: res, json: j });
  });
  await page.route(/\/api\/new-game$/, async (r) => {
    const body = JSON.parse(r.request().postData() ?? '{}');
    if (body.seed === undefined && !body.seedCode) body.seed = seat.seed;
    body.daily = false;
    await r.continue({ postData: JSON.stringify(body) });
  });
}

/** Open the title on a fresh profile and take office on the pinned seat; resolves on the month 1 desk. */
export async function startGame({ variant, device, out, base, seat = SEAT }) {
  fs.rmSync(path.join(out, '.profile'), { recursive: true, force: true });
  const s = await launch({ variant, device, out, base });
  s.page.setDefaultTimeout(8000);
  await pinSeat(s.page, seat);
  await s.goto();
  if (!(await s.click(/^Take office/i, { timeout: 15000 }))) throw new Error('no Take office on the title screen');
  // The briefing (and on some builds a familiarity question) sits between the title and the desk
  const exec = s.page.getByRole('button', { name: /Execute month/i }).first();
  const t0 = Date.now();
  // Execute must be pressable, not only rendered under the briefing
  const ready = () => exec.click({ trial: true, timeout: 600 }).then(() => true, () => false);
  while (!(await ready())) {
    if (Date.now() - t0 > 30000) {
      await s.look('start-stuck');
      throw new Error('the month 1 desk did not open after Take office');
    }
    await s.click(/^(Take office|Begin|Start)/i, { timeout: 1500 });
    await s.page.waitForTimeout(700);
  }
  await s.page.waitForTimeout(800);
  return s;
}

/** Visible text of the page, whitespace collapsed. */
export const bodyText = async (page) => (await page.locator('body').innerText()).replace(/\s+/g, ' ');

/** Run the body with a guard; close every session it opened; any throw is a failed check. */
export async function run(id, body) {
  const g = guard(id);
  const sessions = [];
  try {
    await body(g, (s) => (sessions.push(s), s));
  } catch (e) {
    g.check(false, `threw: ${e.message.split('\n')[0]}`);
    const s = sessions.at(-1);
    if (s) await s.page.screenshot({ path: path.join(s.out, 'failure.png') }).catch(() => {});
  } finally {
    for (const s of sessions) await s.close().catch(() => {});
  }
  g.finish();
}
