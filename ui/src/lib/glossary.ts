/**
 * One name per concept (design-orders.md §8). UI labels import `TERMS.x.name` / `.compact`
 * instead of literals; `tests/ui-glossary.spec.ts` fails on any `banned` match in UI strings,
 * flashpoint objective labels, data-loader objective labels and docs/GAMEPLAY.md.
 * Prose mirror: devloop/instances/world-conflict/glossary.md and docs/GAMEPLAY.md.
 */
export interface Term {
  id: string;
  /** Full name, where there is room. */
  name: string;
  /** Tight spaces (HUD at tablet width, chips, grab bar). `{n}` and `{m}` are numbers. */
  compact: string;
  /** The one allowed abbreviation, if any (the ◆ diamond). */
  token?: string;
  /** Shown in the explainer when a resource label is tapped. */
  definition?: string;
  /** Strings that must not appear in player-facing UI text for this concept. */
  banned: RegExp[];
}

export const TERMS = {
  capital: {
    id: 'capital',
    name: 'Political capital',
    compact: '◆ {n} left',
    token: '◆',
    definition:
      'What your orders cost. You get +2 each month (+3 in a Flashpoint), up to ◆ 6. Unspent capital carries over.',
    // "Capital city" is the map legend's city dot, not the resource. F-04-4: the band shows what
    // is left after this month's choices; "(what orders cost)" beside it read as the bank
    banned: [/\bpolitical capital \(what orders cost\)/i, /\bpolitical credit\b/i, /^\s*credits?\s*$/i, /\bPC\b/, /\bCap\b/, /\bCAP\b/, /(?<!Political |political )\bCapital\b(?! city)/],
  },
  orders: {
    id: 'orders',
    name: 'Orders this month',
    compact: 'Orders {n} of 6',
    definition: 'You can give up to 6 orders a month, one of each kind per country.',
    banned: [/\bOrders\s+\d+\s*\/\s*\d+/, /^\s*Orders\s*$/],
  },
  meetings: {
    id: 'meetings',
    name: 'Meetings',
    compact: 'Meetings {n} of 3',
    definition: 'You take up to 3 meetings a month yourself. Your ministers take the rest with the usual answer.',
    // design-agenda 0.4 and 0.12 (WP-A6): the agenda's plain words replace the iteration 3 ones
    banned: [/\bin person\b/i, /\b\d\s*\/\s*3\b/, /\bdeput(y|ies)\b/i, /\bhandled\b/i, /\bneeds you\b/i, /\broutine meetings?\b/i, /\bproposed orders?\b/i],
  },
  defense: {
    id: 'defense',
    name: 'Defense budget',
    compact: '{n}% defense',
    definition: "Military orders use a share of this month's defense budget.",
    banned: [/\bdef\b/i, /^\s*Defense\s*$/],
  },
  score: {
    id: 'score',
    name: 'Score',
    compact: 'Score',
    definition:
      'Your standing out of 200: approval, stability, economy and security, moving 15% a month toward how things really are.',
    banned: [/\bLeadership score\b/i, /\bLeader score\b/i],
  },
  approval: {
    id: 'approval',
    name: 'Approval',
    compact: 'Approval',
    definition: 'How much your public backs you. Low approval loses elections and fills the streets.',
    banned: [/\bAPPR\b/, /\bAppr\b/],
  },
  stability: {
    id: 'stability',
    name: 'Stability',
    compact: 'Stability',
    definition: 'How firmly the state holds together. Low stability invites unrest, coups and collapse.',
    banned: [/\bSTAB\b/, /\bStab\b/],
  },
  legitimacy: {
    id: 'legitimacy',
    name: 'Legitimacy',
    compact: 'Legitimacy',
    definition: 'Whether people accept your right to rule. It cushions bad months.',
    banned: [/\bLEGIT\b/, /\bLegit\b/],
  },
  economy: {
    id: 'economy',
    name: 'Economy',
    compact: 'Economy',
    definition: 'Real growth over the last months, annualised.',
    banned: [/^\s*GDP\s*$/],
  },
  tension: {
    id: 'tension',
    name: 'World tension',
    compact: 'World tension',
    definition: 'How close the world feels to a wider war. Wars, strikes and threats raise it; it eases over time.',
    banned: [/\bTENS\b/, /\bTens\b/],
  },
  staffPick: {
    id: 'staffPick',
    // D-71/D-72: the panel chose "Recommended"; each one names its adviser ("Recommended by Foreign Minister")
    name: 'Recommended by {role}',
    compact: 'Recommended',
    definition: 'What one of your advisers recommends. Choose it, or choose another answer yourself.',
    // QA3-S3-2: the crisis tag and button said "Cabinet pick" / "Accept cabinet pick"
    banned: [/^\s*Suggested\s*$/, /\bStaff suggests\b/i, /^\s*Staff\s*$/, /\bstaff picks?\b/i, /\bcabinet(?:'s)? picks?\b/i],
  },
  recommended: {
    id: 'recommended',
    name: 'Recommended',
    compact: 'Recommended ({n})',
    // The line under the group (RS-005, D-72 wording; D-73: one verb, Choose). N-2 (design-rereview-your-call.md):
    // a crisis not in the list (a call left open) does not go ahead on the Recommended tag
    definition: 'Your advisers recommend these for this month. A recommended order runs only if you choose it; a crisis or meeting listed here goes ahead on its recommended or usual answer unless you change it, one not listed is yours to answer.',
    banned: [],
  },
  reviewRecommended: {
    id: 'reviewRecommended',
    // The bar form of the Plan and Map mode (D-72 D4): opens the list, chooses nothing
    name: 'Review {n} recommended',
    compact: 'Review {n}',
    banned: [],
  },
  yourCall: {
    id: 'yourCall',
    // D-84 (R11): a thing Choose all never decides; two advisers recommend different answers by name
    name: 'Your call',
    compact: 'Your call',
    definition: 'A decision that is yours: a crisis your advisers disagree on, or the move for your mission. Choose all recommended never decides it: you choose a card, or skip and the card says what leaving it does.',
    banned: [],
  },
  choose: {
    id: 'choose',
    // The one per-item verb (D-72 D8, D-73): on every answer card, the recommended one included
    name: 'Choose',
    compact: 'Choose',
    banned: [],
  },
  proposed: {
    id: 'proposed',
    name: 'Proposed by staff',
    compact: 'Proposed',
    definition: 'An order your advisers recommend. It spends no political capital until you choose it, and it does not run unless you do.',
    banned: [/\bpre-?queued\b/i],
  },
  approveAll: {
    id: 'approveAll',
    // D-73: with the agenda's per-item Choose, the bulk button is "Choose all recommended"; the count in brackets
    name: 'Choose all recommended ({n})',
    compact: 'Choose all ({n})',
    // The line under the button: it defines itself as choosing (design-agenda 0.12)
    definition: 'Chooses the recommended answer for every routine thing still to do.',
    // QA3-S3-2 and D-73: one verb, Choose. No Approve, and no Accept for a recommendation
    banned: [
      /\bAccept (all|order|answer|meeting|deputy|recommended|recommendations?)\b/i,
      /\bAccepted: /,
      /\bif accepted\b/i,
      /\b(until|for) you (to )?accept\b/i,
      /^\s*Approve\s+\d*\s*$/,
      /\bApprove all\b/i,
      /\bApprove \d+ (staff )?picks?\b/i,
      /\bApprove\b/,
      /\bif approved\b/i,
      /\bOn Approve\b/i,
      /\bto approve\b/i,
      /\bwaits? for your approval\b/i,
    ],
  },
  orderIdeas: {
    id: 'orderIdeas',
    // QA3-S3-2: the advisers' order ideas are not the Recommended group (they hold no count of
    // their own next to "Review n recommended"); the proposals among them are counted as recommended
    name: 'Orders to consider',
    compact: 'Orders to consider ({n})',
    definition: 'Orders your advisers think fit this month, with a line on why. Add any of them yourself; the ones marked Recommended are also in the Recommended list.',
    banned: [/\badvis[eo]rs suggest\b/i, /\badvis[eo]rs'? suggestions\b/i],
  },
  inThisMonth: {
    id: 'inThisMonth',
    name: 'In this month',
    compact: 'In this month',
    // Player-facing words for an order in the tray (a crisis may still land "on your desk")
    banned: [/\bqueued\b/i, /\bAlready on your desk\b/, /\bon your desk this month\b/i],
  },
  chance: {
    id: 'chance',
    name: '{n}% chance',
    compact: '{n}%',
    banned: [/\bsuccess (rate|odds)\b/i, /^\s*odds\s*$/i],
  },
  noUndo: {
    id: 'noUndo',
    name: 'No undo',
    compact: 'No undo',
    banned: [],
  },
  chiefCalls: {
    id: 'chiefCalls',
    // D-84: the opt-in setting that restores the full one-press Accept all
    name: 'Let the Chief of Staff make my calls',
    compact: 'Chief of Staff makes my calls',
    // RC-4 (design-review-your-call.md), on the month screen with its Your call cards (D-85 item 5)
    definition: "Off: Choose all recommended decides the routine things only; your calls (a crisis your advisers disagree on, the move for your mission) start with no answer and wait for you. On: each call starts on the Chief of Staff's answer (the one that serves your mission, or the calm one when political capital is short) and Choose all recommended chooses it too. A crisis call you have not answered follows the setting at once; the order for your mission from the next month.",
    banned: [],
  },
} as const satisfies Record<string, Term>;

export type TermId = keyof typeof TERMS;

/**
 * The family word on every order card's chip (design-order-cards.md section 4): one word per
 * order family, shown with the family colour and the pictogram, never colour alone.
 */
export const ORDER_FAMILY_WORDS = {
  diplo: 'Diplomacy',
  mil: 'Military',
  nuke: 'Nuclear',
  intel: 'Covert',
  econ: 'Economy',
  home: 'Home',
} as const;

/** Fill `{n}` / `{m}` in a term's name or compact form. */
export function term(text: string, n?: number | string, m?: number | string): string {
  return text.split('{n}').join(String(n ?? '')).split('{m}').join(String(m ?? ''));
}

/**
 * The state band's capital label (F-04-4): the number beside it is what is left after this
 * month's choices (budget.ts `left`, the plan's "◆ n left"), so the label says so.
 */
export const CAPITAL_LEFT = `${TERMS.capital.name} left`;
