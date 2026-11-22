import { useRef, useState, type ReactNode } from 'react';
import { CardCost, CardShell, EffectChips, type CardState } from '../components/game/CardShell';
import { CapitalSeal, CapitalSeals, type SealVariant } from '../components/game/CapitalSeal';
import { Stamp, type StampWord } from '../components/game/Stamp';
import { SoundToggle, SoundSettingsSection } from '../components/game/SoundToggle';
import { refundSeals, spendSeals } from '../components/game/SealFlight';
import { shake } from '../lib/motion';
import { sound } from '../lib/sound';
import type { OutcomeCardData } from '../lib/debrief';
import { OutcomeCard } from './OutcomeCard';
import { sceneForAction, sceneForChoice, sceneForOutcome } from './kinds';
import '../styles/game.css';
import './debrief.css';
import './feel-gallery.css';

/**
 * The "Feel" section of the dev gallery (/#scenes/feel, also at the top of /#scenes): every
 * state of the game primitives for QA screenshots, plus a live demo of press, stamp, seal spend,
 * refund and refusal with sound.
 */

const H2 = ({ children }: { children: ReactNode }) => <h2 className="fg-h2">{children}</h2>;
const Cell = ({ label, spec, note, children }: { label: string; spec?: string; note?: string; children: ReactNode }) => (
  <div className="fg-cell">
    <div className="fg-label">
      {label}
      {spec && <span>{spec}</span>}
    </div>
    {children}
    {note && <div className="fg-note">{note}</div>}
  </div>
);

const court = { title: 'Court Pakistan', description: 'A call and a state visit offer. Warm words, a trade mission.', art: sceneForChoice(undefined, '', 'Court Pakistan'), other: 'PAK' };
const courtFx = <EffectChips effects={[{ text: "Pakistan's view of you up a lot", tone: 'up' }, { text: 'Approval up', tone: 'up' }]} />;
const odds = (w: string) => (
  <div className="fg-odds">
    Chance it works: <b>{w}</b>
  </div>
);
const muscat = { title: 'Back channel via Muscat', description: 'Talk to the men who just bombed your airport. Quietly.', art: sceneForChoice(undefined, 'After the Riyadh airport strike', 'Back channel via Muscat'), other: 'YEM' };
const muscatFx = (
  <EffectChips
    effects={[
      { text: 'Approval down a lot', tone: 'down' },
      { text: "Yemen's view of you up a lot", tone: 'up' },
      { text: 'World tension down', tone: 'up' },
    ]}
  />
);

function States() {
  return (
    <div className="fg-sheet">
      <Cell label="1. Rest" spec="no motion" note="Paper gradient, 1 px edge, 4 px thickness. Art slightly dimmed so the chosen card can brighten.">
        <CardShell {...court} home="IND" keyHint={1} cost={<CardCost seals={1} />} onPress={() => {}}>
          {courtFx}
          {odds('high (80 out of 100)')}
        </CardShell>
      </Cell>
      <Cell label="2. Hover or focus" spec="140 ms lift" note="Lifts 4 px, shadow grows, art to full colour. Focus adds the accent ring. No hover sound.">
        <CardShell {...court} home="IND" keyHint={1} cost={<CardCost seals={1} />} onPress={() => {}} className="fg-force-hover">
          {courtFx}
          {odds('high (80 out of 100)')}
        </CardShell>
      </Cell>
      <Cell label="3. Pressed" spec="80 ms, tap" note="Sinks on pointerdown, before any network: feedback under 100 ms.">
        <CardShell {...court} home="IND" keyHint={1} cost={<CardCost seals={1} />} onPress={() => {}} className="is-pressed">
          {courtFx}
          {odds('high (80 out of 100)')}
        </CardShell>
      </Cell>
      <Cell label="4. Chosen: Your pick" spec="280 ms stamp" note="Stamp lands from 180% and -16 degrees. Siblings step back to 78%.">
        <CardShell {...muscat} home="SAU" keyHint={2} tag="cabinet" cost={<CardCost seals={0} />} state="chosen" stamp="YOUR PICK" onPress={() => {}}>
          {muscatFx}
        </CardShell>
      </Cell>
      <Cell label="5. Cabinet pick approved" spec="steel ink" note="Approve all stamps each pre-filled card 90 ms apart, one sound each, at most 4.">
        <CardShell {...muscat} home="SAU" keyHint={2} tag="cabinet" cost={<CardCost seals={0} />} state="approved" stamp="APPROVED" onPress={() => {}}>
          {muscatFx}
        </CardShell>
      </Cell>
      <Cell label="6. Cannot be played" spec="reason on the card" note="Never only a tooltip. The hole in the cost shows what is missing.">
        <CardShell
          title="Declare war on India"
          art={sceneForAction('DIPLOMACY_DECLARE_WAR')}
          home="PAK"
          other="IND"
          keyHint={4}
          cost={<CardCost seals={2} missing={1} />}
          state="unavailable"
          reason={{ title: 'Needs 2 seals, you have 1.', fix: 'Remove Reform program to free 2.', point: () => {} }}
        >
          <EffectChips effects={[{ text: 'World tension up a lot', tone: 'down' }, { text: "India's view of you down a lot", tone: 'down' }]} />
        </CardShell>
      </Cell>
      <Cell label="7. Refused on press" spec="260 ms shake, refuse" note="Pressing anyway: the card and the bank shake, the missing seals flash red.">
        <CardShell
          title="Strike military targets in Iran"
          art="airstrike"
          home="ISR"
          other="IRN"
          keyHint={5}
          cost={<CardCost seals={2} missing={2} alarm />}
          state="unavailable"
          reason={{ title: 'Needs 2 seals, you have 0.', fix: 'Next month you get 2.', point: () => {} }}
        >
          <EffectChips effects={[{ text: 'World tension up a lot', tone: 'down' }, { text: "Iran's view of you down a lot", tone: 'down' }]} />
        </CardShell>
      </Cell>
      <Cell label="8. Queued order" spec="ghost with Undo" note="The card's seal flies to the plan; a dashed ghost keeps its place, so nothing reflows.">
        <CardShell {...court} home="IND" cost={<CardCost seals={1} />} state="queued" onUndo={() => {}}>
          <EffectChips effects={[{ text: "Pakistan's view of you up a lot", tone: 'up' }]} />
        </CardShell>
      </Cell>
    </div>
  );
}

function Layouts() {
  return (
    <div className="fg-layouts">
      <div className="fg-col">
        <div className="fg-label">Row (phone stack, lists)</div>
        <CardShell layout="row" {...muscat} home="SAU" keyHint={1} tag="both" cost={<CardCost seals={0} />} state="chosen" stamp="YOUR PICK" onPress={() => {}}>
          {muscatFx}
        </CardShell>
        <CardShell layout="row" title="Bomb Sanaa" description="The full air force. Revenge, ruins, and familiar headlines." art={sceneForChoice(undefined, '', 'Bomb Sanaa')} home="SAU" other="YEM" keyHint={2} ribbon={{ tone: 'risk', text: 'Risks your mission: Yemen ceasefire' }} cost={<CardCost seals={1} />} dimmed onPress={() => {}}>
          <EffectChips effects={[{ text: 'Approval up', tone: 'up' }, { text: 'World tension up a lot', tone: 'down' }, { text: "Yemen's view of you down a lot", tone: 'down' }]} />
        </CardShell>
        <CardShell layout="row" title="Spy on Iran" art="covert" home="SAU" other="IRN" keyHint={3} cost={<CardCost seals={2} missing={1} />} state="unavailable" reason={{ title: 'Needs 2 seals, you have 1.', fix: 'Remove a staff order to free 1.', point: () => {} }} />
      </div>
      <div className="fg-col">
        <div className="fg-label">Slot (this month you will)</div>
        <CardShell layout="slot" title="After the Riyadh airport strike: Back channel via Muscat" art={muscat.art} home="SAU" other="YEM" cost={<CardCost seals={0} />} state="approved" stamp="APPROVED" onPress={() => {}} />
        <CardShell layout="slot" title="Reform program" art={sceneForAction('DOMESTIC_REFORM')} home="SAU" cost={<CardCost seals={2} />} state="chosen" stamp="ORDERED" onPress={() => {}} />
        <CardShell layout="slot" title="Court Pakistan" art={court.art} home="SAU" other="PAK" cost={<CardCost seals={1} />} onPress={() => {}} />
        <div className="fg-label" style={{ marginTop: 18 }}>
          Tile with a mission ribbon and a gain
        </div>
        <div style={{ maxWidth: 340 }}>
          <CardShell title="Accept the reforms" description="The street gets its concessions. The old guard sulks." art={sceneForChoice(undefined, '', 'Accept the reforms')} home="SAU" keyHint={3} tag="best" ribbon={{ tone: 'help', text: 'Helps your mission: stability 60%' }} cost={<CardCost seals={0} gain={1} />} byline="Backed by the Interior Minister" onPress={() => {}}>
            <EffectChips effects={[{ text: 'Stability up a lot', tone: 'up' }, { text: 'Legitimacy down', tone: 'down' }]} />
          </CardShell>
        </div>
      </div>
    </div>
  );
}

function Seals() {
  const variants: Array<[SealVariant, string, string]> = [
    ['full', 'Available', 'Full wax: counted in "2 left". Static, no idle animation.'],
    ['imprint', 'Placed this month', 'The imprint stays in the bank; the seal sits on the order.'],
    ['short', 'Short', 'Only while a card that needs more is hovered or refused.'],
    ['new', 'Minted', 'Monthly refill and "+1 political capital": pops in with a shine.'],
    ['broken', 'Spent', 'At Execute the seals on orders crack inside the turn stamp.'],
    ['next', 'Next month', 'Dotted outline: what the monthly refill will add.'],
  ];
  return (
    <>
      <div className="fg-panel fg-anat">
        <CapitalSeal size={160} label="Political capital seal" />
        <div>
          <p className="fg-p">
            One object everywhere: a wax seal with the embossed ◆. <b>A full seal is one you can still spend.</b> The word is always "political capital"; "seal" is the unit in sentences ("Needs 2 seals, you have 1.").
          </p>
          <div className="fg-sizes">
            {[18, 24, 38, 56].map((s) => (
              <figure key={s}>
                <CapitalSeal size={s} />
                <figcaption>{s === 18 ? '18 inline' : s === 24 ? '24 HUD, card cost' : s === 38 ? '38 rail bank' : '56 onboarding'}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </div>
      <div className="fg-seal-states">
        {variants.map(([v, t, n]) => (
          <div className="fg-panel" key={v}>
            <b>{t}</b>
            <div className="fg-seal-stage">
              {v !== 'full' && <CapitalSeal size={44} />}
              <CapitalSeal variant={v} size={44} className={v === 'new' ? 'wc-seal-mint' : ''} />
            </div>
            <p className="fg-p">{n}</p>
          </div>
        ))}
      </div>
      <div className="fg-panel fg-banks">
        <div>
          <div className="fg-label">HUD, 24 px</div>
          <CapitalSeals left={1} held={2} size={24} text="1 left" />
        </div>
        <div>
          <div className="fg-label">Rail bank, 38 px, with next refill</div>
          <CapitalSeals left={2} held={1} nextRefill={2} size={38} text="2 of 3 left" />
        </div>
        <div>
          <div className="fg-label">Refused: short seals</div>
          <CapitalSeals left={1} short={1} size={38} text="1 left" />
        </div>
        <div>
          <div className="fg-label">Cost chips</div>
          <div className="fg-row">
            <CardCost seals={1} />
            <CardCost seals={2} />
            <CardCost seals={0} />
            <CardCost seals={0} gain={1} />
            <CardCost seals={2} missing={1} />
            <CardCost seals={2} missing={2} alarm />
          </div>
        </div>
      </div>
    </>
  );
}

function Stamps() {
  const words: StampWord[] = ['YOUR PICK', 'APPROVED', 'ORDERED', 'DONE', 'MIXED', 'FAILED'];
  return (
    <div className="fg-panel fg-stamps">
      {words.map((w, i) => (
        <Stamp key={w} word={w} delay={i * 90} />
      ))}
      <Stamp word="DONE" size="lg" tilt={-6} />
      <Stamp word="FAILED" size="sm" />
    </div>
  );
}

const DEMO = [
  { id: 'd1', title: 'Court Pakistan', art: court.art, other: 'PAK', cost: 1, fx: courtFx, odds: 'high' },
  {
    id: 'd2',
    title: 'Spy on Iran',
    art: sceneForAction('INTEL_GATHER'),
    other: 'IRN',
    cost: 1,
    fx: <EffectChips effects={[{ text: 'What you know up a lot', tone: 'up' }, { text: "Iran's view of you down", tone: 'down' }]} />,
    odds: 'fair',
  },
  {
    id: 'd3',
    title: 'Declare war on India',
    art: sceneForAction('DIPLOMACY_DECLARE_WAR'),
    other: 'IND',
    cost: 2,
    fx: <EffectChips effects={[{ text: 'World tension up a lot', tone: 'down' }, { text: "India's view of you down a lot", tone: 'down' }]} />,
    odds: 'low',
  },
];

function LiveDemo() {
  const total = 3;
  const [queued, setQueued] = useState<string[]>([]);
  const [short, setShort] = useState(0);
  const bank = useRef<HTMLDivElement>(null);
  const plan = useRef<HTMLDivElement>(null);
  const used = queued.reduce((n, id) => n + (DEMO.find((d) => d.id === id)?.cost ?? 0), 0);
  const left = total - used;
  const queue = (id: string, cost: number) => {
    setQueued((q) => [...q, id]);
    sound.play('stamp');
    // Let the plan slot render, then fly the seals into it
    requestAnimationFrame(() => {
      const slot = plan.current?.querySelector(`[data-card-id="plan-${id}"] [data-seal-target]`);
      void spendSeals(bank.current, slot, { count: cost });
    });
  };
  const undo = (id: string, cost: number) => {
    const slot = plan.current?.querySelector(`[data-card-id="plan-${id}"] [data-seal-target]`);
    void refundSeals(slot, bank.current, { count: cost });
    setQueued((q) => q.filter((x) => x !== id));
  };
  const refuse = (cost: number) => {
    setShort(cost - left);
    shake(bank.current);
    window.setTimeout(() => setShort(0), 1400);
  };
  return (
    <>
      <div className="fg-controls">
        <SoundToggle />
        <button className="fg-btn" onClick={() => setQueued([])}>
          Reset the month
        </button>
        <span>Cards cost 1, 1 and 2 seals. You have 3. Queue the first two, then press the third to see a refusal.</span>
      </div>
      <div className="fg-demo">
        <div className="wc-cards" data-count="3">
          {DEMO.map((d, i) => {
            const isQ = queued.includes(d.id);
            const off = !isQ && d.cost > left;
            const state: CardState = isQ ? 'queued' : off ? 'unavailable' : 'rest';
            return (
              <CardShell
                key={d.id}
                id={d.id}
                title={d.title}
                art={d.art}
                home="PAK"
                other={d.other}
                keyHint={i + 1}
                cost={<CardCost seals={d.cost} missing={off ? d.cost - left : 0} alarm={off && short > 0} />}
                state={state}
                reason={off ? { title: `Needs ${d.cost} seals, you have ${left}.`, fix: queued.length ? `Undo ${DEMO.find((x) => x.id === queued[0])?.title} to free ${DEMO.find((x) => x.id === queued[0])?.cost}.` : undefined, point: () => shake(bank.current) } : undefined}
                onPress={() => queue(d.id, d.cost)}
                onRefuse={() => refuse(d.cost)}
                onUndo={() => undo(d.id, d.cost)}
              >
                {d.fx}
                {odds(d.odds)}
              </CardShell>
            );
          })}
        </div>
        <div className="fg-tray">
          <div className="fg-bank" ref={bank}>
            <div className="fg-bank-head">
              Political capital <span>{left} of {total} left</span>
            </div>
            <CapitalSeals left={left} held={used} short={short} size={38} />
          </div>
          <div className="fg-plan" ref={plan}>
            <h4>This month you will</h4>
            {queued.map((id) => {
              const d = DEMO.find((x) => x.id === id);
              if (!d) return null;
              return <CardShell key={id} id={`plan-${id}`} layout="slot" title={d.title} art={d.art} home="PAK" other={d.other} cost={<CardCost seals={d.cost} />} state="chosen" stamp="ORDERED" stampSoundOnMount={false} onPress={() => undo(id, d.cost)} ariaLabel={`${d.title}: press to undo`} />;
            })}
            {Array.from({ length: Math.max(0, 3 - queued.length) }, (_, i) => (
              <div key={i} className="fg-empty-slot">
                Empty order slot
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function Verdicts() {
  const base = { lines: [], facts: [], reaction: undefined };
  const cards: OutcomeCardData[] = [
    {
      ...base,
      key: 'v1',
      kicker: 'Crisis · Yemen',
      country: 'YEM',
      headline: 'Muscat channel opens; the missiles stop for now',
      lines: [{ text: 'You: Back channel via Muscat', icon: 'CRISIS' }],
      facts: [{ label: "Yemen's view of you", before: -48, after: -31 }],
      verdict: 'good',
      scene: sceneForChoice(undefined, 'After the Riyadh airport strike', 'Back channel via Muscat'),
    },
    {
      ...base,
      key: 'v2',
      kicker: 'Yemen · 3 items',
      country: 'YEM',
      headline: 'Propose ceasefire to Yemen failed; al-Houthi keeps the line open',
      lines: [
        { text: 'Sanaa refuses to sign while the blockade holds.', icon: 'DIPLOMACY_PROPOSE_CEASEFIRE', ok: false },
        { text: 'Call: Keep talking', icon: 'CALL' },
      ],
      facts: [{ label: "Yemen's view of you", before: -31, after: -24 }],
      verdict: 'mixed',
      scene: sceneForOutcome(sceneForAction('DIPLOMACY_PROPOSE_CEASEFIRE'), 'bad'),
    },
    {
      ...base,
      key: 'v3',
      kicker: 'Order · Iran',
      country: 'IRN',
      headline: 'Offer defense pact to Iran: it failed',
      lines: [{ text: 'Tehran says no in public.', icon: 'DIPLOMACY_PROPOSE_ALLIANCE', ok: false }],
      facts: [{ label: "Iran's view of you", before: 10, after: 2 }],
      verdict: 'bad',
      scene: sceneForOutcome(sceneForAction('DIPLOMACY_PROPOSE_ALLIANCE'), 'bad'),
    },
  ];
  return (
    <div className="fg-verdicts">
      {cards.map((c) => (
        <OutcomeCard key={c.key} c={c} home="SAU" />
      ))}
    </div>
  );
}

export function FeelGallery() {
  return (
    <section className="fg">
      <h1 className="fg-h1">Feel: game primitives</h1>
      <p className="fg-lede">Briefing cards, wax seals, stamps and sound (design-feel.md sections 3, 4 and 6). Press the live cards below; sound is synthesized.</p>
      <H2>Briefing card states</H2>
      <States />
      <H2>Layouts</H2>
      <Layouts />
      <H2>Live: press a card</H2>
      <LiveDemo />
      <H2>Political capital seal</H2>
      <Seals />
      <H2>Stamps</H2>
      <Stamps />
      <H2>Debrief verdicts (art matches outcome)</H2>
      <Verdicts />
      <H2>Settings: sound</H2>
      <div className="fg-panel" style={{ maxWidth: 640 }}>
        <SoundSettingsSection />
      </div>
    </section>
  );
}
