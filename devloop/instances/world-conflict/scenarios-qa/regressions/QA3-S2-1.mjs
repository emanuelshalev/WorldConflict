// QA iteration 3 S2-1 (REGRESSED RS-001-5 and F-02-5): on the desk, "Orders to consider" (it said
// "Your advisors suggest") drew each suggestion's order card at min-content width: titles one
// letter per line in 300 to 650 px tall cards, at every width from month 2 on (Focus and Full desk).
// The Map strip escaped it, so QA1-S2-1 (Map only) stayed green. This guard checks the desk list
// at 390, 1440 and 1920, in Focus and Full desk, in month 1 (Show the whole desk) and month 2:
// every visible suggestion's title is a sensible width, the card height is bounded and the title
// is not wrapped into a column of letters.
// Repro (runs/iter-03/qa-verify.md S2-1): the pinned seat, Show the whole desk, then month 2.
//   node devloop/instances/world-conflict/scenarios-qa/regressions/QA3-S2-1.mjs <outDir> <baseUrl> <apiUrl>
import path from 'node:path';
import { args, run, startGame } from './_lib.mjs';

const { out, base } = args('QA3-S2-1');

/** Measure every visible suggestion card on the desk (not the Map strip). */
async function measure(page) {
  return page.evaluate(() =>
    [...document.querySelectorAll('.adv-row')]
      .filter((e) => e.getBoundingClientRect().width > 0 && !e.closest('.cmd-strip, .advisors.compact'))
      .map((e) => {
        const b = e.getBoundingClientRect();
        const t = e.querySelector('.wc-card-title, .adv-label');
        const tb = t?.getBoundingClientRect();
        const lh = t ? Number.parseFloat(getComputedStyle(t).lineHeight) || Number.parseFloat(getComputedStyle(t).fontSize) * 1.3 : 0;
        return { w: b.width, h: b.height, tw: tb?.width ?? 0, th: tb?.height ?? 0, lh, title: (t?.textContent ?? '').trim().slice(0, 40) };
      }),
  );
}

async function checkList(g, s, where) {
  const vw = s.page.viewportSize().width;
  // Bring the list into view (it can sit under the move cards)
  await s.page.locator('section.advisors:not(.compact), .detail-title').first().scrollIntoViewIfNeeded().catch(() => {});
  await s.page.waitForTimeout(400);
  const cards = await measure(s.page);
  await s.look(where.replace(/\W+/g, '-'));
  g.check(cards.length >= 1, `${where}: the desk shows suggestion cards (${cards.length})`);
  // A title box narrower than this held one letter per line (0 px at every width in the QA run)
  const minTitle = vw < 600 ? 120 : 160;
  for (const [i, c] of cards.entries()) {
    const ok = c.tw >= minTitle && c.w >= Math.min(300, vw - 40) && c.h <= 300 && c.th <= c.lh * (vw < 600 ? 3 : 2) + 2;
    g.check(ok, `${where}: card ${i + 1} "${c.title}" is ${Math.round(c.w)}x${Math.round(c.h)} px, title ${Math.round(c.tw)} px wide and ${Math.round(c.th / (c.lh || 1))} lines`);
  }
}

async function nextMonth(s) {
  const p = s.page;
  await s.click(/^Accept all recommended/i, { timeout: 1500 });
  if (!(await s.click(/Execute month/i, { timeout: 12000 }))) throw new Error('Execute month not clickable');
  await p.waitForTimeout(2500);
  const exec = p.getByRole('button', { name: /Execute month/i }).first();
  for (let i = 0; i < 14; i++) {
    if (await exec.click({ trial: true, timeout: 800 }).then(() => true, () => false)) break;
    const moved =
      (await s.click(/To your desk|Next month|Continue|Done/i, { timeout: 800 })) ||
      (await p
        .locator('button.primary, .wc-btn.primary')
        .last()
        .click({ timeout: 1200 })
        .then(() => true, () => false));
    if (!moved) await s.key('Escape');
  }
  await p.waitForTimeout(1200);
}

async function fullDesk(s, on) {
  const tab = s.page.getByRole('tab', { name: on ? 'Full desk' : 'Focus' }).first();
  if (!(await tab.isVisible().catch(() => false))) return false;
  await tab.click();
  await s.page.waitForTimeout(700);
  if (on) {
    // The Full desk shows the suggestions in its detail pane: open them from the navigator
    const open = s.page.locator('nav.navigator').getByRole('button', { name: /Orders to consider|suggest/i }).first();
    if (await open.isVisible().catch(() => false)) {
      await open.click();
      await s.page.waitForTimeout(600);
    }
  }
  return true;
}

await run('QA3-S2-1', async (g, track) => {
  for (const device of ['laptop', 'desktop', 'phone']) {
    const s = track(await startGame({ variant: `qa3s21-${device}`, device, out: path.join(out, device), base }));
    const w = s.page.viewportSize().width;
    // Month 1: the advisors wait behind "Show the whole desk"
    const show = s.page.getByRole('button', { name: /Show the whole desk/i }).first();
    if (await show.isVisible().catch(() => false)) {
      await show.click();
      await s.page.waitForTimeout(900);
    }
    await checkList(g, s, `${w} month 1 focus`);
    if (device !== 'phone' && (await fullDesk(s, true))) {
      await checkList(g, s, `${w} month 1 full desk`);
      await fullDesk(s, false);
    }
    await nextMonth(s);
    await checkList(g, s, `${w} month 2 focus`);
    if (device !== 'phone' && (await fullDesk(s, true))) {
      await checkList(g, s, `${w} month 2 full desk`);
      await fullDesk(s, false);
    }
    g.check(!s.errors.length, `${w}: no page errors (${s.errors.slice(0, 2).join(' | ')})`);
  }
});
