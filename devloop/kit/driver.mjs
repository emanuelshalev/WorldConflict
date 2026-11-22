// Persistent playtest driver: keeps one browser session open so an agent can play turn by turn
// with separate shell commands (look, decide, act, look again).
//
//   node devloop/kit/driver.mjs --port 7801 --variant ruth-tablet --device tablet --out <dir> &
//   node devloop/kit/act.mjs 7801 goto
//   node devloop/kit/act.mjs 7801 look title
//   node devloop/kit/act.mjs 7801 click "Take office"
//   node devloop/kit/act.mjs 7801 stop
import http from 'node:http';
import { launch } from './kit.mjs';

const arg = (k, d) => {
  const i = process.argv.indexOf(`--${k}`);
  return i > 0 ? process.argv[i + 1] : d;
};
const port = Number(arg('port', 7801));
const variant = arg('variant', 'qa');
const s = await launch({ variant, device: arg('device', variant), out: arg('out', `/tmp/playtest/${variant}`), video: arg('video', '') === '1' });

const toName = (v) => {
  // "/regex/i" -> RegExp, otherwise case-insensitive substring
  const m = /^\/(.*)\/([a-z]*)$/.exec(v ?? '');
  if (m) return new RegExp(m[1], m[2]);
  return new RegExp(String(v).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
};

const commands = {
  goto: async ([fresh]) => s.goto(fresh !== 'keep'),
  look: async ([name = 'look', full]) => s.look(name, { full: full === 'full' }),
  click: async ([name, nth]) => ({ ok: await s.click(toName(name), { nth: Number(nth ?? 0) }) }),
  text: async ([t, nth]) => ({ ok: await s.clickText(toName(t), { nth: Number(nth ?? 0) }) }),
  at: async ([x, y]) => s.clickAt(Number(x), Number(y)),
  key: async ([k]) => s.key(k),
  type: async ([t]) => {
    await s.page.keyboard.type(t);
    return { ok: true };
  },
  scroll: async ([dy = '600', x, y]) => {
    if (x) await s.page.mouse.move(Number(x), Number(y));
    await s.page.mouse.wheel(0, Number(dy));
    await s.page.waitForTimeout(400);
    return { ok: true };
  },
  hover: async ([name]) => {
    await s.page.getByText(toName(name)).first().hover({ timeout: 3000 });
    await s.page.waitForTimeout(400);
    return { ok: true };
  },
  burst: async ([name = 'burst', ms]) => s.burst(name, { ms: Number(ms ?? 1500) }),
  hud: async () => ({ hud: await s.hud() }),
  wait: async ([ms = '1000']) => {
    await s.page.waitForTimeout(Number(ms));
    return { ok: true };
  },
  note: async (rest) => {
    s.note(rest.join(' '));
    return { ok: true };
  },
  errors: async () => ({ errors: s.errors }),
  stop: async () => {
    setTimeout(async () => {
      await s.close();
      process.exit(0);
    }, 50);
    return { ok: true, stopping: true };
  },
};

http
  .createServer(async (req, res) => {
    let body = '';
    for await (const c of req) body += c;
    let out;
    try {
      const { cmd, args = [] } = JSON.parse(body || '{}');
      if (!commands[cmd]) throw new Error(`unknown command ${cmd}; known: ${Object.keys(commands).join(', ')}`);
      out = (await commands[cmd](args)) ?? { ok: true };
    } catch (e) {
      out = { ok: false, error: e.message.split('\n')[0] };
    }
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify(out));
  })
  .listen(port, () => console.log(`driver ready on ${port} (${variant})`));
