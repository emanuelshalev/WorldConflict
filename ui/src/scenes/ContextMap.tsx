import type { JSX } from 'react';
import { countryName, type DeskFocus, type WorldState, type PendingAction, useGameStore } from '../store/gameStore';
import { OutcomeMap, type MapEffect } from './OutcomeMap';
import { mapEffect } from '../lib/mapEffect';

/**
 * The desk's small 2D map: follows the item in focus (a crisis, a call or visit, an order, a hot
 * zone) and plays its geography on real borders. Clicking it opens Map mode on the same place.
 */

interface Context {
  home: string;
  target?: string;
  effect: MapEffect;
  caption: string;
}

const HOT = /^(gaza_|westbank_|pa_gaza)/;

function enemyOf(world: WorldState, home: string): string | undefined {
  return world.countries.find((c) => c.id === home)?.atWarWith[0];
}

function contextFor(world: WorldState, focus: DeskFocus, actions: PendingAction[], catalogTarget?: string | null): Context {
  const home = world.playerCountryId;
  const me = countryName(home);
  if (focus.kind === 'crisis') {
    const d = world.pendingDecisions.find((x) => x.id === focus.id);
    if (d) {
      if (d.templateId && HOT.test(d.templateId)) {
        const zone = world.hotspots?.find((h) => (d.templateId?.startsWith('westbank') ? h.id === 'WEST_BANK' : h.id === 'GAZA'));
        if (zone) return { home, target: zone.mapId, effect: zone.phase === 'WAR' || zone.violence >= 55 ? 'strike' : 'none', caption: `${zone.name}: ${d.title}` };
      }
      const other = d.affectedCountries.find((id) => id !== home);
      const atWar = !!other && world.wars.some((w) => [w.attackerId, w.defenderId].includes(home) && [w.attackerId, w.defenderId].includes(other));
      const effect: MapEffect = /pact|alliance/.test(d.templateId ?? '') ? 'alliance' : atWar || /incident|standoff|ultimatum|war/.test(d.templateId ?? '') ? 'war' : /spy|mole|covert|leak/.test(d.templateId ?? '') ? 'covert' : other ? 'denounce' : 'none';
      return { home, target: other, effect, caption: other ? `${me} and ${countryName(other)}: ${d.title}` : `${me}: ${d.title}` };
    }
  }
  if (focus.kind === 'meeting') {
    const m = world.agenda?.find((x) => x.id === focus.id);
    if (m) {
      if (m.withCountry) return { home, target: m.withCountry, effect: 'court', caption: `${m.kind === 'VISIT' ? 'State visit' : 'Call'}: ${countryName(m.withCountry)}` };
      const enemy = enemyOf(world, home);
      return { home, target: enemy, effect: enemy ? 'war' : 'none', caption: m.title };
    }
  }
  if (focus.kind === 'order') {
    const a = actions[Number(focus.id)];
    if (a) return { home, target: a.targetCountryId, effect: mapEffect(a.type) ?? 'none', caption: `${a.label} (preview)` };
  }
  if (focus.kind === 'catalog' && catalogTarget) return { home, target: catalogTarget, effect: 'none', caption: `Orders for ${countryName(catalogTarget)}` };
  // The latest queued order, else our wars
  const last = actions[actions.length - 1];
  if (focus.kind === 'suggestions' && last) return { home, target: last.targetCountryId, effect: mapEffect(last.type) ?? 'none', caption: `${last.label} (preview)` };
  const enemy = enemyOf(world, home);
  return { home, target: enemy, effect: enemy ? 'war' : 'none', caption: enemy ? `${me} at war with ${countryName(enemy)}` : me };
}

export function ContextMap({ catalogTarget }: { catalogTarget?: string | null }): JSX.Element | null {
  const world = useGameStore((s) => s.worldState);
  const focus = useGameStore((s) => s.focus);
  const actions = useGameStore((s) => s.pendingActions);
  if (!world) return null;
  const ctx = contextFor(world, focus, actions, catalogTarget);
  const open = () => {
    const s = useGameStore.getState();
    s.setDeskMode('map');
    if (ctx.target && world.countries.some((c) => c.id === ctx.target)) s.selectCountry(ctx.target);
  };
  return (
    <button className="context-map" onClick={open} title="Open the big map here (M)">
      <OutcomeMap home={ctx.home} target={ctx.target} effect={ctx.effect} ok />
      <span className="context-cap">{ctx.caption}</span>
    </button>
  );
}
