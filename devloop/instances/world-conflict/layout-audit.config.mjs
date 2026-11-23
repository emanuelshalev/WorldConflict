// World Conflict layout audit config (kit: devloop/kit/layout-audit.mjs, method:
// devloop/method/layout-audit.md, finding RS-008, decisions D-80, D-81). Regions are the five of
// design-layout.md L-1 on their real selectors (section 10): State, the month Bar, the List, the
// Thing and the Plan; `summary` is the visible, counted stand-in a small screen shows instead
// ("See all 7", the phone's thing line). The CEO plays at 3440x1440, 100% zoom (RS-008): listed and
// reported first, labelled "CEO".
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
    // L-5: the state band, dedicated and always visible
    { id: 'state', selector: '[data-region="state"]' },
    { id: 'bar', selector: '[data-region="bar"]' },
    // The current thing (desk, map card, phone page)
    { id: 'item', selector: '[data-region="item"]' },
    // The Plan in its form (rail, float, bar; the phone's bottom bar)
    { id: 'plan', selector: '[data-region="plan"]' },
    // The month's things: a column from 1600 wide, else behind "See all n"
    { id: 'list', selector: '[data-region="list"]', summary: '.month-bar .see-all, .ph-thingline .see-all' },
    // Execute (phones: only on the review screen and in Map mode, so it is not listed there)
    { id: 'execute', selector: '.execute-btn' },
  ],
  // Every region box counts as content; in Map mode the map fills the area (design-layout AC-L3)
  content: ['[data-region]', '.mode-map .map-stage .map-container'],
  // The news ticker is a marquee (its track overflows by design); the map canvas is not a control;
  // the phone's below-the-fold cue sits in the sticky bottom bar on purpose
  ignore: ['.ticker', '.maplibregl-canvas-container', '.maplibregl-control-container', '.ph-bottom .below'],
  // Section 7: the only regions allowed to scroll, each signalled
  exempt: ['[data-scroll="reading"]'],
  rules: [
    { id: 'no-inner-scroll', check: 'inner-scroll', when: { minWidth: 1024, minHeight: 768 } },
    { id: 'no-page-scroll', check: 'page-scroll', when: { minWidth: 1024, minHeight: 768 } },
    { id: 'no-hidden-items', check: 'below-fold', when: { minWidth: 1024, minHeight: 768 } },
    { id: 'use-the-width', check: 'used-width', when: { minWidth: 1920 }, min: 0.85 },
    { id: 'collapsed-not-hidden', check: 'collapsed-not-hidden', when: { widths: [390, 1024] }, regions: ['list'] },
    { id: 'state-visible', check: 'collapsed-not-hidden', regions: ['state', 'bar', 'item', 'plan', 'execute'], when: { minWidth: 1024 } },
    { id: 'not-covered', check: 'occluded', when: { minWidth: 701 } },
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
    { id: 'no-inner-scroll', check: 'inner-scroll', when: { minWidth: 1024, minHeight: 768 } },
    { id: 'no-hidden-items', check: 'below-fold', when: { minWidth: 1024, minHeight: 768 } },
    { id: 'collapsed-not-hidden', check: 'collapsed-not-hidden', when: { widths: [390, 1024] } },
    { id: 'result-visible', check: 'collapsed-not-hidden', when: { minWidth: 1024 } },
  ],
};

export default { viewports: VIEWPORTS, game, result };
