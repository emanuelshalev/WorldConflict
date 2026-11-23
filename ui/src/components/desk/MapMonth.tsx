import { useEffect, useRef } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useFitLevel, useLayout } from '../../lib/layout';
import { Thing } from './YourMove';
import { AgendaList } from './AgendaList';
import { MapPlanBar, Plan } from './Plan';
import { PhoneBottom } from './PhoneMonth';
import { Detail } from './Detail';

/**
 * Map mode keeps the desk's places (design-layout L-14): the State band and the Bar stay; the
 * Thing is a card on the left over the map (compacting on short screens, never scrolling); from
 * 1600 wide the Plan floats on the right with the desk's Execute place, below that the Plan is the
 * bar along the bottom; from 2240 wide and 1200 tall the List sits under the card. The camera
 * centres the subject in the gap between the panels (lib/globeFit gameInsets reads
 * [data-map-panel]). Phones: a map band on top, the card below, Execute in the sticky bottom.
 */
export function MapMonth() {
  const L = useLayout();
  const deskMode = useGameStore((s) => s.deskMode);
  const gameOver = useGameStore((s) => s.gameOver);
  const listOpen = useGameStore((s) => s.listOpen);
  const focus = useGameStore((s) => s.focus);
  const target = useGameStore((s) => s.orderTarget);
  const setTarget = useGameStore((s) => s.setOrderTarget);
  const on = deskMode === 'map' && !gameOver;
  const cardRef = useRef<HTMLDivElement>(null);
  const agendaKey = useGameStore((s) => s.agendaKey);
  const choices = useGameStore((s) => s.decisionChoices);
  const fit = useFitLevel(cardRef, `${agendaKey}|${focus.kind}|${Object.keys(choices).length}|${on}`, 3);
  // The globe re-fits to the new free box when the panels come and go
  useEffect(() => {
    const t = window.setTimeout(() => window.dispatchEvent(new Event('resize')), 60);
    return () => window.clearTimeout(t);
  }, [on, L.cls, L.mapFloat, L.mapList]);
  // Phones: Map shows the map band on top, so switching to it brings the page back to the top (a
  // page scrolled down to the answers would leave the map out of view and its taps unreachable)
  const phone = L.cls === 'P';
  useEffect(() => {
    if (on && phone) document.querySelector('.game')?.scrollTo({ top: 0 });
  }, [on, phone]);
  if (!on) return null;
  const detail = focus.kind === 'catalog' || focus.kind === 'order' || focus.kind === 'suggestions';
  if (L.cls === 'P')
    return (
      <section className="map-month is-phone" aria-label="This month on the map">
        <div className="mapcard ph-body" data-region="item">
          <Thing compact />
        </div>
        <PhoneBottom map />
        {listOpen && (
          <div className="ph-sheet">
            <AgendaList form="sheet" />
          </div>
        )}
      </section>
    );
  return (
    <>
      <section className="map-month" aria-label="This month on the map">
        <div className="map-left" data-map-panel="left">
          <div className="mapcard" data-region="item" ref={cardRef} data-fit={fit}>
            {detail ? <Detail target={target} setTarget={setTarget} /> : <Thing compact />}
          </div>
          {L.mapList && <AgendaList form="float" />}
          {!L.mapList && listOpen && <AgendaList form="panel" />}
        </div>
        <span className="map-gap" aria-hidden />
        {L.mapFloat && (
          <div className="map-right" data-map-panel="right">
            <Plan form="float" />
          </div>
        )}
      </section>
      {!L.mapFloat && <MapPlanBar />}
    </>
  );
}
