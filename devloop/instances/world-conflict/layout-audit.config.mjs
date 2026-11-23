// World Conflict layout audit config (kit: devloop/kit/layout-audit.mjs, method:
// devloop/method/layout-audit.md, finding RS-008, decision D-80). Regions are what the player must
// see or act on each month; `summary` is the visible, counted stand-in a small screen may show instead.
// The CEO plays at 3440x1440, 100% zoom (RS-008): listed and reported first, labelled "CEO".
export const VIEWPORTS = [
  { width: 3440, height: 1440, label: 'CEO' },
  { width: 390, height: 844 },
  { width: 1024, height: 768 },
  { width: 1366, height: 768 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
  { width: 2560, height: 1440 },
  { width: 3840, height: 2160 },
];

/** The game screen: Desk mode and Map mode. */
export const game = {
  regions: [
    // State: the numbers that run the month (RS-008 rule 3: a dedicated, always-visible place)
    { id: 'state', selector: '.hud-stats' },
    { id: 'capital', selector: '.hud .stat.capital, .rail .seal-bank, .cmd-strip .seals', summary: '.bar-plan, .cmd-strip .seals' },
    { id: 'mission', selector: '.goal-line' },
    // The month's items: the crisis answers and the recommended picks
    { id: 'your-move', selector: '.move-card, .stage.is-primary', summary: '.stage.is-primary .stage-text, .cmd-strip .strip-note' },
    { id: 'recommended', selector: '[data-staff-picks] .sp-item, .advisors .adv-row', summary: '.sp-main, .bar-plan, .rail .readiness' },
    // Actions
    { id: 'execute', selector: '.execute-btn, .cmd-strip .strip-act .wc-btn.primary' },
  ],
  // The goal banner stretches with its text, so it does not count as using the width
  content: ['.desk-stage > *:not(.mission-line)', '.rail', 'nav.navigator', '.desk-detail', '.cmd-bar', '.cmd-strip', '.map-stage .map-container'],
  // The news ticker is a marquee (its track overflows by design); the map canvas is not a control
  ignore: ['.ticker', '.maplibregl-canvas-container', '.maplibregl-control-container'],
  exempt: [],
  rules: [
    { id: 'no-inner-scroll', check: 'inner-scroll', when: { minWidth: 1366, minHeight: 768 } },
    { id: 'no-page-scroll', check: 'page-scroll', when: { minWidth: 1366, minHeight: 768 } },
    { id: 'no-hidden-items', check: 'below-fold', when: { minWidth: 1366, minHeight: 768 } },
    { id: 'use-the-width', check: 'used-width', when: { minWidth: 1920 }, min: 0.85 },
    { id: 'collapsed-not-hidden', check: 'collapsed-not-hidden', when: { widths: [390, 1024] } },
    { id: 'state-visible', check: 'collapsed-not-hidden', regions: ['state', 'capital', 'execute'], when: { minWidth: 1366 } },
    { id: 'not-covered', check: 'occluded', when: { minWidth: 1366 } },
  ],
};

/** The result card after Execute (a dialog over the desk). */
export const result = {
  root: '.result-overlay',
  regions: [
    { id: 'result', selector: '.result-card .rc-sentence' },
    { id: 'next', selector: '.result-card .rc-next' },
  ],
  content: ['.result-card'],
  ignore: ['.ticker'],
  exempt: [],
  rules: [
    { id: 'no-inner-scroll', check: 'inner-scroll', when: { minWidth: 1366, minHeight: 768 } },
    { id: 'no-hidden-items', check: 'below-fold', when: { minWidth: 1366, minHeight: 768 } },
    { id: 'collapsed-not-hidden', check: 'collapsed-not-hidden', when: { widths: [390, 1024] } },
    { id: 'result-visible', check: 'collapsed-not-hidden', when: { minWidth: 1366 } },
  ],
};

export default { viewports: VIEWPORTS, game, result };
