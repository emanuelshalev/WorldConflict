import { type ComponentType, useMemo, useState } from 'react';
import { IconArrowLeft, IconX } from '@tabler/icons-react';
import { type PendingAction, approveProposal, countryName, queueOrder, useGameStore } from '../../store/gameStore';
import { pcCost } from '../../lib/actions';
import { budgetShare } from '../../lib/budget';
import { TERMS } from '../../lib/glossary';
import { ActionIcon } from '../../scenes/icons';
import { CountryPicker } from '../orders/CountryPicker';
import { AdvisorCardRow } from './AdvisorList';
import { useAdvisorRows } from '../../lib/advisorRows';

/**
 * The orders agent's catalog (design-orders.md 4.5: OrderCard tiles with search) mounts here
 * when its module exists; until then the desk keeps its own catalog below. Vite resolves the
 * glob at build time, so a missing file is simply an empty map.
 */
type CatalogProps = { target: string; setTarget: (id: string) => void };
const ORDER_CATALOG = Object.values(import.meta.glob<{ OrderCatalog?: ComponentType<CatalogProps> }>('../orders/OrderCatalog.tsx', { eager: true }))[0]?.OrderCatalog;

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
      {def > 0 && <span className="num def">{Math.round(def * 100)}% defense</span>}
    </span>
  );
}

function SuggestionsDetail() {
  // The same shared order card as the map strip and the Focus view (F-02-5)
  const rows = useAdvisorRows();
  return (
    <article>
      <h3 className="detail-title">
        {TERMS.orderIdeas.name} ({rows.length})
      </h3>
      <p className="hint">The staff propose up to two of these at the start of each month, never one with poor odds or a repeat of last month, and always leave you at least ◆ 1. A recommended order spends nothing until you choose it (or press Choose all recommended); add the others here.</p>
      <div className="adv-list">
        {rows.map((r) => (
          <AdvisorCardRow key={r.key} r={r} />
        ))}
      </div>
    </article>
  );
}

const IRREVERSIBLE = new Set(['DIPLOMACY_DECLARE_WAR', 'NUCLEAR_STRIKE']);

function CatalogDetail({ target, setTarget }: { target: string; setTarget: (id: string) => void }) {
  if (ORDER_CATALOG) {
    const Catalog = ORDER_CATALOG;
    return <Catalog target={target} setTarget={setTarget} />;
  }
  return <DeskCatalog target={target} setTarget={setTarget} />;
}

function DeskCatalog({ target, setTarget }: { target: string; setTarget: (id: string) => void }) {
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
              // Irreversible orders need a deliberate press on the button, never Enter alone
              if (IRREVERSIBLE.has(h.o.type)) document.getElementById(`hit-${Math.min(sel, hits.length - 1)}`)?.focus();
              else add(h.o, h.t);
            } else if (e.key === 'Escape') (e.target as HTMLInputElement).blur();
          }}
          aria-label="Search orders (Up/Down to choose, Enter to add)"
        />
        <CountryPicker value={target} onChange={setTarget} mapPick placeholder="Target: choose a country" />
      </div>
      {!query && !target && <p className="hint">Orders aimed at a country need a target: pick a country first.</p>}
      {query ? (
        <div className="catalog-hits">
          {hits.length === 0 && <p className="hint">No order matches.</p>}
          {hits.map((h, i) => (
            <button key={`${h.label}-${i}`} id={`hit-${i}`} className={`wc-btn ${h.o.danger ? 'danger' : ''} ${i === Math.min(sel, hits.length - 1) ? 'hit-on' : ''}`} onClick={() => add(h.o, h.t)}>
              <ActionIcon type={h.o.type} size={15} /> {h.label} <Cost type={h.o.type} />
              {i === Math.min(sel, hits.length - 1) && (IRREVERSIBLE.has(h.o.type) ? <small className="hit-note">No undo: press to confirm</small> : <kbd>Enter</kbd>)}
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
      {a.proposed && (
        <p className="hint" data-proposal="">
          Recommended by your staff: nothing is spent until you choose it, and it does not run unless you do.{' '}
          <button type="button" className="wc-btn small primary" onClick={() => approveProposal(index)}>
            Choose order{pcCost(a.type) ? ` (spends ◆ ${pcCost(a.type)})` : ''}
          </button>
        </p>
      )}
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

/** An order view the month opened (All orders, an order of this month, the order ideas), with the way back. */
export function Detail({ target, setTarget }: { target: string; setTarget: (id: string) => void }) {
  const focus = useGameStore((s) => s.focus);
  const actions = useGameStore((s) => s.pendingActions);
  const setFocus = useGameStore((s) => s.setFocus);
  let body: React.ReactNode = null;
  if (focus.kind === 'catalog') body = <CatalogDetail target={target} setTarget={setTarget} />;
  else if (focus.kind === 'order') {
    const i = Number(focus.id);
    body = actions[i] ? <OrderDetail a={actions[i]} index={i} /> : null;
  }
  if (!body) body = <SuggestionsDetail />;
  return (
    <section className="detail" aria-live="polite" aria-label="Order views">
      <button type="button" className="wc-btn small detail-back" onClick={() => setFocus({ kind: 'mission' })}>
        <IconArrowLeft size={14} aria-hidden /> Back to the month
      </button>
      {body}
    </section>
  );
}
