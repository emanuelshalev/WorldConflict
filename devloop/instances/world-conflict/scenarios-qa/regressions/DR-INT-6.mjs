// DR-INT-6 (design-review-integrated.md): Ask your staff opened an "Advisors" panel whose
// recommendations were titled with engine identifiers ("DIPLOMACY_IMPROVE_RELATIONS") under LOW and
// MEDIUM badges (the briefing also named countries by code, "RUS, CHN", and printed "75.6275%"),
// in an emoji-icon, blue-bubble chat style unlike the desk; the suggested questions ran off the panel ("What's") and the input placeholder was cut ("Ask a question, or tap one abo").
// Rule: the panel speaks the game's words (glossary "advisers", the order vocabulary of
// ui/src/lib/orders.ts), shows no engine identifier, no risk code and no emoji, and every suggested
// question, the input with its placeholder and Send are whole at 1920x1080.
// Scenes: Hormuz Convoy as the United States (seed 4242), month 2, 1920x1080: the month's first
// crisis call opened, Ask your staff, then each of the six advisers chosen in turn. Fixed and
// floating elements: the panel is a modal over the desk (state band, List, Plan rail and ticker
// stay behind it, none is moved); inside it the adviser list (left), the briefing (middle) and the
// chat with its suggested questions and input (right).
//   node devloop/instances/world-conflict/scenarios-qa/regressions/DR-INT-6.mjs <outDir> <baseUrl> <apiUrl>
import path from 'node:path';
import { WHOLE_JS, apiSave, args, openSaved, run } from './_lib.mjs';

const { out, base, api } = args('DR-INT-6');
const SIZE = process.env.DRINT6_SIZE ?? '1920x1080';

await run('DR-INT-6', async (g) => {
  const sv = await apiSave(api, 1, undefined, 'drint6');
  const { browser, page: p, errors } = await openSaved(base, SIZE, sv);
  try {
    // The month opens on its first item, a crisis call with "What your advisers say"
    await p.getByRole('button', { name: /Ask your staff/ }).first().click();
    const dlg = p.locator('.modal-overlay[role="dialog"]').first();
    await dlg.waitFor({ timeout: 8000 });
    await p.waitForTimeout(1200);
    const texts = [];
    const cards = dlg.locator('.advisor-card');
    const n = await cards.count();
    g.check(n === 6, `the panel lists the six advisers (${n})`);
    for (let i = 0; i < n; i++) {
      await cards.nth(i).click();
      await p.waitForTimeout(500);
      texts.push(await dlg.innerText());
      if (i === 0) await p.screenshot({ path: path.join(out, 'm2-askstaff.png') });
    }
    const all = texts.join('\n');
    const codes = [...new Set(all.match(/\b[A-Z]{3,}_[A-Z_]+\b/g) ?? [])];
    g.check(!codes.length, `no engine identifier in the panel (${codes.slice(0, 4).join(', ')})`);
    const badges = [...new Set(all.match(/^(LOW|MEDIUM|HIGH|CRITICAL)$/gm) ?? [])];
    g.check(!badges.length, `no risk code badge (${badges.join(', ')})`);
    g.check(!/\bAdvisors?\b/.test(all), 'the panel says "advisers", never "Advisors"');
    const coded = [...new Set(all.match(/\b[A-Z]{3}(?:, [A-Z]{3})+\b|\b(?:with|in) [A-Z]{3}\b/g) ?? [])];
    g.check(!coded.length, `countries are named, not coded (${coded.slice(0, 3).join(' | ')})`);
    const raw = [...new Set(all.match(/\b\d+\.\d{3,}/g) ?? [])];
    g.check(!raw.length, `no raw engine numbers (${raw.slice(0, 3).join(', ')})`);
    const emoji = [...new Set(all.match(/\p{Extended_Pictographic}/gu) ?? [])];
    g.check(!emoji.length, `no emoji in the panel (${emoji.join(' ')})`);
    const m = await p.evaluate((wholeSrc) => {
      // eslint-disable-next-line no-new-func
      const whole = new Function(`return ${wholeSrc}`)();
      const chips = [...document.querySelectorAll('.advisor-questions button')].map((b) => ({ t: b.textContent.trim(), bad: whole(b) }));
      const input = document.querySelector('.chat-input input');
      const send = document.querySelector('.chat-input button');
      const cs = input ? getComputedStyle(input) : null;
      const ctx = document.createElement('canvas').getContext('2d');
      if (cs) ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      const room = input ? input.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) : 0;
      return {
        chips,
        inputBad: input ? whole(input) : 'no input',
        sendBad: send ? whole(send) : 'no Send',
        ph: input?.placeholder ?? '',
        phFits: input ? ctx.measureText(input.placeholder).width <= room + 0.5 : false,
        scroll: document.scrollingElement.scrollHeight > innerHeight + 1,
      };
    }, WHOLE_JS);
    g.check(m.chips.length >= 3, `the suggested questions are shown (${m.chips.length})`);
    const cut = m.chips.filter((c) => c.bad);
    g.check(!cut.length, `every suggested question is whole (${cut.map((c) => `"${c.t}": ${c.bad}`).slice(0, 3).join('; ')})`);
    g.check(!m.inputBad && !m.sendBad, `the input and Send are whole (${m.inputBad || ''} ${m.sendBad || ''})`);
    g.check(m.phFits, `the placeholder "${m.ph}" fits the input`);
    g.check(!m.scroll, 'no page scroll');
    g.check(!errors.length, `no page errors (${errors.slice(0, 2).join(' | ')})`);
  } finally {
    await browser.close();
  }
});
