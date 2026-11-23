// QA fast-forward: start today's flashpoint from the title screen and play it to the end through
// the real UI (approve the staff suggestions, execute, step through the debrief), then walk the
// reveal stage by stage and screenshot each one.
//   node devloop/kit/finish-flashpoint.mjs [outDir] [device]
// DEVLOOP_BASE_URL points at the UI under test (default http://localhost:5173/).
import { launch } from './kit.mjs';

const out = process.argv[2] ?? '/tmp/playtest/finish';
const device = process.argv[3] ?? 'laptop';
const s = await launch({ variant: `finish-${device}`, device, out });
const fail = (msg) => {
  console.error(`FINISH FAIL: ${msg}`);
  process.exitCode = 1;
};
const revealUp = () => s.page.locator('.rv-root').first().isVisible().catch(() => false);
try {
  await s.goto();
  if (!(await s.click(/^Take office/i))) throw new Error('no Take office on the title screen');
  await s.page.waitForTimeout(2500);
  await s.click(/Take office|Begin|Start/i);
  let month = 0;
  for (; month < 130 && !(await revealUp()); month++) {
    // The month's bulk button: crisis answers, recommended orders and meetings in one press (the
    // product's words for it: "Choose all recommended", earlier "Accept all recommended")
    await s.click(/^(Choose|Accept) all recommended/i, { timeout: 1500 });
    if (!(await s.click(/Execute month/i, { timeout: 12000 }))) {
      if (await revealUp()) break;
      await s.look(`m${month + 1}-blocked`);
      throw new Error(`month ${month + 1}: Execute month not clickable`);
    }
    await s.page.waitForTimeout(2500);
    for (let i = 0; i < 12; i++) {
      if (await revealUp()) break;
      const reachable = await s.page
        .getByRole('button', { name: /Execute month/i })
        .first()
        .click({ trial: true, timeout: 800 })
        .then(() => true, () => false);
      if (reachable) break;
      const moved =
        (await s.click(/To your desk|Next month|See your verdict|Continue|Done/i, { timeout: 800 })) ||
        (await s.page
          .locator('button.primary, .wc-btn.primary')
          .last()
          .click({ timeout: 1200 })
          .then(() => true, () => false));
      if (!moved) await s.key('Escape');
    }
  }
  await s.page.waitForTimeout(1500);
  if (!(await revealUp())) throw new Error(`no reveal after ${month} months`);
  console.log(`reveal opened after ${month} months`);
  for (let stage = 0; stage <= 7; stage++) {
    await s.page.waitForTimeout(stage === 0 ? 1200 : 2600);
    await s.look(`reveal-${stage}`);
    if (stage < 7) await s.page.keyboard.press('ArrowRight');
  }
  await s.click(/Full report/i);
  await s.page.waitForTimeout(1200);
  await s.look('reveal-report');
  if (s.errors.length) fail(`page errors: ${s.errors.slice(0, 3).join(' | ')}`);
} catch (e) {
  fail(e.message);
} finally {
  await s.close();
}
if (!process.exitCode) console.log(`FINISH OK (${out})`);
