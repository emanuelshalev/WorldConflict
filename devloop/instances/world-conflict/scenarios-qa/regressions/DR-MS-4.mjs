// DR-MS-4 (design-review-month-screen.md S2-3, carried condition C-2): on a call crisis "What your
// advisers say" used the authored backers while the answer cards used the engine's call advisers, so
// on Hormuz month 4 "Tanker hit in the strait" the Chief of Staff recommended Full convoy on the card
// and argued for strikes in the voices block, under a question saying the advisers agree.
// Rule: the voices come from the same source as the cards' Recommended lines: every adviser who
// speaks below speaks for the card that names them and for no other; an adviser named on a card
// does not argue for another answer; "your advisers agree" shows only when one card holds every
// adviser who backs a card (and every voice speaks for it).
// Scenes (what a player sees on a tall desk, 3440x1440, where the voices block shows): Hormuz Convoy
// as the United States (seed 4242), months 2 to 5, and Quarantine as China (QU-CHN-LEO01), months 1
// to 4, nothing chosen; every crisis on the List marked Your call is opened and read. Fixed and
// floating elements: the state band and month bar (top), the List and the Plan rail beside the
// Thing, the ticker (bottom); none is moved by this guard.
//   node devloop/instances/world-conflict/scenarios-qa/regressions/DR-MS-4.mjs <outDir> <baseUrl> <apiUrl>
import path from 'node:path';
import { apiSave, args, openSaved, run } from './_lib.mjs';

const { out, base, api } = args('DR-MS-4');
const SIZE = process.env.DRMS4_SIZE ?? '3440x1440';
const SCENES = [
  { tag: 'hormuz-usa', seat: { flashpointId: 'hormuz-convoy', countryId: 'USA', seed: 4242 }, months: [1, 2, 3, 4], must: 'Tanker hit in the strait' },
  { tag: 'quarantine-chn', seat: { flashpointId: 'quarantine', countryId: 'CHN', seedCode: 'QU-CHN-LEO01' }, months: [0, 1, 2, 3] },
];

/** "Recommended by your Defense Minister and your Chief of Staff: ..." -> the adviser names. */
const namesOf = (rec) =>
  rec
    .replace(/^\W*/, '')
    .split(':')[0]
    .replace(/^Recommended by your\s+/i, '')
    .split(/\s+and your\s+/i)
    .map((s) => s.trim())
    .filter(Boolean);

await run('DR-MS-4', async (g) => {
  const seen = new Set();
  for (const sc of SCENES) {
    let calls = 0;
    for (const months of sc.months) {
      const sv = await apiSave(api, months, sc.seat, `drms4-${sc.tag}`);
      const { browser, page: p, errors } = await openSaved(base, SIZE, sv);
      try {
        // The List rows of this month's call crises (the mission move is a call too, read elsewhere)
        if (!(await p.locator('[data-agenda]').first().isVisible().catch(() => false))) await p.locator('.see-all').first().click().catch(() => {});
        const titles = [];
        for (const row of await p.locator('.lrow').all()) {
          const t = (await row.innerText().catch(() => '')).replace(/\s+/g, ' ');
          const name = (await row.locator('.lrow-t > b').first().innerText().catch(() => '')).trim();
          if (name && /Your call/.test(t) && !/move for your mission/i.test(name)) titles.push(name);
        }
        for (const title of titles) {
          const row = p.locator('.lrow').filter({ has: p.locator('.lrow-t > b', { hasText: title }) }).first();
          await row.click().catch(() => {});
          await p.waitForTimeout(700);
          const thing = p.locator(`article.thing[aria-label="${title.replace(/"/g, '\\"')}"]`).first();
          if (!(await thing.isVisible().catch(() => false)) || (await thing.getAttribute('data-thing')) === 'move') continue;
          calls++;
          seen.add(title);
          const where = `${sc.tag} month ${months + 1} "${title}"`;
          // The cards: title and the advisers its Recommended line names
          const cards = [];
          for (const o of await thing.locator('.opts > .opt:not(.skipopt)').all()) {
            const name = (await o.locator('.opt-name').first().innerText().catch(() => '')).trim();
            const rec = (await o.locator('.opt-rec').first().innerText().catch(() => '')).trim();
            cards.push({ name, advisers: rec ? namesOf(rec) : [] });
          }
          const voices = [];
          for (const v of await thing.locator('.th-facts.advice p.r').all()) {
            // 'Defense Minister and Chief of Staff: "..." (Full convoy operation)': one voice per adviser
            const names = (await v.locator('b').first().innerText().catch(() => '')).trim().split(/\s+and\s+/).filter(Boolean);
            const text = (await v.innerText().catch(() => '')).trim();
            const label = text.match(/\(([^()]*)\)"?\s*$/)?.[1]?.trim() ?? '';
            for (const who of names) voices.push({ who, label });
          }
          const ask = (await thing.locator('.ask').first().innerText().catch(() => '')).trim();
          const shown = await thing.locator('.th-facts.advice').first().isVisible().catch(() => false);
          g.check(cards.length >= 2, `${where}: its answer cards are read (${cards.length})`);
          g.check(shown, `${where}: "What your advisers say" is shown at ${SIZE}`);
          const backed = cards.filter((c) => c.advisers.length);
          const bad = [];
          for (const v of voices) {
            const own = cards.find((c) => v.label && c.name.toLowerCase().startsWith(v.label.toLowerCase()));
            if (!own) bad.push(`${v.who} speaks for "${v.label}", no such card`);
            else if (!own.advisers.includes(v.who)) bad.push(`${v.who} speaks for "${v.label}" but its card names ${own.advisers.join(' and ') || 'nobody'}`);
            const other = cards.find((c) => c !== own && c.advisers.includes(v.who));
            if (other) bad.push(`${v.who} speaks for "${v.label}" and is named on "${other.name}"`);
          }
          // Every adviser a card names has their say (up to the three voices the block shows)
          const named = [...new Set(backed.flatMap((c) => c.advisers))];
          const missing = named.filter((n) => !voices.some((v) => v.who === n));
          if (voices.length < 3 && missing.length) bad.push(`named on a card but silent below: ${missing.join(', ')}`);
          g.check(!bad.length, `${where}: every voice speaks for the card that names it (${voices.map((v) => `${v.who}: ${v.label}`).join('; ') || 'no voices'})${bad.length ? ` [${bad.join('; ')}]` : ''}`);
          const agree = /advisers agree/i.test(ask);
          const oneCard = backed.length <= 1 && new Set(voices.map((v) => v.label)).size <= 1;
          g.check(!agree || oneCard, `${where}: "agree" only when one card holds every adviser (${agree ? 'agree' : 'disagree'}; cards with advisers: ${backed.map((c) => c.name).join(' | ') || 'none'})`);
          if (title === sc.must || calls === 1) await thing.screenshot({ path: path.join(out, `${sc.tag}-m${months + 1}-${title.replace(/\W+/g, '-').toLowerCase()}.png`) }).catch(() => {});
        }
        g.check(!errors.length, `${sc.tag} month ${months + 1}: no page errors (${errors.slice(0, 2).join(' | ')})`);
      } finally {
        await browser.close();
      }
    }
    g.check(calls > 0, `${sc.tag}: at least one call crisis was read (${calls})`);
    if (sc.must) g.check(seen.has(sc.must), `${sc.tag}: "${sc.must}" was read`);
  }
});
