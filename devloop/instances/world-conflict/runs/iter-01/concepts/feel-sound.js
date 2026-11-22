/*
 * World Conflict sound kit concept (design-feel.md section 4). WebAudio only, no assets.
 * Port target: ui/src/lib/sound.ts. All sounds are short, synthesized, and go through one
 * master gain + compressor. Nothing plays until the first user gesture; muted state persists.
 */
window.WCSound = (() => {
  let ctx = null;
  let master = null;
  let muted = false;
  try { muted = localStorage.getItem('worldconflict.sound') === 'off'; } catch { /* storage unavailable */ }

  function ac() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -18;
      comp.ratio.value = 4;
      master = ctx.createGain();
      master.gain.value = 0.55;
      master.connect(comp);
      comp.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  /** One oscillator voice with a pitch glide and an exponential decay. */
  function tone({ type = 'sine', f = 440, f2, at = 0, dur = 0.12, g = 0.2, attack = 0.004, lp }) {
    const c = ac();
    if (!c) return;
    const t = c.currentTime + at;
    const o = c.createOscillator();
    const v = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    v.gain.setValueAtTime(0.0001, t);
    v.gain.exponentialRampToValueAtTime(g, t + attack);
    v.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let node = o;
    if (lp) {
      const fl = c.createBiquadFilter();
      fl.type = 'lowpass';
      fl.frequency.setValueAtTime(lp[0], t);
      if (lp[1]) fl.frequency.exponentialRampToValueAtTime(lp[1], t + dur);
      o.connect(fl);
      node = fl;
    }
    node.connect(v);
    v.connect(master);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  /** A filtered noise burst (paper, stamp body, snare, rumble). */
  function noise({ at = 0, dur = 0.06, g = 0.2, type = 'bandpass', f = 2000, f2, q = 1 }) {
    const c = ac();
    if (!c) return;
    const t = c.currentTime + at;
    const len = Math.max(1, Math.floor(c.sampleRate * dur));
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    // Deterministic noise (a tiny LCG) so the kit never uses Math.random
    let s = 1234567;
    for (let i = 0; i < len; i++) { s = (s * 1103515245 + 12345) & 0x7fffffff; d[i] = (s / 0x3fffffff - 1) * (1 - i / len); }
    const src = c.createBufferSource();
    src.buffer = buf;
    const fl = c.createBiquadFilter();
    fl.type = type;
    fl.Q.value = q;
    fl.frequency.setValueAtTime(f, t);
    if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + dur);
    const v = c.createGain();
    v.gain.setValueAtTime(g, t);
    v.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(fl);
    fl.connect(v);
    v.connect(master);
    src.start(t);
  }

  const chord = (fs, at, dur, g, type = 'sine') => fs.forEach((f) => tone({ type, f, at, dur, g, attack: 0.25 }));

  const RECIPES = {
    // UI layer: under 150 ms, quiet
    tap: () => noise({ dur: 0.03, g: 0.12, f: 2400, q: 2 }),
    stamp: () => { tone({ f: 110, f2: 48, dur: 0.16, g: 0.5 }); noise({ dur: 0.07, g: 0.35, type: 'lowpass', f: 900 }); },
    spend: () => { tone({ type: 'triangle', f: 560, f2: 380, dur: 0.09, g: 0.22 }); noise({ dur: 0.02, g: 0.12, f: 3000, q: 3 }); },
    refund: () => { tone({ type: 'triangle', f: 380, dur: 0.06, g: 0.16 }); tone({ type: 'triangle', f: 570, at: 0.07, dur: 0.08, g: 0.16 }); },
    refuse: () => { tone({ type: 'square', f: 150, dur: 0.07, g: 0.08, lp: [600] }); tone({ type: 'square', f: 140, at: 0.11, dur: 0.08, g: 0.08, lp: [600] }); },
    page: () => noise({ dur: 0.16, g: 0.12, type: 'bandpass', f: 600, f2: 3200, q: 0.7 }),
    execute: () => { noise({ dur: 0.22, g: 0.14, type: 'bandpass', f: 400, f2: 2400, q: 0.6 }); tone({ f: 90, f2: 45, at: 0.2, dur: 0.3, g: 0.55 }); noise({ at: 0.2, dur: 0.09, g: 0.3, type: 'lowpass', f: 800 }); },
    // Stingers: 1.2 to 2.6 s
    war: () => {
      tone({ f: 70, f2: 38, dur: 0.6, g: 0.7 }); noise({ dur: 0.25, g: 0.4, type: 'lowpass', f: 500 });
      tone({ type: 'sawtooth', f: 73.4, at: 0.15, dur: 1.9, g: 0.16, attack: 0.3, lp: [260, 1400] });
      tone({ type: 'sawtooth', f: 110, at: 0.15, dur: 1.9, g: 0.12, attack: 0.3, lp: [260, 1400] });
      tone({ f: 70, f2: 38, at: 0.9, dur: 0.5, g: 0.5 });
    },
    nuclear: () => {
      tone({ f: 46, f2: 28, dur: 2.6, g: 0.8, attack: 0.02 }); noise({ dur: 2.2, g: 0.35, type: 'lowpass', f: 1200, f2: 120 });
      tone({ f: 880, f2: 660, at: 0.6, dur: 0.5, g: 0.06 }); tone({ f: 880, f2: 660, at: 1.2, dur: 0.5, g: 0.05 });
    },
    coup: () => {
      for (let i = 0; i < 14; i++) noise({ at: 0.6 * (1 - Math.pow(0.86, i)) * 2.2, dur: 0.05, g: 0.18 + i * 0.012, f: 1800, q: 1.2 });
      tone({ f: 98, f2: 49, at: 1.35, dur: 0.4, g: 0.6 }); noise({ at: 1.35, dur: 0.12, g: 0.35, type: 'lowpass', f: 700 });
    },
    peace: () => { chord([261.6, 329.6, 392], 0, 2.2, 0.08); tone({ f: 1046.5, at: 0.35, dur: 1.6, g: 0.07 }); tone({ f: 2093, at: 0.35, dur: 0.9, g: 0.025 }); },
    mission: () => {
      [523.3, 659.3, 784, 1046.5].forEach((f, i) => tone({ type: 'triangle', f, at: i * 0.09, dur: 0.35, g: 0.14 }));
      tone({ f: 1568, at: 0.42, dur: 1.2, g: 0.05 }); tone({ f: 110, f2: 48, at: 0.42, dur: 0.18, g: 0.45 });
    },
  };

  return {
    play(name) { if (!muted && RECIPES[name]) RECIPES[name](); },
    get muted() { return muted; },
    setMuted(m) { muted = m; try { localStorage.setItem('worldconflict.sound', m ? 'off' : 'on'); } catch { /* ignore */ } },
    names: Object.keys(RECIPES),
  };
})();
