import { NATIONS, addStock, payStock, totalStock } from "@/game/data/catalog";
import { uid } from "@/game/sim/rng";
import type { GameState, GoodId, IslandId, RouteStop, Ship, Stock } from "@/game/types";

function pushLog(state: GameState, text: string, tone: GameState["log"][0]["tone"]) {
  state.log.unshift({ id: uid("ev"), day: state.day, text, tone });
  state.log = state.log.slice(0, 40);
}

export function emptyStop(at: IslandId | "europe"): RouteStop {
  return { at, load: {}, unload: {}, sell: at === "europe" };
}

export function etaFor(from: Ship["location"], to: IslandId | "europe") {
  if (from === to) return 0;
  if (from === "europe" || to === "europe") return 8;
  return 4;
}

export function depart(ship: Ship, dest: IslandId | "europe") {
  if (dest === "europe") {
    ship.mission = "europe";
    ship.dest = "europe";
    ship.location = "sea";
    ship.eta = etaFor(ship.location, dest) || 8;
    return;
  }
  const fromEurope = ship.location === "europe";
  ship.mission = "transfer";
  ship.dest = dest;
  ship.location = "sea";
  ship.eta = fromEurope ? 8 : 4;
}

function moveCargo(from: Stock, to: Stock, good: GoodId, want: number, cap: number) {
  const have = from[good] ?? 0;
  const space = Math.max(0, cap - totalStock(to));
  const n = Math.min(want, have, space);
  if (n <= 0) return 0;
  from[good] = have - n;
  if ((from[good] ?? 0) <= 0) delete from[good];
  to[good] = (to[good] ?? 0) + n;
  return n;
}

export function applyStop(state: GameState, ship: Ship, stop: RouteStop) {
  if (stop.at === "europe") {
    if (stop.sell) {
      const nation = state.nationId ? NATIONS[state.nationId] : NATIONS.england;
      const trade = nation.tradeMult * (state.fathers.includes("franklin") ? 1.12 : 1);
      const tax = state.independent ? 0 : state.taxRate / 100;
      let gold = 0;
      for (const [k, v] of Object.entries(ship.cargo)) {
        if (!v) continue;
        const good = k as GoodId;
        const gross = v * state.prices[good] * trade;
        gold += Math.round(gross * (1 - tax));
        state.prices[good] = Math.max(1, Math.round((state.prices[good] - v * 0.15) * 10) / 10);
        if (tax > 0.08) state.liberty += v * 0.05;
      }
      ship.cargo = {};
      state.gold += gold;
      if (gold > 0) pushLog(state, `${ship.name} sells the hold in Europe for ${gold}g.`, "good");
    }
    return;
  }

  const isle = state.islands.find((i) => i.id === stop.at);
  if (!isle) return;
  const hasDock = isle.buildings.some((b) => b.type === "dock");
  if (!hasDock) {
    pushLog(state, `${ship.name} finds no dock at ${isle.name}.`, "warn");
    return;
  }

  for (const [k, v] of Object.entries(stop.unload)) {
    if (!v) continue;
    moveCargo(ship.cargo, isle.storage, k as GoodId, v >= 99 ? 999 : v, isle.storageCap);
  }
  for (const [k, v] of Object.entries(stop.load)) {
    if (!v) continue;
    moveCargo(isle.storage, ship.cargo, k as GoodId, v >= 99 ? 999 : v, ship.cargoCap);
  }
}

export function tickRoutes(state: GameState) {
  for (const ship of state.ships) {
    if (ship.held || !ship.route?.length) continue;
    if (ship.mission !== "idle") continue;
    const stop = ship.route[ship.routeIndex] ?? ship.route[0];
    if (!stop) continue;
    if (ship.location !== stop.at) {
      depart(ship, stop.at);
      continue;
    }
    applyStop(state, ship, stop);
    ship.routeIndex = (ship.routeIndex + 1) % ship.route.length;
    const next = ship.route[ship.routeIndex];
    if (next && next.at !== ship.location) depart(ship, next.at);
  }
}

export function recoverPrices(state: GameState, base: Record<GoodId, number>) {
  for (const k of Object.keys(base) as GoodId[]) {
    const cur = state.prices[k];
    const target = base[k];
    const next = cur + (target - cur) * 0.08;
    state.prices[k] = Math.max(1, Math.round(next * 10) / 10);
  }
}
