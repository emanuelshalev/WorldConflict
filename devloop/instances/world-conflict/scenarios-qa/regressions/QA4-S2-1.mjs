// QA4-S2-1 (runs/iter-04/qa-verify.md): the game's own fonts never loaded. ui/src/styles/fonts.css
// points at @fontsource packages that were in ui/package.json but not installed: the font URLs
// returned index.html, every FontFace was in "error" and every screen showed fallback faces, while
// the gate passed (nothing looked at fonts). No request went to Google Fonts, which is the other
// half of goal 5.
// Rule: on the title screen and the month 1 desk, the four families (Geist, Geist Mono, Instrument
// Serif, Newsreader; italic for the two serifs) load from the game's own origin, no face is in
// error, and no request goes to fonts.googleapis.com or fonts.gstatic.com. The build half (a failed
// build on a font file that does not resolve) is tests/ui-fonts-build.spec.ts.
// Scenes: a fresh browser at 1920x1080, the title, then Hormuz Convoy as the United States (seed
// 4242) month 1 from a save. Nothing on screen is moved.
//   node devloop/instances/world-conflict/scenarios-qa/regressions/QA4-S2-1.mjs <outDir> <baseUrl> <apiUrl>
import path from 'node:path';
import { chromium } from 'playwright';
import { FONT_HOSTS, apiSave, args, fontsReport, openSaved, run } from './_lib.mjs';

const { out, base, api } = args('QA4-S2-1');

await run('QA4-S2-1', async (g) => {
  // The title on a fresh profile
  const browser = await chromium.launch();
  try {
    const page = await (await browser.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();
    const google = [];
    page.on('request', (r) => FONT_HOSTS.test(r.url()) && google.push(r.url()));
    await page.goto(base, { waitUntil: 'load' });
    await page.getByRole('button', { name: /^Take office/i }).first().waitFor({ timeout: 30000 });
    const f = await fontsReport(page);
    g.check(!f.bad.length, `title: the four game fonts load from the game (${f.faces} faces, ${f.files} files)${f.bad.length ? ` [${f.bad.slice(0, 3).join('; ')}]` : ''}`);
    g.check(!google.length, `title: no request to Google Fonts (${google.slice(0, 2).join(', ')})`);
    await page.screenshot({ path: path.join(out, 'title.png') });
  } finally {
    await browser.close();
  }
  // The month 1 desk, where every family is on screen
  const sv = await apiSave(api, 0, undefined, 'qa4s21');
  const s = await openSaved(base, '1920x1080', sv);
  try {
    const google = [];
    s.page.on('request', (r) => FONT_HOSTS.test(r.url()) && google.push(r.url()));
    const f = await fontsReport(s.page);
    g.check(!f.bad.length, `month 1 desk: the four game fonts load from the game (${f.faces} faces)${f.bad.length ? ` [${f.bad.slice(0, 3).join('; ')}]` : ''}`);
    g.check(!google.length, `month 1 desk: no request to Google Fonts`);
    g.check(!s.errors.length, `month 1 desk: no page errors (${s.errors.slice(0, 2).join(' | ')})`);
  } finally {
    await s.browser.close();
  }
});
