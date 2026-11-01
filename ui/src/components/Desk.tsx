import { useMemo, useState } from 'react';
import { IconAlertTriangle, IconChevronDown, IconChevronUp, IconSend, IconX } from '@tabler/icons-react';
import {
  type PendingAction,
  type PendingDecision,
  countryName,
  executeTurn,
  fetchPreview,
  useGameStore,
  usePlayerCountry,
} from '../store/gameStore';
import { ADVISOR_NAMES, arrowText, effectArrows, flag } from '../lib/format';

// Mirrors src/core/costs.ts (PC per order)
const PC: Record<string, number> = {
  DIPLOMACY_IMPROVE_RELATIONS: 1,
  DIPLOMACY_PROPOSE_ALLIANCE: 2,
  DIPLOMACY_BREAK_ALLIANCE: 1,
  DIPLOMACY_DECLARE_WAR: 2,
  DIPLOMACY_PROPOSE_CEASEFIRE: 1,
  DIPLOMACY_MEDIATE: 2,
  MILITARY_MOBILIZE: 1,
  MILITARY_AIRSTRIKE: 1,
  NUCLEAR_FUND_PROGRAM: 1,
  ECONOMY_ADJUST_MILITARY_BUDGET: 1,
  INTEL_GATHER: 1,
  INTEL_COUNTER_INTEL: 1,
  INTEL_PROPAGANDA: 1,
  INTEL_SABOTAGE: 2,
  INTEL_DESTABILIZE: 2,
  INTEL_SUPPORT_REBELS: 2,
  INTEL_MISINFORMATION: 2,
  INTEL_ASSASSINATE: 3,
  INTEL_COUP: 3,
  DOMESTIC_PROPAGANDA: 1,
  DOMESTIC_REFORM: 2,
};
const pcCost = (type: string) => PC[type] ?? 0;

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
    { type: 'DIPLOMACY_PROPOSE_ALLIANCE', label: 'Offer defense pact', target: true },
    { type: 'DIPLOMACY_PROPOSE_CEASEFIRE', label: 'Propose ceasefire', target: true },
    { type: 'DIPLOMACY_MEDIATE', label: 'Mediate peace for', target: true },
    { type: 'DIPLOMACY_BREAK_ALLIANCE', label: 'Break pact', target: true, danger: true },
    { type: 'DIPLOMACY_DECLARE_WAR', label: 'Declare war', target: true, danger: true },
  ],
  Military: [
    { type: 'MILITARY_MOBILIZE', label: 'Mobilize forces' },
    { type: 'MILITARY_DEMOBILIZE', label: 'Stand down forces' },
    { type: 'MILITARY_PROCURE', label: 'Buy weapons' },
    { type: 'MILITARY_DEPLOY_BORDER', label: 'Mass troops facing', target: true, danger: true },
    { type: 'MILITARY_WITHDRAW_BORDER', label: 'Withdraw troops facing', target: true },
    { type: 'MILITARY_AIRSTRIKE', label: 'Strike military targets', target: true, danger: true, params: { targetType: 'MILITARY' } },
    { type: 'MILITARY_AIRSTRIKE', label: 'Strike nuclear sites', target: true, danger: true, params: { targetType: 'NUCLEAR' } },
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
  const existential = decision.urgency === 'EXISTENTIAL';
  return (
    <div className={`crisis ${existential ? 'existential' : ''}`}>
      <div className="stamp">
        {existential ? '⚠ EXISTENTIAL · EYES ONLY' : 'CRISIS · EYES ONLY'}{' '}
        {decision.affectedCountries
          .slice(0, 3)
          .map((id) => flag(id))
          .join(' ')}
      </div>
      <h4>{decision.title}</h4>
      <p className="situation">{decision.situation}</p>
      <div className="options">
        {decision.options.map((o) => (
          <button
            key={o.id}
            className={`option ${chosen === o.id ? 'chosen' : ''}`}
            onClick={() => choose(decision.id, o.id)}
          >
            <b>{o.label}</b>
            <div className="desc">{o.description}</div>
            <div className="arrows">
              {effectArrows(o, countryName).map((a) => (
                <span key={a.label} className={a.good ? 'delta-up' : 'delta-down'}>
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

function useSuggestions(): Suggestion[] {
  const world = useGameStore((s) => s.worldState);
  const view = useGameStore((s) => s.playerView);
  const me = usePlayerCountry();
  return useMemo(() => {
    if (!world || !me) return [];
    const out: Array<Suggestion & { p: number }> = [];
    const others = view.filter((v) => !v.isPlayer);
    for (const enemy of me.atWarWith) {
      const war = world.wars.find((w) => [w.attackerId, w.defenderId].includes(enemy) && [w.attackerId, w.defenderId].includes(me.id));
      const mine = war ? (war.attackerId === me.id ? war.frontline : 100 - war.frontline) : 50;
      out.push(
        mine < 50
          ? { p: 95, who: 'Foreign Minister', label: `Propose ceasefire to ${countryName(enemy)}`, why: 'The front is going badly. Stop the bleeding.', action: { type: 'DIPLOMACY_PROPOSE_CEASEFIRE', label: `Propose ceasefire to ${countryName(enemy)}`, targetCountryId: enemy } }
          : { p: 70, who: 'Defense Minister', label: 'Mobilize forces', why: 'We hold the initiative. Press it.', action: { type: 'MILITARY_MOBILIZE', label: 'Mobilize forces' } },
      );
    }
    // Mission requires a war between others to end: offer to broker talks
    const peaceGoal = [...(world.objective?.primary ?? []), ...(world.objective?.bonus ?? [])].find(
      (c) => c.kind === 'WAR_ENDED' && c.targetId && world.wars.some((w) => [w.attackerId, w.defenderId].includes(c.targetId as string)),
    );
    if (peaceGoal?.targetId && !me.atWarWith.includes(peaceGoal.targetId))
      out.push({ p: 90, who: 'Foreign Minister', label: `Mediate peace for ${countryName(peaceGoal.targetId)}`, why: 'Your mission needs this war to end. Every round of talks wears both sides down.', action: { type: 'DIPLOMACY_MEDIATE', label: `Mediate peace for ${countryName(peaceGoal.targetId)}`, targetCountryId: peaceGoal.targetId } });
    if (me.stability < 50 || me.legitimacy < 45)
      out.push({ p: 85, who: 'Interior Minister', label: 'Reform program', why: `Stability ${Math.round(me.stability)}%: the state needs shoring up.`, action: { type: 'DOMESTIC_REFORM', label: 'Reform program' } });
    if (me.approval < 55)
      out.push({ p: 75, who: 'Chief of Staff', label: 'National address', why: `Approval ${Math.round(me.approval)}%. Speak to the nation (works less if repeated).`, action: { type: 'DOMESTIC_PROPAGANDA', label: 'National address' } });
    const worst = [...others].filter((v) => !me.atWarWith.includes(v.id)).sort((a, b) => a.relationWithPlayer - b.relationWithPlayer)[0];
    if (worst && worst.relationWithPlayer < -20)
      out.push({ p: 60, who: 'Foreign Minister', label: `Court ${worst.name}`, why: `Relations ${Math.round(worst.relationWithPlayer)}. Lower the temperature before it boils over.`, action: { type: 'DIPLOMACY_IMPROVE_RELATIONS', label: `Court ${worst.name}`, targetCountryId: worst.id } });
    const friend = [...others].filter((v) => v.relationWithPlayer > 45 && !me.alliances.includes(v.id)).sort((a, b) => b.relationWithPlayer - a.relationWithPlayer)[0];
    if (friend)
      out.push({ p: 45, who: 'Foreign Minister', label: `Offer pact to ${friend.name}`, why: 'They like us. A defense pact deters our rivals.', action: { type: 'DIPLOMACY_PROPOSE_ALLIANCE', label: `Offer defense pact to ${friend.name}`, targetCountryId: friend.id } });
    const nuke = others.find((v) => v.nuclearStatus === 'DEVELOPING' && (v.nuclearProgress?.estimate ?? 0) > 35 && v.relationWithPlayer < -20);
    if (nuke)
      out.push({ p: 80, who: 'Intelligence Chief', label: `Spy on ${nuke.name}`, why: `Their program may be ~${Math.round(nuke.nuclearProgress?.estimate ?? 0)}% along. We need certainty.`, action: { type: 'INTEL_GATHER', label: `Spy on ${nuke.name}`, targetCountryId: nuke.id } });
    if (me.insurgencyLevel === 'REBELLION' || me.insurgencyLevel === 'GUERILLA')
      out.push({ p: 78, who: 'Interior Minister', label: 'Soft policing', why: 'Win hearts, not just streets. Slow but no backlash.', action: { type: 'DOMESTIC_POLICING', label: 'Soft policing', params: { tactic: 'SOFT' } } });
    if (out.length < 3)
      out.push({ p: 10, who: 'Intelligence Chief', label: 'Hunt foreign spies', why: 'Rivals are always probing. Harden our services.', action: { type: 'INTEL_COUNTER_INTEL', label: 'Hunt foreign spies' } });
    return out.sort((a, b) => b.p - a.p).slice(0, 3);
  }, [world, view, me]);
}

const TIPS = [
  'Each month: answer the crisis on the left, add orders on the right (◆ = political capital, refilled monthly), then Execute month.',
  'Arrows show the direction and size of consequences — not exact numbers. Your advisors disagree on purpose.',
  'Tap any country for its dossier. The map is your intelligence picture: foreign numbers are estimates, and some are wrong.',
];

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
      <p style={{ flex: 1, margin: 0, color: 'var(--text-1)' }}>{TIPS[turn]}</p>
      <button className="wc-btn ghost" style={{ padding: '4px 8px', fontSize: 12 }} onClick={dismiss}>
        Got it — no more tips
      </button>
    </div>
  );
}

export function Desk() {
  const world = useGameStore((s) => s.worldState);
  const pendingDecisions = useGameStore((s) => s.pendingDecisions);
  const decisionChoices = useGameStore((s) => s.decisionChoices);
  const pendingActions = useGameStore((s) => s.pendingActions);
  const addPendingAction = useGameStore((s) => s.addPendingAction);
  const removePendingAction = useGameStore((s) => s.removePendingAction);
  const selectedCountryId = useGameStore((s) => s.selectedCountryId);
  const view = useGameStore((s) => s.playerView);
  const isLoading = useGameStore((s) => s.isLoading);
  const gameOver = useGameStore((s) => s.gameOver);
  const suggestions = useSuggestions();
  const [showAll, setShowAll] = useState(false);
  const [target, setTarget] = useState<string>('');
  const [collapsed, setCollapsed] = useState(false);
  if (!world || gameOver) return null;

  const pcLeft = world.politicalCapital - pendingActions.reduce((s, a) => s + pcCost(a.type), 0);
  const unanswered = pendingDecisions.filter((d) => !decisionChoices[d.id]);
  const effectiveTarget = target || selectedCountryId || '';

  const add = async (a: PendingAction) => {
    if (pcCost(a.type) > pcLeft) {
      useGameStore.getState().setError(`Not enough political capital for "${a.label}" (${pcCost(a.type)} needed)`);
      return;
    }
    const preview = await fetchPreview({ type: a.type, targetCountryId: a.targetCountryId, value: a.value, params: a.params });
    if (preview?.blocked) {
      useGameStore.getState().setError(preview.blocked);
      return;
    }
    addPendingAction({ ...a, preview: preview ?? undefined });
  };

  return (
    <section className="desk">
      <div className="desk-head">
        <h3>
          Your desk · <b>{pendingDecisions.length > 0 ? `${pendingDecisions.length} crisis${pendingDecisions.length > 1 ? 'es' : ''}` : 'quiet month'}</b>
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
              Advisors suggest · political capital left <span className="num" style={{ color: 'var(--accent)' }}>{pcLeft}</span>
            </div>
            <div className="suggestions">
              {suggestions.map((s) => (
                <button key={s.label} className="suggestion" onClick={() => add(s.action)} disabled={pcCost(s.action.type) > pcLeft}>
                  <div className="who">{s.who}</div>
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
                    <option value="">— tap a country on the map —</option>
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
              {pendingActions.length === 0 && <span style={{ fontSize: 12, color: 'var(--text-3)' }}>No orders yet — pick a suggestion, or just execute the month.</span>}
              {pendingActions.map((a, i) => (
                <span key={`${a.label}-${i}`} className={`order-pill ${a.preview && !a.preview.affordable ? 'blocked' : ''}`} title={a.preview?.summary}>
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
            {unanswered.length > 0 && (
              <div className="hint" style={{ color: 'var(--accent)' }}>
                <IconAlertTriangle size={13} style={{ verticalAlign: -2 }} /> {unanswered.length} crisis unanswered — it will resolve on its own
              </div>
            )}
            <button className="wc-btn primary big" disabled={isLoading} onClick={() => executeTurn()}>
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
