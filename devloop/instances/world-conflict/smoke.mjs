// QA smoke playtest: start today's flashpoint from the title screen, play three months
// through the real UI, and fail on page errors or a stuck flow.
//   node devloop/instances/world-conflict/smoke.mjs [outDir] [variant]
import { launch } from '../../kit/kit.mjs';

const out = process.argv[2] ?? '/tmp/playtest/smoke';
const variant = process.argv[3] ?? 'qa-laptop';
const s = await launch({ variant, out });
const fail = (msg) => {
  console.error(`SMOKE FAIL: ${msg}`);
  process.exitCode = 1;
};
try {
  await s.goto();
  await s.look('title');
  if (!(await s.click(/^Take office/i))) fail('no Take office on the title screen');
  await s.page.waitForTimeout(2500);
  await s.look('briefing');
  await s.click(/Take office|Begin|Start/i);
  for (let month = 1; month <= 3; month++) {
    await s.look(`m${month}-desk`);
    await s.click(/Approve( \d+)?( suggestion)?/i);
    if (!(await s.click(/Execute month/i, { timeout: 12000 }))) {
      const v = await s.look(`m${month}-execute-blocked`);
      const ex = v.controls.find((c) => /Execute month/i.test(c.label));
      fail(`month ${month}: Execute month not clickable (${ex ? `disabled=${ex.disabled} title=${ex.title}` : 'not visible'}; alerts: ${v.alerts.join(' | ')})`);
      break;
    }
    await s.page.waitForTimeout(3000);
    await s.look(`m${month}-after`);
    // Step through whatever the month opened (debrief pages, the paper) until the desk is back
    for (let i = 0; i < 10; i++) {
      const reachable = await s.page
        .getByRole('button', { name: /Execute month/i })
        .first()
        .click({ trial: true, timeout: 800 })
        .then(() => true, () => false);
      if (reachable) break;
      // Forward buttons, not the tab strip: prefer the bottom-right primary button of each step.
      const moved =
        (await s.click(/To your desk|Next month|See your verdict|Continue|Done/i, { timeout: 800 })) ||
        (await s.page
          .locator('button.primary, .wc-btn.primary, button:has(svg):right-of(:text("Top story"))')
          .last()
          .click({ timeout: 1200 })
          .then(() => true, () => false));
      if (!moved) await s.key('Escape');
      if (i === 9) fail(`month ${month}: stuck after Execute (debrief/paper did not lead back to the desk)`);
    }
  }
  if (s.errors.length) fail(`page errors: ${s.errors.slice(0, 3).join(' | ')}`);
} catch (e) {
  fail(e.message);
} finally {
  await s.close();
}
if (!process.exitCode) console.log(`SMOKE OK (${out})`);
