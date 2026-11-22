// B-07 / F-00-12 (QA repro #1: freezes): the hidden map kept drawing behind the desk (about 33,800
// draw calls/s under software GL) and 97 endless CSS animations ran at idle. Guard: after the desk
// has sat idle for 25 s no animation is running, and the globe behind the desk renders no frames.
// (QA measured "still after 15 to 20 s"; the strict 10 s target of Feel AC24 is still open.)
import { args, run, startGame } from './_lib.mjs';

const { out, base } = args('B-07');

await run('B-07', async (g, track) => {
  const s = track(await startGame({ variant: 'b07', device: 'laptop', out, base }));
  const p = s.page;
  await p.mouse.move(5, 5);
  await p.waitForTimeout(25000);
  const idle = await p.evaluate(async () => {
    const running = document.getAnimations().filter((a) => a.playState === 'running');
    const sample = running.slice(0, 5).map((a) => `${a.animationName ?? a.constructor.name} on ${a.effect?.target?.className ?? '?'}`);
    // Frames the globe draws while the desk covers it
    const map = window.__wcMap;
    let renders = -1;
    if (map) {
      renders = 0;
      const on = () => renders++;
      map.on('render', on);
      await new Promise((r) => setTimeout(r, 3000));
      map.off('render', on);
    }
    return { running: running.length, sample, renders };
  });
  g.check(idle.running === 0, `no running animations after 25 s idle on the desk (${idle.running}: ${idle.sample.join(', ')})`);
  g.check(idle.renders <= 0, `the globe behind the desk renders no frames (${idle.renders < 0 ? 'not mounted' : `${idle.renders} in 3 s`})`);
  g.check(!s.errors.length, `no page errors (${s.errors.slice(0, 2).join(' | ')})`);
});
