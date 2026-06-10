import type { CountryFull, PlayerViewCountry, WorldState } from '../store/gameStore';

/**
 * Knowledge-driven advisor Q&A.
 *
 * Instead of canned keyword responses, answers are composed from the actual
 * simulation state: historical rivalries and key events, the timeline of what
 * has recently happened, alliances, regime opposition, wars, beliefs and
 * uncertainty. Each advisor answers through their departmental lens.
 */

export interface BrainContext {
  worldState: WorldState;
  playerView: PlayerViewCountry[];
  player: CountryFull;
}

const fmtMoney = (n: number) =>
  n >= 1e12 ? `$${(n / 1e12).toFixed(1)} trillion` : n >= 1e9 ? `$${(n / 1e9).toFixed(0)} billion` : `$${(n / 1e6).toFixed(0)} million`;

function view(ctx: BrainContext, id: string): PlayerViewCountry | undefined {
  return ctx.playerView.find((c) => c.id === id);
}

export function countryName(ctx: BrainContext, id: string): string {
  return ctx.worldState.countries.find((c) => c.id === id)?.name ?? id;
}

function findMentionedCountry(ctx: BrainContext, question: string): CountryFull | undefined {
  const q = question.toLowerCase();
  // Prefer full-name matches, then ISO codes as whole words
  return (
    ctx.worldState.countries.find(
      (c) => c.id !== ctx.player.id && q.includes(c.name.toLowerCase()),
    ) ??
    ctx.worldState.countries.find(
      (c) => c.id !== ctx.player.id && new RegExp(`\\b${c.id.toLowerCase()}\\b`).test(q),
    )
  );
}

// ---------------------------------------------------------------------------
// Cause analysis: WHY are relations with X the way they are?
// ---------------------------------------------------------------------------

interface RelationCause {
  text: string;
  weight: number;
}

function explainRelations(ctx: BrainContext, target: CountryFull): { tone: string; causes: RelationCause[] } {
  const { player, worldState } = ctx;
  const relation = player.relations[target.id] ?? 0;
  const causes: RelationCause[] = [];

  const tone =
    relation > 60 ? 'excellent' : relation > 25 ? 'good' : relation > -25 ? 'workable' : relation > -60 ? 'hostile' : 'openly adversarial';

  // 1. Active war
  if (player.atWarWith.includes(target.id)) {
    causes.push({ text: `we are at war with them — there is no deeper explanation needed while the guns fire`, weight: 100 });
  }

  // 2. Historical rivalry (either direction)
  const weAreTheirRival = (target.history.historicalRivals ?? []).includes(player.id);
  const theyAreOurRival = (player.history.historicalRivals ?? []).includes(target.id);
  if (theyAreOurRival || weAreTheirRival) {
    // Pull the specific historical events that involve the other side
    const relevantEvents = [...(target.history.keyEvents ?? []), ...(player.history.keyEvents ?? [])]
      .filter(
        (e) =>
          e.event.toLowerCase().includes(target.name.toLowerCase().split(' ')[0]) ||
          e.event.toLowerCase().includes(player.name.toLowerCase().split(' ')[0]) ||
          e.impact.toLowerCase().includes(target.name.toLowerCase().split(' ')[0]) ||
          e.impact.toLowerCase().includes(player.name.toLowerCase().split(' ')[0]),
      )
      .slice(0, 2);
    const eventText = relevantEvents.length
      ? ` (${relevantEvents.map((e) => `${e.year}: ${e.event.toLowerCase()}`).join('; ')})`
      : '';
    causes.push({
      text: `this is a historical rivalry that long predates your government${eventText} — neither establishment trusts the other`,
      weight: 80,
    });
  }

  // 3. Historical friendship
  if ((player.history.historicalAllies ?? []).includes(target.id) && relation > 0) {
    causes.push({ text: `decades of partnership and aligned interests underpin the relationship`, weight: 70 });
  }

  // 4. Ideological opposition
  const democracies = ['DEMOCRACY'];
  const autocracies = ['AUTOCRACY', 'COMMUNIST', 'MILITARY_JUNTA', 'THEOCRACY'];
  if (
    (democracies.includes(player.regimeType) && autocracies.includes(target.regimeType)) ||
    (autocracies.includes(player.regimeType) && democracies.includes(target.regimeType))
  ) {
    causes.push({
      text: `their ${target.regimeType.toLowerCase().replace('_', ' ')} sees our system of government as a threat to its own legitimacy, and the feeling is mutual`,
      weight: 40,
    });
  }

  // 5. They are allied with our rivals
  const alliedWithOurRivals = target.alliances.filter((a) => (player.history.historicalRivals ?? []).includes(a));
  if (alliedWithOurRivals.length > 0) {
    causes.push({
      text: `they maintain a military pact with ${alliedWithOurRivals.map((id) => countryName(ctx, id)).join(' and ')} — our principal rival${alliedWithOurRivals.length > 1 ? 's' : ''}`,
      weight: 50,
    });
  }
  const weAlliedWithTheirRivals = player.alliances.filter((a) => (target.history.historicalRivals ?? []).includes(a));
  if (weAlliedWithTheirRivals.length > 0 && relation < 0) {
    causes.push({
      text: `our own pact with ${weAlliedWithTheirRivals.map((id) => countryName(ctx, id)).join(' and ')} reads in their capital as encirclement`,
      weight: 45,
    });
  }

  // 6. Recent incidents from the timeline (last 18 months)
  const recentIncidents = worldState.timeline
    .filter((t) => worldState.turn - t.turn <= 18)
    .filter(
      (t) =>
        t.description.includes(target.name) &&
        (t.description.includes(player.name) ||
          t.category === 'COVERT' ||
          t.category === 'WAR' ||
          t.category === 'NUCLEAR'),
    )
    .slice(-3);
  if (recentIncidents.length > 0) {
    const list = recentIncidents.map((i) => `${i.date}: "${i.description}"`).join('; ');
    causes.push({
      text: `recent events have left fresh scars — ${list}`,
      weight: 60,
    });
  }

  // 7. Border deployments
  if (player.borderDeployments.some((d) => d.targetCountryId === target.id)) {
    causes.push({ text: `our troops sit on their border; every month they stay there, their public demands their government respond`, weight: 55 });
  }
  if (target.borderDeployments.some((d) => d.targetCountryId === player.id)) {
    causes.push({ text: `their forces are deployed against our border — a standing provocation`, weight: 55 });
  }

  // 8. Their leader
  if ((target.leader.style === 'HARDLINER' || target.leader.style === 'HAWKISH') && relation < 0) {
    causes.push({
      text: `${target.leader.title} ${target.leader.name} is a ${target.leader.style.toLowerCase()} who profits politically from confrontation with us`,
      weight: 35,
    });
  }

  // 9. Embargo
  if (player.underGlobalEmbargo) {
    causes.push({ text: `our pariah status under the global embargo poisons every relationship, this one included`, weight: 30 });
  }

  causes.sort((a, b) => b.weight - a.weight);
  return { tone, causes };
}

function whyRelationsAnswer(ctx: BrainContext, target: CountryFull): string {
  const relation = Math.round(ctx.player.relations[target.id] ?? 0);
  const { tone, causes } = explainRelations(ctx, target);
  if (causes.length === 0) {
    return `Honestly, there is no deep grievance with ${target.name} — relations are ${tone} (${relation}) mostly through neglect. A sustained diplomatic effort would likely move them; nothing structural stands in the way.`;
  }
  const main = causes.slice(0, 3);
  const parts = main.map((c, i) => (i === 0 ? `First, ${c.text}.` : i === 1 ? `Second, ${c.text}.` : `And ${c.text}.`));
  return `Our relationship with ${target.name} is ${tone} (${relation}) for concrete reasons. ${parts.join(' ')}`;
}

function howToImproveAnswer(ctx: BrainContext, target: CountryFull): string {
  const relation = ctx.player.relations[target.id] ?? 0;
  const { causes } = explainRelations(ctx, target);
  const structural = causes.some((c) => c.weight >= 80);
  const steps: string[] = [];
  if (ctx.player.atWarWith.includes(target.id)) {
    return `Improvement begins with ending the war. Propose a ceasefire — acceptance depends on who holds the battlefield advantage and how exhausted both armies are. After that, expect years of cold peace before anything resembling friendship.`;
  }
  if (ctx.player.borderDeployments.some((d) => d.targetCountryId === target.id)) {
    steps.push('withdraw our border deployment — it costs them nothing to hate us while our troops face their cities');
  }
  steps.push('a sustained Improve Relations campaign ($100M per month) — slow but reliable');
  if (relation > 40) steps.push(`relations are already warm enough that a military pact proposal could land once we cross PROFITABLE (60+)`);
  if (structural) {
    return `I must be candid: the rivalry with ${target.name} is structural, and no charm offensive erases it. But we can manage it downward. Concretely: ${steps.join('; ')}. Expect progress to be slow and reversible.`;
  }
  return `${target.name} is movable. Concretely: ${steps.join('; ')}.`;
}

// ---------------------------------------------------------------------------
// Other answer domains
// ---------------------------------------------------------------------------

function militaryAssessment(ctx: BrainContext, target: CountryFull): string {
  const v = view(ctx, target.id);
  if (!v) return `We have no file on ${target.name}.`;
  const myStrength = ctx.player.manpower * (0.25 + (0.75 * ctx.player.mobilizationLevel) / 100) + ctx.player.airpower * 60;
  const ratio = myStrength / Math.max(1, v.militaryStrength.estimate);
  const confidence = Math.round(v.intelConfidence);
  const uncertainty =
    confidence > 70
      ? 'Our picture of their forces is solid.'
      : confidence > 40
        ? `Caveat: our intelligence confidence is only ${confidence}% — these estimates could be off by a wide margin.`
        : `Major caveat: we are nearly blind on ${target.name} (${confidence}% confidence). I would not stake a war on these numbers — fund intelligence gathering first.`;
  const balance =
    ratio > 1.6 ? 'We hold a decisive conventional advantage.' : ratio > 1.1 ? 'We hold a modest edge.' : ratio > 0.8 ? 'Forces are roughly matched — any war would be a grinding affair.' : 'They outmatch us conventionally. I advise against direct confrontation.';
  const nuclear =
    v.nuclearStatus === 'ARMED'
      ? ` And do not forget: they possess a deliverable nuclear arsenal. Conventional calculations stop mattering past a certain threshold.`
      : v.nuclearStatus === 'DEVELOPING'
        ? ` Our analysts believe they are actively developing nuclear weapons (program at roughly ${Math.round(v.nuclearProgress?.estimate ?? 0)}%).`
        : '';
  const pacts = target.alliances.length
    ? ` Their defense pacts with ${target.alliances.map((id) => countryName(ctx, id)).join(', ')} mean an attack on them likely brings others into the fight.`
    : '';
  return `${balance} They field an estimated ${Math.round(v.manpower.low / 1000)}–${Math.round(v.manpower.high / 1000)}k personnel against our ${Math.round(ctx.player.manpower / 1000)}k, mobilization ${target.id === ctx.player.id ? '' : 'unknown'}. ${uncertainty}${nuclear}${pacts}`;
}

function warFeasibility(ctx: BrainContext, target: CountryFull): string {
  const v = view(ctx, target.id);
  if (!v) return '';
  const assessment = militaryAssessment(ctx, target);
  const election =
    ctx.player.politicalSystem.nextElectionTurn !== null &&
    ctx.player.politicalSystem.nextElectionTurn - ctx.worldState.turn < 12
      ? ` Politically: elections are ${ctx.player.politicalSystem.nextElectionTurn - ctx.worldState.turn} months away. Wars are popular for a month and poisonous for a year.`
      : '';
  const bothNuclear = v.nuclearStatus === 'ARMED' && ctx.player.nuclear.status === 'ARMED';
  const nuclearWarning = bothNuclear
    ? ` Above all: BOTH arsenals are operational. The old rule applies — attack means disaster. I cannot recommend war between nuclear states under any conventional logic.`
    : '';
  return `${assessment}${election}${nuclearWarning} Remember the costs are certain even in victory: approval, stability and GDP all bleed for every month of fighting.`;
}

function economyAnswer(ctx: BrainContext): string {
  const p = ctx.player;
  const growth = p.growthRate * 100;
  const issues: string[] = [];
  if (p.atWarWith.length > 0) issues.push(`the war is shaving roughly 2.5% off annual growth and pushing debt up every month`);
  if (p.debtGdpRatio > 100) issues.push(`debt at ${p.debtGdpRatio.toFixed(0)}% of GDP is becoming a drag in its own right`);
  if (p.militaryBudgetPercent > 6) issues.push(`military spending at ${p.militaryBudgetPercent.toFixed(1)}% of GDP crowds out productive investment`);
  if (p.underGlobalEmbargo) issues.push(`the global embargo is strangling trade — getting it lifted at the July summit should be a top priority`);
  if (p.stability < 50) issues.push(`instability frightens investors; every riot has a price`);
  const health =
    growth > 2.5 ? 'The economy is performing well' : growth > 0.5 ? 'The economy is growing, but without much margin' : 'The economy is in real trouble';
  return `${health}: GDP ${fmtMoney(p.gdp)}, growing at ${growth.toFixed(1)}% annually, debt at ${p.debtGdpRatio.toFixed(0)}% of GDP. ${
    issues.length ? `The main drags: ${issues.join('; ')}.` : 'No structural problems demand intervention right now.'
  } Your monthly defense budget works out to ${fmtMoney((p.gdp * (p.militaryBudgetPercent / 100)) / 12)}.`;
}

function stabilityAnswer(ctx: BrainContext): string {
  const p = ctx.player;
  const causes: string[] = [];
  if (p.growthRate < 0) causes.push('the shrinking economy — nothing erodes support like falling living standards');
  if (p.atWarWith.length > 0) causes.push('war fatigue');
  if (p.insurgencyLevel !== 'NONE') causes.push(`the ${p.insurgencyLevel.toLowerCase()} we are fighting internally (current tactics: ${p.policingTactic.toLowerCase()} policing)`);
  if (p.legitimacy < 45) causes.push('questions about the government\'s very legitimacy');
  for (const d of p.internalDivisions ?? []) {
    if (d.tension > 60) causes.push(`the ${d.name.toLowerCase()} runs hot`);
  }
  const election =
    p.politicalSystem.nextElectionTurn !== null
      ? ` Elections come in ${p.politicalSystem.nextElectionTurn - ctx.worldState.turn} months — at ${Math.round(p.approval)}% approval you would ${p.approval >= 50 ? 'likely survive them' : p.approval >= 42 ? 'be fighting for your life' : 'lose, on current numbers'}.`
      : ` There are no elections in our system, but legitimacy at ${Math.round(p.legitimacy)}% is what keeps the colonels and the crowds at home — let it slide below 30 and we should talk about coup risk seriously.`;
  return `Stability stands at ${Math.round(p.stability)}%, approval at ${Math.round(p.approval)}%. ${
    causes.length ? `What's eating at it: ${causes.join('; ')}.` : 'No acute pressures — this is as quiet as politics gets.'
  }${election} Reform builds durable stability; propaganda buys a cheaper, shallower kind.`;
}

function intelAnswer(ctx: BrainContext, target?: CountryFull): string {
  if (target) {
    const v = view(ctx, target.id);
    const conf = Math.round(v?.intelConfidence ?? 0);
    const ops: string[] = [];
    if (conf < 60) ops.push('an intelligence-gathering operation to sharpen our picture');
    if ((v?.stability.estimate ?? 100) < 45) ops.push('destabilization — their government is already wobbling');
    if (target.insurgencyLevel !== 'NONE') ops.push(`arming their ${target.insurgencyLevel.toLowerCase()} (deniable, effective, dirty)`);
    if (v?.nuclearStatus === 'DEVELOPING') ops.push('sabotage of their nuclear facilities');
    return `On ${target.name}: our confidence in what we know is ${conf}%. ${
      conf < 50 ? 'Treat every number you have seen about them as an estimate that could be badly wrong. ' : ''
    }Available covert options worth considering: ${ops.length ? ops.join('; ') : 'nothing especially promising — they are stable and well-protected'}. Every operation carries exposure risk; assassination and coup-sponsorship outrage the entire world when discovered, not just the target.`;
  }
  const blind = ctx.playerView
    .filter((v) => !v.isPlayer && v.intelConfidence < 45)
    .map((v) => v.name)
    .slice(0, 4);
  return `Our service rates ${ctx.player.intelLevel}/100 in capability, counter-intelligence at ${ctx.player.counterIntelLevel ?? '—'}. ${
    blind.length
      ? `We are effectively blind on ${blind.join(', ')} — what you see about them in briefings is closer to guesswork than fact.`
      : 'Coverage of the major powers is adequate.'
  } Remember the principle: you act on what we believe, not on what is true. So does everyone else — which is where their mistakes become your opportunities.`;
}

function alliancesAnswer(ctx: BrainContext): string {
  const p = ctx.player;
  const allies = p.alliances.map((id) => countryName(ctx, id));
  const candidates = ctx.worldState.countries
    .filter((c) => c.id !== p.id && !p.alliances.includes(c.id) && (p.relations[c.id] ?? 0) >= 45)
    .sort((a, b) => (p.relations[b.id] ?? 0) - (p.relations[a.id] ?? 0))
    .slice(0, 3);
  const historical = (p.history.historicalAllies ?? []).filter((id) => !p.alliances.includes(id)).map((id) => countryName(ctx, id)).slice(0, 3);
  return `${
    allies.length
      ? `We hold mutual-defense pacts with ${allies.join(', ')}. Understand what that means: their defensive wars become ours, and ours become theirs.`
      : 'We have no formal allies — in a crisis, we stand alone.'
  } ${
    candidates.length
      ? `Best prospects for new pacts: ${candidates.map((c) => `${c.name} (relations ${Math.round(p.relations[c.id] ?? 0)})`).join(', ')} — a pact needs relations at PROFITABLE (60+) and their trust.`
      : 'No one currently likes us enough to consider a pact; relations must be built first.'
  }${historical.length ? ` History suggests ${historical.join(', ')} as natural partners worth courting.` : ''}`;
}

function aboutCountry(ctx: BrainContext, target: CountryFull): string {
  const v = view(ctx, target.id);
  const history = target.history.narrative ?? '';
  const events = (target.history.keyEvents ?? []).slice(-3).map((e) => `${e.year} — ${e.event}`).join('; ');
  const level = v?.diplomaticLevel.replace('_', ' ') ?? '';
  return `${target.name}: ${target.regimeType.toLowerCase().replace('_', ' ')} led by ${target.leader.title} ${target.leader.name} (${target.leader.style.toLowerCase()}, in power since ${target.leader.sinceTurn === 0 ? 'before your term' : `turn ${target.leader.sinceTurn}`}). ${history} Formative history: ${events}. Our relationship: ${level} (${Math.round(ctx.player.relations[target.id] ?? 0)}).`;
}

// ---------------------------------------------------------------------------
// Advisor voices & dispatch
// ---------------------------------------------------------------------------

const VOICES: Record<string, { opener: string[]; lens: string }> = {
  FOREIGN_MINISTER: {
    opener: ['', 'Diplomatically speaking, ', 'From the Foreign Ministry\'s view: '],
    lens: 'diplomacy',
  },
  DEFENSE_MINISTER: { opener: ['', 'Bluntly: ', 'Commander, '], lens: 'military' },
  FINANCE_MINISTER: { opener: ['', 'The numbers first. ', 'Fiscally: '], lens: 'economy' },
  INTELLIGENCE_CHIEF: { opener: ['', 'What I can tell you — and how confident I am in it: ', ''], lens: 'intel' },
  DOMESTIC_ADVISOR: { opener: ['', 'Politically at home, ', ''], lens: 'domestic' },
  CHIEF_OF_STAFF: { opener: ['', 'Pulling the threads together: ', ''], lens: 'strategy' },
};

export function answerQuestion(
  advisorId: string,
  question: string,
  ctx: BrainContext,
): string {
  const q = question.toLowerCase();
  const target = findMentionedCountry(ctx, question);
  const voice = VOICES[advisorId] ?? VOICES.CHIEF_OF_STAFF;
  const opener = voice.opener[question.length % voice.opener.length];

  const asksWhy = /\bwhy\b|\bhow come\b|\breason\b|\bexplain\b/.test(q);
  const asksImprove = /improve|better|fix|repair|mend|warm|friend|reconcil/.test(q);
  const asksWar = /\bwar\b|attack|invade|invasion|strike|fight|defeat|beat|win against/.test(q);
  const asksMilitary = /military|army|troops|forces|strength|strong|weapon|defen[cs]e|mobiliz/.test(q);
  const asksRelations = /relation|hostile|enem|friend|like us|hate|tension|diplomat/.test(q);
  const asksEconomy = /econom|gdp|money|budget|debt|trade|growth|financ|tax|afford/.test(q);
  const asksStability = /stabilit|approval|unrest|protest|riot|coup|election|legitim|insurgen|domestic|people|popular/.test(q);
  const asksIntel = /intel|spy|spies|covert|secret|sabotage|assassin|destabiliz|know about|information/.test(q);
  const asksAlliance = /alliance|ally|allies|pact|partner|nato/.test(q);
  const asksNuclear = /nuclear|nuke|warhead|bomb|atomic|proliferat/.test(q);
  const asksAbout = /who is|who leads|tell me about|what about|describe|history of|leader of/.test(q);

  // --- Country-specific questions ---
  if (target) {
    if (asksWhy && (asksRelations || asksWar || /them|they/.test(q) || true)) {
      // "why are relations with X hostile", "why do they hate us"
      if (asksRelations || asksWhy) {
        const core = whyRelationsAnswer(ctx, target);
        const lensTail =
          voice.lens === 'military'
            ? ` Militarily, what matters is this: ${militaryAssessment(ctx, target).split('.')[0]}.`
            : voice.lens === 'intel'
              ? ` ${intelConfidenceNote(ctx, target)}`
              : voice.lens === 'economy'
                ? ' From my desk: hostility has a price — sanctions, lost trade, higher defense spending. Factor that into whatever you decide.'
                : '';
        return opener + core + lensTail;
      }
    }
    if (asksImprove && asksRelations) return opener + howToImproveAnswer(ctx, target);
    if (asksWar) return opener + warFeasibility(ctx, target);
    if (asksMilitary) return opener + militaryAssessment(ctx, target);
    if (asksIntel) return opener + intelAnswer(ctx, target);
    if (asksNuclear) return opener + nuclearAnswer(ctx, target);
    if (asksAbout) return opener + aboutCountry(ctx, target);
    if (asksRelations) return opener + whyRelationsAnswer(ctx, target);
    if (asksImprove) return opener + howToImproveAnswer(ctx, target);
    // Country mentioned but unclear intent → dossier summary through the lens
    if (voice.lens === 'military') return opener + militaryAssessment(ctx, target);
    if (voice.lens === 'intel') return opener + intelAnswer(ctx, target);
    return opener + aboutCountry(ctx, target);
  }

  // --- General questions ---
  if (asksNuclear) return opener + nuclearAnswer(ctx);
  if (asksAlliance) return opener + alliancesAnswer(ctx);
  if (asksEconomy) return opener + economyAnswer(ctx);
  if (asksStability) return opener + stabilityAnswer(ctx);
  if (asksIntel) return opener + intelAnswer(ctx);
  if (asksMilitary || asksWar) return opener + generalMilitaryAnswer(ctx);
  if (asksRelations) return opener + generalRelationsAnswer(ctx);

  // --- Fallback: advisor's priority read, not a re-statement ---
  return opener + priorityRead(ctx, advisorId);
}

function intelConfidenceNote(ctx: BrainContext, target: CountryFull): string {
  const conf = Math.round(view(ctx, target.id)?.intelConfidence ?? 0);
  return conf < 50
    ? `One more thing: our visibility into ${target.name} is poor (${conf}% confidence). Some of what "everyone knows" about them may simply be wrong.`
    : `Our coverage of ${target.name} is decent (${conf}% confidence), so I stand behind this read.`;
}

function nuclearAnswer(ctx: BrainContext, target?: CountryFull): string {
  if (target) {
    const v = view(ctx, target.id);
    const status = v?.nuclearStatus ?? 'NONE';
    if (status === 'ARMED' || status === 'TESTED')
      return `${target.name} is a nuclear power — that is public fact since their test. Their arsenal cannot be destroyed conventionally; hardened and dispersed. Deterrence, not disarmament, is the only framework that works now.`;
    if (status === 'DEVELOPING')
      return `Our assessment: ${target.name} is running an active weapons program, roughly ${Math.round(v?.nuclearProgress?.estimate ?? 0)}% of the way to a test (confidence ${Math.round(v?.intelConfidence ?? 0)}%). The window for stopping it conventionally closes at the test. Two consecutive successful strikes on their facilities would cripple the program; sabotage is slower but deniable. After a test, neither works.`;
    return `We see no active weapons program in ${target.name}${status === 'LATENT' ? ', though they have the technical base to start one quickly if threatened' : ''}.`;
  }
  const p = ctx.player;
  const ours =
    p.nuclear.status === 'ARMED'
      ? `Our arsenal stands at ${p.nuclear.warheads} warheads — the ultimate guarantee, and a thing that must never be used.`
      : p.nuclear.status === 'DEVELOPING'
        ? `Our program is at ${Math.round(p.nuclear.progress)}%. Until we test, we are vulnerable to precisely two consecutive strikes on the facilities — guard them.`
        : `We have no nuclear weapons.`;
  const others = ctx.playerView
    .filter((v) => !v.isPlayer && (v.nuclearStatus === 'ARMED' || v.nuclearStatus === 'TESTED'))
    .map((v) => v.name);
  const developing = ctx.playerView.filter((v) => !v.isPlayer && v.nuclearStatus === 'DEVELOPING').map((v) => v.name);
  return `${ours} Declared nuclear powers: ${others.join(', ') || 'none'}. ${developing.length ? `Suspected active programs: ${developing.join(', ')}.` : ''} Remember the rule that has held since 1945: when both sides have operational arsenals, attack means disaster.`;
}

function generalMilitaryAnswer(ctx: BrainContext): string {
  const p = ctx.player;
  const wars = ctx.worldState.wars.filter((w) => w.attackerId === p.id || w.defenderId === p.id);
  const warText = wars
    .map((w) => {
      const enemyId = w.attackerId === p.id ? w.defenderId : w.attackerId;
      const myPosition = w.attackerId === p.id ? w.frontline : 100 - w.frontline;
      return `against ${countryName(ctx, enemyId)} we ${myPosition > 55 ? 'hold the advantage' : myPosition < 45 ? 'are losing ground' : 'are locked in stalemate'} (front at ${Math.round(myPosition)}%, exhaustion ${Math.round(w.exhaustion)}%)`;
    })
    .join('; ');
  return `${p.manpower.toLocaleString()} active personnel, ${p.airpower.toLocaleString()} aircraft, mobilization at ${p.mobilizationLevel}%, budget ${p.militaryBudgetPercent.toFixed(1)}% of GDP. ${
    wars.length ? `War status: ${warText}.` : 'We are at peace, which is the cheapest force posture there is.'
  } ${p.mobilizationLevel < 40 && threatNearby(ctx) ? 'Given the threat picture, I would raise mobilization.' : ''}`;
}

function threatNearby(ctx: BrainContext): boolean {
  return ctx.worldState.countries.some(
    (c) => c.id !== ctx.player.id && (ctx.player.relations[c.id] ?? 0) < -50 && c.mobilizationLevel > 50,
  );
}

function generalRelationsAnswer(ctx: BrainContext): string {
  const p = ctx.player;
  const sorted = ctx.worldState.countries
    .filter((c) => c.id !== p.id)
    .sort((a, b) => (p.relations[b.id] ?? 0) - (p.relations[a.id] ?? 0));
  const friends = sorted.slice(0, 3).map((c) => `${c.name} (${Math.round(p.relations[c.id] ?? 0)})`);
  const enemies = sorted.slice(-3).reverse().map((c) => `${c.name} (${Math.round(p.relations[c.id] ?? 0)})`);
  return `The map in one sentence: our closest relationships are ${friends.join(', ')}; our worst are ${enemies.join(', ')}. Ask me about any specific country and I will explain exactly why the relationship is where it is and what could move it.`;
}

function priorityRead(ctx: BrainContext, advisorId: string): string {
  const p = ctx.player;
  switch (advisorId) {
    case 'FOREIGN_MINISTER':
      return generalRelationsAnswer(ctx);
    case 'DEFENSE_MINISTER':
      return generalMilitaryAnswer(ctx);
    case 'FINANCE_MINISTER':
      return economyAnswer(ctx);
    case 'INTELLIGENCE_CHIEF':
      return intelAnswer(ctx);
    case 'DOMESTIC_ADVISOR':
      return stabilityAnswer(ctx);
    default: {
      const worst =
        p.stability < 45
          ? 'our domestic stability — nothing else matters if the government falls'
          : p.atWarWith.length > 0
            ? 'the war — everything else is secondary until it ends'
            : (p.relations && Object.values(p.relations).some((r) => r < -60))
              ? 'managing our worst rivalries before they become wars'
              : 'using this calm to build — economy, alliances, intelligence';
      return `If you are asking where to focus, my answer is ${worst}. Ask any of the ministers for depth on their domain, or name a country and I will coordinate a full assessment.`;
    }
  }
}
