import { API, SEATS, start } from './lib.mjs';
const { ctx, page: p } = await start({ seat: SEATS.usa, w: 1440, h: 900, tag: 'calls' });
const sid = await p.evaluate(() => localStorage.getItem('worldconflict.lastSave'));
const j = await p.evaluate(async (u) => (await fetch(u)).json(), `${API}/load/${sid}`);
const a = j.advice || {};
for (const c of a.calls || []) { console.log(c.kind, c.id, 'mission', c.missionCard, 'calm', c.calmCard, 'chief', c.chiefPick, '|', c.guide); for (const k of c.cards || []) console.log('  ', k.id, k.side, 'pc', k.pc, 'price', k.price, JSON.stringify(k.advisers), 'breaks', JSON.stringify(k.breaks), 'hurts', JSON.stringify(k.hurts), 'helps', JSON.stringify(k.helps)); }
console.log('notes', JSON.stringify(a.missionNotes).slice(0, 500));
await ctx.close();
