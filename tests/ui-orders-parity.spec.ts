import { describe, expect, it } from "vitest";
import { PC_COSTS } from "../src/core/costs.js";
import { createDataLoader } from "../src/core/data-loader.js";
import { ENGINE_ORDERS } from "../src/core/orders.js";
import { buildPlayerView } from "../src/core/systems/intelligence.js";
import { orderLabel as engineLabel } from "../src/core/turn.js";
import type { Action, WorldState } from "../src/core/types.js";
import { ACTION_VERBS, PC } from "../ui/src/lib/actions.js";
import {
  deskOrders,
  ORDERS,
  ORDERS_BY_FAMILY,
  orderAction,
  orderFor,
  orderLabel,
  ordersFor,
  SHORT_LIST,
} from "../ui/src/lib/orders.js";
import type { CountryFull, PlayerViewCountry } from "../ui/src/store/gameStore.js";

/**
 * One registry (design-orders.md §4.1, §4.5, goal G6): the UI order list matches the engine's,
 * and for any target the map's expanded menu offers exactly the desk's orders, with the same labels.
 */
const loader = createDataLoader();

function seat(player: string, mode: "TERM" | "LEGACY" = "TERM", seed = 1) {
  const world: WorldState = loader.newGame({ scenarioId: "2026", playerCountryId: player, seed, mode });
  const me = world.countries.find((c) => c.id === player) as unknown as CountryFull;
  const views = buildPlayerView(world) as unknown as PlayerViewCountry[];
  return { world, me, views: views.filter((v) => !v.isPlayer) };
}

describe("Order registry parity", () => {
  it("has the engine's ids, types, params, verbs and flags", () => {
    const strip = (o: {
      id: string;
      type: string;
      params?: Record<string, unknown>;
      verb: string;
      targeted: boolean;
      irreversible?: boolean;
    }) => ({
      id: o.id,
      type: o.type,
      params: o.params ?? null,
      verb: o.verb,
      targeted: o.targeted,
      irreversible: !!o.irreversible,
    });
    expect(ORDERS.map(strip)).toEqual(ENGINE_ORDERS.map(strip));
    expect(new Set(ORDERS.map((o) => o.id)).size).toBe(ORDERS.length);
  });

  it("files every order under one family group and gives it a blurb", () => {
    const grouped = Object.values(ORDERS_BY_FAMILY).flat();
    expect(grouped).toHaveLength(ORDERS.length);
    for (const o of ORDERS) {
      expect(o.blurb.length, o.id).toBeGreaterThan(10);
      expect(o.blurb).not.toMatch(/\u2014/);
    }
    for (const id of ["declare-war", "nuclear-strike"]) expect(orderFor(ORDERS.find((o) => o.id === id) ?? { type: "" })?.irreversible).toBe(true);
  });

  it("labels orders as the engine's debrief does", () => {
    const { world } = seat("USA");
    for (const def of ORDERS) {
      const action = orderAction(def, def.targeted ? "IRN" : undefined, "Iran") as Action;
      expect(orderLabel(def, def.targeted ? "Iran" : undefined), def.id).toBe(engineLabel(world, action));
      expect(action.label).toBe(engineLabel(world, action));
    }
    expect(orderLabel(ORDERS.find((o) => o.id === "nuclear-strike") as (typeof ORDERS)[number], "India")).toBe("Nuclear strike on India");
    // ACTION_VERBS derives from the registry
    for (const def of ORDERS) expect(ACTION_VERBS[def.type]).toBe(ORDERS.find((o) => o.type === def.type)?.verb);
  });

  it("mirrors the engine's political capital costs", () => {
    for (const def of ORDERS) expect(PC[def.type] ?? 0, def.type).toBe(PC_COSTS[def.type] ?? 0);
  });

  it("offers the same orders on the map (expanded) and the desk, for every target", () => {
    const desk = deskOrders().map((o) => o.id).sort();
    let checked = 0;
    for (const [player, mode] of [
      ["USA", "TERM"],
      ["UKR", "TERM"],
      ["IRN", "LEGACY"],
      ["ISR", "TERM"],
    ] as const) {
      const { me, views } = seat(player, mode);
      for (const view of views) {
        const map = ordersFor(me, view, { expanded: true });
        expect(map.map((o) => o.id).sort(), `${player} -> ${view.id}`).toEqual(desk);
        // Identical labels for the same order and target
        for (const o of map) expect(orderLabel(o, view.name)).toBe(`${o.verb} ${view.name}`);
        const short = ordersFor(me, view);
        expect(short.length).toBeGreaterThan(0);
        expect(short.length).toBeLessThanOrEqual(SHORT_LIST);
        for (const o of short) expect(map).toContain(o);
        // The short list leads the expanded one, in the same order
        expect(map.slice(0, short.length)).toEqual(short);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(100);
  });

  it("leads with a ceasefire against an enemy and courtship at peace", () => {
    const { me, views } = seat("UKR");
    const rus = views.find((v) => v.id === "RUS") as PlayerViewCountry;
    expect(ordersFor(me, rus)[0].id).toBe("ceasefire");
    const can = views.find((v) => v.id === "CAN") as PlayerViewCountry;
    expect(ordersFor(me, can)[0].id).toBe("court");
  });
});
