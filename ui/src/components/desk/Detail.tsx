import { useMemo, useRef, useState } from 'react';
import { IconArrowLeft, IconArrowRight, IconCheck, IconMessageCircle, IconPlus, IconUserShare, IconX } from '@tabler/icons-react';
import {
  type DecisionOption,
  type Meeting,
  type PendingAction,
  type PendingDecision,
  MEETING_SLOTS,
  countryName,
  orderKey,
  queueOrder,
  useGameStore,
  usePlayerCountry,
} from '../../store/gameStore';
import { ADVISOR_NAMES, arrowText, effectArrows, flag } from '../../lib/format';
import { pcCost } from '../../lib/actions';
import { budgetShare } from '../../lib/budget';
import { computeSuggestions, crisisStaffPick, meetingSuggestion, missionRisk } from '../../lib/staff';
import { SceneFrame } from '../../scenes/SceneFrame';
import { sceneForAction, sceneForCrisis } from '../../scenes/kinds';
import { ActionIcon } from '../../scenes/icons';
import { actionFamily } from '../../scenes/actionIcons';
import { deskItems } from '../../lib/deskItems';

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

function Cost({ type }: { type: string }) {
  const pc = pcCost(type);
  const def = budgetShare(type);
  return (
    <span className="cost">
      {pc ? <span className="num pc">◆{pc}</span> : <span className="num free">free</span>}
      {def > 0 && <span className="num def">{Math.round(def * 100)}% def</span>}
    </span>
  );
}

function Arrows({ o }: { o: DecisionOption }) {
  return (
    <div className="arrows">
      {effectArrows(o, countryName).map((a, i) => (
        <span key={`${a.label}-${i}`} className={a.good ? 'delta-up' : 'delta-down'}>
          {arrowText(a)}
        </span>
      ))}
    </div>
  );
}

function Option({ o, chosen, tag, disabled, onPick, risk }: { o: DecisionOption; chosen: boolean; tag?: string; disabled?: boolean; onPick: () => void; risk?: string | null }) {
  return (
    <button className={`option ${chosen ? 'chosen' : ''}`} onClick={onPick} disabled={disabled} aria-pressed={chosen}>
      <b>{o.label}</b>
      {tag && <span className={`opt-tag ${tag === 'Staff pick' ? 'staff' : 'suggest'}`}>{tag}</span>}
      {risk && (
        <span className="opt-tag risk" title={risk}>
          ⚠ mission
        </span>
      )}
      {(o.effects.pc ?? 0) !== 0 && <span className="num opt-pc">{(o.effects.pc ?? 0) > 0 ? '+' : '−'}◆{Math.abs(o.effects.pc ?? 0)}</span>}
      <div className="desc">{o.description}</div>
      <Arrows o={o} />
      {o.backedBy.length > 0 && <div className="backers">Backed by {o.backedBy.map((b) => ADVISOR_NAMES[b] ?? b).join(', ')}</div>}
    </button>
  );
}

function CrisisDetail({ d }: { d: PendingDecision }) {
  const choices = useGameStore((s) => s.decisionChoices);
  const choose = useGameStore((s) => s.chooseDecision);
  const reviewed = useGameStore((s) => s.reviewed);
  const objective = useGameStore((s) => s.worldState?.objective);
  const home = useGameStore((s) => s.worldState?.playerCountryId);
  const staff = useMemo(() => crisisStaffPick(d, objective), [d, objective]);
  const existential = d.urgency === 'EXISTENTIAL';
  return (
    <article className={`detail-crisis ${existential ? 'existential' : ''}`}>
      <SceneFrame
        kind={sceneForCrisis(d.templateId, d.title, d.situation)}
        home={home}
        other={d.affectedCountries.find((id) => id !== home)}
        mood={existential || d.urgency === 'URGENT' ? 'bad' : 'neutral'}
        size="card"
        kicker={`${existential ? 'Existential' : d.urgency === 'URGENT' ? 'Urgent' : 'Crisis'} ${d.affectedCountries.slice(0, 3).map((id) => flag(id)).join(' ')}`}
        headline={d.title}
      />
      <div className="detail-bar">
        <span className={`nav-tag ${reviewed[d.id] ? 'mine' : 'staff'}`}>{reviewed[d.id] ? 'Your call' : `Staff pick: ${staff.label}`}</span>
        {!reviewed[d.id] && (
          <button className="wc-btn ghost small" onClick={() => choose(d.id, choices[d.id] ?? staff.id)}>
            <IconCheck size={14} /> Approve staff pick
          </button>
        )}
        <button
          className="wc-btn ghost small"
          onClick={() => useGameStore.getState().consult(d.options.find((o) => o.backedBy.length)?.backedBy[0] ?? 'CHIEF_OF_STAFF', `${d.title}: what do you advise, and what are the risks of each option?`)}
        >
          <IconMessageCircle size={14} /> Consult your staff
        </button>
      </div>
      <p className="situation">{d.situation}</p>
      <div className="options">
        {d.options.map((o) => (
          <Option key={o.id} o={o} chosen={choices[d.id] === o.id} tag={o.id === staff.id ? 'Staff pick' : undefined} risk={missionRisk(o, objective)} onPick={() => choose(d.id, o.id)} />
        ))}
      </div>
    </article>
  );
}

const KIND_SCENE: Record<Meeting['kind'], Parameters<typeof SceneFrame>[0]['kind']> = { CALL: 'address', STAFF: 'cabinet', VISIT: 'summit', PRESS: 'tv_interview' };
const KIND_WORD: Record<Meeting['kind'], string> = { CALL: 'Call', STAFF: 'Staff meeting', VISIT: 'State visit', PRESS: 'Interview' };

function advisorFor(m: Meeting): string {
  if (m.kind === 'CALL' || m.kind === 'VISIT') return 'FOREIGN_MINISTER';
  if (m.kind === 'PRESS') return 'CHIEF_OF_STAFF';
  if (/front|troops/i.test(m.title)) return 'DEFENSE_MINISTER';
  if (/economy/i.test(m.title)) return 'FINANCE_MINISTER';
  if (/unrest/i.test(m.title)) return 'DOMESTIC_ADVISOR';
  if (/intelligence/i.test(m.title)) return 'INTELLIGENCE_CHIEF';
  return 'CHIEF_OF_STAFF';
}

function MeetingDetail({ m }: { m: Meeting }) {
  const me = usePlayerCountry();
  const choices = useGameStore((s) => s.decisionChoices);
  const choose = useGameStore((s) => s.chooseDecision);
  const agenda = useGameStore((s) => s.worldState?.agenda ?? []);
  const attended = agenda.filter((x) => x.id !== m.id && choices[x.id] && choices[x.id] !== x.defaultOptionId).length;
  const full = attended >= MEETING_SLOTS;
  const picked = choices[m.id];
  const suggestion = meetingSuggestion(m);
  return (
    <article className="detail-meeting">
      <SceneFrame kind={KIND_SCENE[m.kind]} home={me?.id} other={m.withCountry} size="card" live kicker={`${KIND_WORD[m.kind]}${m.withCountry ? ` ${flag(m.withCountry)}` : ''}`} headline={m.speaker} />
      <div className="detail-bar">
        <span className={`nav-tag ${!picked ? 'suggest' : picked === m.defaultOptionId ? 'deputy' : 'mine'}`}>
          {!picked ? 'Waiting for you: a deputy goes if you do not answer' : picked === m.defaultOptionId ? 'Deputy goes' : 'You attend'}
        </span>
        {suggestion && picked !== suggestion.id && (
          <button className="wc-btn ghost small" disabled={full && !picked} onClick={() => choose(m.id, suggestion.id)}>
            <IconCheck size={14} /> Approve suggestion: {suggestion.label}
          </button>
        )}
        {picked !== m.defaultOptionId && m.defaultOptionId && (
          <button className="wc-btn ghost small" onClick={() => choose(m.id, m.defaultOptionId as string)}>
            <IconUserShare size={14} /> Send deputy
          </button>
        )}
        <button className="wc-btn ghost small" onClick={() => useGameStore.getState().consult(advisorFor(m), `${m.title}. ${m.situation} How should I respond?`)}>
          <IconMessageCircle size={14} /> Consult
        </button>
      </div>
      <h3 className="detail-title">{m.title}</h3>
      <blockquote className="situation">{m.situation}</blockquote>
      {full && !picked && <p className="hint warn">Your calendar is full (3 in person). Send a deputy to another meeting to take this one.</p>}
      <div className="options">
        {m.options
          .filter((o) => o.id !== m.defaultOptionId)
          .map((o) => (
            <Option key={o.id} o={o} chosen={picked === o.id} tag={o.id === suggestion?.id ? 'Staff suggests' : undefined} disabled={full && picked !== o.id && !picked} onPick={() => choose(m.id, o.id)} />
          ))}
      </div>
    </article>
  );
}

function SuggestionsDetail() {
  const world = useGameStore((s) => s.worldState);
  const view = useGameStore((s) => s.playerView);
  const actions = useGameStore((s) => s.pendingActions);
  const remove = useGameStore((s) => s.removePendingAction);
  const me = usePlayerCountry();
  const home = world?.playerCountryId;
  const suggestions = useMemo(() => computeSuggestions(world, view, me), [world, view, me]);
  return (
    <article>
      <h3 className="detail-title">Your staff suggest</h3>
      <p className="hint">The staff queue up to two of these at the start of each month, never one with poor odds or a repeat of last month, and always leave you at least 1 ◆. Remove what you do not want; add the others here.</p>
      <div className="sugg-list">
        {suggestions.map((s) => {
          const i = actions.findIndex((a) => orderKey(a) === orderKey(s.action));
          return (
            <div key={s.label} className={`sugg-row fam-${actionFamily(s.action.type)} ${i >= 0 ? 'queued' : ''}`}>
              <SceneFrame kind={sceneForAction(s.action.type)} home={home} other={s.action.targetCountryId} size="thumb" />
              <div className="sugg-body">
                <div className="who">
                  <ActionIcon type={s.action.type} size={14} /> {s.who}
                </div>
                <b>
                  {s.label} <Cost type={s.action.type} />
                </b>
                <div className="why">{s.why}</div>
              </div>
              {i >= 0 ? (
                <button className="wc-btn small" onClick={() => remove(i)}>
                  <IconX size={14} /> Remove
                </button>
              ) : (
                <button className="wc-btn primary small" onClick={() => void queueOrder({ ...s.action, origin: 'player', why: `${s.who}: ${s.why}` })}>
                  <IconPlus size={14} /> Add
                </button>
              )}
            </div>
          );
        })}
      </div>
    </article>
  );
}

function CatalogDetail({ target, setTarget }: { target: string; setTarget: (id: string) => void }) {
  const view = useGameStore((s) => s.playerView);
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(0);
  const others = useMemo(() => [...view].filter((v) => !v.isPlayer).sort((a, b) => a.name.localeCompare(b.name)), [view]);
  const query = q.trim().toLowerCase();
  // "spy ir" finds Spy on Iran: every word must start a word of the order or the country
  const matches = (label: string) => !query || query.split(/\s+/).every((w) => label.toLowerCase().split(/\s+/).some((x) => x.startsWith(w)));
  const hits = query
    ? Object.values(CATALOG)
        .flat()
        .flatMap((o) => (o.target ? others.map((v) => ({ o, t: v.id, label: `${o.label} ${v.name}` })) : [{ o, t: '', label: o.label }]))
        .filter((h) => matches(h.label))
        .slice(0, 8)
    : [];
  const add = (o: OrderDef, t: string) => void queueOrder({ type: o.type, label: o.target ? `${o.label} ${countryName(t)}` : o.label, targetCountryId: o.target ? t : undefined, params: o.params, origin: 'player' });
  return (
    <article>
      <h3 className="detail-title">All orders</h3>
      <div className="catalog-top">
        <input id="catalog-search" className="leader-input" placeholder="Search: spy iran, court china, reform" value={q} onChange={(e) => {
            setQ(e.target.value);
            setSel(0);
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
              e.preventDefault();
              setSel((v) => Math.max(0, Math.min(hits.length - 1, v + (e.key === 'ArrowDown' ? 1 : -1))));
            } else if (e.key === 'Enter' && hits[Math.min(sel, hits.length - 1)]) {
              const h = hits[Math.min(sel, hits.length - 1)];
              add(h.o, h.t);
            } else if (e.key === 'Escape') (e.target as HTMLInputElement).blur();
          }}
          aria-label="Search orders (Up/Down to choose, Enter to add)"
        />
        <select className="leader-input" value={target} onChange={(e) => setTarget(e.target.value)} aria-label="Target country">
          <option value="">Target: pick a country</option>
          {others.map((v) => (
            <option key={v.id} value={v.id}>
              {flag(v.id)} {v.name} ({Math.round(v.relationWithPlayer)})
            </option>
          ))}
        </select>
      </div>
      {query ? (
        <div className="catalog-hits">
          {hits.length === 0 && <p className="hint">No order matches.</p>}
          {hits.map((h, i) => (
            <button key={`${h.label}-${i}`} className={`wc-btn ${h.o.danger ? 'danger' : ''} ${i === Math.min(sel, hits.length - 1) ? 'hit-on' : ''}`} onClick={() => add(h.o, h.t)}>
              <ActionIcon type={h.o.type} size={15} /> {h.label} <Cost type={h.o.type} />
              {i === Math.min(sel, hits.length - 1) && <kbd>Enter</kbd>}
            </button>
          ))}
        </div>
      ) : (
        Object.entries(CATALOG).map(([cat, items]) => (
          <div key={cat} className="catalog-cat">
            <div className="nav-head">{cat}</div>
            <div className="catalog-btns">
              {items.map((o) => {
                const needs = o.target && !target;
                return (
                  <button key={o.label} className={`wc-btn ${o.danger ? 'danger' : ''}`} disabled={!!needs} onClick={() => add(o, target)}>
                    <ActionIcon type={o.type} size={15} />
                    {o.target ? `${o.label} ${target ? countryName(target) : '…'}` : o.label}
                    <Cost type={o.type} />
                  </button>
                );
              })}
            </div>
          </div>
        ))
      )}
    </article>
  );
}

function OrderDetail({ a, index }: { a: PendingAction; index: number }) {
  const remove = useGameStore((s) => s.removePendingAction);
  const setFocus = useGameStore((s) => s.setFocus);
  const p = a.preview;
  return (
    <article>
      <h3 className="detail-title">
        <ActionIcon type={a.type} size={18} /> {a.label} <Cost type={a.type} />
      </h3>
      {a.why && <p className="hint">{a.why}</p>}
      {p && (
        <>
          <p className="situation">{p.summary}</p>
          {p.successChance != null && <p>Chance of success: <b className="num">{Math.round(p.successChance <= 1 ? p.successChance * 100 : p.successChance)}%</b></p>}
          {p.effects.length > 0 && (
            <ul className="preview-effects">
              {p.effects.map((e, i) => (
                <li key={i}>
                  {e.metric} <b className="num">{e.delta}</b>{e.note ? ` (${e.note})` : ''}
                </li>
              ))}
            </ul>
          )}
          {p.risks.length > 0 && <p className="hint warn">Risks: {p.risks.join('; ')}</p>}
          {p.missionWarning && <p className="hint warn">⚠ {p.missionWarning}</p>}
        </>
      )}
      <button
        className="wc-btn"
        onClick={() => {
          remove(index);
          setFocus({ kind: 'suggestions' });
        }}
      >
        <IconX size={14} /> Remove this order
      </button>
    </article>
  );
}

function MissionDetail() {
  const world = useGameStore((s) => s.worldState);
  const status = useGameStore((s) => s.objectiveStatus);
  if (!world?.objective) return null;
  return (
    <article>
      <h3 className="detail-title">◎ {world.objective.title}</h3>
      <p className="hint">
        {world.maxTurns - world.turn} months left · leadership score <b className="num">{world.score?.total ?? 0}</b>
      </p>
      {world.objective.briefing && <p className="situation">{world.objective.briefing}</p>}
      <ul className="mission-list">
        {status.map((c) => (
          <li key={c.label} className={c.failed ? 'failed' : c.met ? 'met' : ''}>
            {c.failed ? '✗' : c.met ? '✓' : '○'} {c.label} {c.bonus && <span className="nav-tag">bonus</span>}
          </li>
        ))}
      </ul>
    </article>
  );
}

/** The one item in focus, with previous/next to walk the desk. */
export function Detail({ target, setTarget }: { target: string; setTarget: (id: string) => void }) {
  const focus = useGameStore((s) => s.focus);
  const decisions = useGameStore((s) => s.pendingDecisions);
  const agenda = useGameStore((s) => s.worldState?.agenda ?? []);
  const actions = useGameStore((s) => s.pendingActions);
  const setFocus = useGameStore((s) => s.setFocus);
  const ref = useRef<HTMLDivElement>(null);
  let body: React.ReactNode = null;
  if (focus.kind === 'crisis') {
    const d = decisions.find((x) => x.id === focus.id);
    body = d ? <CrisisDetail d={d} /> : null;
  } else if (focus.kind === 'meeting') {
    const m = agenda.find((x) => x.id === focus.id);
    body = m ? <MeetingDetail m={m} /> : null;
  } else if (focus.kind === 'suggestions') body = <SuggestionsDetail />;
  else if (focus.kind === 'catalog') body = <CatalogDetail target={target} setTarget={setTarget} />;
  else if (focus.kind === 'order') {
    const i = Number(focus.id);
    body = actions[i] ? <OrderDetail a={actions[i]} index={i} /> : null;
  } else body = <MissionDetail />;
  if (!body) body = <SuggestionsDetail />;
  const items = deskItems();
  const at = items.findIndex((x) => x.kind === focus.kind && (x.id ?? '') === (focus.id ?? ''));
  const go = (n: number) => {
    const next = items[at + n];
    if (next) {
      setFocus({ kind: next.kind, id: next.id });
      ref.current?.scrollTo({ top: 0 });
    }
  };
  return (
    <section className="detail" ref={ref} aria-live="polite" aria-label="Item in focus">
      {body}
      {at >= 0 && (
        <div className="detail-nav">
          <button className="wc-btn ghost small" disabled={at <= 0} onClick={() => go(-1)}>
            <IconArrowLeft size={14} /> {items[at - 1]?.label ?? 'Previous'} <kbd>K</kbd>
          </button>
          <button className="wc-btn ghost small" disabled={at >= items.length - 1} onClick={() => go(1)}>
            {items[at + 1]?.label ?? 'Next'} <IconArrowRight size={14} /> <kbd>J</kbd>
          </button>
        </div>
      )}
    </section>
  );
}
