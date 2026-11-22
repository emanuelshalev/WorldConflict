// QA scenario for design-orders.md §10 (27 acceptance criteria), iteration 1, WP7.
//
//   node devloop/instances/world-conflict/scenarios-qa/orders.mjs <outDir> [baseUrl] [apiUrl]
//   (defaults: http://localhost:5173/ and http://localhost:8080/api)
//
// Three parts:
//  A. The orders gallery (/#orders: a real Water War game as Pakistan with the concept's month)
//     at 1440, 1024 and 390: card states, reasons, pointing, confirm faces, map menu, catalog and
//     search, parity, with screenshots.
//  B. The real game from the title screen (1440 and 390): the desk catalog when it is mounted,
//     the map menu, the HUD vocabulary, the toast (network failure), no native dialogs.
//  C. The engine agreement over 3 months through the API: every order the menu plus the month
//     layer allows is never refused at Execute for a predictable reason.
// Writes <outDir>/orders-qa.json and prints one line per criterion: PASS, FAIL or MANUAL.
import fs from 'node:fs';
import path from 'node:path';
import { launch } from '../../../kit/kit.mjs';

const out = process.argv[2] ?? '/tmp/playtest/orders-qa';
const base = (process.argv[3] ?? process.env.DEVLOOP_BASE_URL ?? 'http://localhost:5173/').replace(/#.*$/, '');
const api = (process.argv[4] ?? process.env.DEVLOOP_API_URL ?? 'http://localhost:8080/api').replace(/\/$/, '');
fs.mkdirSync(out, { recursive: true });

/** criterion number → { status, notes[] } (FAIL wins over PASS, PASS over MANUAL). */
const results = {};
const rank = { FAIL: 3, PASS: 2, MANUAL: 1 };
function mark(n, ok, note) {
  const status = ok === null ? 'MANUAL' : ok ? 'PASS' : 'FAIL';
  const r = (results[n] ??= { status, notes: [] });
  if (rank[status] > rank[r.status]) r.status = status;
  if (note) r.notes.push(`${status === 'FAIL' ? 'FAIL ' : ''}${note}`);
}
const step = async (name, fn) => {
  try {
    await fn();
  } catch (e) {
    console.error(`step "${name}" threw: ${e.message.split('\n')[0]}`);
    mark('errors', false, `${name}: ${e.message.split('\n')[0]}`);
  }
};

const VIEWPORTS = [
  { device: 'laptop', w: 1440 },
  { device: 'tablet', w: 1024 },
  { device: 'phone', w: 390 },
];

// ---------------------------------------------------------------------------------------------
// A. The gallery
// ---------------------------------------------------------------------------------------------
async function gallery({ device, w }) {
  const s = await launch({ variant: `orders-${w}`, device, out: path.join(out, `gallery-${w}`), base: `${base}#orders` });
  const p = s.page;
  p.setDefaultTimeout(6000);
  let dialogs = 0;
  p.on('dialog', () => dialogs++);
  const shot = (name, loc) => (loc ? loc.first().screenshot({ path: path.join(s.out, `${name}.png`) }) : p.screenshot({ path: path.join(s.out, `${name}.png`), fullPage: false }));
  const card = (scope, id) => p.locator(`${scope} [data-order-id="${id}"]`).first();
  const slots = () => p.locator('.og-tray [data-point-slot]').count();
  const reset = async () => {
    await p.getByRole('button', { name: 'Reset the month' }).click();
    await p.waitForFunction(() => document.querySelectorAll('.og-tray [data-point-slot]').length === 2, null, { timeout: 8000 });
    await p.waitForTimeout(300);
  };
  try {
    await p.goto(`${base}#orders`);
    await p.waitForSelector('[data-og=states] [data-order-id="spy"][data-order-state]', { timeout: 20000 });
    await p.waitForTimeout(1200);
    await p.screenshot({ path: path.join(s.out, '00-gallery-full.png'), fullPage: true });

    // ---- AC2, AC6, AC5: states before any tap
    await step('states', async () => {
      const war = card('[data-og=states]', 'declare-war');
      const t = await war.innerText();
      mark(2, /Needs ◆ 2, you have ◆ 1\./.test(t) && /\+3 next month/.test(t), `${w}: desk tile "${t.replace(/\s+/g, ' ').slice(0, 90)}"`);
      const row = await card('[data-og=rows]', 'declare-war').innerText();
      mark(2, /Needs ◆ 2, you have ◆ 1\./.test(row) && /\+3 next month/.test(row), `${w}: row`);
      const nuke = await card('[data-og=states]', 'nuclear-strike').innerText();
      mark(6, /Only in wartime\. You are not at war with India\./.test(nuke.replace(/\s+/g, ' ')), `${w}: "${nuke.replace(/\s+/g, ' ').slice(0, 80)}"`);
      for (const scope of ['[data-og=states]', '[data-og=rows]', '[data-og=map]']) {
        const c = card(scope, 'court');
        const txt = await c.innerText();
        mark(5, (await c.getAttribute('data-order-state')) === 'queued' && /In this month/.test(txt) && /Remove/.test(txt), `${w}: queued on ${scope}`);
      }
    });

    // ---- AC10: unavailable cards reachable by Tab with "{label}, unavailable: {reason}"
    await step('a11y', async () => {
      const hit = card('[data-og=states]', 'declare-war').locator('.wc-card-hit');
      const name = await hit.getAttribute('aria-label');
      const disabled = await hit.evaluate((b) => b.disabled || b.tabIndex < 0);
      mark(10, !disabled && /^Declare war on India, unavailable: Needs ◆ 2, you have ◆ 1\.$/.test(name ?? ''), `${w}: name "${name}"`);
      // Keyboard path: Tab from the card before it lands on it
      await card('[data-og=states]', 'spy').locator('.wc-card-hit').focus();
      for (let i = 0; i < 6; i++) {
        await p.keyboard.press('Tab');
        if (await hit.evaluate((b) => b === document.activeElement)) break;
      }
      mark(10, await hit.evaluate((b) => b === document.activeElement), `${w}: Tab reaches the unaffordable card`);
    });

    // ---- AC3, AC11, AC12: tapping an unaffordable order
    await step('unaffordable tap', async () => {
      const before = await slots();
      const war = card('[data-og=states]', 'declare-war');
      // aria-disabled cards still take presses (Playwright treats them as disabled: dispatch the click)
      await war.locator('.wc-card-hit').dispatchEvent('click');
      const t0 = Date.now();
      const pointed = await p.waitForFunction(
        () => {
          const els = [...document.querySelectorAll('[data-point="capital"]')].filter((e) => e.getBoundingClientRect().width > 0);
          return els.length > 0 && els.every((e) => e.classList.contains('is-pointed'));
        },
        null,
        { timeout: 1000 },
      ).then(() => Date.now() - t0, () => -1);
      const callout = await p.locator('.wc-point-callout').innerText().catch(() => '');
      mark(11, pointed >= 0 && pointed < 400 && /Declare war on India needs ◆ 2/.test(callout), `${w}: capital pointed after ${pointed} ms, callout "${callout}"`);
      const slotLit = await p.locator('.og-tray [data-point-slot].is-pointed').count();
      mark(12, slotLit >= 1, `${w}: ${slotLit} tray slot(s) lit`);
      await shot('01-unaffordable-pointed');
      await shot('01b-states', p.locator('[data-og=states]'));
      const after = await slots();
      const toast = await p.locator('.toast').count();
      const still = /Needs ◆ 2/.test(await war.innerText());
      mark(3, after === before && toast === 0 && still, `${w}: tray ${before}→${after}, toasts ${toast}`);
      // An invalid card: no queue either
      await card('[data-og=states]', 'nuclear-strike').locator('.wc-card-hit').dispatchEvent('click');
      mark(3, (await slots()) === before, `${w}: invalid tap queues nothing`);
      await p.waitForTimeout(2200);
    });

    // ---- AC13: adding pulses the tray slot and the capital meter
    await step('add', async () => {
      const spy = card('[data-og=states]', 'spy');
      await spy.locator('.wc-card-hit').click();
      await p.waitForFunction(() => document.querySelectorAll('.og-tray [data-point-slot]').length === 3, null, { timeout: 6000 });
      const slotPulse = await p.locator('.og-tray [data-point-slot="2"].is-pointed').count();
      const meter = await p.locator('.og-meter[data-point="capital"].is-pointed').count();
      mark(13, slotPulse === 1 && meter === 1, `${w}: slot ${slotPulse}, meter ${meter}`);
      await shot('02-added');
    });

    // ---- AC23, AC24, AC22, AC21 on the map menu
    await step('map', async () => {
      await reset();
      const menu = p.locator('[data-og=map] .map-action-menu');
      await menu.scrollIntoViewIfNeeded();
      const spyMap = menu.locator('[data-order-id="spy"]');
      if (w >= 700) {
        await spyMap.locator('.wc-card-hit').hover();
        await p.waitForTimeout(500);
        const hover = await p.locator('.ord-hover').innerText().catch(() => '');
        await spyMap.locator('.ord-info').click();
        const inline = await spyMap.locator('.ord-pv').innerText().catch(() => '');
        const summary = inline.split('\n')[0];
        mark(24, !!summary && hover.includes(summary), `${w}: hover forecast ${hover ? 'shown' : 'missing'}`);
        await spyMap.locator('.ord-info').click();
      } else mark(24, null, `${w}: touch uses the Forecast button (same OrderPreview)`);
      const before = await slots();
      await spyMap.locator('.wc-card-hit').click();
      await p.waitForTimeout(900);
      const state = await spyMap.getAttribute('data-order-state');
      const stamp = await spyMap.locator('.wc-stamp').count();
      mark(23, (await menu.count()) === 1 && state === 'queued' && stamp === 1 && (await slots()) === before + 1, `${w}: menu open, state ${state}, stamp ${stamp}`);
      await shot('03-map-queued', menu);
      await reset();
      // AC22: same numbers on the map card and the desk card
      // The country picker (F-01-1) replaced the native select
      await p.locator('[data-og=catalog] [data-country-picker]').first().click();
      await p.waitForTimeout(300);
      await p.locator('.cp-row[data-country="IND"]').first().click();
      await p.waitForTimeout(900);
      const more = menu.locator('.mam-more');
      if (await more.count()) await more.click();
      await p.waitForTimeout(400);
      // Tiles and phone rows lay the facts out differently: compare the facts, not the layout
      const facts = async (loc) => {
        const el = loc.first();
        const text = (await el.innerText()).replace(/\s+/g, ' ');
        return {
          cost: await el.locator('.wc-cost').getAttribute('aria-label').catch(() => null) ?? (await el.locator('.wc-cost').innerText().catch(() => '')),
          numbers: (text.match(/\d+% (chance|defense)/g) ?? []).sort().join(' '),
          reason: text.match(/Needs ◆ \d, you have ◆ \d\.|Only in wartime\.[^.]*\.|All 6 orders this month are used\./)?.[0] ?? '',
        };
      };
      for (const id of ['destabilize', 'declare-war', 'spy', 'deploy-border']) {
        const a = await facts(menu.locator(`[data-order-id="${id}"]`));
        const b = await facts(p.locator(`[data-og=catalog] [data-order-id="${id}"]`));
        mark(22, JSON.stringify(a) === JSON.stringify(b), `${w}: ${id} map ${JSON.stringify(a)} desk ${JSON.stringify(b)}`);
      }
      // AC21: the expanded map list and the desk catalog hold the same orders with the same labels
      const mapLabels = (await menu.locator('.wc-card-title').allInnerTexts()).sort();
      const deskLabels = (await p.locator('[data-og=catalog] .wc-card-title').allInnerTexts()).filter((l) => / India$/.test(l)).sort();
      mark(21, JSON.stringify(mapLabels) === JSON.stringify(deskLabels), `${w}: map ${mapLabels.length} vs desk ${deskLabels.length}`);
      await shot('04-map-expanded', menu);
    });

    // ---- AC1: no target picked in All orders
    await step('needs target', async () => {
      // The country picker cannot be cleared back to "no target" (QA S4): reload the gallery and
      // test the no-target state only when the catalog starts without one
      await p.goto(`${base}#orders`);
      await p.waitForSelector('[data-og=states] [data-order-id="spy"][data-order-state]', { timeout: 20000 });
      await p.waitForTimeout(1200);
      const cards = p.locator('[data-og=catalog] [data-order-code="NEEDS_TARGET"]');
      const n = await cards.count();
      if (n === 0) {
        mark(1, null, `${w}: the gallery catalog always has a target; check "Pick a country first." in the game (All orders before a pick)`);
        return;
      }
      const texts = await cards.allInnerTexts();
      mark(1, n >= 15 && texts.every((t) => t.includes('Pick a country first.')), `${w}: ${n} targeted cards say Pick a country first.`);
      await cards.first().locator('.ord-fix').click();
      const focused = await p.evaluate(() => document.activeElement?.getAttribute('aria-label'));
      const pulsed = await p.locator('[data-og=catalog] [data-country-picker].is-pointed, [data-og=catalog] .is-pointed [data-country-picker]').count();
      mark(1, /country|target/i.test(focused ?? '') && pulsed >= 1, `${w}: focus "${focused}", picker pulsed ${pulsed}`);
      await shot('05-needs-target', p.locator('[data-og=catalog]'));
    });

    // ---- AC25: Enter in search on Declare war opens the face, a second Enter cancels (B-09)
    await step('search enter', async () => {
      await reset();
      // free a seal so Declare war is available: remove the staff order
      await p.locator('.og-tray [data-point-slot="1"] .ord-slot-remove').click();
      await p.waitForTimeout(300);
      const before = await slots();
      const box = p.locator('[data-og=catalog] #catalog-search');
      await box.fill('declare war ind');
      await p.waitForTimeout(900);
      await box.press('Enter');
      await p.waitForTimeout(400);
      const face = await p.locator('[data-og=catalog] [data-confirm="war"]').count();
      const focusText = await p.evaluate(() => document.activeElement?.textContent?.trim());
      mark(25, face === 1 && focusText === 'Keep the peace', `${w}: face ${face}, focus "${focusText}"`);
      await shot('06-search-confirm', p.locator('[data-og=catalog] .ord-hits'));
      await p.keyboard.press('Enter');
      await p.waitForTimeout(400);
      mark(25, (await p.locator('[data-og=catalog] [data-confirm]').count()) === 0 && (await slots()) === before, `${w}: second Enter cancels, nothing queued`);
      // Enter on the first hit of a plain search never queues an unavailable order either
      await box.fill('assassinate ind');
      await p.waitForTimeout(900);
      await box.press('Enter');
      await p.waitForTimeout(300);
      mark(25, (await slots()) === before, `${w}: Enter on an invalid hit queues nothing`);
      await box.fill('');
    });

    // ---- AC26, AC27: the static confirm faces
    await step('confirm faces', async () => {
      const result = () => p.locator('[data-og-result]').getAttribute('data-og-result');
      const hold = p.locator('[data-og=confirm] .ord-hold');
      await hold.scrollIntoViewIfNeeded();
      const b = await hold.boundingBox();
      await p.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
      await p.mouse.down();
      await p.waitForTimeout(500);
      await p.mouse.up();
      await p.waitForTimeout(300);
      const early = await result();
      await p.mouse.down();
      await p.waitForTimeout(1450);
      await p.mouse.up();
      await p.waitForTimeout(200);
      const full = await result();
      mark(26, early !== 'nuclear-authorized' && full === 'nuclear-authorized', `${w}: 0.5 s → ${early}, 1.45 s → ${full}`);
      const mission = p.locator('[data-og=confirm] [data-confirm="mission"]');
      const color = await mission.locator('.ord-confirm-mission').evaluate((e) => getComputedStyle(e).color);
      const count = (await mission.innerText()).split('Mission at risk').length - 1;
      mark(27, count === 1 && /255, 226, 160/.test(color), `${w}: warning shown ${count}x, amber ${color}`);
      await shot('07-confirm-faces', p.locator('[data-og=confirm]'));
    });

    // ---- AC4: six orders used
    await step('order limit', async () => {
      await reset();
      // The country picker (F-01-1) replaced the native select
      await p.locator('[data-og=catalog] [data-country-picker]').first().click();
      await p.waitForTimeout(300);
      await p.locator('.cp-row[data-country="IND"]').first().click();
      await p.waitForTimeout(800);
      for (const id of ['denounce', 'demobilize', 'policing-soft', 'policing-hard']) {
        await p.locator(`[data-og=catalog] [data-order-id="${id}"] .wc-card-hit`).click();
        await p.waitForTimeout(700);
      }
      const n = await slots();
      const others = p.locator('[data-og=catalog] [data-order-state]:not([data-order-state="queued"])');
      const texts = await others.allInnerTexts();
      const limited = texts.filter((t) => t.includes('All 6 orders this month are used.')).length;
      const invalid = await p.locator('[data-og=catalog] [data-order-state="invalid"]').count();
      mark(4, n === 6 && limited === texts.length - invalid && limited > 5, `${w}: ${n} queued, ${limited} of ${texts.length} cards say the limit (${invalid} invalid keep their rule)`);
      await p.locator('[data-og=catalog] [data-order-code="ORDER_LIMIT"] .wc-card-hit').first().dispatchEvent('click');
      await p.waitForTimeout(150);
      mark(4, (await p.locator('[data-point="orders"].is-pointed').count()) >= 1, `${w}: Orders this month pointed`);
      await shot('08-order-limit', p.locator('[data-og=catalog]'));
    });

    mark(8, dialogs === 0, `${w}: ${dialogs} native dialogs in the gallery`);
    mark(9, (await p.locator('.toast').count()) === 0, `${w}: no toast for refusals in the gallery`);
    if (s.errors.length) mark('errors', false, `${w}: ${s.errors.slice(0, 3).join(' | ')}`);
  } finally {
    await s.close();
  }
}

// AC15: reduced motion shows a static ring
async function reducedMotion() {
  const s = await launch({ variant: 'orders-rm', device: 'laptop', out: path.join(out, 'gallery-reduced-motion'), base: `${base}#orders` });
  const p = s.page;
  p.setDefaultTimeout(6000);
  try {
    await p.emulateMedia({ reducedMotion: 'reduce' });
    await p.goto(`${base}#orders`);
    await p.waitForSelector('[data-og=states] [data-order-id="declare-war"][data-order-state="unaffordable"]', { timeout: 20000 });
    await p.locator('[data-og=states] [data-order-id="declare-war"] .wc-card-hit').dispatchEvent('click');
    await p.waitForTimeout(120);
    const st = await p.locator('.og-meter[data-point="capital"]').evaluate((e) => {
      const cs = getComputedStyle(e);
      return { cls: e.className, anim: cs.animationName, transform: cs.transform, shadow: cs.boxShadow };
    });
    mark(15, /is-pointed/.test(st.cls) && st.anim === 'none' && (st.transform === 'none' || st.transform === '') && st.shadow !== 'none', `animation ${st.anim}, transform ${st.transform}`);
  } finally {
    await s.close();
  }
}

// ---------------------------------------------------------------------------------------------
// B. The real game
// ---------------------------------------------------------------------------------------------
async function realGame({ device, w }) {
  const s = await launch({ variant: `orders-game-${w}`, device, out: path.join(out, `game-${w}`), base });
  const p = s.page;
  p.setDefaultTimeout(6000);
  let dialogs = 0;
  p.on('dialog', () => dialogs++);
  try {
    await s.goto();
    await s.click(/^Take office/i);
    await p.waitForTimeout(2500);
    await s.click(/Take office|Begin|Start/i);
    await p.waitForTimeout(1500);
    const v = await s.look('desk');
    // AC17, AC19: vocabulary in the HUD and the visible text
    const text = await p.locator('body').innerText();
    if (w === 1024 || w === 1440) {
      const words = ['Approval', 'Stability', 'Legitimacy', 'Economy', 'Political capital', 'World tension', 'Score'];
      const missing = words.filter((x) => !text.includes(x));
      mark(17, missing.length === 0, `${w}: HUD missing ${missing.join(', ') || 'nothing'}`);
    }
    const banned = [/Orders \d+\/6/, /\bIn person\b/i, /Leadership score/i, /\bApprove \d+\s*$/m, /political credit/i, /\bAPPR\b/, /\bSTAB\b/];
    const hits = banned.filter((re) => re.test(text)).map(String);
    mark(19, hits.length === 0, `${w}: ${hits.join(', ') || 'no banned strings visible'}`);
    // AC18: HUD and rail diamonds agree (desk WP5); counted when both meters draw seals
    const counts = await p.$$eval('[data-point="capital"]', (els) => els.filter((e) => e.getBoundingClientRect().width > 0).map((e) => e.querySelectorAll('[data-seal="full"],[data-seal="new"]').length));
    mark(18, counts.length >= 2 ? counts.every((c) => c === counts[0]) : null, `${w}: capital meters with seals ${JSON.stringify(counts)}`);
    // AC20: tapping Political capital explains it (desk WP5)
    const label = p.getByRole('button', { name: /Political capital/i }).first();
    if (await label.count()) {
      await label.click().catch(() => {});
      await p.waitForTimeout(300);
      const t = await p.locator('body').innerText();
      mark(20, /up to ◆ 6/.test(t) && /\+[23] each month|\+[23] next month/.test(t), `${w}: explainer ${/up to ◆ 6/.test(t) ? 'shown' : 'missing'}`);
      await p.keyboard.press('Escape');
    } else mark(20, null, `${w}: no Political capital button yet (desk WP5)`);
    // AC1, AC25 on the desk itself, when the desk mounts OrderCatalog
    const allOrders = p.getByText(/^All orders$/).first();
    if (await allOrders.count()) {
      await allOrders.click().catch(() => {});
      await p.waitForTimeout(800);
      const catalog = p.locator('[data-order-catalog]');
      if (await catalog.count()) {
        const n = await catalog.locator('[data-order-code="NEEDS_TARGET"]').count();
        mark(1, n >= 15, `${w}: desk catalog ${n} cards say Pick a country first.`);
        await s.look('desk-catalog');
      } else mark(1, null, `${w}: desk still shows the old catalog (OrderCatalog not mounted yet)`);
    }
    // AC14: the disabled Execute reason points at a meter (desk WP5): reported, not driven
    mark(14, null, `${w}: Execute reason pointing is desk WP5 (useExecute + pointAt)`);
    // AC9: a network failure shows one toast that collapses repeats and disappears within 6 s
    if (w === 1440) {
      await p.route('**/api/turn', (r) => r.abort());
      const exec = p.getByRole('button', { name: /Execute month/i }).first();
      if (await exec.count()) {
        await exec.click().catch(() => {});
        await p.waitForTimeout(1500);
        await exec.click().catch(() => {});
        await p.waitForTimeout(1200);
        const toast = await p.locator('.toast').allInnerTexts();
        await s.look('toast');
        const t0 = Date.now();
        await p.waitForFunction(() => !document.querySelector('.toast'), null, { timeout: 9000 }).catch(() => {});
        const gone = Date.now() - t0;
        mark(9, toast.length === 1 && /×2/.test(toast[0]) && gone < 6500, `${w}: toast "${toast.join(' | ')}", gone after ${gone} ms`);
      } else mark(9, null, `${w}: Execute month not found`);
      await p.unroute('**/api/turn');
      // The aborted requests log console errors on purpose
      for (let i = s.errors.length - 1; i >= 0; i--) if (/ERR_FAILED|Failed to fetch/.test(s.errors[i])) s.errors.splice(i, 1);
    }
    mark(8, dialogs === 0 && !(v.dialogs?.length), `${w}: ${dialogs} native dialogs in the game`);
    if (s.errors.length) mark('errors', false, `${w} game: ${s.errors.slice(0, 3).join(' | ')}`);
  } finally {
    await s.close();
  }
}

// ---------------------------------------------------------------------------------------------
// C. Engine agreement through the API (AC7)
// ---------------------------------------------------------------------------------------------
const PREDICTABLE = new Set(['NO_CAPITAL', 'NO_DEFENSE_BUDGET', 'ORDER_LIMIT', 'DUPLICATE', 'NEEDS_TARGET', 'GAME_OVER', 'SELF_TARGET', 'TARGET_COLLAPSED', 'INVALID_VALUE', 'AT_WAR', 'NOT_AT_WAR', 'ALREADY_AT_WAR', 'TARGET_NOT_AT_WAR', 'PARTY_TO_WAR', 'NOT_ALLIED', 'PACT_REFUSED', 'RELATIONS_MAXED', 'NO_WARHEADS', 'PROGRAM_MAXED', 'TOO_PROTECTED', 'TOO_STABLE', 'NO_TROOPS']);
async function agreement() {
  const post = async (url, body) => (await fetch(`${api}${url}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })).json();
  let g = await post('/new-game', { playerCountryId: 'PAK', flashpointId: 'water-war', seed: 99, mode: 'FLASHPOINT' });
  if (!g.success) return mark(7, false, `new game failed: ${g.error}`);
  const saveId = g.saveId;
  let bad = 0;
  let given = 0;
  for (let month = 1; month <= 3 && !g.gameOver; month++) {
    let pc = g.worldState.politicalCapital;
    const orders = [];
    const keys = new Set();
    for (const target of [null, 'IND', 'CHN', 'USA', 'AFG']) {
      const m = await post('/orders/menu', { saveId, targetCountryId: target });
      for (const o of m.orders ?? []) {
        if (orders.length >= 6 || o.block || o.irreversible || o.costPC > pc || o.defenseShare > 0.1) continue;
        const key = `${o.type}:${target ?? ''}:${o.params?.targetType ?? o.params?.tactic ?? ''}`;
        if (keys.has(key)) continue;
        keys.add(key);
        pc -= o.costPC;
        orders.push({ type: o.type, ...(o.params ? { params: o.params } : {}), ...(target ? { targetCountryId: target } : {}) });
      }
    }
    given += orders.length;
    g = await post('/turn', { saveId, playerActions: orders, decisions: (g.pendingDecisions ?? []).map((d) => ({ decisionId: d.id, optionId: d.defaultOptionId ?? d.options[0].id })) });
    const refused = (g.worldState?.turnReport?.orders ?? []).filter((o) => o.ok === false && PREDICTABLE.has(o.code));
    bad += refused.length;
    if (refused.length) mark(7, false, `month ${month}: ${refused.map((o) => `${o.label} (${o.code})`).join(', ')}`);
  }
  mark(7, bad === 0, `${given} orders over 3 months, ${bad} predictable refusals at Execute`);
}

// ---------------------------------------------------------------------------------------------
// ONLY=gallery,game,agreement (comma list) runs a subset; WIDTHS=1440,390 limits the viewports
const only = (process.env.ONLY ?? 'gallery,motion,game,agreement').split(',');
const widths = (process.env.WIDTHS ?? '1440,1024,390').split(',').map(Number);
if (only.includes('gallery')) for (const vp of VIEWPORTS.filter((v) => widths.includes(v.w))) await step(`gallery ${vp.w}`, () => gallery(vp));
if (only.includes('motion')) await step('reduced motion', reducedMotion);
if (only.includes('game')) for (const vp of [VIEWPORTS[0], VIEWPORTS[2]].filter((v) => widths.includes(v.w))) await step(`game ${vp.w}`, () => realGame(vp));
if (only.includes('agreement')) await step('agreement', agreement);
mark(16, null, 'covered by npm test (tests/ui-glossary.spec.ts)');

const order = [...Array(27)].map((_, i) => String(i + 1));
fs.writeFileSync(path.join(out, 'orders-qa.json'), JSON.stringify(results, null, 2));
for (const n of [...order, 'errors']) {
  const r = results[n];
  if (!r) {
    if (n !== 'errors') console.log(`AC${n.padStart(2)}  NOT RUN`);
    continue;
  }
  console.log(`AC${String(n).padStart(2)}  ${r.status.padEnd(6)} ${r.notes.slice(0, 4).join(' ; ')}`);
}
if (Object.values(results).some((r) => r.status === 'FAIL')) process.exitCode = 1;
