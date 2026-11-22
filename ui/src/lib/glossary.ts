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
    name: 'Staff pick',
    compact: 'Staff pick',
    definition: 'What your staff would do. Approve it or choose yourself.',
    banned: [/^\s*Suggested\s*$/, /\bStaff suggests\b/i, /^\s*Staff\s*$/],
  },
  approveAll: {
    id: 'approveAll',
    name: 'Approve {n} staff picks',
    compact: 'Approve {n} picks',
    banned: [/^\s*Approve\s+\d*\s*$/],
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
} as const satisfies Record<string, Term>;

export type TermId = keyof typeof TERMS;

/** Fill `{n}` / `{m}` in a term's name or compact form. */
export function term(text: string, n?: number | string, m?: number | string): string {
  return text.split('{n}').join(String(n ?? '')).split('{m}').join(String(m ?? ''));
}
