import { type ReactNode, type Ref, useCallback, useEffect, useId, useImperativeHandle, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { IconCheck, IconInfoCircle, IconLock, IconPlus, IconX } from '@tabler/icons-react';
import { type ConfirmNeed, type PendingAction, orderKey, queueOrder, useGameStore } from '../../store/gameStore';
import { proposalEffects } from '../../lib/month';
import { CardCost, CardShell } from '../game/CardShell';
import { spendSeals } from '../game/SealFlight';
import { type OrderDef, orderAction, orderBlurb, orderFor, orderLabel } from '../../lib/orders';
import { TERMS, term } from '../../lib/glossary';
import { pcCost } from '../../lib/actions';
import { defenseShareOf, type MonthBlock } from '../../lib/availability';
import { pointAt } from '../../lib/pointAt';
import { shake } from '../../lib/motion';
import { sound } from '../../lib/sound';
import { sceneForAction } from '../../scenes/kinds';
import { actionFamily } from '../../scenes/actionIcons';
import { ConfirmFace } from './ConfirmFace';
import { OrderPreview } from './OrderPreview';
import { previewOf } from './preview';
import { useOrderState } from './useOrders';
import '../../styles/orders.css';

/** What a parent (the catalog's search box) can do with a card. */
export interface OrderCardHandle {
  /**
   * Enter on a search hit: queue an available order, open the confirm face of an irreversible
   * one, or (unavailable) shake, point at the resource and focus the fix. Never queues on its own
   * an order that needs confirmation.
   */
  activate: () => void;
  /** Focus the card's press target. */
  focus: () => void;
}

export interface OrderCardProps {
  def: OrderDef;
  /** The target country (targeted orders). Missing: the card shows "Pick a country first." */
  targetId?: string;
  /** `tile`: desk catalog and map menu. `row`: phone sheet, search hits, staff picks, dossier. */
  variant?: 'tile' | 'row';
  /** Replaces the registry blurb (staff picks: "Foreign Minister: ..."). */
  blurb?: ReactNode;
  /** Who proposed it, for "Staff pick: Foreign Minister" when it is queued. */
  staff?: string;
  /** The search hit under the cursor: shows the Enter hint. */
  selected?: boolean;
  /** Tight spaces (map menu tiles): smaller art band, no blurb, one chip line. */
  compact?: boolean;
  /** The NEEDS_TARGET fix: focus the target picker. */
  onPickTarget?: () => void;
  /** A press on the queued card (desk: open it in the detail pane). Default: toggles the forecast. */
  onOpen?: (index: number) => void;
  /** After the order was added (index in the tray). */
  onQueued?: (index: number) => void;
  /** Extra props for the queued action (origin, why). */
  extra?: Partial<PendingAction>;
  /** Show the forecast beside the tile on hover/focus (desktop). Default true for tiles. */
  hoverPreview?: boolean;
  handle?: Ref<OrderCardHandle>;
  className?: string;
}

/** The first free-standing seal bank on screen (HUD or rail), where a spend flight leaves from. */
function bankEl(): Element | null {
  const els = [...document.querySelectorAll('[data-point="capital"]')];
  return els.find((e) => e.querySelector('[data-seal]') && e.getBoundingClientRect().width > 0) ?? els.find((e) => e.getBoundingClientRect().width > 0) ?? null;
}

function confirmCopy(def: OrderDef, label: string, need: ConfirmNeed) {
  if (def.type === 'NUCLEAR_STRIKE') return { kind: 'nuclear' as const, question: `Authorize a ${label.charAt(0).toLowerCase()}${label.slice(1)}?`, confirmText: 'Hold to authorize', cancelText: 'Stand down' };
  if (need.irreversible) return { kind: 'war' as const, question: `${label}?`, confirmText: def.type === 'DIPLOMACY_DECLARE_WAR' ? 'Declare war' : 'Give the order', cancelText: 'Keep the peace' };
  return { kind: 'mission' as const, question: `${label} anyway?`, confirmText: 'Give the order', cancelText: 'Cancel' };
}

/**
 * The order card (design-orders.md §4): one component for the desk catalog, search hits, staff
 * picks, the map menu and the dossier, drawn in the briefing card shell (design-feel.md §3).
 * Every card shows its state before any press: available, unaffordable (amber, the reason and its
 * fix), invalid (dashed, the rule and an alternative), queued (green, "In this month", Remove) and
 * confirming (the red confirm face for war and nuclear use, amber for a mission warning).
 */
export function OrderCard({
  def,
  targetId,
  variant = 'tile',
  blurb,
  staff,
  selected = false,
  compact = false,
  onPickTarget,
  onOpen,
  onQueued,
  extra,
  hoverPreview,
  handle,
  className = '',
}: OrderCardProps) {
  const st = useOrderState(def, targetId);
  const remove = useGameStore((s) => s.removePendingAction);
  const home = useGameStore((s) => s.worldState?.playerCountryId);
  const wrap = useRef<HTMLDivElement>(null);
  const uid = useId().replace(/:/g, '');
  const [confirm, setConfirm] = useState<ConfirmNeed | null>(null);
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState(false);
  const [alarm, setAlarm] = useState(false);
  // A late block from the server (the rules changed since the menu loaded) stands for that month only
  const [lateBlock, setLateBlock] = useState<{ block: MonthBlock; key: string } | null>(null);

  const { label, entry, month } = st;
  const lateKey = `${month.ordersUsed}:${targetId ?? ''}`;
  const late = lateBlock && lateBlock.key === lateKey ? lateBlock.block : null;
  const avail = late && st.avail.state === 'available' ? { state: 'invalid' as const, block: late } : st.avail;
  const block = avail.block;
  const pc = entry?.costPC ?? pcCost(def.type);
  const share = entry && entry.budgetM > 0 && entry.costM > 0 ? entry.costM / entry.budgetM : defenseShareOf(def.type);
  const isQueued = avail.state === 'queued';
  // A staff proposal for this very order (F-02-4): the card offers Approve, and shows what it changes
  const myKey = orderKey(orderAction(def, st.targetId, st.targetName));
  const proposalIndex = useGameStore((s) => s.pendingActions.findIndex((a) => a.proposed && orderKey(a) === myKey));
  const proposal = useGameStore((s) => (proposalIndex >= 0 ? s.pendingActions[proposalIndex] : undefined));
  const isProposal = !!proposal && !isQueued;
  const proposalFx = proposal ? proposalEffects(proposal) : '';
  const off = avail.state === 'unaffordable' || avail.state === 'invalid';
  const fam = actionFamily(def.type);

  const pointBlock = useCallback(
    (b: MonthBlock | null) => {
      if (!b?.points) return;
      const slots = b.code === 'NO_CAPITAL' ? b.slots : b.code === 'NO_DEFENSE_BUDGET' ? month.queuedKeys.map((_, i) => i).filter((i) => month.queuedCosts[i] >= 0 && defenseShareOf(month.queuedKeys[i].split(':')[0]) > 0) : undefined;
      pointAt(b.points === 'orders' ? ['orders', 'tray'] : b.points, {
        detail: b.code === 'NO_CAPITAL' ? `${label} needs ◆ ${pc}` : undefined,
        slots,
      });
    },
    [label, pc, month.queuedKeys, month.queuedCosts],
  );

  const focusFix = () => wrap.current?.querySelector<HTMLButtonElement>('[data-fix]')?.focus({ preventScroll: true });

  /** Pressed while unavailable (CardShell already shook it and played `refuse`). */
  const refused = () => {
    setAlarm(true);
    window.setTimeout(() => setAlarm(false), 900);
    pointBlock(block);
    if (block?.code === 'NEEDS_TARGET') onPickTarget?.();
    focusFix();
  };

  const give = async (confirmed = false) => {
    if (busy) return;
    if (!confirmed && !isProposal && (def.irreversible || entry?.irreversible || entry?.missionWarning)) {
      setConfirm({ irreversible: !!(def.irreversible || entry?.irreversible), missionWarning: entry?.missionWarning ?? null, preview: null });
      return;
    }
    setBusy(true);
    const action = { ...orderAction(def, st.targetId, st.targetName), origin: 'player' as const, ...extra };
    const r = await queueOrder(action, { confirmed });
    setBusy(false);
    if (r.ok) {
      setConfirm(null);
      onQueued?.(r.index);
      pointAt(pc > 0 ? ['tray', 'capital'] : 'tray', { slots: [r.index] });
      if (pc > 0) void spendSeals(bankEl(), wrap.current?.querySelector('[data-seal-target]'), { count: pc });
      else sound.play('stamp');
      return;
    }
    if (r.confirm) {
      setConfirm(r.confirm);
      return;
    }
    setConfirm(null);
    sound.play('refuse');
    shake(wrap.current?.querySelector('.wc-card'));
    if (r.block && !['NO_CAPITAL', 'NO_DEFENSE_BUDGET', 'ORDER_LIMIT', 'DUPLICATE'].includes(r.block.code)) setLateBlock({ block: r.block, key: lateKey });
    window.setTimeout(focusFix, 0);
  };

  const activate = () => {
    if (confirm) return;
    if (isQueued) {
      if (onOpen) onOpen(st.queuedIndex);
      else setInfo((v) => !v);
      return;
    }
    if (off) {
      sound.play('refuse');
      shake(wrap.current?.querySelector('.wc-card'));
      refused();
      return;
    }
    void give(false);
  };

  useImperativeHandle(handle, () => ({
    activate,
    focus: () => wrap.current?.querySelector<HTMLButtonElement>('.wc-card-hit')?.focus({ preventScroll: true }),
  }));

  const cancelConfirm = useCallback(() => {
    setConfirm(null);
    window.setTimeout(() => wrap.current?.querySelector<HTMLButtonElement>('.wc-card-hit')?.focus({ preventScroll: true }), 0);
  }, []);

  // ---------- the confirm face replaces the card ----------
  if (confirm) {
    const copy = confirmCopy(def, label, confirm);
    const src = confirm.preview ?? entry;
    const lines = [
      ...(src?.effects ?? []).slice(0, 2).map((e) => `${e.target && e.target !== 'Global' ? `${e.target}: ` : ''}${e.metric} ${e.delta}`),
      ...(src?.risks ?? []).slice(0, 2),
    ];
    return (
      <div ref={wrap} className={`ord-wrap ord-${variant} is-confirming ${className}`.trim()} data-order-id={def.id} data-order-state="confirming">
        <ConfirmFace {...copy} missionWarning={confirm.missionWarning} lines={lines} onConfirm={() => void give(true)} onCancel={cancelConfirm} />
      </div>
    );
  }

  // ---------- chips ----------
  const chips: ReactNode[] = [];
  if (def.irreversible) chips.push(<span key="undo" className="ord-chip ord-noundo">{TERMS.noUndo.name}</span>);
  if (isQueued && pc > 0) chips.push(<span key="held" className="ord-chip ord-held num">◆ {pc} held</span>);
  if (isProposal) chips.push(<span key="prop" className="ord-chip ord-proposed">{TERMS.proposed.name}</span>);
  if (share > 0) chips.push(<span key="def" className="ord-chip ord-def num">{term(TERMS.defense.compact, Math.round(share * 100))}</span>);
  // The resting card names the odds only; the effect sizes ("Approval about +3") open on Forecast,
  // hover or focus (F-01-6), so the tile stays quiet
  if (entry && entry.chance !== null && avail.state !== 'invalid') chips.push(<span key="ch" className="ord-chip ord-chance num">{term(TERMS.chance.name, entry.chance)}</span>);

  // ---------- the state line and its fix ----------
  const fix = renderFix();
  function renderFix(): ReactNode {
    if (!block) return null;
    const b = block;
    if (b.code === 'DUPLICATE') return null;
    if (b.code === 'NO_CAPITAL') {
      const slot = b.slots?.[0];
      return (
        <>
          {slot !== undefined && (
            <button
              type="button"
              className="ord-fix"
              data-fix=""
              onClick={() => remove(slot)}
              onMouseEnter={() => pointAt('capital', { slots: [slot], detail: `${label} needs ◆ ${pc}` })}
            >
              Remove {month.queuedStaff[slot] ? 'a staff order' : month.queuedLabels[slot]} (frees ◆ {month.queuedCosts[slot]})
            </button>
          )}
          <span className="ord-refill">{slot !== undefined ? `or wait: ${b.refill}` : b.refill?.startsWith('+') ? `Wait: ${b.refill}` : b.refill}</span>
        </>
      );
    }
    if (b.code === 'NEEDS_TARGET')
      return (
        <button
          type="button"
          className="ord-fix"
          data-fix=""
          onClick={() => {
            pointAt('target');
            onPickTarget?.();
          }}
        >
          Pick a country
        </button>
      );
    if (b.code === 'ORDER_LIMIT' || b.code === 'NO_DEFENSE_BUDGET')
      return (
        <button type="button" className="ord-fix" data-fix="" onClick={() => pointBlock(b)}>
          {b.fix} <span aria-hidden>→</span>
        </button>
      );
    if (b.alt) {
      const altDef = orderFor(b.alt);
      if (!altDef) return null;
      return (
        <button
          type="button"
          className="ord-fix ord-alt"
          data-fix=""
          onClick={() => void queueOrder({ ...orderAction(altDef, altDef.targeted ? st.targetId : undefined, st.targetName), origin: 'player' })}
        >
          {b.fix ?? orderLabel(altDef, st.targetName)}
        </button>
      );
    }
    return null;
  }

  const reasonLine = block && block.code !== 'DUPLICATE' && (
    <div
      className={`ord-reason ${avail.state === 'unaffordable' ? 'is-budget' : 'is-rule'}`}
      onMouseEnter={() => pointBlock(block)}
      onClick={() => pointBlock(block)}
      id={`ord-${uid}-why`}
    >
      <p className="ord-reason-text">
        {avail.state === 'unaffordable' ? <IconLock size={14} aria-hidden /> : <IconInfoCircle size={14} aria-hidden />}
        <span>
          <b>{block.reason.split('. ')[0]}{block.reason.includes('. ') ? '.' : ''}</b>
          {block.reason.includes('. ') ? ` ${block.reason.split('. ').slice(1).join('. ')}` : ''}
        </span>
      </p>
      {fix && <div className="ord-fixes">{fix}</div>}
    </div>
  );

  const queuedLine = isQueued && (
    <div className="ord-queued-line">
      <span className="ord-in">
        <IconCheck size={14} aria-hidden /> {TERMS.inThisMonth.name}
      </span>
      <button type="button" className="ord-remove" onClick={() => remove(st.queuedIndex)} data-fix="">
        Remove
      </button>
    </div>
  );

  const proposalLine = isProposal && (
    <div className="ord-proposal" data-proposal="">
      {proposalFx && <p className="ord-proposal-fx">Will change: {proposalFx}</p>}
      <div className="ord-add-line">
        {avail.state === 'available' && (
          <span className="ord-add">
            <IconCheck size={14} aria-hidden /> Approve order{pc ? ` (spends ◆ ${pc})` : ''}
          </span>
        )}
        <button type="button" className="ord-remove" onClick={() => remove(proposalIndex)} data-fix="">
          Remove
        </button>
      </div>
    </div>
  );

  const addLine = avail.state === 'available' && !isProposal && (
    <div className="ord-add-line">
      <span className="ord-add">
        <IconPlus size={14} aria-hidden /> Add to this month
      </span>
      {selected && <kbd>Enter</kbd>}
    </div>
  );

  const infoBtn = entry && (
    <button type="button" className="ord-info" aria-expanded={info} aria-controls={`ord-${uid}-pv`} onClick={() => setInfo((v) => !v)}>
      {info ? 'Hide forecast' : 'How much? Forecast'}
    </button>
  );

  const ariaLabel = off && block ? `${label}, unavailable: ${block.reason}` : isQueued ? `${label}, ${TERMS.inThisMonth.name.toLowerCase()}` : isProposal ? `${label}, ${TERMS.proposed.name.toLowerCase()}: approve${pc ? `, spends ◆ ${pc}` : ''}${proposalFx ? `. Will change: ${proposalFx}` : ''}` : `${label}, ${pc ? `costs ◆ ${pc}` : 'free'}${entry?.chance != null ? `, ${entry.chance}% chance` : ''}`;
  const stateCls = `ord-${variant} st-${avail.state} fam-${fam}${compact ? ' ord-compact' : ''}${busy ? ' is-busy' : ''}${selected ? ' is-selected' : ''}${isProposal ? ' is-proposal' : ''}`;
  const desc = blurb ?? (compact ? undefined : orderBlurb(def, st.targetName));

  // ---------- row: the phone sheet, search hits, staff picks, dossier ----------
  if (variant === 'row') {
    const slot = block?.code === 'NO_CAPITAL' ? block.slots?.[0] : undefined;
    const actKind = avail.state === 'available' ? 'add' : isQueued ? 'remove' : slot !== undefined ? 'free' : block?.code === 'NEEDS_TARGET' ? 'pick' : 'why';
    const actText = { add: isProposal ? 'Approve order' : 'Add', remove: 'Remove', free: `Free ◆ ${slot !== undefined ? month.queuedCosts[slot] : 0}`, pick: 'Pick', why: 'Why' }[actKind];
    const onAct = () => {
      if (actKind === 'add') void give(false);
      else if (actKind === 'remove') remove(st.queuedIndex);
      else if (actKind === 'free' && slot !== undefined) remove(slot);
      else if (actKind === 'pick') {
        pointAt('target');
        onPickTarget?.();
      } else {
        setInfo((v) => !v);
        pointBlock(block);
      }
    };
    return (
      <div ref={wrap} className={`ord-wrap ${stateCls} ${className}`.trim()} data-order-id={def.id} data-order-state={avail.state} data-order-code={block?.code}>
        <CardShell
          layout="row"
          id={`ord-${def.id}-${uid}`}
          title={label}
          art={sceneForAction(def.type)}
          home={home}
          other={st.targetId}
          mood={def.danger ? 'bad' : 'neutral'}
          cost={<CardCost seals={pc} missing={block?.code === 'NO_CAPITAL' ? Math.max(0, pc - (block.need?.have ?? 0)) : 0} alarm={alarm} size={18} />}
          state={off ? 'unavailable' : 'rest'}
          stamp={isQueued ? 'ORDERED' : undefined}
          onPress={activate}
          onRefuse={refused}
          ariaLabel={ariaLabel}
        >
          <div className="ord-meta">
            {isQueued ? (
              <span className="ord-meta-in">
                {TERMS.inThisMonth.name}
                {pc ? ` · ◆ ${pc} held` : ''}
                {staff ? ` · ${TERMS.staffPick.name}: ${staff}` : ''}
              </span>
            ) : isProposal ? (
              <span className="ord-meta-line ord-meta-proposed">
                {TERMS.proposed.name}
                {staff ? ` (${staff})` : ''} · {pc ? `◆ ${pc} if approved` : 'free'}{' '}
                <button type="button" className="link ord-dismiss" onClick={() => remove(proposalIndex)}>
                  Remove
                </button>
              </span>
            ) : (
              avail.state !== 'invalid' && (
                <span className="ord-meta-line">
                  {pc ? `◆ ${pc}` : 'free'}
                  {share > 0 ? ` · ${term(TERMS.defense.compact, Math.round(share * 100))}` : ''}
                  {entry?.chance != null ? ` · ${term(TERMS.chance.name, entry.chance)}` : ''}
                  {def.irreversible ? ` · ${TERMS.noUndo.name}` : ''}
                </span>
              )
            )}
            {off && block && (
              <span className={`ord-meta-why ${avail.state === 'unaffordable' ? 'is-budget' : 'is-rule'}`}>
                {block.reason}
                {block.code === 'NO_CAPITAL' && block.refill?.startsWith('+') ? ` ${block.refill}.` : ''}
              </span>
            )}
            {isProposal && proposalFx && <span className="ord-proposal-fx">Will change: {proposalFx}</span>}
            {desc && avail.state === 'available' && <span className="ord-meta-blurb">{desc}</span>}
            {selected && avail.state === 'available' && <kbd className="ord-kbd">Enter</kbd>}
          </div>
          {info && (
            <div className="ord-expand" id={`ord-${uid}-pv`}>
              {off && fix && <div className="ord-fixes">{fix}</div>}
              <OrderPreview preview={previewOf(entry)} compact />
            </div>
          )}
        </CardShell>
        <button type="button" className={`ord-act act-${avail.state}`} onClick={onAct} data-fix={off ? '' : undefined} aria-label={`${actText}: ${label}`}>
          {actText}
        </button>
      </div>
    );
  }

  // ---------- tile: the desk catalog and the map menu ----------
  return (
    <div
      ref={wrap}
      className={`ord-wrap ${stateCls} ${className}`.trim()}
      data-order-id={def.id}
      data-order-state={avail.state}
      data-order-code={block?.code}
      style={{ ['--fam' as string]: `var(--fam-${fam})` }}
    >
      <CardShell
        layout="tile"
        id={`ord-${def.id}-${uid}`}
        title={label}
        description={avail.state === 'available' ? desc : undefined}
        art={sceneForAction(def.type)}
        home={home}
        other={st.targetId}
        mood={def.danger ? 'bad' : 'neutral'}
        cost={<CardCost seals={pc} missing={block?.code === 'NO_CAPITAL' ? Math.max(0, pc - (block.need?.have ?? 0)) : 0} alarm={alarm} size={compact ? 18 : 22} />}
        state={off ? 'unavailable' : 'rest'}
        stamp={isQueued ? 'ORDERED' : undefined}
        byline={isQueued && staff ? `${TERMS.staffPick.name}: ${staff}` : undefined}
        onPress={activate}
        onRefuse={refused}
        ariaLabel={ariaLabel}
      >
        {chips.length > 0 && <div className="ord-chips">{chips}</div>}
        {reasonLine}
        {queuedLine}
        {proposalLine}
        {addLine}
        {info && (
          <div className="ord-expand" id={`ord-${uid}-pv`}>
            <OrderPreview preview={previewOf(entry)} compact={compact} />
          </div>
        )}
        {infoBtn}
      </CardShell>
      {(hoverPreview ?? true) && entry && <HoverPreview anchor={wrap} entry={entry} label={label} />}
    </div>
  );
}

/** Forecast beside a tile after 300 ms of hover or keyboard focus (desktop pointers only). */
function HoverPreview({ anchor, entry, label }: { anchor: React.RefObject<HTMLDivElement | null>; entry: NonNullable<ReturnType<typeof useOrderState>['entry']>; label: string }) {
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  useEffect(() => {
    const el = anchor.current;
    if (!el || !window.matchMedia?.('(hover: hover) and (pointer: fine)').matches) return;
    let t = 0;
    const show = () => {
      window.clearTimeout(t);
      t = window.setTimeout(() => {
        const r = el.getBoundingClientRect();
        const w = 300;
        const left = r.right + 12 + w < window.innerWidth ? r.right + 12 : r.left - 12 - w >= 0 ? r.left - 12 - w : Math.max(8, Math.min(window.innerWidth - w - 8, r.left));
        const top = Math.max(8, Math.min(window.innerHeight - 260, r.top));
        setPos({ left, top: left === r.right + 12 || left === r.left - 12 - w ? top : Math.min(window.innerHeight - 260, r.bottom + 8) });
      }, 300);
    };
    const hide = () => {
      window.clearTimeout(t);
      setPos(null);
    };
    const onFocus = (e: FocusEvent) => {
      if ((e.target as HTMLElement).matches?.('.wc-card-hit:focus-visible')) show();
    };
    el.addEventListener('mouseenter', show);
    el.addEventListener('mouseleave', hide);
    el.addEventListener('focusin', onFocus);
    el.addEventListener('focusout', hide);
    el.addEventListener('pointerdown', hide);
    return () => {
      window.clearTimeout(t);
      el.removeEventListener('mouseenter', show);
      el.removeEventListener('mouseleave', hide);
      el.removeEventListener('focusin', onFocus);
      el.removeEventListener('focusout', hide);
      el.removeEventListener('pointerdown', hide);
    };
  }, [anchor]);
  if (!pos) return null;
  return createPortal(
    <div className="ord-hover" style={{ left: pos.left, top: pos.top }} role="tooltip" aria-label={`Forecast: ${label}`}>
      <div className="ord-hover-title">{label}</div>
      <OrderPreview preview={previewOf(entry)} />
    </div>,
    document.body,
  );
}

/**
 * The compact tray slot (`slot` variant): label, ◆ chip, state, Remove. Carries
 * `data-point-slot`, so pointAt('capital', { slots }) can light the orders whose removal frees
 * capital. The desk rail renders one per queued order.
 */
export function OrderSlot({ action, index, onOpen }: { action: PendingAction; index: number; onOpen?: (index: number) => void }) {
  const remove = useGameStore((s) => s.removePendingAction);
  const home = useGameStore((s) => s.worldState?.playerCountryId);
  const pc = pcCost(action.type);
  return (
    <div className="ord-wrap ord-slot st-queued" data-point-slot={index} data-order-id={orderFor(action)?.id}>
      <CardShell
        layout="slot"
        id={`slot-${index}`}
        title={action.label}
        art={sceneForAction(action.type)}
        home={home}
        other={action.targetCountryId}
        cost={pc > 0 ? <span className="ord-chip ord-held num">◆ {pc}</span> : <span className="ord-chip num">free</span>}
        description={action.origin === 'staff' ? TERMS.staffPick.name : undefined}
        onPress={() => onOpen?.(index)}
        ariaLabel={`${action.label}, ${TERMS.inThisMonth.name.toLowerCase()}`}
      >
        {action.origin === 'staff' && <span className="ord-slot-tag">{TERMS.staffPick.name}</span>}
      </CardShell>
      <button type="button" className="ord-slot-remove" onClick={() => remove(index)} aria-label={`Remove ${action.label}`}>
        <IconX size={16} aria-hidden />
      </button>
    </div>
  );
}
