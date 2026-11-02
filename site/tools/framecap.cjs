// Frame-exact capture for landing-page footage.
//
// The cloud browser renders WebGL and SVG in software at a few frames per second, so a
// real-time screen recording stutters. Instead we give the page a virtual clock: time only
// moves when we say so (requestAnimationFrame, setTimeout/setInterval, performance.now,
// Date.now and every CSS/Web animation), and we screenshot after each 1/fps step. The
// resulting video is perfectly smooth however slow the machine is.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

/** Call before page.goto(). Installs the virtual clock (paused until the first advance). */
async function installClock(page) {
  await page.addInitScript(() => {
    const realNow = performance.now.bind(performance);
    const realDate = Date.now;
    const t0 = realNow();
    const d0 = realDate();
    let now = 0; // virtual ms since install
    let live = true; // real time until capture starts
    const offset = () => (live ? realNow() - t0 : now);
    let rafQ = [];
    let rafId = 1;
    let timers = [];
    let timerId = 1;
    const origRaf = window.requestAnimationFrame.bind(window);
    const origCancelRaf = window.cancelAnimationFrame.bind(window);
    const origSetTimeout = window.setTimeout.bind(window);
    const origClearTimeout = window.clearTimeout.bind(window);
    const origSetInterval = window.setInterval.bind(window);
    const origClearInterval = window.clearInterval.bind(window);
    performance.now = () => t0 + offset();
    Date.now = () => d0 + offset();
    window.requestAnimationFrame = (cb) => {
      if (live) return origRaf(cb);
      const id = rafId++;
      rafQ.push({ id, cb });
      return id;
    };
    window.cancelAnimationFrame = (id) => {
      rafQ = rafQ.filter((r) => r.id !== id);
      origCancelRaf(id);
    };
    window.setTimeout = (cb, ms = 0, ...args) => {
      if (live) return origSetTimeout(cb, ms, ...args);
      const id = timerId++;
      timers.push({ id, at: now + Math.max(0, ms), cb: () => cb(...args) });
      return id;
    };
    window.clearTimeout = (id) => {
      timers = timers.filter((t) => t.id !== id);
      origClearTimeout(id);
    };
    window.setInterval = (cb, ms = 0, ...args) => {
      if (live) return origSetInterval(cb, ms, ...args);
      const id = timerId++;
      const every = Math.max(1, ms);
      const tick = () => {
        cb(...args);
        timers.push({ id, at: now + every, cb: tick });
      };
      timers.push({ id, at: now + every, cb: tick });
      return id;
    };
    window.clearInterval = (id) => {
      timers = timers.filter((t) => t.id !== id);
      origClearInterval(id);
    };
    window.__clockFreeze = () => {
      now = realNow() - t0;
      live = false;
      for (const a of document.getAnimations()) a.pause();
    };
    window.__clockAdvance = (ms) => {
      const end = now + ms;
      // Fire due timers in order (they may schedule more)
      for (;;) {
        timers.sort((a, b) => a.at - b.at);
        const next = timers[0];
        if (!next || next.at > end) break;
        timers.shift();
        now = Math.max(now, next.at);
        try { next.cb(); } catch (e) { console.error(e); }
      }
      now = end;
      // Step every CSS/Web animation, including ones created since the last frame
      for (const a of document.getAnimations()) {
        if (a.playState !== 'paused') a.pause();
        a.currentTime = (a.currentTime ?? 0) + ms;
      }
      // One animation frame at the new time
      const q = rafQ;
      rafQ = [];
      for (const r of q) {
        try { r.cb(t0 + now); } catch (e) { console.error(e); }
      }
    };
  });
}

/**
 * Capture `seconds` of footage at `fps` into `out` (mp4). `script` is an optional list of
 * [atSecond, async () => {...}] steps run between frames (clicks, camera moves).
 */
async function captureClip(page, { seconds, fps = 30, out, width, crf = 26, script = [], clip, onFrame }) {
  const dir = fs.mkdtempSync(path.join(path.dirname(out), '.frames-'));
  const steps = [...script].sort((a, b) => a[0] - b[0]);
  const total = Math.round(seconds * fps);
  await page.evaluate(() => window.__clockFreeze());
  for (let f = 0; f < total; f++) {
    const t = f / fps;
    while (steps.length && steps[0][0] <= t) await steps.shift()[1]();
    if (onFrame) await onFrame(f, t, total);
    await page.evaluate((ms) => window.__clockAdvance(ms), 1000 / fps);
    await page.screenshot({ path: path.join(dir, `f${String(f).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 90, ...(clip ? { clip } : {}) });
  }
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(fps), '-i', path.join(dir, 'f%05d.jpg'), '-vf', `scale=${width}:-2`, '-c:v', 'libx264', '-preset', 'slow', '-crf', String(crf), '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', out]);
  fs.rmSync(dir, { recursive: true, force: true });
}

module.exports = { installClock, captureClip };
