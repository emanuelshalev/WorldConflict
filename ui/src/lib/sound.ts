import { useSyncExternalStore } from 'react';

/**
 * The sound kit (design-feel.md 6.3): WebAudio only, synthesized, no asset files. Ported from
 * devloop/.../concepts/feel-sound.js.
 *
 * - No AudioContext until the first sound plays (always after a user gesture); muted means none
 *   is ever created. Suspended after 30 s of silence, resumed on the next sound.
 * - One master gain into a compressor (threshold -18 dB, ratio 4). Volume 0 to 100, default 55.
 * - At most 4 UI sounds in 500 ms (extras are dropped); a stinger ducks UI sounds while it plays.
 * - Noise comes from a fixed LCG, never Math.random.
 * - Persisted in localStorage['worldconflict.sound'] as {"on":true,"volume":55}.
 */

export type UiSound = 'tap' | 'stamp' | 'spend' | 'refund' | 'refuse' | 'page' | 'execute';
export type StingerSound = 'war' | 'nuclear' | 'coup' | 'peace' | 'mission';
export type SoundName = UiSound | StingerSound;

export interface SoundSettings {
  on: boolean;
  /** 0 to 100 */
  volume: number;
}

const KEY = 'worldconflict.sound';
const DEFAULTS: SoundSettings = { on: true, volume: 55 };
const STINGER_LENGTH: Record<StingerSound, number> = { war: 2.1, nuclear: 2.7, coup: 1.8, peace: 2.2, mission: 1.7 };
const UI_BURST = 4;
const UI_WINDOW_MS = 500;
const SUSPEND_AFTER_MS = 30_000;

function load(): SoundSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    if (raw === 'off' || raw === 'on') return { ...DEFAULTS, on: raw === 'on' };
    const v = JSON.parse(raw) as Partial<SoundSettings>;
    return {
      on: typeof v.on === 'boolean' ? v.on : DEFAULTS.on,
      volume: typeof v.volume === 'number' && Number.isFinite(v.volume) ? Math.max(0, Math.min(100, Math.round(v.volume))) : DEFAULTS.volume,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

let settings: SoundSettings = load();
const listeners = new Set<() => void>();
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let suspendTimer: ReturnType<typeof setTimeout> | undefined;
let recentUi: number[] = [];
let duckUntil = 0;
const noiseCache = new Map<number, AudioBuffer>();

function emit() {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    /* storage unavailable: the setting lasts for this session */
  }
  for (const l of listeners) l();
}

const gainFor = (volume: number) => (volume / 100) * 1.0; // 55 -> 0.55, the concept's master level

function ac(): AudioContext | null {
  if (!ctx) {
    const w = window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
    const AC = w.AudioContext ?? w.webkitAudioContext;
    if (!AC) return null;
    try {
      ctx = new AC();
    } catch {
      return null;
    }
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 4;
    master = ctx.createGain();
    master.gain.value = gainFor(settings.volume);
    master.connect(comp);
    comp.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
  clearTimeout(suspendTimer);
  suspendTimer = setTimeout(() => {
    if (ctx && ctx.state === 'running') void ctx.suspend().catch(() => {});
  }, SUSPEND_AFTER_MS);
  return ctx;
}

interface ToneOpts {
  type?: OscillatorType;
  f: number;
  f2?: number;
  at?: number;
  dur?: number;
  g?: number;
  attack?: number;
  lp?: [number, number?];
}

/** One oscillator voice with a pitch glide and an exponential decay. */
function tone(c: AudioContext, { type = 'sine', f, f2, at = 0, dur = 0.12, g = 0.2, attack = 0.004, lp }: ToneOpts) {
  if (!master) return;
  const t = c.currentTime + at;
  const o = c.createOscillator();
  const v = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
  v.gain.setValueAtTime(0.0001, t);
  v.gain.exponentialRampToValueAtTime(g, t + attack);
  v.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  let node: AudioNode = o;
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

/** Deterministic decaying noise (a tiny LCG), cached per length. */
function noiseBuffer(c: AudioContext, dur: number): AudioBuffer {
  const len = Math.max(1, Math.floor(c.sampleRate * dur));
  const hit = noiseCache.get(len);
  if (hit) return hit;
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  let s = 1234567;
  for (let i = 0; i < len; i++) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    d[i] = (s / 0x3fffffff - 1) * (1 - i / len);
  }
  noiseCache.set(len, buf);
  return buf;
}

interface NoiseOpts {
  at?: number;
  dur?: number;
  g?: number;
  type?: BiquadFilterType;
  f?: number;
  f2?: number;
  q?: number;
}

/** A filtered noise burst (paper, stamp body, snare, rumble). */
function noise(c: AudioContext, { at = 0, dur = 0.06, g = 0.2, type = 'bandpass', f = 2000, f2, q = 1 }: NoiseOpts) {
  if (!master) return;
  const t = c.currentTime + at;
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c, dur);
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

const chord = (c: AudioContext, fs: number[], at: number, dur: number, g: number) =>
  fs.forEach((f) => tone(c, { f, at, dur, g, attack: 0.25 }));

const RECIPES: Record<SoundName, (c: AudioContext) => void> = {
  // UI layer: under 150 ms, quiet
  tap: (c) => noise(c, { dur: 0.03, g: 0.12, f: 2400, q: 2 }),
  stamp: (c) => {
    tone(c, { f: 110, f2: 48, dur: 0.16, g: 0.5 });
    noise(c, { dur: 0.07, g: 0.35, type: 'lowpass', f: 900 });
  },
  spend: (c) => {
    tone(c, { type: 'triangle', f: 560, f2: 380, dur: 0.09, g: 0.22 });
    noise(c, { dur: 0.02, g: 0.12, f: 3000, q: 3 });
  },
  refund: (c) => {
    tone(c, { type: 'triangle', f: 380, dur: 0.06, g: 0.16 });
    tone(c, { type: 'triangle', f: 570, at: 0.07, dur: 0.08, g: 0.16 });
  },
  refuse: (c) => {
    tone(c, { type: 'square', f: 150, dur: 0.07, g: 0.08, lp: [600] });
    tone(c, { type: 'square', f: 140, at: 0.11, dur: 0.08, g: 0.08, lp: [600] });
  },
  page: (c) => noise(c, { dur: 0.16, g: 0.12, type: 'bandpass', f: 600, f2: 3200, q: 0.7 }),
  execute: (c) => {
    noise(c, { dur: 0.22, g: 0.14, type: 'bandpass', f: 400, f2: 2400, q: 0.6 });
    tone(c, { f: 90, f2: 45, at: 0.2, dur: 0.3, g: 0.55 });
    noise(c, { at: 0.2, dur: 0.09, g: 0.3, type: 'lowpass', f: 800 });
  },
  // Stingers: 1.2 to 2.8 s
  war: (c) => {
    tone(c, { f: 70, f2: 38, dur: 0.6, g: 0.7 });
    noise(c, { dur: 0.25, g: 0.4, type: 'lowpass', f: 500 });
    tone(c, { type: 'sawtooth', f: 73.4, at: 0.15, dur: 1.9, g: 0.16, attack: 0.3, lp: [260, 1400] });
    tone(c, { type: 'sawtooth', f: 110, at: 0.15, dur: 1.9, g: 0.12, attack: 0.3, lp: [260, 1400] });
    tone(c, { f: 70, f2: 38, at: 0.9, dur: 0.5, g: 0.5 });
  },
  nuclear: (c) => {
    tone(c, { f: 46, f2: 28, dur: 2.6, g: 0.8, attack: 0.02 });
    noise(c, { dur: 2.2, g: 0.35, type: 'lowpass', f: 1200, f2: 120 });
    tone(c, { f: 880, f2: 660, at: 0.6, dur: 0.5, g: 0.06 });
    tone(c, { f: 880, f2: 660, at: 1.2, dur: 0.5, g: 0.05 });
  },
  coup: (c) => {
    for (let i = 0; i < 14; i++) noise(c, { at: 0.6 * (1 - 0.86 ** i) * 2.2, dur: 0.05, g: 0.18 + i * 0.012, f: 1800, q: 1.2 });
    tone(c, { f: 98, f2: 49, at: 1.35, dur: 0.4, g: 0.6 });
    noise(c, { at: 1.35, dur: 0.12, g: 0.35, type: 'lowpass', f: 700 });
  },
  peace: (c) => {
    chord(c, [261.6, 329.6, 392], 0, 2.2, 0.08);
    tone(c, { f: 1046.5, at: 0.35, dur: 1.6, g: 0.07 });
    tone(c, { f: 2093, at: 0.35, dur: 0.9, g: 0.025 });
  },
  mission: (c) => {
    [523.3, 659.3, 784, 1046.5].forEach((f, i) => tone(c, { type: 'triangle', f, at: i * 0.09, dur: 0.35, g: 0.14 }));
    tone(c, { f: 1568, at: 0.42, dur: 1.2, g: 0.05 });
    tone(c, { f: 110, f2: 48, at: 0.42, dur: 0.18, g: 0.45 });
  },
};

const isStinger = (n: SoundName): n is StingerSound => n in STINGER_LENGTH;

export const SOUND_NAMES = Object.keys(RECIPES) as SoundName[];

export const sound = {
  /** Play a sound now (no-op when muted, at volume 0, or over the UI rate limit). Returns whether it played. */
  play(name: SoundName): boolean {
    if (!settings.on || settings.volume <= 0 || typeof window === 'undefined') return false;
    const now = performance.now();
    if (isStinger(name)) {
      duckUntil = now + STINGER_LENGTH[name] * 1000;
    } else {
      if (now < duckUntil) return false;
      recentUi = recentUi.filter((t) => now - t < UI_WINDOW_MS);
      if (recentUi.length >= UI_BURST) return false;
      recentUi.push(now);
    }
    const c = ac();
    if (!c) return false;
    try {
      RECIPES[name](c);
      return true;
    } catch {
      return false;
    }
  },
  get on() {
    return settings.on;
  },
  get muted() {
    return !settings.on;
  },
  get volume() {
    return settings.volume;
  },
  setOn(on: boolean) {
    settings = { ...settings, on };
    if (!on && ctx && ctx.state === 'running') void ctx.suspend().catch(() => {});
    emit();
  },
  setMuted(muted: boolean) {
    sound.setOn(!muted);
  },
  setVolume(volume: number) {
    settings = { ...settings, volume: Math.max(0, Math.min(100, Math.round(volume))) };
    if (master && ctx) master.gain.setTargetAtTime(gainFor(settings.volume), ctx.currentTime, 0.02);
    emit();
  },
  /** Vibrate (phones), only when sound is on. */
  haptic(pattern: number | number[]) {
    if (!settings.on) return;
    try {
      navigator.vibrate?.(pattern);
    } catch {
      /* not supported */
    }
  },
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },
  snapshot(): SoundSettings {
    return settings;
  },
};

/** React view of the sound settings (re-renders on toggle and volume changes). */
export function useSoundSettings(): SoundSettings {
  return useSyncExternalStore(sound.subscribe, sound.snapshot, sound.snapshot);
}
