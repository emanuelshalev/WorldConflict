import type { PlayerViewCountry } from '../store/gameStore';

/**
 * Country fill colours for every map layer, and the legend entries built from the same scales,
 * so the Map Guide always matches what the map draws. Every scale is continuous, recomputed
 * from the latest server payload, and avoids red/green as the only cue (colour-blind safe):
 * diverging scales run warm (red/orange) to cool (teal/blue) and change lightness too, and
 * special states add a hatch pattern on top of the colour.
 */

export type MapLayer = 'relations' | 'political' | 'military' | 'economic' | 'stability' | 'intelligence' | 'nuclear';

type Stop = readonly [number, string];

function hexToRgb(h: string): [number, number, number] {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Piecewise-linear colour ramp over sorted stops (clamped at both ends). */
export function ramp(stops: readonly Stop[], x: number): string {
  if (!Number.isFinite(x)) x = stops[0][0];
  if (x <= stops[0][0]) return stops[0][1];
  for (let i = 1; i < stops.length; i++) {
    const [x1, c1] = stops[i];
    if (x <= x1) {
      const [x0, c0] = stops[i - 1];
      const t = (x - x0) / (x1 - x0);
      const a = hexToRgb(c0);
      const b = hexToRgb(c1);
      const m = a.map((v, k) => Math.round(v + (b[k] - v) * t));
      return `rgb(${m[0]}, ${m[1]}, ${m[2]})`;
    }
  }
  return stops[stops.length - 1][1];
}

/** CSS gradient for a legend bar, from the same stops. */
export function rampCss(stops: readonly Stop[]): string {
  const lo = stops[0][0];
  const hi = stops[stops.length - 1][0];
  return `linear-gradient(to right, ${stops.map(([x, c]) => `${c} ${Math.round(((x - lo) / (hi - lo)) * 100)}%`).join(', ')})`;
}

// --------------------------------------------------------------------------
// Scales
// --------------------------------------------------------------------------

/** Relations with you, -100..100: orange (hostile) through slate (neutral) to blue (friendly). */
export const RELATION_STOPS: readonly Stop[] = [
  [-80, '#f26b3a'],
  [-40, '#b4613f'],
  [0, '#4a586e'],
  [40, '#3575c2'],
  [80, '#2f8cfd'],
];

/** Annual real growth: deep red (contraction) through neutral grey (~+1%) to teal green (boom). */
export const GROWTH_STOPS: readonly Stop[] = [
  [-0.05, '#9e0f1a'],
  [-0.025, '#d4572f'],
  [0, '#c49a5c'],
  [0.01, '#8e9088'],
  [0.025, '#4fa88b'],
  [0.04, '#0f936b'],
];
export const SCORCHED = '#5b5622';

/** Government stability 0..100: crimson (collapsing) through sand (shaky) to blue (solid). */
export const STABILITY_STOPS: readonly Stop[] = [
  [0, '#5a0b20'],
  [15, '#a3202f'],
  [30, '#d6604d'],
  [50, '#d8b06a'],
  [70, '#4f9fb0'],
  [100, '#1f6fb4'],
];
export const COLLAPSED = '#1c0b10';

/** Military strength relative to the strongest power (square-root spread). */
export const MILITARY_STOPS: readonly Stop[] = [
  [0, '#2b303b'],
  [0.35, '#6e3b2b'],
  [0.7, '#c4452b'],
  [1, '#ff6038'],
];

export const NUCLEAR_COLORS: Record<string, string> = {
  ARMED: '#c92a2a',
  TESTED: '#e8590c',
  DEVELOPING: '#e6a23c',
  LATENT: '#6f6d4f',
  NONE: '#3c4048',
};
/** Radioactive fallout 0..100: dim olive (faint, decaying) to toxic yellow-green, under hazard stripes. */
export const FALLOUT_STOPS: readonly Stop[] = [
  [0, '#59662a'],
  [50, '#9fbb32'],
  [100, '#d6f03c'],
];
export const NUKED = ramp(FALLOUT_STOPS, 100);
export const NUKE_USER = '#a3176f'; // used a nuclear weapon: pariah magenta

// Okabe-Ito categorical palette: colorblind-safe and value-neutral
export const REGIME_COLORS: Record<string, string> = {
  DEMOCRACY: '#0072B2',
  AUTOCRACY: '#D55E00',
  COMMUNIST: '#CC79A7',
  MONARCHY: '#009E73',
  THEOCRACY: '#E69F00',
  MILITARY_JUNTA: '#9a8466',
};

export const relationColor = (rel: number) => ramp(RELATION_STOPS, rel);

/** Fill patterns drawn over the colour (registered as map images in mapIcons.tsx). */
export const PATTERN = {
  embargo: 'pat-embargo',
  war: 'pat-war',
  unrest: 'pat-unrest',
  fallout: 'pat-fallout',
  pariah: 'pat-pariah',
} as const;

/** CSS backgrounds that mimic the map patterns, for the legend. */
export const PATTERN_CSS: Record<string, string> = {
  [PATTERN.embargo]: 'repeating-linear-gradient(45deg, rgba(5,8,14,0.85) 0 2px, transparent 2px 6px)',
  [PATTERN.war]: 'repeating-linear-gradient(-45deg, rgba(255,70,60,0.9) 0 2px, transparent 2px 7px)',
  [PATTERN.unrest]:
    'repeating-linear-gradient(45deg, rgba(255,159,67,0.85) 0 1.5px, transparent 1.5px 6px), repeating-linear-gradient(-45deg, rgba(255,159,67,0.85) 0 1.5px, transparent 1.5px 6px)',
  [PATTERN.fallout]: 'repeating-linear-gradient(45deg, rgba(10,10,6,0.9) 0 3px, transparent 3px 7px)',
  [PATTERN.pariah]:
    'repeating-linear-gradient(45deg, rgba(255,210,235,0.6) 0 1px, transparent 1px 5px), repeating-linear-gradient(-45deg, rgba(255,210,235,0.6) 0 1px, transparent 1px 5px)',
};

export interface ColorContext {
  maxStrength: number;
  /** Countries that used a nuclear weapon (pariahs under the global embargo). */
  nukeUsers: Set<string>;
}

export interface Paint {
  fill: string;
  pattern: string; // '' for none
}

const fallout = (v: PlayerViewCountry) => v.fallout ?? v.full?.fallout ?? 0;
const growth = (v: PlayerViewCountry) => v.growth ?? v.full?.realGrowth ?? v.full?.growthRate ?? 0.01;

export function countryPaint(view: PlayerViewCountry, layer: string, ctx: ColorContext): Paint {
  const none = '';
  switch (layer) {
    case 'relations':
      return { fill: view.isPlayer ? '#F2A93B' : relationColor(view.relationWithPlayer), pattern: none };
    case 'political':
      return { fill: REGIME_COLORS[view.regimeType] ?? '#555', pattern: none };
    case 'military': {
      const t = Math.sqrt(Math.min(1, Math.max(0, view.militaryStrength.estimate) / Math.max(1, ctx.maxStrength)));
      return { fill: ramp(MILITARY_STOPS, t), pattern: view.atWarWith.length > 0 ? PATTERN.war : none };
    }
    case 'economic': {
      const scorched = fallout(view) > 20;
      return {
        fill: scorched ? SCORCHED : ramp(GROWTH_STOPS, growth(view)),
        pattern: view.underEmbargo || view.full?.underGlobalEmbargo ? PATTERN.embargo : none,
      };
    }
    case 'stability': {
      if (view.full?.collapsed) return { fill: COLLAPSED, pattern: PATTERN.unrest };
      const revolt = view.insurgencyLevel === 'REBELLION' || view.insurgencyLevel === 'GUERILLA';
      return { fill: ramp(STABILITY_STOPS, view.stability.estimate), pattern: revolt ? PATTERN.unrest : none };
    }
    case 'intelligence': {
      if (view.isPlayer) return { fill: '#2a6dd9', pattern: none };
      const c = view.intelConfidence;
      return { fill: `hsl(210, ${Math.round(c * 0.5)}%, ${18 + (c / 100) * 30}%)`, pattern: none };
    }
    case 'nuclear': {
      if (fallout(view) > 0) return { fill: ramp(FALLOUT_STOPS, fallout(view)), pattern: PATTERN.fallout };
      if (ctx.nukeUsers.has(view.id)) return { fill: NUKE_USER, pattern: PATTERN.pariah };
      return { fill: NUCLEAR_COLORS[view.nuclearStatus] ?? NUCLEAR_COLORS.NONE, pattern: none };
    }
    default:
      return { fill: '#555', pattern: none };
  }
}

// --------------------------------------------------------------------------
// Legend (Map Guide), generated from the scales above
// --------------------------------------------------------------------------

export interface LegendSwatch {
  color: string;
  label: string;
  pattern?: string;
}

export interface LayerLegend {
  title: string;
  description: string;
  gradient?: { css: string; left: string; mid?: string; right: string };
  swatches: LegendSwatch[];
}

export const LAYER_LEGENDS: Record<MapLayer, LayerLegend> = {
  relations: {
    title: 'Relations layer',
    description:
      'How every government feels about you, recomputed every month. Blue = friendly, slate = neutral, orange = hostile. Your own country is amber; countries you are fighting have a pulsing red border.',
    gradient: { css: rampCss(RELATION_STOPS), left: 'Hostile', mid: 'Neutral', right: 'Friendly' },
    swatches: [
      { color: '#F2A93B', label: 'You' },
      { color: relationColor(70), label: 'Ally / warm (+70)' },
      { color: relationColor(0), label: 'Neutral (0)' },
      { color: relationColor(-70), label: 'Hostile (-70)' },
    ],
  },
  political: {
    title: 'Regimes layer',
    description:
      'System of government (colour-blind-safe palette, no colour means good or bad). Coups and revolutions repaint a country the month they happen, with a badge on it.',
    swatches: [
      { color: REGIME_COLORS.DEMOCRACY, label: 'Democracy' },
      { color: REGIME_COLORS.AUTOCRACY, label: 'Autocracy' },
      { color: REGIME_COLORS.COMMUNIST, label: 'Communist state' },
      { color: REGIME_COLORS.MONARCHY, label: 'Monarchy' },
      { color: REGIME_COLORS.THEOCRACY, label: 'Theocracy' },
      { color: REGIME_COLORS.MILITARY_JUNTA, label: 'Military junta' },
    ],
  },
  military: {
    title: 'Military layer',
    description:
      "Brighter = greater estimated fighting power relative to the strongest military (your intelligence service's estimate). Red stripes: the country is at war. Unit boxes show troops massed on a border.",
    gradient: { css: rampCss(MILITARY_STOPS), left: 'Minor force', right: 'Superpower' },
    swatches: [
      { color: ramp(MILITARY_STOPS, 1), label: 'Major military power' },
      { color: ramp(MILITARY_STOPS, 0.6), label: 'Mid-tier force' },
      { color: ramp(MILITARY_STOPS, 0.2), label: 'Minor force' },
      { color: ramp(MILITARY_STOPS, 0.6), label: 'At war', pattern: PATTERN.war },
    ],
  },
  economic: {
    title: 'Economic layer',
    description:
      'Economic health, not size: real annual growth from public statistics. Red = shrinking, grey = flat, teal-green = booming. Dark stripes: under embargo. A scorched olive tone: an economy wrecked by nuclear fallout.',
    gradient: { css: rampCss(GROWTH_STOPS), left: '-5%', mid: '+1%', right: '+4%' },
    swatches: [
      { color: ramp(GROWTH_STOPS, 0.045), label: 'Booming (+4% or more)' },
      { color: ramp(GROWTH_STOPS, 0.01), label: 'Flat (about +1%)' },
      { color: ramp(GROWTH_STOPS, -0.025), label: 'Recession (-2.5%)' },
      { color: ramp(GROWTH_STOPS, -0.06), label: 'Collapse (-5% or worse)' },
      { color: ramp(GROWTH_STOPS, 0.01), label: 'Under embargo', pattern: PATTERN.embargo },
      { color: SCORCHED, label: 'Wrecked by nuclear fallout' },
    ],
  },
  stability: {
    title: 'Stability layer',
    description:
      'How solid each government is (your estimate). Blue = solid, sand = shaky, crimson = on the brink. Orange crosshatch: open rebellion or guerilla war. Unstable states are vulnerable to coups and revolutions.',
    gradient: { css: rampCss(STABILITY_STOPS), left: '0', mid: '50', right: '100' },
    swatches: [
      { color: ramp(STABILITY_STOPS, 85), label: 'Very solid (80+)' },
      { color: ramp(STABILITY_STOPS, 50), label: 'Shaky (~50)' },
      { color: ramp(STABILITY_STOPS, 25), label: 'Unstable (~25)' },
      { color: ramp(STABILITY_STOPS, 8), label: 'Collapsing (<15)' },
      { color: ramp(STABILITY_STOPS, 30), label: 'Rebellion / guerilla war', pattern: PATTERN.unrest },
    ],
  },
  intelligence: {
    title: 'Intelligence layer',
    description:
      'How well you can see each country. Your nation is blue. Others: brighter = higher intelligence confidence; near-black = you are effectively blind there, and the numbers you see for them may be badly wrong.',
    swatches: [
      { color: '#2a6dd9', label: 'Your nation (full knowledge)' },
      { color: 'hsl(210, 45%, 45%)', label: 'Good coverage (high confidence)' },
      { color: 'hsl(210, 25%, 30%)', label: 'Partial coverage' },
      { color: 'hsl(210, 10%, 20%)', label: 'Nearly blind' },
    ],
  },
  nuclear: {
    title: 'Nuclear layer',
    description:
      'Nuclear status as your analysts assess it (programs can be hidden). Radioactive fallout (the country hit, and neighbours it drifts into) turns a country toxic yellow under hazard stripes, fading as the radiation decays; a country that used a nuclear weapon is marked as a pariah.',
    gradient: { css: rampCss(FALLOUT_STOPS), left: 'Faint fallout', right: 'Fresh strike (100)' },
    swatches: [
      { color: NUKED, label: 'Struck: severe radioactive fallout', pattern: PATTERN.fallout },
      { color: ramp(FALLOUT_STOPS, 25), label: 'Fallout drifting in / decaying', pattern: PATTERN.fallout },
      { color: NUKE_USER, label: 'Used a nuclear weapon', pattern: PATTERN.pariah },
      { color: NUCLEAR_COLORS.ARMED, label: 'ARMED, deliverable arsenal' },
      { color: NUCLEAR_COLORS.TESTED, label: 'TESTED, weaponizing' },
      { color: NUCLEAR_COLORS.DEVELOPING, label: 'DEVELOPING, program detected' },
      { color: NUCLEAR_COLORS.LATENT, label: 'LATENT, could build quickly' },
      { color: NUCLEAR_COLORS.NONE, label: 'None detected' },
    ],
  },
};
