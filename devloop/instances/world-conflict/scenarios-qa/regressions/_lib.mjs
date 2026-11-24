// Shared helpers for the regression guards in this folder (registry: ../../regressions.yaml).
// Every guard is called as `node <guard>.mjs <outDir> <baseUrl> <apiUrl>` and exits non-zero on failure.
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
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
    // A seat with a seed code (scenarios.yaml control:) starts exactly that seat and seed
    if (seat.seedCode) body.seedCode = seat.seedCode;
    else if (body.seed === undefined && !body.seedCode) body.seed = seat.seed;
    body.daily = false;
    await r.continue({ postData: JSON.stringify(body) });
  });
}

/**
 * Open All orders the way a player does (iteration 4): the month's "Your own orders" thing (from the
 * List, or See all when the List is folded) holds the All orders button.
 */
/**
 * All orders shows one family at a time behind tabs wider than a phone (design review S1-1,
 * DR-MS-1); phones list every family. Runs `fn(family word | null)` once per family tab (after
 * choosing it), or once with null when there are no tabs, and returns the results in order.
 */
export async function forEachFamily(page, fn) {
  const tabs = page.locator('[data-order-catalog] [role="tab"][data-family-tab]');
  const n = await tabs.count();
  if (!n) return [await fn(null)];
  const out = [];
  for (let i = 0; i < n; i++) {
    const tab = tabs.nth(i);
    await tab.click();
    await page.waitForTimeout(350);
    out.push(await fn(await tab.getAttribute('data-family-tab')));
  }
  return out;
}

/** Bring the first catalogue card matching `sel` into the panel (choosing its family tab); true when found. */
export async function showCatalogCard(page, sel) {
  const card = page.locator(`[data-order-catalog] ${sel}`).first();
  if (await card.count()) return true;
  const tabs = page.locator('[data-order-catalog] [role="tab"][data-family-tab]');
  for (let i = 0; i < (await tabs.count()); i++) {
    await tabs.nth(i).click();
    await page.waitForTimeout(350);
    if (await card.count()) return true;
  }
  return false;
}

export async function openAllOrders(s) {
  const p = s.page;
  const direct = p.getByRole('button', { name: /^All orders/ }).first();
  if (!(await direct.isVisible().catch(() => false))) {
    // The List holds "Your own orders" (month 2 on) or, in month 1, All orders in its flat panel
    if (!(await p.locator('[data-agenda]').first().isVisible().catch(() => false))) await p.locator('.see-all').first().click().catch(() => {});
    await p.waitForTimeout(300);
    if (!(await direct.isVisible().catch(() => false))) await p.locator('[data-agenda-item="own"]').first().click({ timeout: 5000 }).catch(() => {});
    await p.waitForTimeout(400);
  }
  return p.getByRole('button', { name: /^All orders/ }).first().click({ timeout: 5000 }).then(() => true, () => false);
}

/** Phones: go to the review screen, where the only Execute of the phone desk is (AC-21). */
export async function toPhoneReview(page) {
  if (await page.getByRole('button', { name: /Execute month/i }).first().isVisible().catch(() => false)) return;
  const review = page.getByRole('button', { name: /^Check and execute|^Review your month/ }).first();
  for (let i = 0; i < 12 && !(await review.isVisible().catch(() => false)); i++) {
    const next = page.locator('.ph-bottom .ph-next').first();
    if (!(await next.isVisible().catch(() => false))) break;
    await next.click().catch(() => {});
    await page.waitForTimeout(250);
  }
  await review.click().catch(() => {});
  await page.waitForTimeout(400);
}

/** Open the title on a fresh profile and take office on the pinned seat; resolves on the month 1 desk. */
/** init: an optional page script run before the app loads (a stored setting, say). */
export async function startGame({ variant, device, out, base, seat = SEAT, init }) {
  fs.rmSync(path.join(out, '.profile'), { recursive: true, force: true });
  const s = await launch({ variant, device, out, base });
  s.page.setDefaultTimeout(8000);
  await pinSeat(s.page, seat);
  if (init) await s.page.addInitScript(init);
  await s.goto();
  if (!(await s.click(/^Take office/i, { timeout: 15000 }))) throw new Error('no Take office on the title screen');
  // The briefing (and on some builds a familiarity question) sits between the title and the desk
  const exec = s.page.getByRole('button', { name: /Execute month/i }).first();
  const t0 = Date.now();
  // Execute must be pressable, not only rendered under the briefing. Phones have no Execute on the
  // desk until the review screen (design-agenda AC-21): there the month's Next button counts
  const phoneNext = s.page.locator('.ph-bottom .ph-next').first();
  const ready = async () =>
    (await exec.click({ trial: true, timeout: 600 }).then(() => true, () => false)) ||
    (await phoneNext.click({ trial: true, timeout: 300 }).then(() => true, () => false));
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

/**
 * A save made through the API (new game on the seat, `months` months resolved with no orders and
 * the default answers), for guards that measure a later month without playing up to it.
 */
export async function apiSave(api, months = 0, seat = SEAT, tag = 'guard') {
  const post = (p, body) => fetch(`${api}${p}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }).then((r) => r.json());
  const guest = `guest-${tag}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const body = { playerCountryId: seat.countryId, mode: seat.mode ?? 'FLASHPOINT', playerId: guest, saveName: tag };
  if (seat.flashpointId) body.flashpointId = seat.flashpointId;
  if (seat.seedCode) body.seedCode = seat.seedCode;
  else body.seed = seat.seed;
  const d = await post('/new-game', body);
  if (!d.success) throw new Error(`new game: ${JSON.stringify(d).slice(0, 200)}`);
  for (let i = 0; i < months; i++) {
    // The API allows a few /turn calls a second per client: wait out a 429
    for (let k = 0; ; k++) {
      const t = await post('/turn', { saveId: d.saveId, playerActions: [], decisions: [] });
      if (t.success) break;
      if (k > 8 || !/RATE/.test(JSON.stringify(t))) throw new Error(`turn: ${JSON.stringify(t).slice(0, 200)}`);
      await new Promise((r) => setTimeout(r, 500 + 300 * k));
    }
  }
  return { guest, save: d.saveId };
}

/**
 * Open a save from the title with Continue in a fresh browser at a size ("1920x1080"; 700 wide or
 * less is a touch phone); the coach is finished. Returns { browser, page, errors }; close the browser.
 */
export async function openSaved(base, size, sv, { init } = {}) {
  const [w, h] = size.split('x').map(Number);
  const browser = await chromium.launch({ args: process.env.DEVLOOP_SOFTWARE_GL ? [] : ['--enable-gpu', '--ignore-gpu-blocklist', '--use-gl=angle', '--use-angle=gl'] });
  const ctx = await browser.newContext(w <= 700 ? { viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: w, height: h } });
  const page = await ctx.newPage();
  page.setDefaultTimeout(8000);
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(
    ([g, s]) => {
      if (sessionStorage.getItem('guard-init')) return;
      sessionStorage.setItem('guard-init', '1');
      localStorage.setItem('worldconflict.guest', g);
      localStorage.setItem('worldconflict.lastSave', s);
      localStorage.setItem('worldconflict.sound', JSON.stringify({ muted: true }));
      localStorage.setItem('worldconflict.coach', 'done');
    },
    [sv.guest, sv.save],
  );
  if (init) await page.addInitScript(init);
  await page.goto(base);
  await page.getByRole('button', { name: /^Continue/i }).first().click({ timeout: 30000 });
  await page.locator('[data-region="item"]').first().waitFor({ timeout: 30000 });
  await page.waitForTimeout(1200);
  return { browser, page, errors };
}

/**
 * Runs in the page: is this element whole and on top? Inside the viewport, inside every ancestor
 * that clips (overflow other than visible), and the element (or a descendant) is what is under its
 * centre and its four corners inset by 4 px (elementFromPoint). Returns '' or what is wrong.
 */
export const WHOLE_JS = `(el) => {
  const r = el.getBoundingClientRect();
  if (r.width < 1 || r.height < 1) return 'not shown';
  if (r.top < -0.5 || r.left < -0.5 || r.bottom > innerHeight + 0.5 || r.right > innerWidth + 0.5) return 'outside the viewport (' + Math.round(r.top) + '..' + Math.round(r.bottom) + ' of ' + innerHeight + ')';
  for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
    const s = getComputedStyle(a);
    if (s.overflowX === 'visible' && s.overflowY === 'visible') continue;
    const q = a.getBoundingClientRect();
    if (r.top < q.top - 0.5 || r.bottom > q.bottom + 0.5 || r.left < q.left - 0.5 || r.right > q.right + 0.5) return 'clipped by ' + a.tagName.toLowerCase() + '.' + [...a.classList].slice(0, 2).join('.') + ' (' + Math.round(r.top) + '..' + Math.round(r.bottom) + ' in ' + Math.round(q.top) + '..' + Math.round(q.bottom) + ')';
  }
  const pts = [[r.left + r.width / 2, r.top + r.height / 2], [r.left + 4, r.top + 4], [r.right - 4, r.top + 4], [r.left + 4, r.bottom - 4], [r.right - 4, r.bottom - 4]];
  for (const [x, y] of pts) {
    const at = document.elementFromPoint(x, y);
    if (!at || !(el.contains(at) || at.contains(el))) return 'covered at ' + Math.round(x) + ',' + Math.round(y) + ' by ' + (at ? at.tagName.toLowerCase() + '.' + [...at.classList].slice(0, 2).join('.') : 'nothing');
  }
  return '';
}`;

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

/**
 * The phone month's order list as the player sees it (iteration 4 phone tree, PhoneMonth). The page
 * scroller is `.game`; what floats over the list: the sticky top (`.game-top`: the state line and
 * the thing line with Back, See all and the Desk / Map switch), the sticky bottom bar (`.ph-bottom`:
 * the below-the-fold cue, Next, or Execute on the review screen and in Map mode), any coach bubble
 * that is shown, and the List or recommendation sheet (`.ph-sheet`) when one is open. Returns the free
 * band between the top and the bottom bar, the share of it a coach bubble or a sheet covers, and the
 * catalogue rows that are whole inside it and really on top (elementFromPoint at the centre, the four
 * corners inset by 4 px and the row's button): rows in the layout box that something covers do not count.
 */
export function phoneList(page) {
  return page.evaluate(() => {
    const vis = (e) => {
      if (!e) return false;
      const cs = getComputedStyle(e);
      const r = e.getBoundingClientRect();
      return cs.visibility !== 'hidden' && cs.display !== 'none' && r.height > 0 && r.width > 0;
    };
    const top = Math.max(0, document.querySelector('.game-top')?.getBoundingClientRect().bottom ?? 0);
    const bar = document.querySelector('.ph-bottom');
    const bottom = Math.min(innerHeight, vis(bar) ? bar.getBoundingClientRect().top : innerHeight);
    const band = Math.max(0, bottom - top);
    const floaters = [...document.querySelectorAll('.coach-bubble, .ph-sheet')].filter(vis).map((e) => ({ e, r: e.getBoundingClientRect() }));
    // Covered share of the band's height: the union of the floaters' vertical extents inside it
    const spans = floaters.map(({ r }) => [Math.max(top, r.top), Math.min(bottom, r.bottom)]).filter(([a, b]) => b > a).sort((x, y) => x[0] - y[0]);
    let covered = 0;
    let end = top;
    for (const [a, b] of spans) {
      if (b <= end) continue;
      covered += b - Math.max(a, end);
      end = b;
    }
    const onTop = (el, x, y) => {
      const at = y >= 0 && y < innerHeight && x >= 0 && x < innerWidth ? document.elementFromPoint(x, y) : null;
      return !!at && el.contains(at);
    };
    const rows = [...document.querySelectorAll('[data-order-catalog] .ord-cat .ord-wrap')].filter(vis);
    const whole = rows.filter((w) => {
      const r = w.getBoundingClientRect();
      if (r.top < top - 1 || r.bottom > bottom + 1) return false;
      const pts = [
        [r.left + r.width / 2, r.top + r.height / 2],
        [r.left + 4, r.top + 4],
        [r.right - 4, r.top + 4],
        [r.left + 4, r.bottom - 4],
        [r.right - 4, r.bottom - 4],
      ];
      const act = w.querySelector('.ord-act');
      if (act) {
        const a = act.getBoundingClientRect();
        pts.push([a.left + a.width / 2, a.top + a.height / 2]);
      }
      return pts.every(([x, y]) => onTop(w, x, y));
    });
    return {
      top: Math.round(top),
      bottom: Math.round(bottom),
      band: Math.round(band),
      covered: Math.round(covered),
      coveredShare: band ? covered / band : 0,
      floaters: floaters.map(({ e, r }) => `${e.dataset.coach ? `coach ${e.dataset.coach}` : e.className.toString().split(' ')[0]} ${Math.round(r.top)}..${Math.round(r.bottom)}`),
      whole: whole.length,
      heights: whole.map((w) => Math.round(w.getBoundingClientRect().height)).join(','),
      hscroll: (document.querySelector('.game')?.scrollWidth ?? 0) > innerWidth + 1,
    };
  });
}

/** Phone: scroll the page so this catalogue family's group starts right under the sticky top. */
export async function phoneScrollToFamily(page, fam) {
  await page.evaluate((fam) => {
    const g = document.querySelector('.game');
    const sec = document.querySelector(`[data-order-catalog] [data-order-family="${fam}"]`);
    const top = document.querySelector('.game-top')?.getBoundingClientRect().bottom ?? 0;
    g.scrollTop += sec.getBoundingClientRect().top - top;
  }, fam);
  await page.waitForTimeout(400);
}

/**
 * Open a thing of the month by its title (iteration 4 month screen: one thing at a time). The thing
 * on screen is `article.thing` with the title as its label; any other is opened from the List (a
 * column, or See all when it is folded; the sheet on a phone). Returns true when it is on screen.
 */
export async function openThing(page, title) {
  const on = () => page.locator(`article.thing[aria-label="${title.replace(/"/g, '\\"')}"]`).first().isVisible().catch(() => false);
  if (await on()) return true;
  const row = page.locator('.lrow').filter({ has: page.locator('.lrow-t > b', { hasText: title }) }).first();
  if (!(await row.isVisible().catch(() => false))) {
    await page.locator('.see-all').first().click({ timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(300);
  }
  await row.scrollIntoViewIfNeeded().catch(() => {});
  await row.click({ timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(400);
  return on();
}
