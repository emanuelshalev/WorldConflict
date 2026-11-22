import { useEffect, useId, useState, type ReactNode } from 'react';
import { useIdle } from '../lib/motion';
import { SceneUid } from './art/uid';
import { SCENE_META, type SceneKind } from './kinds';
import { SCENE_ART } from './art';
import type { Mood } from './art/types';
import { flagColors } from './palette';
import './scenes.css';

export type Verdict = 'success' | 'failed' | 'backfired' | 'partial' | 'decided';

interface Props {
  kind: SceneKind;
  /** Player country id (flag colours of the home side). */
  home?: string;
  /** Counterpart country id. */
  other?: string;
  mood?: Mood;
  /** Headline figure passed to data scenes (markets TV). */
  figure?: string;
  /** Lower-third headline; omit for a clean frame (thumbnails). */
  headline?: string;
  kicker?: string;
  sub?: string;
  /** Scrolling ticker items along the bottom. */
  ticker?: string[];
  verdict?: Verdict;
  size?: 'thumb' | 'card' | 'full';
  /** Slow push-in on the art (the reel uses it; static cards do not). */
  live?: boolean;
  /**
   * Whether the art's loops may run. Default: card and full scenes play while at least 30% on
   * screen and the tab is visible; thumbnails hold a still frame. `false` always holds; `true`
   * lets a thumbnail play too (still only while on screen). Idle (15 s, no input) holds all.
   */
  play?: boolean;
  children?: ReactNode;
}

const VERDICT_TEXT: Record<Verdict, string> = {
  success: 'Success',
  failed: 'Failed',
  backfired: 'Backfired',
  partial: 'Mixed',
  decided: 'Decided',
};

/** Animated outcome glyph: drawn stroke inside a pulsing ring. */
export function VerdictGlyph({ verdict }: { verdict: Verdict }) {
  const path =
    verdict === 'success' || verdict === 'decided'
      ? 'M14 25 l7 7 l14 -16'
      : verdict === 'partial'
        ? 'M14 25 h22'
        : verdict === 'backfired'
          ? 'M25 12 v16 M25 35 v1'
          : 'M16 16 l18 18 M34 16 l-18 18';
  return (
    <svg className="verdict-glyph" viewBox="0 0 50 50" aria-hidden>
      <circle className="vg-ring" cx="25" cy="25" r="22" />
      <circle className="vg-disc" cx="25" cy="25" r="18" />
      <path className="vg-mark" d={path} />
    </svg>
  );
}

/**
 * Play only what can be seen (design-feel 8.2): an IntersectionObserver (30% visible) and the
 * page's visibility gate the `is-playing` class; scenes.css holds every loop of a scene without it.
 */
function useScenePlaying(wanted: boolean) {
  const [el, setEl] = useState<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);
  const [shown, setShown] = useState(() => typeof document === 'undefined' || document.visibilityState !== 'hidden');
  const canObserve = typeof IntersectionObserver !== 'undefined';
  useIdle();
  useEffect(() => {
    if (!wanted || !el || !canObserve) return;
    const io = new IntersectionObserver((entries) => setVisible(entries.some((e) => e.isIntersecting && e.intersectionRatio >= 0.3)), { threshold: [0, 0.3, 0.6] });
    io.observe(el);
    return () => io.disconnect();
  }, [wanted, el, canObserve]);
  useEffect(() => {
    const on = () => setShown(document.visibilityState !== 'hidden');
    document.addEventListener('visibilitychange', on);
    return () => document.removeEventListener('visibilitychange', on);
  }, []);
  return [setEl, wanted && (canObserve ? visible : true) && shown] as const;
}

export function SceneFrame({
  kind,
  home,
  other,
  mood = 'neutral',
  figure,
  headline,
  kicker,
  sub,
  ticker,
  verdict,
  size = 'card',
  live = false,
  play,
  children,
}: Props) {
  const [frameRef, playing] = useScenePlaying(play ?? size !== 'thumb');
  const Art = SCENE_ART[kind];
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const meta = SCENE_META[kind];
  return (
    <figure
      ref={frameRef}
      className={`scene scene-${size} tone-${meta.tone} mood-${mood}${live ? ' is-live' : ''}${playing ? ' is-playing' : ''}${verdict ? ` v-${verdict}` : ''}`}
      data-kind={kind}
    >
      <div className="scene-art">
        <SceneUid.Provider value={uid}>
          <Art a={flagColors(home)} b={flagColors(other)} mood={mood} figure={figure} />
        </SceneUid.Provider>
      </div>
      <div className="scene-grade" aria-hidden />
      {size !== 'thumb' && (
        <div className="scene-bug" aria-hidden>
          <span className="dot" />
          {meta.bug}
        </div>
      )}
      {size === 'full' && (
        <div className="scene-mark" aria-hidden>
          WCN
        </div>
      )}
      {verdict && (
        <div className="scene-verdict" role="img" aria-label={VERDICT_TEXT[verdict]}>
          <VerdictGlyph verdict={verdict} />
          <span>{VERDICT_TEXT[verdict]}</span>
        </div>
      )}
      {headline && (
        <figcaption className="lower-third">
          {kicker && <span className="lt-kicker">{kicker}</span>}
          <span className="lt-head">{headline}</span>
          {sub && <span className="lt-sub">{sub}</span>}
        </figcaption>
      )}
      {ticker && ticker.length > 0 && (
        <div className="scene-ticker" aria-hidden>
          <div className="tk-label">WCN</div>
          <div className="tk-track">
            <div className="tk-run">
              {[...ticker, ...ticker].map((t, i) => (
                <span key={i}>{t}</span>
              ))}
            </div>
          </div>
        </div>
      )}
      {children}
    </figure>
  );
}
