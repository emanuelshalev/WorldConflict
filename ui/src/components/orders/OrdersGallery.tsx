import { useEffect, useState, type ReactNode } from 'react';
import { API_BASE, ownerId, queueOrder, useGameStore } from '../../store/gameStore';
import { CapitalSeals } from '../game/CapitalSeal';
import { FAMILY_WORD, ORDERS, orderAction, orderById, orderLabel, type OrderDef } from '../../lib/orders';
import { TERMS, term } from '../../lib/glossary';
import { MapActionMenu } from '../MapActionMenu';
import { CountryDetailPanel } from '../CountryDetailPanel';
import { ConfirmFace } from './ConfirmFace';
import { OrderPictogram, OrderPlate } from './OrderPictogram';
import { OrderCard, OrderSlot } from './OrderCard';
import { OrderCatalog } from './OrderCatalog';
import { clearMenus, useMonthView } from './useOrders';
import '../../styles/wc.css';
import '../../styles/game.css';

/**
 * Dev gallery for the order cards (/#orders, design-orders.md WP4): a real game (Water War as
 * Pakistan, the concept's seat) with every card state, the confirm faces, the map menu, the
 * catalog with search and the phone rows, for QA screenshots and the orders scenario script.
 * It starts its own save and never touches "Continue" (no rememberSave).
 */

const SEAT = { playerCountryId: 'PAK', flashpointId: 'water-war', mode: 'FLASHPOINT', seed: 4242 } as const;
const TARGET = 'IND';

const def = (id: string) => orderById(id) as OrderDef;

async function newGallerySave(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/new-game`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...SEAT, playerId: ownerId(), saveName: 'Orders gallery' }),
    });
    const data = await res.json();
    if (!data.success) return false;
    useGameStore.getState().reset();
    useGameStore.getState().applyServerPayload(data, data.saveId);
    useGameStore.setState({ screen: 'game' });
    return true;
  } catch {
    return false;
  }
}

/** The month the concept shows: Court India queued by you, a staff order, 1 ◆ left. */
async function stageMonth(): Promise<void> {
  useGameStore.setState({ pendingActions: [] });
  clearMenus();
  const name = useGameStore.getState().playerView.find((v) => v.id === TARGET)?.name;
  await queueOrder({ ...orderAction(def('court'), TARGET, name), origin: 'player' });
  const sau = useGameStore.getState().playerView.find((v) => v.id === 'SAU');
  if (sau) await queueOrder({ ...orderAction(def('court'), 'SAU', sau.name), origin: 'staff', why: 'Foreign Minister: keep the Gulf money coming.' });
}

const H2 = ({ children }: { children: ReactNode }) => <h2 className="og-h2">{children}</h2>;
const Cell = ({ label, note, children, wide }: { label: string; note?: string; children: ReactNode; wide?: boolean }) => (
  <div className={`og-cell${wide ? ' wide' : ''}`}>
    <div className="og-label">{label}</div>
    {children}
    {note && <div className="og-note">{note}</div>}
  </div>
);

function Meters() {
  const m = useMonthView();
  const pending = useGameStore((s) => s.pendingActions);
  const held = m.queuedCosts.reduce((s, c) => s + c, 0);
  const left = Math.max(0, m.pcLeft);
  return (
    <div className="og-hud">
      <div className="og-meter" data-point="capital">
        <span className="og-meter-name">{TERMS.capital.name}</span>
        <CapitalSeals left={left} held={held} nextRefill={Math.min(m.pcIncome, Math.max(0, m.pcCap - left - held))} size={22} text={term(TERMS.capital.compact, left)} />
        <span className="og-meter-sub">
          {held} held by orders · +{m.pcIncome} next month
        </span>
      </div>
      <div className="og-meter" data-point="orders">
        <span className="og-meter-name">{TERMS.orders.name}</span>
        <b className="num">{term(TERMS.orders.compact, m.ordersUsed)}</b>
      </div>
      <div className="og-meter" data-point="defense">
        <span className="og-meter-name">{TERMS.defense.name}</span>
        <b className="num">{Math.round((m.defenseUsedM / Math.max(1, m.budgetM)) * 100)}% used</b>
      </div>
      <div className="og-tray" data-point="tray" aria-label="This month">
        {pending.map((a, i) => (
          <OrderSlot key={`${a.type}-${a.targetCountryId}-${i}`} action={a} index={i} />
        ))}
        {pending.length === 0 && <span className="og-note">No orders yet.</span>}
      </div>
    </div>
  );
}

export default function OrdersGallery() {
  const [ready, setReady] = useState<'loading' | 'ok' | 'error'>('loading');
  const [target, setTarget] = useState('');
  // What the static confirm faces did, for the QA script (scenarios-qa/orders.mjs)
  const [result, setResult] = useState('none');
  const [vw] = useState(() => window.innerWidth);
  const saveId = useGameStore((s) => s.saveId);
  useEffect(() => {
    let alive = true;
    void (async () => {
      const ok = await newGallerySave();
      if (ok) await stageMonth();
      // The dossier section shows India's dossier (same OrderCard rows as the map's phone sheet)
      if (ok) useGameStore.getState().selectCountry(TARGET);
      if (alive) setReady(ok ? 'ok' : 'error');
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (ready === 'error') return <div className="og-page"><p>Cannot reach the game server: start it with npm run dev:api.</p></div>;
  if (ready === 'loading' || !saveId) return <div className="og-page"><p>Starting the gallery game…</p></div>;

  const noop = () => undefined;
  const record = (r: string) => () => setResult(r);
  return (
    <div className="og-page">
      <header className="og-top">
        <h1>Order cards</h1>
        <p>Water War as Pakistan, month 1. Court India and a staff order are in this month, so political capital is low. Every state is live: press the cards.</p>
        <button className="wc-btn" onClick={() => void stageMonth()}>
          Reset the month
        </button>
      </header>
      <Meters />

      <H2>1. The four states (tiles)</H2>
      <div className="og-grid four" data-og="states">
        <Cell label="Available" note="Tap or Enter adds it; the tray slot and the meter pulse once.">
          <OrderCard def={def('spy')} targetId={TARGET} />
        </Cell>
        <Cell label="Unaffordable" note="Budget block with the fix; tapping shakes and points at the meter.">
          <OrderCard def={def('declare-war')} targetId={TARGET} />
        </Cell>
        <Cell label="Invalid" note="Rule block: dashed, the reason first, an alternative when one exists.">
          <OrderCard def={def('nuclear-strike')} targetId={TARGET} />
        </Cell>
        <Cell label="In this month" note="In this month: Remove, never a duplicate message.">
          <OrderCard def={def('court')} targetId={TARGET} staff="Foreign Minister" />
        </Cell>
        <Cell label="No target picked" note="Pick a country first; the fix focuses the picker.">
          <OrderCard def={def('denounce')} />
        </Cell>
        <Cell label="At home" note="Untargeted orders read the defense budget.">
          <OrderCard def={def('mobilize')} />
        </Cell>
      </div>

      <H2>2. Confirm faces (never a native dialog, never Enter alone)</H2>
      <div className="og-grid three" data-og="confirm">
        <Cell label="Declare war" note="Focus lands on Keep the peace.">
          <div className="ord-wrap ord-tile is-confirming">
            <ConfirmFace order={{ id: 'declare-war', family: 'mil', title: 'Declare war on India' }} kind="war" question="Declare war on India?" lines={['World tension +15', 'You are outmatched (force ratio 0.62)', 'Both arsenals are operational: this war can end civilization']} confirmText="Declare war" cancelText="Keep the peace" onConfirm={record('war-declared')} onCancel={record('war-cancelled')} />
          </div>
        </Cell>
        <Cell label="Nuclear strike" note="1.2 s press and hold, or Space or Enter held.">
          <div className="ord-wrap ord-tile is-confirming">
            <ConfirmFace order={{ id: 'nuclear-strike', family: 'nuke', title: 'Nuclear strike on India' }} kind="nuclear" question="Authorize a nuclear strike on India?" lines={['A total embargo follows, every nation turns on you (relations -60)', 'India can strike back']} confirmText="Hold to authorize" cancelText="Stand down" onConfirm={record('nuclear-authorized')} onCancel={record('nuclear-cancelled')} />
          </div>
        </Cell>
        <Cell label="Mission warning" note="Amber, shown once on the face.">
          <div className="ord-wrap ord-tile is-confirming">
            <ConfirmFace order={{ id: 'deploy-border', family: 'mil', title: 'Mass troops facing India' }} kind="mission" question="Mass troops facing India anyway?" missionWarning="Mission at risk: keep the Indus Waters Treaty alive." lines={['World tension +4']} confirmText="Give the order" cancelText="Cancel" onConfirm={record('mission-given')} onCancel={record('mission-cancelled')} />
          </div>
        </Cell>
      </div>

      <p className="og-note">
        Last confirm face result: <output data-og-result={result}>{result}</output>
      </p>

      <H2>3. Rows (phone sheet, search hits, recommended, dossier)</H2>
      <div className="og-phone" data-og="rows">
        <OrderCard def={def('spy')} targetId={TARGET} variant="row" />
        <OrderCard def={def('court')} targetId={TARGET} variant="row" />
        <OrderCard def={def('declare-war')} targetId={TARGET} variant="row" />
        <OrderCard def={def('nuclear-strike')} targetId={TARGET} variant="row" />
      </div>

      <H2>4. The map menu uses the same card</H2>
      <div className="og-map" data-og="map">
        <MapActionMenu countryId={TARGET} x={vw < 700 ? 0 : 420} y={30} bounds={{ top: 0, bottom: 640, left: 0, right: Math.min(980, vw - 32) }} onClose={noop} inline />
      </div>

      <H2>4b. The dossier uses the same card</H2>
      <div className="og-map og-dossier" data-og="dossier">
        <CountryDetailPanel />
      </div>

      <H2>5. Pictograms (28 orders, plate at 52, 42, 34 px and bare at 24 px)</H2>
      <div className="og-picts" data-og="pictograms">
        {ORDERS.map((o) => (
          <div key={o.id} className={`og-pict fam-${o.family}`} data-order-id={o.id}>
            <OrderPlate id={o.id} family={o.family} size={52} />
            <OrderPlate id={o.id} family={o.family} size={42} />
            <OrderPlate id={o.id} family={o.family} size={34} />
            <span className="og-pict-bare">
              <OrderPictogram id={o.id} size={24} />
            </span>
            <span className="og-pict-name">
              <b>{orderLabel(o).replace(/ (to|on|in|for|with|facing|of)$/, '')}</b>
              <span>{FAMILY_WORD[o.family]}</span>
            </span>
          </div>
        ))}
      </div>

      <H2>6. All orders (desk catalog with search)</H2>
      <div className="og-catalog" data-og="catalog">
        <OrderCatalog target={target} setTarget={setTarget} onOpenOrder={noop} />
      </div>
    </div>
  );
}
