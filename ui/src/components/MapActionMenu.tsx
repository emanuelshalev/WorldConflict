import { useEffect, useLayoutEffect, useRef } from 'react';
import { IconFileText, IconX } from '@tabler/icons-react';
import {
  type CountryFull,
  type PendingAction,
  type PlayerViewCountry,
  capitalLeft,
  orderKey,
  queueOrder,
  useGameStore,
} from '../store/gameStore';
import { pcCost } from '../lib/actions';
import { flag } from '../lib/format';
import { ActionIcon } from '../scenes/icons';
import { actionFamily } from '../scenes/actionIcons';

/** One order the map offers for a country: short button text plus the desk's full label. */
interface MapOrder {
  type: string;
  short: string;
  label: string;
  params?: Record<string, unknown>;
  danger?: boolean;
}

/**
 * The orders that make sense against this country right now, most relevant first. Labels match
 * the desk catalog ("Strike military targets in Iran"), so the tray and the report read the same.
 */
function mapOrdersFor(me: CountryFull, view: PlayerViewCountry): MapOrder[] {
  const id = view.id;
  const name = view.name;
  const atWar = me.atWarWith.includes(id);
  const allied = me.alliances.includes(id);
  const deployed = me.borderDeployments.some((d) => d.targetCountryId === id);
  const theirProgram = view.nuclearStatus === 'DEVELOPING';
  const myBomb = me.nuclear.status === 'ARMED' || me.nuclear.status === 'TESTED';
  const otherWar = view.atWarWith.some((x) => x !== me.id);
  const troops: MapOrder = deployed
    ? { type: 'MILITARY_WITHDRAW_BORDER', short: 'Withdraw troops', label: `Withdraw troops facing ${name}` }
    : { type: 'MILITARY_DEPLOY_BORDER', short: 'Mass troops', label: `Mass troops facing ${name}`, danger: true };
  const strike: MapOrder = {
    type: 'MILITARY_AIRSTRIKE',
    short: 'Airstrike',
    label: `Strike military targets in ${name}`,
    params: { targetType: 'MILITARY' },
    danger: true,
  };
  const nukeSites: MapOrder = {
    type: 'MILITARY_AIRSTRIKE',
    short: 'Hit nuclear sites',
    label: `Strike nuclear sites in ${name}`,
    params: { targetType: 'NUCLEAR' },
    danger: true,
  };
  const spy: MapOrder = { type: 'INTEL_GATHER', short: 'Spy on', label: `Spy on ${name}` };
  const sabotage: MapOrder = { type: 'INTEL_SABOTAGE', short: 'Sabotage', label: `Sabotage ${name}` };
  const destabilize: MapOrder = { type: 'INTEL_DESTABILIZE', short: 'Destabilize', label: `Destabilize ${name}` };

  if (atWar) {
    const out: MapOrder[] = [
      { type: 'DIPLOMACY_PROPOSE_CEASEFIRE', short: 'Ceasefire', label: `Propose ceasefire to ${name}` },
      strike,
      troops,
    ];
    if (theirProgram) out.push(nukeSites);
    out.push(spy, theirProgram ? sabotage : destabilize);
    if (myBomb) out.push({ type: 'NUCLEAR_STRIKE', short: 'Nuclear strike', label: `☢ Nuclear strike ${name}`, danger: true });
    return out;
  }
  const out: MapOrder[] = [
    { type: 'DIPLOMACY_IMPROVE_RELATIONS', short: 'Court', label: `Court ${name}` },
    { type: 'DIPLOMACY_DENOUNCE', short: 'Denounce', label: `Denounce ${name}` },
    spy,
    allied
      ? { type: 'DIPLOMACY_BREAK_ALLIANCE', short: 'Break pact', label: `Break pact with ${name}`, danger: true }
      : { type: 'DIPLOMACY_PROPOSE_ALLIANCE', short: 'Offer pact', label: `Offer defense pact to ${name}` },
  ];
  if (otherWar) out.push({ type: 'DIPLOMACY_MEDIATE', short: 'Mediate peace', label: `Mediate peace for ${name}` });
  out.push(troops, theirProgram ? sabotage : destabilize, strike);
  if (!allied) out.push({ type: 'DIPLOMACY_DECLARE_WAR', short: 'Declare war', label: `Declare war on ${name}`, danger: true });
  return out;
}

/** Why an order can't be given right now, or null when it can. */
function disabledReason(o: MapOrder, targetId: string, pcLeft: number, queued: PendingAction[]): string | null {
  const key = orderKey({ type: o.type, targetCountryId: targetId, params: o.params });
  if (queued.some((a) => orderKey(a) === key)) return 'Already on your desk';
  if (queued.length >= 6) return 'At most 6 orders a month';
  if (pcCost(o.type) > pcLeft) return `Needs ◆${pcCost(o.type)}, you have ◆${Math.max(0, pcLeft)}`;
  return null;
}

interface Props {
  countryId: string;
  /** Click point, in px relative to the map container. */
  x: number;
  y: number;
  /** The visible part of the map (not under the HUD or desk), relative to the container. */
  bounds: { top: number; bottom: number; left: number; right: number };
  onClose: () => void;
}

/** A compact order menu at the click point: the map's shortcut to the desk. */
export function MapActionMenu({ countryId, x, y, bounds, onClose }: Props) {
  const world = useGameStore((s) => s.worldState);
  const view = useGameStore((s) => s.playerView.find((v) => v.id === countryId));
  const pending = useGameStore((s) => s.pendingActions);
  // Re-render when crisis answers change the capital left
  useGameStore((s) => s.decisionChoices);
  const selectCountry = useGameStore((s) => s.selectCountry);
  const ref = useRef<HTMLDivElement>(null);

  // Place beside the click, flipped and clamped to stay inside the visible map
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const pad = 8;
    // Too little map showing (phones): dock as a sheet at the bottom of the screen instead
    if (h > bounds.bottom - bounds.top - pad * 2 || w > bounds.right - bounds.left - pad * 2) {
      el.classList.add('sheet');
      el.style.left = '';
      el.style.top = '';
      el.style.visibility = '';
      return;
    }
    let left = x + 14;
    if (left + w > bounds.right - pad) left = x - 14 - w;
    left = Math.max(bounds.left + pad, Math.min(left, bounds.right - w - pad));
    let top = y - 28;
    if (top + h > bounds.bottom - pad) top = bounds.bottom - pad - h;
    top = Math.max(bounds.top + pad, top);
    // Measured placement is applied straight to the element (no second render)
    el.classList.remove('sheet');
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
    el.style.visibility = '';
  }, [x, y, bounds.top, bounds.bottom, bounds.left, bounds.right, countryId]);

  // Escape closes the menu first (before the dossier or a drawer)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopImmediatePropagation();
      onClose();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  useEffect(() => {
    ref.current?.querySelector<HTMLButtonElement>('button.mam-item:not(:disabled)')?.focus({ preventScroll: true });
  }, [countryId]);

  const me = world?.countries.find((c) => c.id === world.playerCountryId);
  if (!world || !me || !view) return null;
  const pcLeft = capitalLeft();
  const orders = mapOrdersFor(me, view);
  const atWar = me.atWarWith.includes(countryId);
  const rel = Math.round(view.relationWithPlayer);
  const over = !!world.gameOver;

  const give = (o: MapOrder) => {
    onClose();
    void queueOrder({ type: o.type, label: o.label, targetCountryId: countryId, params: o.params });
  };

  return (
    <div
      ref={ref}
      className="map-action-menu"
      role="menu"
      aria-label={`Orders for ${view.name}`}
      style={{ left: x, top: y, visibility: 'hidden' }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="mam-head">
        <span className="mam-flag" aria-hidden>{flag(countryId)}</span>
        <div className="mam-title">
          <b>{view.name}</b>
          <span className={`mam-rel ${atWar ? 'war' : rel >= 20 ? 'warm' : rel <= -20 ? 'cold' : ''}`}>
            {atWar ? 'At war with you' : `${view.diplomaticLevel.replace(/_/g, ' ').toLowerCase()} · ${rel > 0 ? '+' : ''}${rel}`}
          </span>
        </div>
        <span className="mam-pc num" title="Political capital left this month">◆{Math.max(0, pcLeft)}</span>
        <button className="mam-close" onClick={onClose} aria-label="Close order menu">
          <IconX size={14} />
        </button>
      </div>
      <div className="mam-grid">
        {orders.map((o) => {
          const why = over ? 'The game is over' : disabledReason(o, countryId, pcLeft, pending);
          const cost = pcCost(o.type);
          return (
            <button
              key={`${o.type}:${String(o.params?.targetType ?? '')}`}
              role="menuitem"
              className={`mam-item fam-${actionFamily(o.type)} ${o.danger ? 'danger' : ''}`}
              disabled={!!why}
              title={why ?? o.label}
              onClick={() => give(o)}
            >
              <ActionIcon type={o.type} size={16} />
              <span className="mam-label">{o.short}</span>
              <span className="mam-cost num">{cost ? `◆${cost}` : 'free'}</span>
            </button>
          );
        })}
      </div>
      <button
        className="mam-dossier"
        role="menuitem"
        onClick={() => {
          onClose();
          selectCountry(countryId);
        }}
      >
        <IconFileText size={15} /> Dossier
        <span className="mam-hint">intel, history, more orders</span>
      </button>
    </div>
  );
}
