/**
 * Zoom to fit for the globes (design-worldmap.md 3.1). The globe's diameter is measured, not
 * guessed: project the two limb points [center.lng +- 90, 0] (always 90 degrees from the centre,
 * so they sit on the visible rim whatever the latitude) and take their distance. That calibrates
 * itself against MapLibre's globe scale, so there is no magic zoom constant.
 */
import { useEffect, useMemo, useRef } from 'react';
import type maplibregl from 'maplibre-gl';

export interface Insets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export type FitKind = 'title' | 'title-phone' | 'game';

/** Phone layout threshold shared with title.css (max-width: 900px). */
export const PHONE_MAX = 900;

/** The title globe band on phones: top offset (under the brand and mode dial) and height. */
export const PHONE_BAND_TOP = 160;
export const phoneBandHeight = (width: number) => width + 8;

/**
 * Insets of the title screen: what permanently covers the globe.
 * Desktop: copy column on the left (only from 1280 wide; narrower, it overlays the globe edge),
 * the header on top, the dossier on the right. Phone: the globe has its own band.
 */
export function titleInsets(width: number, height: number, dossier: number): Insets {
  if (width <= PHONE_MAX) {
    const band = phoneBandHeight(width);
    return { top: PHONE_BAND_TOP, right: 0, bottom: Math.max(0, height - PHONE_BAND_TOP - band), left: 0 };
  }
  return { top: 112, right: dossier > 0 ? dossier + 12 : 0, bottom: 20, left: width >= 1280 ? 230 : 0 };
}

/**
 * Insets of the in-game map (3.1): the canvas runs under the glass HUD and the command strip, so
 * the free box is measured from the page: top = the goal line's (or HUD's) bottom, bottom = the command strip and
 * ticker (when they cover the canvas), right = an open drawer or dossier. `el` is the map container.
 */
export function gameInsets(el: HTMLElement): Insets {
  const c = el.getBoundingClientRect();
  const out: Insets = { top: 0, right: 0, bottom: 0, left: 0 };
  const over = (r: DOMRect) => r.width > 0 && r.height > 0 && r.left < c.right && r.right > c.left && r.top < c.bottom && r.bottom > c.top;
  // The HUD and the goal line under it both cover the top of the canvas (QA AC3: the disc's top
  // was drawn under the goal line)
  for (const sel of ['.hud', '.goal-line']) {
    const r = document.querySelector(sel)?.getBoundingClientRect();
    if (r && over(r) && r.top < c.top + c.height / 2) out.top = Math.max(out.top, r.bottom - c.top);
  }
  for (const sel of ['.cmd-strip', '.ticker']) {
    const r = document.querySelector(sel)?.getBoundingClientRect();
    if (r && over(r) && r.top > c.top + c.height / 2) out.bottom = Math.max(out.bottom, c.bottom - r.top);
  }
  for (const sel of ['.drawer', '.dossier']) {
    const r = document.querySelector(sel)?.getBoundingClientRect();
    if (r && over(r) && r.left > c.left + c.width / 3 && r.height > c.height / 3) out.right = Math.max(out.right, c.right - r.left);
  }
  return out;
}

export interface FreeBox extends Insets {
  width: number;
  height: number;
  /** Target globe diameter in px. */
  diameter: number;
  /** Centre of the free box in container px. */
  cx: number;
  cy: number;
}

/** The free box and its target diameter: D = min(freeW x 0.98, freeH x 1.02). */
export function freeBox(width: number, height: number, insets: Insets): FreeBox {
  const w = Math.max(1, width - insets.left - insets.right);
  const h = Math.max(1, height - insets.top - insets.bottom);
  return {
    ...insets,
    width: w,
    height: h,
    diameter: Math.min(w * 0.98, h * 1.02),
    cx: insets.left + w / 2,
    cy: insets.top + h / 2,
  };
}

/** The globe's on-screen diameter in px at the current camera. */
export function measureDiameter(map: maplibregl.Map): number {
  const c = map.getCenter();
  const a = map.project([c.lng - 90, 0]);
  const b = map.project([c.lng + 90, 0]);
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/** The zoom at which the globe's diameter equals `diameter` (log2: diameter doubles per zoom). */
export function zoomForDiameter(currentZoom: number, measured: number, diameter: number, min = 0, max = 22): number {
  if (!(measured > 0) || !(diameter > 0)) return currentZoom;
  return Math.min(max, Math.max(min, currentZoom + Math.log2(diameter / measured)));
}

/**
 * Jump to the zoom that fits `box`, centred in it (padding). Three passes: MapLibre's globe scale
 * depends a little on zoom, latitude and padding; the later passes remove the remainder.
 */
export function fitGlobe(map: maplibregl.Map, box: FreeBox): number {
  map.setPadding({ top: box.top, right: box.right, bottom: box.bottom, left: box.left });
  let z = map.getZoom();
  for (let i = 0; i < 3; i++) {
    z = zoomForDiameter(map.getZoom(), measureDiameter(map), box.diameter, map.getMinZoom(), map.getMaxZoom());
    map.jumpTo({ zoom: z });
  }
  return z;
}

export interface GlobeFitState {
  /** The current fit zoom (NaN until the first fit). */
  fit: number;
  /** The latitude of the centre when the fit was measured (the fit zoom depends on it). */
  fitLat: number;
  /** The target diameter of the last fit, px. */
  diameter: number;
  /** True once the player zoomed by hand: a resize then keeps their offset from the fit. */
  userZoomed: boolean;
}

export interface GlobeFitHandle {
  /** The current fit zoom (NaN until the first fit). */
  fit: () => number;
  /** After a framed pick or "Whole world": resizes re-fit again instead of keeping a hand zoom. */
  resetUserZoom: () => void;
  /**
   * The fit zoom for a camera centred at `lat`. MapLibre's globe draws a bigger disc at the same
   * zoom further from the equator (it keeps the scale of the centre latitude), so the fit zoom
   * depends on where the camera looks. Measured, not modelled: the camera jumps there and back
   * inside one task (no frame is drawn in between).
   */
  fitAt: (lat: number) => number;
}

/** The zoom at which the globe centred at (lng, lat) has `diameter` px; the camera is restored. */
export function zoomForDiameterAt(map: maplibregl.Map, lng: number, lat: number, diameter: number, start: number): number {
  const saved = { center: map.getCenter(), zoom: map.getZoom() };
  let z = start;
  for (let i = 0; i < 3; i++) {
    map.jumpTo({ center: [lng, lat], zoom: z });
    z = zoomForDiameter(z, measureDiameter(map), diameter, map.getMinZoom(), map.getMaxZoom());
  }
  map.jumpTo(saved);
  return z;
}

/**
 * Fit on load, re-fit on resize (ResizeObserver, debounced 120 ms). If the player zoomed by hand,
 * a resize keeps their offset: z = newFit + (z - oldFit). `onFit` runs after every fit.
 */
export function useGlobeFit(
  map: maplibregl.Map | null,
  container: HTMLElement | null,
  getInsets: (width: number, height: number) => Insets,
  onFit?: (fit: number, state: GlobeFitState) => void,
): GlobeFitHandle {
  const state = useRef<GlobeFitState>({ fit: Number.NaN, fitLat: 0, diameter: 0, userZoomed: false });
  const mapRef = useRef(map);
  useEffect(() => {
    mapRef.current = map;
  });
  const insetsRef = useRef(getInsets);
  const onFitRef = useRef(onFit);
  useEffect(() => {
    insetsRef.current = getInsets;
    onFitRef.current = onFit;
  });

  useEffect(() => {
    if (!map || !container) return;
    const s = state.current;
    const run = () => {
      const { width, height } = container.getBoundingClientRect();
      if (width < 2 || height < 2) return;
      // Make sure MapLibre's transform has the new canvas size before measuring (its own resize
      // handling may run after this observer)
      map.resize();
      const box = freeBox(width, height, insetsRef.current(width, height));
      const before = map.getZoom();
      const oldFit = s.fit;
      const fit = fitGlobe(map, box);
      s.fit = fit;
      s.fitLat = map.getCenter().lat;
      s.diameter = box.diameter;
      if (s.userZoomed && Number.isFinite(oldFit)) {
        map.jumpTo({ zoom: Math.min(map.getMaxZoom(), Math.max(map.getMinZoom(), fit + (before - oldFit))) });
      }
      onFitRef.current?.(fit, s);
    };
    const onZoom = (e: { originalEvent?: unknown }) => {
      if (e.originalEvent) s.userZoomed = true;
    };
    map.on('zoomstart', onZoom);
    run();
    let t: ReturnType<typeof setTimeout> | undefined;
    const ro = new ResizeObserver(() => {
      clearTimeout(t);
      t = setTimeout(run, 120);
    });
    ro.observe(container);
    return () => {
      clearTimeout(t);
      ro.disconnect();
      map.off('zoomstart', onZoom);
    };
  }, [map, container]);

  return useMemo(
    () => ({
      fit: () => state.current.fit,
      resetUserZoom: () => {
        state.current.userZoomed = false;
      },
      fitAt: (lat: number) => {
        const s = state.current;
        const m = mapRef.current;
        if (!m || !Number.isFinite(s.fit) || !(s.diameter > 0) || Math.abs(lat - s.fitLat) < 0.5) return s.fit;
        return zoomForDiameterAt(m, m.getCenter().lng, lat, s.diameter, s.fit);
      },
    }),
    [],
  );
}
