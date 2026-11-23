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
    // "Capital city" is the map legend's city dot, not the resource
    banned: [/\bpolitical credit\b/i, /^\s*credits?\s*$/i, /\bPC\b/, /\bCap\b/, /\bCAP\b/, /(?<!Political |political )\bCapital\b(?! city)/],
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
    definition: 'You attend up to 3 meetings a month. A deputy handles the rest with the default answer.',
    banned: [/\bin person\b/i, /\b\d\s*\/\s*3\b/],
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
    definition: 'What one of your advisers recommends. Accept it or choose yourself.',
    // QA3-S3-2: the crisis tag and button said "Cabinet pick" / "Accept cabinet pick"
    banned: [/^\s*Suggested\s*$/, /\bStaff suggests\b/i, /^\s*Staff\s*$/, /\bstaff picks?\b/i, /\bcabinet(?:'s)? picks?\b/i],
  },
  recommended: {
    id: 'recommended',
    name: 'Recommended',
    compact: 'Recommended ({n})',
    // The first-use line next to every Accept control (RS-005, D-72 wording)
    definition: 'Your advisers recommend these for this month. Orders and meetings wait for you to accept; a crisis goes ahead on its recommended answer unless you change it.',
    banned: [],
  },
  proposed: {
    id: 'proposed',
    name: 'Proposed by staff',
    compact: 'Proposed',
    definition: 'An order your advisers recommend. It spends no political capital until you accept it, and it does not run unless you do.',
    banned: [/\bpre-?queued\b/i],
  },
  approveAll: {
    id: 'approveAll',
    // One verb, Accept (D-72); the count in brackets
    name: 'Accept all recommended ({n})',
    compact: 'Accept all ({n})',
    // QA3-S3-2: one verb (D-73), so no "if approved", "On Approve" or "to approve" next to Accept
    banned: [
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
  yourCall: {
    id: 'yourCall',
    // D-84 R11: the month's one or two decisions Accept all leaves to the player
    name: 'Your call',
    compact: 'Your call',
    definition: 'A decision your advisers disagree on, or the move for your mission. Accept all recommended never decides it: you choose a card, or skip and the cost is named.',
    banned: [],
  },
  chiefCalls: {
    id: 'chiefCalls',
    // D-84: the opt-in setting that restores the full one-press Accept all
    name: 'Let the Chief of Staff make my calls',
    compact: 'Chief of Staff makes my calls',
    definition: 'Off by default. When on, Accept all recommended also decides each Your call: the Chief of Staff takes the card that serves your mission (the calm one when political capital is short) and the first move for your mission.',
    banned: [],
  },
} as const satisfies Record<string, Term>;

export type TermId = keyof typeof TERMS;

/** Fill `{n}` / `{m}` in a term's name or compact form. */
export function term(text: string, n?: number | string, m?: number | string): string {
  return text.split('{n}').join(String(n ?? '')).split('{m}').join(String(m ?? ''));
}
