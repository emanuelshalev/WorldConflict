/**
 * Reactions: how the other side answers what the player did, told in one line, plus the headline
 * of each outcome and what to watch next. The tone is chosen from the measured change (a warmer
 * line can only come with a warmer relationship), then a variant is picked by a hash of the seed,
 * turn and item, never from the turn's random stream, so balance and determinism are untouched.
 */
import type { OrderFact } from "./outcomes.js";
import { possessive } from "./text.js";
import type { CountryState, WorldState } from "./types.js";

export type Tone = "warm" | "cold" | "angry" | "neutral";
export interface Reaction {
  who: string;
  line: string;
  tone: Tone;
}

/** Stable small hash of any parts (FNV-1a). */
export function hashParts(...parts: Array<string | number>): number {
  let h = 2166136261;
  for (const ch of parts.join("|")) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
const pick = <T>(list: T[], seed: number): T => list[seed % list.length];

export function toneOf(delta: number): Tone {
  if (delta >= 1) return "warm";
  if (delta <= -6) return "angry";
  if (delta <= -1) return "cold";
  return "neutral";
}

export type Band = "war" | "hostile" | "cool" | "friendly";
export function bandOf(player: CountryState, other: CountryState | undefined): Band {
  if (!other) return "cool";
  if (player.atWarWith.includes(other.id)) return "war";
  const r = other.relations[player.id] ?? 0;
  if (player.alliances.includes(other.id) || r > 30) return "friendly";
  if (r < -20) return "hostile";
  return "cool";
}

const surnameOf = (name: string) =>
  name
    .split(" ")
    .filter((p) => !/^(jr\.?|sr\.?|ii|iii|iv)$/i.test(p))
    .at(-1) ?? name;

// ----------------------------------------------------------------------------
// Lines, by kind and tone. {L} = their leader's surname, {C} = their country, {Y} = your country.
// ----------------------------------------------------------------------------

const CALL: Record<Tone, string[]> = {
  warm: [
    "We heard you. Let us keep this line open and see what our people can agree next week.",
    "That was a better conversation than either of us expected. My ministers will follow up.",
    "Good. Words like these travel fast in {C}. Do not make me regret them.",
    "I will tell my cabinet {Y} is serious. That counts for something here.",
  ],
  cold: [
    "We have noted your position. It changes nothing on our side.",
    "A short call. Next time, send someone who can make an offer.",
    "{C} expected more from {Y}. We will remember this conversation.",
  ],
  angry: [
    "Then there is nothing more to say. {C} will draw its own conclusions.",
    "You hung up on {C}. Our answer will not come by telephone.",
    "My generals will be pleased: they told me this call was a waste of time.",
  ],
  neutral: [
    "Understood. Our ambassadors will take it from here.",
    "We talked. Neither of us moved. Perhaps that is the most we can do this month.",
  ],
};

const VISIT: Record<Tone, string[]> = {
  warm: [
    "A memorable visit. {C} leaves with more friends in {Y} than it arrived with.",
    "The honour guard, the dinner, the joint statement: our press is calling it a new chapter.",
    "We came for one agreement and left with three ideas. Thank you.",
  ],
  cold: [
    "A short meeting, a shorter statement. {C} had hoped for more.",
    "Our delegation flew home early. The communique says 'frank exchanges'.",
  ],
  angry: ["{C} will not forget how its leader was received in {Y}."],
  neutral: ["Polite, correct, forgettable. The photographs were good."],
};

const PRESS: Record<Tone, string[]> = {
  warm: [
    "The anchor's verdict: 'Assured, on top of the brief. A good night for the government.'",
    "Viewers' panel: two thirds say they trust the government more after tonight.",
  ],
  cold: [
    "The anchor's verdict: 'Evasive. The questions will not go away.'",
    "The clip everyone shares tonight is the one the press office wanted to cut.",
  ],
  angry: ["Opposition benches call it 'the worst interview of this government'."],
  neutral: ["The anchor's verdict: 'No mistakes, no news.'"],
};

const STAFF: Record<Tone, string[]> = {
  warm: [
    "Your staff move at once. 'Clear orders. That is all we needed.'",
    "The cabinet leaves the room with a plan and a deadline.",
  ],
  cold: ["Your staff carry it out, but the grumbling reaches the press by evening."],
  angry: ["Two ministers threaten to resign over the decision."],
  neutral: ["Noted and filed. The machinery of government turns."],
};

/** Crisis voices, by the dominant measured effect. */
const VOICE: Record<string, { who: (ctx: LineCtx) => string; lines: Record<Tone, string[]> }> = {
  approval: {
    who: () => "On the street",
    lines: {
      warm: [
        "'Finally, someone in charge who listens.'",
        "'I did not vote for them, but this was the right call.'",
      ],
      cold: ["'They promised us more than this.'", "'Another decision made for someone else.'"],
      angry: ["'Shame on them. We will remember at the ballot box.'"],
      neutral: ["'We will see. Words are cheap.'"],
    },
  },
  stability: {
    who: () => "Interior ministry",
    lines: {
      warm: ["'The streets are calmer tonight than they have been in weeks.'"],
      cold: ["'Expect more protests. We are stretched.'"],
      angry: ["'We are losing control of several districts.'"],
      neutral: ["'Order holds, for now.'"],
    },
  },
  legitimacy: {
    who: () => "The establishment",
    lines: {
      warm: ["Editorials across the spectrum call it statesmanlike."],
      cold: ["The constitutional court asks pointed questions."],
      angry: ["Senior figures openly question the government's authority."],
      neutral: ["The elites wait to see how it plays out."],
    },
  },
  economy: {
    who: () => "Markets",
    lines: {
      warm: ["Bonds rally and the currency firms. Traders like what they see."],
      cold: ["Analysts trim growth forecasts. 'A costly choice.'"],
      angry: ["The currency slides and rating agencies warn of a downgrade."],
      neutral: ["Markets shrug. Nothing priced in, nothing priced out."],
    },
  },
  mobilization: {
    who: () => "The general staff",
    lines: {
      warm: ["'Units are moving. We will be ready.'"],
      cold: ["'Standing down sends a message. I hope it is the right one.'"],
      angry: ["'You are tying our hands.'"],
      neutral: ["'Orders received.'"],
    },
  },
  zone: {
    who: () => "UN humanitarian coordinator",
    lines: {
      warm: ["'Today more trucks got through. It matters, and it is not enough.'"],
      cold: ["'Every closed crossing costs lives. We have said it before.'"],
      angry: ["'This decision will be measured in graves.'"],
      neutral: ["'We are monitoring the situation.'"],
    },
  },
  tension: {
    who: () => "UN Secretary-General",
    lines: {
      warm: ["'A welcome step back from the brink.'"],
      cold: ["'I urge all parties to show restraint.'"],
      angry: ["'The world is closer to catastrophe tonight.'"],
      neutral: ["'The Secretary-General is following events closely.'"],
    },
  },
};

const ORDER: Record<Tone, string[]> = {
  warm: [
    "{C} welcomes the move. 'A gesture we will answer in kind.'",
    "In {C}, the foreign ministry calls it 'a constructive signal'.",
  ],
  cold: [
    "{C} summons {possY} ambassador. 'We will not forget this.'",
    "{C} calls it 'a provocation' and recalls its envoy for consultations.",
  ],
  angry: [
    "{C} vows a response 'at a time of our choosing'.",
    "Crowds gather outside the embassy of {Y} in {C}.",
  ],
  neutral: ["{C} says nothing in public. Its silence is being read closely."],
};

interface LineCtx {
  them?: CountryState;
  player: CountryState;
}

function fill(line: string, ctx: LineCtx): string {
  return line
    .replaceAll("{L}", ctx.them ? surnameOf(ctx.them.leader.name) : "")
    .replaceAll("{C}", ctx.them?.name ?? "")
    .replaceAll("{possY}", possessive(ctx.player.name))
    .replaceAll("{Y}", ctx.player.name);
}

// ----------------------------------------------------------------------------
// Public helpers
// ----------------------------------------------------------------------------

/** The counterpart's answer to a meeting. */
export function meetingReaction(
  kind: "CALL" | "VISIT" | "STAFF" | "PRESS",
  ctx: LineCtx & { speaker: string },
  delta: number,
  seed: number,
): Reaction {
  const tone = toneOf(delta);
  const table =
    kind === "CALL" ? CALL : kind === "VISIT" ? VISIT : kind === "PRESS" ? PRESS : STAFF;
  const who =
    kind === "PRESS"
      ? "The evening news"
      : ctx.them
        ? `${ctx.them.leader.title} ${ctx.them.leader.name}`
        : ctx.speaker;
  return { who, line: fill(pick(table[tone], seed), ctx), tone };
}

/** Which effect dominates a crisis answer, for its voice and its headline. */
export function dominantEffect(effects: Record<string, number>): string {
  let best = "";
  let size = 0;
  for (const [k, v] of Object.entries(effects)) {
    const w =
      k === "gdp" || k === "growth"
        ? Math.abs(v) * 6
        : k.startsWith("relations")
          ? Math.abs(v) / 1.5
          : Math.abs(v);
    if (w > size && k !== "pc") {
      best = k;
      size = w;
    }
  }
  return best;
}

/** A voice answers a crisis decision: the affected leader, the street, the markets, the UN. */
export function crisisReaction(
  effects: Record<string, number>,
  ctx: LineCtx,
  facts: OrderFact[],
  seed: number,
): Reaction | undefined {
  const key = dominantEffect(effects);
  if (!key) return undefined;
  const measured = (label: RegExp) => {
    const f = facts.find((x) => label.test(x.label));
    return f ? (f.after - f.before) * (f.good === false ? -1 : 1) : undefined;
  };
  if (key.startsWith("relations:") && ctx.them) {
    const d = measured(/view of you/) ?? effects[key];
    const tone = toneOf(d);
    return {
      who: `${ctx.them.leader.title} ${ctx.them.leader.name}`,
      line: fill(pick(ORDER[tone], seed), ctx),
      tone,
    };
  }
  const voiceKey =
    key === "gdp" || key === "growth"
      ? "economy"
      : key.startsWith("hot:")
        ? "zone"
        : key === "approval" ||
            key === "stability" ||
            key === "legitimacy" ||
            key === "mobilization"
          ? key
          : key === "relationsAllies" || key === "relationsRivals"
            ? "legitimacy"
            : "approval";
  const v = VOICE[voiceKey];
  // Good for the player = warm; for a zone, less violence, hunger or occupation is the warm side
  const raw = effects[key] ?? 0;
  const scaled = key === "gdp" || key === "growth" ? raw * 6 : raw;
  const good =
    key.startsWith("hot:") && /violence|humanitarian|control/.test(key) ? -scaled : scaled;
  const tone = toneOf(good);
  return { who: v.who(ctx), line: fill(pick(v.lines[tone], seed), ctx), tone };
}

/** A target country's answer to an order: its real move this month first, else a line by the measured change. */
export function orderReaction(
  ctx: LineCtx,
  relDelta: number,
  realMove: string | undefined,
  seed: number,
): Reaction | undefined {
  if (!ctx.them) return undefined;
  const who = `${ctx.them.leader.title} ${ctx.them.leader.name}`;
  if (realMove)
    return {
      who,
      line: `${ctx.them.name} answered within the month: ${realMove}.`,
      tone: toneOf(relDelta),
    };
  const tone = toneOf(relDelta);
  return { who, line: fill(pick(ORDER[tone], seed), ctx), tone };
}

/** One headline per outcome, written as news (never just the option label). */
export function outcomeHeadline(
  kind: string,
  tone: Tone,
  ctx: LineCtx & { speaker?: string; title: string; choice: string },
  seed: number,
): string {
  const L = ctx.them
    ? `${ctx.them.leader.title} ${surnameOf(ctx.them.leader.name)}`
    : (ctx.speaker ?? "");
  const me = surnameOf(ctx.player.leader.name);
  if (kind === "CALL") {
    const verbs: Record<Tone, string[]> = {
      warm: [
        "takes the call, and keeps the door ajar",
        "ends the call on warmer terms",
        "agrees to keep talking",
      ],
      cold: ["gives nothing away on the phone", "ends a cold call quickly"],
      angry: ["is left holding a dead line", "slams the phone down"],
      neutral: ["listens, and promises nothing"],
    };
    return `${L} ${pick(verbs[tone], seed)}`;
  }
  if (kind === "VISIT")
    return tone === "warm"
      ? `${L}'s visit ends with a joint statement`
      : tone === "neutral"
        ? `A working lunch with ${L}`
        : `${L}'s visit goes badly`;
  if (kind === "PRESS")
    return tone === "warm"
      ? `${me} wins the evening news`
      : tone === "neutral"
        ? `${me} gets through the interview`
        : `${me} stumbles on prime time`;
  if (kind === "STAFF") return `${ctx.speaker ?? "Cabinet"}: ${ctx.choice.replace(/\.$/, "")}`;
  return `${ctx.title.replace(/[?:.]$/, "")}: ${me} chooses to ${ctx.choice.charAt(0).toLowerCase()}${ctx.choice.slice(1).replace(/\.$/, "")}`;
}

/** Only what the engine knows will happen next. */
export function watchLine(opts: {
  followUpDelay?: number;
  deputyCaller?: string;
  bandBefore?: Band;
  bandAfter?: Band;
  country?: string;
  staffHold?: boolean;
}): string | undefined {
  if (opts.followUpDelay)
    return `This will come back: expect consequences in about ${opts.followUpDelay} month${opts.followUpDelay > 1 ? "s" : ""}.`;
  if (opts.bandBefore && opts.bandAfter && opts.bandBefore !== opts.bandAfter && opts.country) {
    const word: Record<Band, string> = {
      war: "an enemy at war",
      hostile: "hostile",
      cool: "neither friend nor foe",
      friendly: "a friend",
    };
    return `${opts.country} now counts as ${word[opts.bandAfter]}.`;
  }
  if (opts.deputyCaller) return `${opts.deputyCaller} may not call again for three months.`;
  if (opts.staffHold)
    return "The issue is not settled: your staff may raise it again in two months.";
  return undefined;
}

export const findCountry = (world: WorldState, id?: string) =>
  id ? world.countries.find((c) => c.id === id) : undefined;
