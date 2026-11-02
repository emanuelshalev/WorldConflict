import { useEffect, useMemo, useRef, useState } from 'react';
import { IconAlertTriangle, IconChevronDown, IconChevronUp, IconSend, IconX } from '@tabler/icons-react';
import {
  type PendingAction,
  type DecisionOption,
  type Objective,
  type PendingDecision,
  countryName,
  capitalLeft,
  executeTurn,
  queueOrder,
  useGameStore,
  usePlayerCountry,
} from '../store/gameStore';
import { ADVISOR_NAMES, arrowText, effectArrows, flag } from '../lib/format';
import { pcCost } from '../lib/actions';
import { SceneFrame } from '../scenes/SceneFrame';
import { sceneForAction, sceneForCrisis } from '../scenes/kinds';
import { ActionIcon } from '../scenes/icons';
import { actionFamily } from '../scenes/actionIcons';



interface OrderDef {
  type: string;
  label: string;
  target?: boolean;
  params?: Record<string, unknown>;
  danger?: boolean;
}

const CATALOG: Record<string, OrderDef[]> = {
  Diplomacy: [
    { type: 'DIPLOMACY_IMPROVE_RELATIONS', label: 'Court', target: true },
    { type: 'DIPLOMACY_DENOUNCE', label: 'Denounce', target: true },
    { type: 'DIPLOMACY_PROPOSE_ALLIANCE', label: 'Offer defense pact to', target: true },
    { type: 'DIPLOMACY_PROPOSE_CEASEFIRE', label: 'Propose ceasefire to', target: true },
    { type: 'DIPLOMACY_MEDIATE', label: 'Mediate peace for', target: true },
    { type: 'DIPLOMACY_BREAK_ALLIANCE', label: 'Break pact with', target: true, danger: true },
    { type: 'DIPLOMACY_DECLARE_WAR', label: 'Declare war on', target: true, danger: true },
  ],
  Military: [
    { type: 'MILITARY_MOBILIZE', label: 'Mobilize forces' },
    { type: 'MILITARY_DEMOBILIZE', label: 'Stand down forces' },
    { type: 'MILITARY_PROCURE', label: 'Buy weapons' },
    { type: 'MILITARY_DEPLOY_BORDER', label: 'Mass troops facing', target: true, danger: true },
    { type: 'MILITARY_WITHDRAW_BORDER', label: 'Withdraw troops facing', target: true },
    { type: 'MILITARY_AIRSTRIKE', label: 'Strike military targets in', target: true, danger: true, params: { targetType: 'MILITARY' } },
    { type: 'MILITARY_AIRSTRIKE', label: 'Strike nuclear sites in', target: true, danger: true, params: { targetType: 'NUCLEAR' } },
    { type: 'NUCLEAR_FUND_PROGRAM', label: 'Fund nuclear program', danger: true },
    { type: 'NUCLEAR_STRIKE', label: '☢ Nuclear strike', target: true, danger: true },
  ],
  Intelligence: [
    { type: 'INTEL_GATHER', label: 'Spy on', target: true },
    { type: 'INTEL_COUNTER_INTEL', label: 'Hunt foreign spies' },
    { type: 'INTEL_SABOTAGE', label: 'Sabotage', target: true },
    { type: 'INTEL_DESTABILIZE', label: 'Destabilize', target: true },
    { type: 'INTEL_SUPPORT_REBELS', label: 'Arm rebels in', target: true, danger: true },
    { type: 'INTEL_MISINFORMATION', label: 'Feed disinformation to', target: true },
    { type: 'INTEL_ASSASSINATE', label: 'Assassinate leader of', target: true, danger: true },
    { type: 'INTEL_COUP', label: 'Back a coup in', target: true, danger: true },
  ],
  Domestic: [
    { type: 'DOMESTIC_PROPAGANDA', label: 'National address' },
    { type: 'DOMESTIC_REFORM', label: 'Reform program' },
    { type: 'DOMESTIC_POLICING', label: 'Soft policing', params: { tactic: 'SOFT' } },
    { type: 'DOMESTIC_POLICING', label: 'Hard crackdown', params: { tactic: 'HARD' }, danger: true },
  ],
};

function CrisisCard({ decision }: { decision: PendingDecision }) {
  const choices = useGameStore((s) => s.decisionChoices);
  const choose = useGameStore((s) => s.chooseDecision);
  const chosen = choices[decision.id];
  const objective = useGameStore((s) => s.worldState?.objective);
  const existential = decision.urgency === 'EXISTENTIAL';
  const home = useGameStore((s) => s.worldState?.playerCountryId);
  return (
    <div className={`crisis ${existential ? 'existential' : ''}`}>
      <SceneFrame
        kind={sceneForCrisis(decision.templateId, decision.title, decision.situation)}
        home={home}
        other={decision.affectedCountries.find((id) => id !== home)}
        mood={existential || decision.urgency === 'URGENT' ? 'bad' : 'neutral'}
        size="card"
        kicker={`${existential ? 'Existential' : decision.urgency === 'URGENT' ? 'Urgent' : 'Crisis'} ${decision.affectedCountries
          .slice(0, 3)
          .map((id) => flag(id))
          .join(' ')}`}
        headline={decision.title}
      />
      <h4 className="sr-only">{decision.title}</h4>
      <p className="situation">{decision.situation}</p>
      <div className="options">
        {decision.options.map((o) => (
          <button
            key={o.id}
            className={`option ${chosen === o.id ? 'chosen' : ''}`}
            onClick={() => choose(decision.id, o.id)}
          >
            <b>{o.label}</b>
            {missionRisk(o, objective) && (
              <span className="chip" style={{ color: 'var(--war)', borderColor: 'rgba(229,56,59,0.5)', marginLeft: 6 }} title={missionRisk(o, objective) ?? ''}>
                ⚠ mission
              </span>
            )}
            <div className="desc">{o.description}</div>
            <div className="arrows">
              {effectArrows(o, countryName).map((a, i) => (
                <span key={`${a.label}-${i}`} className={a.good ? 'delta-up' : 'delta-down'}>
                  {arrowText(a)}
                </span>
              ))}
            </div>
            {o.backedBy.length > 0 && (
              <div className="backers">Backed by {o.backedBy.map((b) => ADVISOR_NAMES[b] ?? b).join(', ')}</div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

interface Suggestion {
  who: string;
  label: string;
  why: string;
  action: PendingAction;
}

// Our relation with each country by month, so advisors notice when courting isn't working.
const relationMemory = new Map<number, Record<string, number>>();

/** Why an option endangers the mission (relations, stats or a war the mission forbids), or null. */
function missionRisk(o: DecisionOption, objective: Objective | null | undefined): string | null {
  if (!objective) return null;
  for (const c of [...objective.primary, ...objective.bonus]) {
    if (c.kind === 'RELATION_MIN' && c.targetId && (o.effects[`relations:${c.targetId}`] ?? 0) < 0)
      return `Hurts a mission goal: ${c.label}`;
    if (c.kind === 'STAT_MIN' && c.stat && (o.effects[c.stat] ?? 0) < 0) return `Hurts a mission goal: ${c.label}`;
    if (
      c.kind === 'NO_WAR_WITH' &&
      o.actions.some((a) => a.type === 'DIPLOMACY_DECLARE_WAR' && a.targetCountryId === c.targetId)
    )
      return `Breaks the mission: ${c.label}`;
  }
  if (o.actions.some((a) => a.type === 'DIPLOMACY_DECLARE_WAR')) return 'Takes you to war';
  return null;
}

const STAT_NAMES: Record<string, string> = { approval: 'Approval', stability: 'Stability', legitimacy: 'Legitimacy' };
const INSURGENCY_ORDER = ['NONE', 'UNREST', 'REBELLION', 'GUERILLA'];

function useSuggestions(): Suggestion[] {
  const world = useGameStore((s) => s.worldState);
  const view = useGameStore((s) => s.playerView);
  const me = usePlayerCountry();
  return useMemo(() => {
    if (!world || !me) return [];
    relationMemory.set(world.turn, { ...me.relations });
    const out: Array<Suggestion & { p: number }> = [];
    const others = view.filter((v) => !v.isPlayer);
    const rel = (id: string) => Math.round(me.relations[id] ?? 0);
    const lastAddress = (world.turnReport?.orders ?? []).some((o) => o.ok && o.label === 'National address');
    // Courting stalled: we courted them last month and the relation still did not rise
    const courtStalled = (id: string) => {
      const before = relationMemory.get(world.turn - 1)?.[id];
      const courted = (world.turnReport?.orders ?? []).some((o) => o.ok && o.label === `Court ${countryName(id)}`);
      return courted && before !== undefined && (me.relations[id] ?? 0) <= before;
    };
    const court = (id: string, p: number, why: string): Suggestion & { p: number } => ({
      p,
      who: 'Foreign Minister',
      label: `Court ${countryName(id)}`,
      why,
      action: { type: 'DIPLOMACY_IMPROVE_RELATIONS', label: `Court ${countryName(id)}`, targetCountryId: id },
    });
    const reform: Suggestion['action'] = { type: 'DOMESTIC_REFORM', label: 'Reform program' };
    const address: Suggestion['action'] = { type: 'DOMESTIC_PROPAGANDA', label: 'National address' };

    // 1. The mission comes first: protect every objective condition that is unmet or slipping
    const goals = [
      ...(world.objective?.primary ?? []).map((c) => ({ c, bonus: false })),
      ...(world.objective?.bonus ?? []).map((c) => ({ c, bonus: true })),
    ];
    for (const { c, bonus } of goals) {
      const boost = bonus ? -8 : 0;
      if (c.kind === 'RELATION_MIN' && c.targetId && !me.atWarWith.includes(c.targetId)) {
        const need = c.min ?? 0;
        const now = rel(c.targetId);
        if (now < need + 10) {
          const gap = now < need ? `needs ${need}+, now ${now}` : `needs ${need}+, now ${now}: keep the margin`;
          out.push(court(c.targetId, (now < need ? 96 : 88) + boost, `Mission: ${countryName(c.targetId)} ${gap}.${courtStalled(c.targetId) ? ' Last month did not move them; keep at it and avoid crisis options that anger them.' : ''}`));
        }
      } else if (c.kind === 'STAT_MIN' && c.stat) {
        const need = c.min ?? 50;
        const now = Math.round(me[c.stat] ?? 0);
        if (now < need + 8) {
          const name = STAT_NAMES[c.stat] ?? c.stat;
          if (c.stat === 'approval' && !lastAddress)
            out.push({ p: (now < need ? 94 : 86) + boost, who: 'Chief of Staff', label: 'National address', why: `Mission: approval needs ${need}%+, now ${now}%.`, action: address });
          else
            out.push({ p: (now < need ? 93 : 85) + boost, who: 'Interior Minister', label: 'Reform program', why: `Mission: ${name.toLowerCase()} needs ${need}%+, now ${now}%.`, action: reform });
        }
      } else if (c.kind === 'WAR_ENDED' && c.targetId) {
        const at = c.targetId;
        if (at !== me.id && world.wars.some((w) => [w.attackerId, w.defenderId].includes(at)) && !me.atWarWith.includes(at))
          out.push({ p: 92 + boost, who: 'Foreign Minister', label: `Mediate peace for ${countryName(at)}`, why: 'Mission: this war must end. Every round of talks wears both sides down.', action: { type: 'DIPLOMACY_MEDIATE', label: `Mediate peace for ${countryName(at)}`, targetCountryId: at } });
      } else if (c.kind === 'NO_WAR_WITH' && c.targetId && !me.atWarWith.includes(c.targetId)) {
        const now = rel(c.targetId);
        if (now < -40 && !courtStalled(c.targetId))
          out.push(court(c.targetId, 70 + boost, `Mission: no war with ${countryName(c.targetId)}. Relations ${now}; lower the temperature.`));
      } else if (c.kind === 'NO_NUCLEAR' && c.targetId) {
        const v = others.find((o) => o.id === c.targetId);
        const est = v?.nuclearProgress?.estimate ?? 0;
        if (v && v.nuclearStatus === 'DEVELOPING')
          out.push(
            est > 55
              ? { p: 89 + boost, who: 'Intelligence Chief', label: `Sabotage ${v.name}`, why: `Mission: ${v.name} must not test. Their program may be ~${Math.round(est)}% along.`, action: { type: 'INTEL_SABOTAGE', label: `Sabotage ${v.name}`, targetCountryId: v.id } }
              : { p: 74 + boost, who: 'Intelligence Chief', label: `Spy on ${v.name}`, why: `Mission: watch ${v.name}'s program (~${Math.round(est)}% by our estimate).`, action: { type: 'INTEL_GATHER', label: `Spy on ${v.name}`, targetCountryId: v.id } },
          );
      } else if (c.kind === 'SCORE_PAR' && !bonus && world.score) {
        // The score drifts toward what the situation deserves: lift its weakest part, early
        const need = c.min ?? world.objective?.par ?? 100;
        const now = world.score.total;
        if (now < need + 6) {
          const gap = now < need ? `needs ${need}+, now ${now}` : `needs ${need}+, now ${now}: keep the margin`;
          const parts = (['approval', 'prestige', 'security', 'economic'] as const).map((k) => ({ k, v: world.score[k] }));
          const weakest = parts.sort((a, b) => a.v - b.v)[0].k;
          const p = now < need ? 91 : 84;
          if (weakest === 'approval' && !lastAddress)
            out.push({ p, who: 'Chief of Staff', label: 'National address', why: `Mission: leadership score ${gap}. Approval is its weakest part.`, action: address });
          else if (weakest === 'prestige') {
            const partner = [...others]
              .filter((v) => !me.atWarWith.includes(v.id) && !(me.history?.historicalRivals ?? []).includes(v.id) && rel(v.id) > -30 && rel(v.id) < 70 && !courtStalled(v.id))
              .sort((a, b) => b.relationWithPlayer - a.relationWithPlayer)[0];
            if (partner) out.push(court(partner.id, p, `Mission: leadership score ${gap}. World standing is its weakest part.`));
          } else
            out.push({ p, who: 'Interior Minister', label: 'Reform program', why: `Mission: leadership score ${gap}. A stronger, steadier country lifts it.`, action: reform });
        }
      } else if (c.kind === 'INSURGENCY_MAX') {
        if (INSURGENCY_ORDER.indexOf(me.insurgencyLevel) >= INSURGENCY_ORDER.indexOf(c.level ?? 'UNREST'))
          out.push({ p: 90 + boost, who: 'Interior Minister', label: 'Soft policing', why: `Mission: insurgency must stay at ${(c.level ?? 'UNREST').toLowerCase()} or below.`, action: { type: 'DOMESTIC_POLICING', label: 'Soft policing', params: { tactic: 'SOFT' } } });
      }
    }

    // 2. Wars we are in
    for (const enemy of me.atWarWith) {
      const war = world.wars.find((w) => [w.attackerId, w.defenderId].includes(enemy) && [w.attackerId, w.defenderId].includes(me.id));
      const mine = war ? (war.attackerId === me.id ? war.frontline : 100 - war.frontline) : 50;
      out.push(
        mine < 50
          ? { p: 95, who: 'Foreign Minister', label: `Propose ceasefire to ${countryName(enemy)}`, why: mine <= 35 ? 'They have what they wanted. Their terms will sting, but far less than a defeat.' : 'The front is going badly. Stop the bleeding.', action: { type: 'DIPLOMACY_PROPOSE_CEASEFIRE', label: `Propose ceasefire to ${countryName(enemy)}`, targetCountryId: enemy } }
          : { p: 70, who: 'Defense Minister', label: 'Mobilize forces', why: 'We hold the initiative. Press it.', action: { type: 'MILITARY_MOBILIZE', label: 'Mobilize forces' } },
      );
    }

    // 3. The home front and general statecraft
    if (me.stability < 50 || me.legitimacy < 45)
      out.push({ p: 84, who: 'Interior Minister', label: 'Reform program', why: `Stability ${Math.round(me.stability)}%: the state needs shoring up.`, action: reform });
    if (me.approval < 55 && !lastAddress)
      out.push({ p: 75, who: 'Chief of Staff', label: 'National address', why: `Approval ${Math.round(me.approval)}%. Speak to the nation (works less if repeated).`, action: address });
    const missionIds = new Set(goals.map(({ c }) => c.targetId).filter(Boolean));
    const worst = [...others]
      .filter((v) => !me.atWarWith.includes(v.id) && !missionIds.has(v.id) && !courtStalled(v.id))
      .sort((a, b) => a.relationWithPlayer - b.relationWithPlayer)[0];
    if (worst && worst.relationWithPlayer < -20)
      out.push(court(worst.id, world.objective ? 40 : 60, `Relations ${Math.round(worst.relationWithPlayer)}. Lower the temperature before it boils over.`));
    const friend = [...others].filter((v) => v.relationWithPlayer > 45 && !me.alliances.includes(v.id)).sort((a, b) => b.relationWithPlayer - a.relationWithPlayer)[0];
    if (friend)
      out.push({ p: 45, who: 'Foreign Minister', label: `Offer pact to ${friend.name}`, why: 'They like us. A defense pact deters our rivals.', action: { type: 'DIPLOMACY_PROPOSE_ALLIANCE', label: `Offer defense pact to ${friend.name}`, targetCountryId: friend.id } });
    const nuke = others.find((v) => v.nuclearStatus === 'DEVELOPING' && (v.nuclearProgress?.estimate ?? 0) > 35 && v.relationWithPlayer < -20);
    if (nuke)
      out.push({ p: 80, who: 'Intelligence Chief', label: `Spy on ${nuke.name}`, why: `Their program may be ~${Math.round(nuke.nuclearProgress?.estimate ?? 0)}% along. We need certainty.`, action: { type: 'INTEL_GATHER', label: `Spy on ${nuke.name}`, targetCountryId: nuke.id } });
    if (me.insurgencyLevel === 'REBELLION' || me.insurgencyLevel === 'GUERILLA')
      out.push({ p: 78, who: 'Interior Minister', label: 'Soft policing', why: 'Win hearts, not just streets. Slow but no backlash.', action: { type: 'DOMESTIC_POLICING', label: 'Soft policing', params: { tactic: 'SOFT' } } });
    const meddled = (world.turnReport?.causes ?? []).some((c) => c.startsWith('Foreign covert'));
    const shielded = world.turn <= (world.director.counterIntelUntil ?? -1);
    if (meddled && !shielded)
      out.push({ p: 92, who: 'Intelligence Chief', label: 'Hunt foreign spies', why: 'Foreign services are working on our streets. A spy hunt foils most of their operations for three months.', action: { type: 'INTEL_COUNTER_INTEL', label: 'Hunt foreign spies' } });
    if (out.length < 3 && !shielded)
      out.push({ p: 10, who: 'Intelligence Chief', label: 'Hunt foreign spies', why: 'Rivals are always probing. Harden our services.', action: { type: 'INTEL_COUNTER_INTEL', label: 'Hunt foreign spies' } });
    // One suggestion per order: keep the highest-priority reason
    const seen = new Set<string>();
    return out
      .sort((a, b) => b.p - a.p)
      .filter((s) => (seen.has(s.label) ? false : (seen.add(s.label), true)))
      .slice(0, 5); // the desk shows the top three not already queued
  }, [world, view, me]);
}

const TIPS = [
  'Each month: answer the crisis {crisis}, add orders {orders} (◆ = political capital, refilled monthly), then Execute month.',
  'Arrows show the direction and size of consequences, not exact numbers. Your advisors disagree on purpose.',
  'Tap any country for its dossier. The map is your intelligence picture: foreign numbers are estimates, and some are wrong.',
];

/** The desk stacks on narrow screens: say "above/below" there, "left/right" on desktop. */
function layoutTip(tip: string): string {
  const stacked = typeof window !== 'undefined' && window.matchMedia?.('(max-width: 900px)').matches;
  return tip.replace('{crisis}', stacked ? 'at the top' : 'on the left').replace('{orders}', stacked ? 'below it' : 'on the right');
}

function CoachTip({ turn }: { turn: number }) {
  const [hidden, setHidden] = useState(() => {
    try {
      return localStorage.getItem('worldconflict.tips') === 'done';
    } catch {
      return false;
    }
  });
  if (hidden || turn >= TIPS.length) return null;
  const dismiss = () => {
    try {
      localStorage.setItem('worldconflict.tips', 'done');
    } catch {
      /* storage unavailable */
    }
    setHidden(true);
  };
  return (
    <div className="list-item" style={{ display: 'flex', gap: 10, alignItems: 'center', borderColor: 'rgba(79,179,217,0.4)', marginBottom: 10 }}>
      <span className="chip" style={{ color: 'var(--intel)', borderColor: 'rgba(79,179,217,0.4)' }}>
        TIP {turn + 1}/3
      </span>
      <p style={{ flex: 1, margin: 0, color: 'var(--text-1)' }}>{layoutTip(TIPS[turn])}</p>
      <button className="wc-btn ghost" style={{ padding: '4px 8px', fontSize: 12 }} onClick={dismiss}>
        Got it: no more tips
      </button>
    </div>
  );
}

export function Desk() {
  const world = useGameStore((s) => s.worldState);
  const pendingDecisions = useGameStore((s) => s.pendingDecisions);
  const decisionChoices = useGameStore((s) => s.decisionChoices);
  const pendingActions = useGameStore((s) => s.pendingActions);
  const removePendingAction = useGameStore((s) => s.removePendingAction);
  const selectedCountryId = useGameStore((s) => s.selectedCountryId);
  const view = useGameStore((s) => s.playerView);
  const isLoading = useGameStore((s) => s.isLoading);
  const gameOver = useGameStore((s) => s.gameOver);
  const suggestions = useSuggestions();
  const home = world?.playerCountryId;
  // A fresh month ignores Execute briefly, so a double-click can't skip a month unseen
  const advancedAt = useRef(0);
  const turnNow = world?.turn ?? -1;
  useEffect(() => {
    advancedAt.current = Date.now();
  }, [turnNow]);
  const execute = () => {
    if (Date.now() - advancedAt.current < 900) return;
    executeTurn();
  };
  const [showAll, setShowAll] = useState(false);
  const [target, setTarget] = useState<string>('');
  const [collapsed, setCollapsed] = useState(false);
  if (!world || gameOver) return null;

  // Crisis answers resolve before orders, and their capital cost (or gain) comes first.
  // An unanswered crisis falls to its default option, so count that one.
  const crisisPc = pendingDecisions.reduce((sum, d) => {
    const option = d.options.find((o) => o.id === (decisionChoices[d.id] ?? d.defaultOptionId ?? d.options[0]?.id));
    return sum + (option?.effects.pc ?? 0);
  }, 0);
  const pcLeft = capitalLeft(); // same rule the map menu and queueOrder use
  const unanswered = pendingDecisions.filter((d) => !decisionChoices[d.id]);
  const effectiveTarget = target || selectedCountryId || '';

  // The map's action menu queues through the same helper
  const add = (a: PendingAction) => void queueOrder(a);

  return (
    <section className="desk">
      <div className="desk-head">
        <h3>
          Your desk · <b>{pendingDecisions.length > 0 ? `${pendingDecisions.length} ${pendingDecisions.length > 1 ? 'crises' : 'crisis'}` : 'quiet month'}</b>
        </h3>
        <button className="wc-btn ghost" onClick={() => setCollapsed((c) => !c)} title={collapsed ? 'Expand' : 'Collapse'}>
          {collapsed ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
        </button>
      </div>
      {!collapsed && <CoachTip turn={world.turn} />}
      {!collapsed && (
        <div className="desk-row">
          {pendingDecisions.length > 0 && (
            <div style={{ flex: 1.3, display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
              {pendingDecisions.slice(0, 2).map((d) => (
                <CrisisCard key={d.id} decision={d} />
              ))}
            </div>
          )}

          <div className="orders">
            <div className="display" style={{ fontSize: 12, color: 'var(--text-3)', letterSpacing: '0.16em' }}>
              Advisors suggest · political capital left <span className="num" style={{ color: pcLeft < 0 ? 'var(--war)' : 'var(--accent)' }}>{pcLeft}</span>
              {crisisPc !== 0 && (
                <span style={{ marginLeft: 6, letterSpacing: 0, textTransform: 'none' }}>
                  (crisis answer {crisisPc > 0 ? '+' : '−'}{Math.abs(crisisPc)})
                </span>
              )}
            </div>
            <div className="suggestions">
              {suggestions
                .filter((s) => !pendingActions.some((a) => a.type === s.action.type && a.targetCountryId === s.action.targetCountryId))
                .slice(0, 3)
                .map((s) => (
                <button key={s.label} className={`suggestion fam-${actionFamily(s.action.type)}`} onClick={() => add(s.action)} disabled={pcCost(s.action.type) > pcLeft}>
                  <SceneFrame kind={sceneForAction(s.action.type)} home={home} other={s.action.targetCountryId} size="thumb" />
                  <div className="who">
                    <ActionIcon type={s.action.type} size={14} /> {s.who}
                  </div>
                  <b>
                    {s.label} <span className="num" style={{ color: 'var(--accent)', fontSize: 11 }}>{pcCost(s.action.type) ? `◆${pcCost(s.action.type)}` : 'free'}</span>
                  </b>
                  <div className="why">{s.why}</div>
                </button>
              ))}
            </div>

            <button className="wc-btn ghost" style={{ alignSelf: 'flex-start', padding: '6px 8px' }} onClick={() => setShowAll((v) => !v)}>
              {showAll ? 'Hide' : 'All orders'} {showAll ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
            </button>
            {showAll && (
              <div className="list-item" style={{ margin: 0 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Target</span>
                  <select className="leader-input" style={{ width: 220, padding: '6px 8px' }} value={effectiveTarget} onChange={(e) => setTarget(e.target.value)}>
                    <option value="">, tap a country on the map, </option>
                    {[...view].filter((v) => !v.isPlayer).sort((a, b) => a.name.localeCompare(b.name)).map((v) => (
                      <option key={v.id} value={v.id}>
                        {flag(v.id)} {v.name}
                      </option>
                    ))}
                  </select>
                </div>
                {Object.entries(CATALOG).map(([cat, items]) => (
                  <div key={cat} style={{ marginBottom: 8 }}>
                    <div className="display" style={{ fontSize: 12, color: 'var(--text-3)', letterSpacing: '0.14em' }}>{cat}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                      {items.map((o) => {
                        const needs = o.target && !effectiveTarget;
                        const label = o.target ? `${o.label} ${effectiveTarget ? countryName(effectiveTarget) : '…'}` : o.label;
                        return (
                          <button
                            key={o.label}
                            className={`wc-btn ${o.danger ? 'danger' : ''}`}
                            style={{ padding: '6px 10px', fontSize: 12.5 }}
                            disabled={needs || pcCost(o.type) > pcLeft}
                            onClick={() => add({ type: o.type, label, targetCountryId: o.target ? effectiveTarget : undefined, params: o.params })}
                          >
                            <ActionIcon type={o.type} size={15} />
                            {label}
                            <span className="num" style={{ fontSize: 10.5, color: 'var(--accent)' }}>{pcCost(o.type) ? `◆${pcCost(o.type)}` : ''}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="order-tray">
              {pendingActions.length === 0 && <span style={{ fontSize: 12, color: 'var(--text-3)' }}>No orders yet, pick a suggestion, or just execute the month.</span>}
              {pendingActions.map((a, i) => (
                <span key={`${a.label}-${i}`} className={`order-pill ${a.preview && (!a.preview.affordable || a.preview.missionWarning) ? 'blocked' : ''}`} title={a.preview?.missionWarning ?? a.preview?.summary}>
                  <ActionIcon type={a.type} size={14} />
                  {a.label}
                  {a.preview?.successChance != null && <span className="num" style={{ fontSize: 11, color: 'var(--text-2)' }}>{Math.round(a.preview.successChance <= 1 ? a.preview.successChance * 100 : a.preview.successChance)}%</span>}
                  <button onClick={() => removePendingAction(i)} aria-label="Remove order">
                    <IconX size={13} />
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div className="execute">
            {pendingDecisions.length > unanswered.length && (
              <div className="hint chosen-summary">
                {pendingDecisions
                  .filter((d) => decisionChoices[d.id])
                  .map((d) => `${d.title}: ${d.options.find((o) => o.id === decisionChoices[d.id])?.label ?? ''}`)
                  .join(' · ')}
              </div>
            )}
            {unanswered.length > 0 && (
              <div className="hint" style={{ color: 'var(--accent)' }}>
                <IconAlertTriangle size={13} style={{ verticalAlign: -2 }} /> {unanswered.length === 1 ? '1 crisis unanswered, it will resolve on its own' : `${unanswered.length} crises unanswered, they will resolve on their own`}
              </div>
            )}
            {pcLeft < 0 && (
              <div className="hint" style={{ color: 'var(--war)' }}>
                <IconAlertTriangle size={13} style={{ verticalAlign: -2 }} /> Orders exceed political capital by {-pcLeft}: remove one or the last will be refused
              </div>
            )}
            <button className="wc-btn primary big" disabled={isLoading} onClick={execute}>
              <IconSend size={18} /> {isLoading ? 'Resolving…' : 'Execute month'}
            </button>
            <div className="hint">
              {world.maxTurns - world.turn} month{world.maxTurns - world.turn === 1 ? '' : 's'} left
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
