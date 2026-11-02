export type Mood = 'good' | 'bad' | 'neutral';

/** Props every scene illustration receives. */
export interface SceneArtProps {
  /** Player nation flag colours (podium, desk flag, backdrop). */
  a: [string, string, string];
  /** Counterpart nation flag colours (summit partner, target, rival). */
  b: [string, string, string];
  /** Lighting and colour grade of the outcome: warm/green good, red/cold bad. */
  mood: Mood;
  /** Optional headline figure for data scenes (markets TV shows real growth, e.g. "-1.2%"). */
  figure?: string;
}
