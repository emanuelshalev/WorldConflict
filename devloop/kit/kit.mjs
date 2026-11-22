// Browser playtest kit: drives a web product's real UI the way a customer does (Playwright).
// Used by the synthetic customer panel (devloop/method/usage-session.md) and by QA.
//
//   import { launch } from './kit.mjs';
//   const s = await launch({ variant: 'maya-phone', device: 'phone', out: '<instance>/runs/iter-01/sessions/maya-phone' });
//   await s.goto();                      // title screen
//   console.log(await s.look('title'));  // screenshot + visible text/controls summary
//   await s.click(/One Term/i);          // act by visible label, like a player
//   await s.close();
//
// Every action is appended to <out>/log.jsonl so a report can cite exact steps.
import { chromium, devices } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

export const VIEWPORTS = {
  phone: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  tabletPortrait: { viewport: { width: 820, height: 1180 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  tablet: { viewport: { width: 1024, height: 768 }, hasTouch: true },
  laptopSmall: { viewport: { width: 1366, height: 768 } },
  laptop: { viewport: { width: 1440, height: 900 } },
  desktop: { viewport: { width: 1920, height: 1080 } },
};

/** Resolve a device profile: a VIEWPORTS key (e.g. 'phone'), or a variant id containing a hint. */
export function deviceFor(device = '') {
  if (VIEWPORTS[device]) return VIEWPORTS[device];
  if (/phone|clip/i.test(device)) return VIEWPORTS.phone;
  if (/tablet.?portrait/i.test(device)) return VIEWPORTS.tabletPortrait;
  if (/tablet/i.test(device)) return VIEWPORTS.tablet;
  if (/laptop-?small|1366/i.test(device)) return VIEWPORTS.laptopSmall;
  if (/desktop|stream|1920/i.test(device)) return VIEWPORTS.desktop;
  return VIEWPORTS.laptop;
}

export async function launch({ variant = 'qa', device = variant, out = `/tmp/playtest/${variant}`, base = process.env.DEVLOOP_BASE_URL ?? 'http://localhost:5173/', video = false } = {}) {
  fs.mkdirSync(out, { recursive: true });
  // Persistent profile per output folder: a restarted driver keeps localStorage (guest id, saves).
  const profile = path.join(out, '.profile');
  const context = await chromium.launchPersistentContext(profile, {
    ...deviceFor(device),
    // Hardware rendering: software GL starves the CPU and produces fake freezes (iteration 0).
    args: process.env.DEVLOOP_SOFTWARE_GL ? [] : ['--enable-gpu', '--ignore-gpu-blocklist', '--use-gl=angle', '--use-angle=gl'],
    ...(video ? { recordVideo: { dir: path.join(out, 'video') } } : {}),
  });
  const browser = { close: async () => {} };
  const page = context.pages()[0] ?? (await context.newPage());
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  // Native dialogs (confirm/alert/prompt): a person would see and answer them, so record the text
  // for the next look() and accept by default (set s.dialogAnswer = false to dismiss instead).
  const dialogs = [];
  page.on('dialog', async (d) => {
    dialogs.push(`${d.type()}: ${d.message()}`);
    try {
      if (s.dialogAnswer === false) await d.dismiss();
      else await d.accept();
    } catch {}
  });
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  let n = fs.readdirSync(out).reduce((m, f) => Math.max(m, Number.parseInt(f, 10) || 0, Number.parseInt(f.replace(/^burst-/, ''), 10) || 0), 0);
  const logFile = path.join(out, 'log.jsonl');
  const log = (entry) => fs.appendFileSync(logFile, `${JSON.stringify({ t: new Date().toISOString(), ...entry })}\n`);

  const s = {
    page,
    errors,
    out,
    log,
    async goto(fresh = true) {
      await page.goto(base);
      if (fresh) {
        await page.evaluate(() => localStorage.clear());
        await page.reload();
      }
      await page.waitForTimeout(1500);
      log({ act: 'goto', fresh });
    },
    /** Screenshot plus a compact description of what a player can see and press. */
    async look(name, { full = false } = {}) {
      await page.waitForTimeout(700);
      const file = path.join(out, `${String(++n).padStart(3, '0')}-${name}.png`);
      await page.screenshot({ path: file, fullPage: full, scale: 'css' }); // 1 screenshot px = 1 tap px
      const view = await page.evaluate(() => {
        const vis = (el) => {
          const r = el.getBoundingClientRect();
          const st = getComputedStyle(el);
          return r.width > 0 && r.height > 0 && st.visibility !== 'hidden' && st.display !== 'none' && r.bottom > 0 && r.top < innerHeight;
        };
        const txt = (el) => (el.innerText || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 90);
        const controls = [...document.querySelectorAll('button, a[href], [role="button"], [role="tab"], [role="option"], [role="menuitem"], [role="switch"], select, input')]
          .filter(vis)
          .map((el) => ({ label: txt(el), disabled: el.disabled || el.getAttribute('aria-disabled') === 'true', title: el.title || undefined }))
          .filter((c) => c.label);
        const headings = [...document.querySelectorAll('h1,h2,h3,h4,[role="heading"]')].filter(vis).map(txt).filter(Boolean).slice(0, 15);
        const alerts = [...document.querySelectorAll('[role="alert"], .toast, .error-toast')].filter(vis).map(txt).filter(Boolean);
        return { headings, alerts, controls: controls.slice(0, 80) };
      });
      const seenDialogs = dialogs.splice(0);
      log({ act: 'look', name, file, alerts: view.alerts, dialogs: seenDialogs });
      return { file, ...(seenDialogs.length ? { dialogs: seenDialogs } : {}), ...view };
    },
    /** Click the first visible control whose accessible name matches (string or RegExp). */
    async click(name, { nth = 0, timeout = 4000 } = {}) {
      // Anything a player can press: buttons, tabs, options, links, menu items, switches, checkboxes.
      const roles = ['button', 'tab', 'option', 'link', 'menuitem', 'switch', 'checkbox', 'radio'];
      let loc = null;
      for (const role of roles) {
        const cand = page.getByRole(role, { name });
        if ((await cand.count()) > nth) {
          loc = cand.nth(nth);
          break;
        }
      }
      if (!loc) loc = page.getByRole('button', { name }).nth(nth);
      try {
        await loc.click({ timeout });
        log({ act: 'click', name: String(name), ok: true });
        await page.waitForTimeout(500);
        return true;
      } catch (e) {
        log({ act: 'click', name: String(name), ok: false, error: e.message.split('\n')[0] });
        return false;
      }
    },
    /** Click by visible text anywhere (cards, list items, map labels rendered as text). */
    async clickText(text, { nth = 0, timeout = 4000 } = {}) {
      const loc = page.getByText(text).nth(nth);
      try {
        await loc.click({ timeout });
        log({ act: 'clickText', text: String(text), ok: true });
        await page.waitForTimeout(500);
        return true;
      } catch (e) {
        log({ act: 'clickText', text: String(text), ok: false, error: e.message.split('\n')[0] });
        return false;
      }
    },
    async clickAt(x, y) {
      await page.mouse.click(x, y);
      log({ act: 'clickAt', x, y });
      await page.waitForTimeout(600);
    },
    async key(k) {
      await page.keyboard.press(k);
      log({ act: 'key', k });
      await page.waitForTimeout(400);
    },
    /** Rapid screenshots to review animation/motion as a frame strip. */
    async burst(name, { ms = 1500, every = 120 } = {}) {
      const dir = path.join(out, `burst-${String(++n).padStart(3, '0')}-${name}`);
      fs.mkdirSync(dir, { recursive: true });
      const frames = [];
      const t0 = Date.now();
      let i = 0;
      while (Date.now() - t0 < ms) {
        const f = path.join(dir, `${String(i++).padStart(3, '0')}.png`);
        await page.screenshot({ path: f, scale: 'css' });
        frames.push(f);
        await page.waitForTimeout(every);
      }
      log({ act: 'burst', name, frames: frames.length, dir });
      return { dir, frames };
    },
    /** The HUD's numbers as text, for reports. */
    async hud() {
      return page.evaluate(() => (document.querySelector('.hud')?.innerText ?? '').replace(/\s+/g, ' ').trim());
    },
    note(text) {
      log({ act: 'note', text });
    },
    async close() {
      log({ act: 'close', errors });
      await context.close();
      await browser.close();
    },
  };
  return s;
}
