// RS-001-2 (CEO, 2026-11-21): "Not enough political credit ... I see a credit bar, very small, on
// the right; it is very unclear if we are referring to that. The element a warning refers to can be
// highlighted." Guards: the resource is named "Political capital" everywhere (never credit, CAP),
// the HUD and rail meters agree (QA repro #5: one filled what is left, the other what is spent),
// pressing an unaffordable order points at every capital meter with a callout naming the order and
// its cost, with no toast; and at 1024 the HUD shows all seven resources in words (QA1 S3-3).
// Since F-02-4 (D-58) staff picks spend nothing until approved: the guard approves them first so
// an order is out of reach (month 1 used to open with the staff's seals already spent).
import { args, bodyText, run, startGame } from './_lib.mjs';

const { out, base } = args('RS-001-2');
const BANNED = [/political credit/i, /\bcredits?\b/i, /\bCAP\b/, /\bAPPR\b/, /\bSTAB\b/, /Leadership score/i];
const fullSeals = (p) =>
  p.$$eval('[data-point="capital"]', (els) =>
    els
      .filter((e) => e.getBoundingClientRect().width > 0 && e.querySelector('[data-seal]'))
      .map((e) => ({ cls: e.className, full: e.querySelectorAll('[data-seal="full"],[data-seal="new"]').length })),
  );

await run('RS-001-2', async (g, track) => {
  const s = track(await startGame({ variant: 'rs0012', device: 'laptop', out, base }));
  const p = s.page;
  await s.click(/^Full desk$/);
  await p.waitForTimeout(600);
  const hudText = await p.locator('.hud').first().innerText();
  g.check(/Political capital/.test(hudText), 'the HUD names "Political capital"');
  const text = await bodyText(p);
  const hits = BANNED.filter((re) => re.test(text)).map(String);
  g.check(hits.length === 0, `no other name for it on the desk (${hits.join(', ') || 'none'})`);

  // QA repro #5: the HUD and the rail draw the same number of full seals
  const meters = await fullSeals(p);
  g.check(meters.length >= 2 && meters.every((m) => m.full === meters[0].full), `HUD and rail capital meters agree ${JSON.stringify(meters.map((m) => m.full))}`);

  // Staff picks are proposals that spend nothing until approved (F-02-4, D-58), so month 1 opens
  // with every seal free and no order out of reach. Spend the way a player does: approve the staff
  // picks, then a 2-seal order is out of reach and the meters must still agree.
  // The navigator row was "Advisors' suggestions" until QA3-S3-2 (one word, D-72)
  await s.click(/^(Orders to consider|Advisors' suggestions)/);
  await p.waitForTimeout(600);
  for (let k = 0; k < 4; k++) {
    const approve = p.getByRole('button', { name: /^Accept order: / }).first();
    if (!(await approve.isVisible().catch(() => false))) break;
    await approve.click();
    await p.waitForTimeout(700);
  }
  const spent = await fullSeals(p);
  g.check(spent.length >= 2 && spent.every((m) => m.full === spent[0].full) && spent[0].full < meters[0].full, `after approving the staff picks the meters agree and show the spend ${JSON.stringify(spent.map((m) => m.full))}`);

  // Press an order the player cannot afford: every capital meter is pointed at, with a callout
  await s.click(/^All orders/);
  await p.locator('[data-order-catalog]').first().waitFor();
  await p.waitForTimeout(600);
  const card = p.locator('[data-order-catalog] [data-order-code="NO_CAPITAL"]').first();
  // With one seal left (D-84: the staff hold fewer) every order that costs more needs a country:
  // choose one so a card the player cannot afford is on the list
  if ((await card.count()) === 0) {
    await p.locator('[data-order-catalog] button[aria-haspopup="dialog"]').first().click();
    await p.locator('[role="dialog"][aria-label="Choose a country"] [role="option"]').first().click();
    await p.waitForTimeout(600);
  }
  g.check((await card.count()) === 1, 'an unaffordable order is on the list');
  const label = (await card.locator('.wc-card-title').first().innerText().catch(() => '')).trim();
  g.check(/Needs ◆ \d, you have ◆ \d\./.test(await card.innerText()), `its card says what it needs and what you have ("${label}")`);
  const before = await p.locator('[data-order-catalog] [data-order-state="queued"]').count();
  await card.locator('.wc-card-hit').dispatchEvent('click');
  const t0 = Date.now();
  const ms = await p
    .waitForFunction(
      () => {
        const els = [...document.querySelectorAll('[data-point="capital"]')].filter((e) => e.getBoundingClientRect().width > 0 && e.querySelector('[data-seal]'));
        return els.length > 0 && els.every((e) => e.classList.contains('is-pointed'));
      },
      null,
      { timeout: 1500 },
    )
    .then(() => Date.now() - t0, () => -1);
  g.check(ms >= 0, `every capital meter is pointed at (${ms} ms)`);
  const callout = (await p.locator('.wc-point-callout').first().innerText().catch(() => '')).replace(/\s+/g, ' ');
  g.check(callout.includes(label) && /◆ \d/.test(callout), `the callout names the order and its cost ("${callout}")`);
  await s.look('capital-pointed');
  g.check((await p.locator('[data-order-catalog] [data-order-state="queued"]').count()) === before, 'nothing was queued');
  g.check((await p.locator('.toast:visible').count()) === 0, 'no toast');

  // Tapping the HUD meter explains it in the same words
  await p.getByRole('button', { name: /^Political capital: .* What is this\?/ }).first().click();
  await p.waitForTimeout(300);
  const note = await p.locator('.hud-explain').first().innerText().catch(() => '');
  g.check(/Political capital/.test(note) && /up to ◆ 6/.test(note), `the meter explains itself ("${note.replace(/\s+/g, ' ').slice(0, 70)}")`);
  await p.keyboard.press('Escape');

  // QA1 S3-3: at 1024 the HUD keeps all seven words (they used to hide behind "More")
  await p.setViewportSize({ width: 1024, height: 768 });
  await p.waitForTimeout(1000);
  const hud1024 = await p.locator('.hud').first().innerText();
  const words = ['Approval', 'Stability', 'Legitimacy', 'Economy', 'Political capital', 'World tension', 'Score'];
  const missing = words.filter((w) => !hud1024.includes(w));
  g.check(missing.length === 0, `1024 HUD shows all seven words (missing: ${missing.join(', ') || 'none'})`);
  await s.look('hud-1024');
  g.check(!s.errors.length, `no page errors (${s.errors.slice(0, 2).join(' | ')})`);
});
