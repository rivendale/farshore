import {
  BUILDING_BY_ID,
  FATHERS,
  addStock,
  countBuilding,
  hasBuilding,
  houseGold,
  islandPop,
  libertyPercent,
  totalPop,
  totalStock,
} from "@/game/data/catalog";
import { uid } from "@/game/sim/rng";
import type {
  GameEvent,
  GameState,
  GoodId,
  Island,
  Stock,
} from "@/game/types";
import { resolveBattle } from "@/game/sim/combat";

function pushLog(state: GameState, text: string, tone: GameEvent["tone"]) {
  state.log.unshift({ id: uid("ev"), day: state.day, text, tone });
  state.log = state.log.slice(0, 40);
}

function get(stock: Stock, id: GoodId) {
  return stock[id] ?? 0;
}

function take(stock: Stock, id: GoodId, n: number) {
  const have = get(stock, id);
  const used = Math.min(have, n);
  stock[id] = have - used;
  if ((stock[id] ?? 0) <= 0) delete stock[id];
  return used === n;
}

function islandSchool(island: Island) {
  return island.buildings.some((b) => b.type === "school" && !b.idle) ? 1.15 : 1;
}

function refreshStorageCap(island: Island) {
  island.storageCap =
    70 +
    island.buildings.reduce((n, b) => n + BUILDING_BY_ID[b.type].storageBonus, 0);
}

function assignWorkers(island: Island) {
  const pop = islandPop(island);
  const ranked = [...island.buildings]
    .map((b) => ({ b, def: BUILDING_BY_ID[b.type] }))
    .filter((x) => x.def.workers > 0)
    .sort((a, b) => a.def.priority - b.def.priority);
  let used = 0;
  for (const { b, def } of ranked) {
    if (used + def.workers <= pop) {
      b.idle = false;
      used += def.workers;
    } else {
      b.idle = true;
    }
  }
}

function tickIsland(state: GameState, island: Island) {
  if (!island.owned) return;
  refreshStorageCap(island);
  assignWorkers(island);
  const nation = state.nationId;
  const foodMult = nation === "france" ? 1.22 : 1;
  const school = islandSchool(island);
  const stock = { ...island.storage };

  const extractors = island.buildings
    .filter((b) => !b.idle)
    .map((b) => ({ b, def: BUILDING_BY_ID[b.type] }))
    .sort((a, b) => a.def.priority - b.def.priority);

  for (const { def } of extractors) {
    if (def.category !== "extract") continue;
    const out: Stock = {};
    for (const [k, v] of Object.entries(def.produces)) {
      if (!v) continue;
      const extra = k === "food" ? foodMult : 1;
      out[k as GoodId] = Math.max(1, Math.round(v * extra * school));
    }
    Object.assign(stock, addStock(stock, out, island.storageCap));
  }

  for (const { b, def } of extractors) {
    if (def.category !== "refine") continue;
    const ok = Object.entries(def.consumes).every(
      ([k, v]) => get(stock, k as GoodId) >= (v ?? 0),
    );
    if (!ok) {
      b.idle = true;
      continue;
    }
    for (const [k, v] of Object.entries(def.consumes)) take(stock, k as GoodId, v ?? 0);
    const out: Stock = {};
    for (const [k, v] of Object.entries(def.produces)) {
      if (v) out[k as GoodId] = Math.max(1, Math.round(v * school));
    }
    Object.assign(stock, addStock(stock, out, island.storageCap));
  }

  for (const { b, def } of extractors) {
    if (def.id !== "barracks") continue;
    if (get(stock, "muskets") >= 1 && get(stock, "food") >= 1) {
      take(stock, "muskets", 1);
      take(stock, "food", 1);
      state.militia += 1;
    } else {
      b.idle = true;
    }
  }

  for (const { def } of extractors) {
    if (def.id !== "market") continue;
    if (get(stock, "food") > 18) {
      take(stock, "food", 4);
      state.gold += 5;
    }
  }

  const houses = island.buildings.filter((b) => BUILDING_BY_ID[b.type].category === "house");
  for (const h of houses) {
    const def = BUILDING_BY_ID[h.type];
    let ok = true;
    for (const need of def.needs) {
      if (get(stock, need.good) < need.amount) {
        if (need.good === "food") ok = false;
        else ok = ok && false;
      }
    }
    const foodNeed = def.needs.find((n) => n.good === "food");
    if (foodNeed && get(stock, "food") >= foodNeed.amount) {
      take(stock, "food", foodNeed.amount);
    } else {
      h.satisfied = false;
      continue;
    }
    let lux = true;
    for (const need of def.needs) {
      if (need.good === "food") continue;
      if (get(stock, need.good) >= need.amount) take(stock, need.good, need.amount);
      else lux = false;
    }
    h.satisfied = lux;
    state.gold += houseGold(def, h.satisfied, state);
    if (h.filled < def.popCap && state.settlers > 0) {
      const add = Math.min(def.popCap - h.filled, state.settlers);
      h.filled += add;
      state.settlers -= add;
    }
  }

  const surplusFood = Math.max(0, get(stock, "food") - islandPop(island) * 0.4);
  state.growth += 1 + surplusFood * 0.15;

  for (const { b, def } of island.buildings.map((b) => ({ b, def: BUILDING_BY_ID[b.type] }))) {
    if (b.idle) continue;
    state.liberty += def.liberty;
    state.crosses += def.crosses;
  }

  island.storage = stock;
}

function tickShips(state: GameState) {
  for (const ship of state.ships) {
    if (ship.mission === "idle" || ship.eta <= 0) continue;
    ship.eta -= 1;
    if (ship.eta > 0) continue;
    if (ship.mission === "europe") {
      ship.location = "europe";
      ship.mission = "idle";
      ship.dest = null;
      pushLog(state, `${ship.name} makes Amsterdam roads. The docks are open.`, "info");
    } else if (ship.mission === "explore" && ship.exploreTarget) {
      const isle = state.islands.find((i) => i.id === ship.exploreTarget);
      if (isle) {
        isle.discovered = true;
        ship.location = isle.id;
        if (isle.native) {
          pushLog(
            state,
            `${ship.name} raises ${isle.name}. ${isle.native.name} watch from the treeline.`,
            "warn",
          );
        } else {
          isle.owned = true;
          pushLog(state, `${ship.name} claims ${isle.name} for the charter.`, "good");
        }
      }
      ship.mission = "idle";
      ship.dest = null;
      ship.exploreTarget = null;
    } else if (ship.mission === "transfer" && ship.dest && ship.dest !== "europe") {
      ship.location = ship.dest;
      ship.mission = "idle";
      const destIsle = state.islands.find((i) => i.id === ship.dest);
      if (destIsle) {
        destIsle.storage = addStock(destIsle.storage, ship.cargo, destIsle.storageCap);
        ship.cargo = {};
        pushLog(state, `${ship.name} unloads at ${destIsle.name}.`, "info");
      }
      ship.dest = null;
    } else if (ship.mission === "diplomacy" && ship.dest && ship.dest !== "europe") {
      ship.location = ship.dest;
      ship.mission = "idle";
      ship.dest = null;
    }
  }
}

function tickGrowth(state: GameState) {
  while (state.growth >= 36) {
    state.growth -= 36;
    state.settlers += 1;
    pushLog(state, "A child of the colony comes of age.", "good");
  }
  while (state.crosses >= 22) {
    state.crosses -= 22;
    state.settlers += 1;
    pushLog(state, "Immigrants step off a packet from Europe.", "good");
  }
}

function tickFathers(state: GameState) {
  const pct = libertyPercent(state);
  for (const f of FATHERS) {
    if (pct >= f.at && !state.fathers.includes(f.id)) {
      state.fathers.push(f.id);
      if (f.id === "penn") {
        for (const isle of state.islands) {
          if (isle.native) isle.native.relation = Math.min(100, isle.native.relation + 16);
        }
      }
      pushLog(state, `${f.name} joins the cause. ${f.blurb}`, "good");
    }
  }
}

function tickCrown(state: GameState) {
  if (state.independent) return;
  if (state.day >= state.nextTaxDay) {
    const bump = state.taxRate >= 12 ? 2 : 3;
    state.taxRate += bump;
    state.nextTaxDay = state.day + 26 + (state.taxRate % 7);
    state.liberty += 6;
    pushLog(
      state,
      `A royal proclamation: tariffs rise to ${state.taxRate}%. The coffeehouses mutter.`,
      "warn",
    );
    if (state.taxRate >= 20 && libertyPercent(state) >= 30 && !state.war) {
      pushLog(state, "Redcoats drill in the harbors of the old country.", "bad");
    }
  }
}

function tickWar(state: GameState) {
  if (!state.war || state.war.resolved) return;
  state.war.eta -= 1;
  if (state.war.eta > 0) return;
  const bonus = (state.fathers.includes("washington") ? 1.25 : 1) * (1 + totalPop(state) / 80);
  const player = Math.round((state.militia * 2 + musketsInEmpire(state)) * bonus);
  const result = resolveBattle(player, state.war.enemy, state.seed + state.day);
  state.militia = Math.max(0, state.militia - result.playerLosses);
  state.war.resolved = true;
  state.war.result = result.won ? "won" : "lost";
  if (result.won) {
    if (state.war.kind === "revolution") {
      state.independent = true;
      state.taxRate = 0;
      state.ending = "republic";
      state.screen = "victory";
      pushLog(state, "The royal line breaks. Farshore is a free republic.", "good");
    } else {
      pushLog(state, "The punitive raid is driven into the surf.", "good");
      state.liberty += 8;
    }
  } else {
    state.liberty = Math.max(0, state.liberty * 0.7);
    state.gold = Math.max(0, state.gold - 40);
    pushLog(state, "The Crown bloodies the beach. Bells fall quiet.", "bad");
  }
  if (state.war.kind !== "revolution" || !result.won) {
    state.war = null;
  }
}

function musketsInEmpire(state: GameState) {
  return state.islands.reduce((n, i) => n + (i.storage.muskets ?? 0), 0);
}

function checkCharterVictory(state: GameState) {
  if (state.ending !== "none") return;
  if (hasBuilding(state, "palace") && countBuilding(state, "manor") + countBuilding(state, "patriot") >= 3) {
    state.ending = "charter";
    state.screen = "victory";
    pushLog(state, "The palace rises. The charter stands eternal.", "good");
  }
}

export function tickDay(state: GameState): GameState {
  if (state.screen !== "play") return state;
  const next: GameState = {
    ...state,
    islands: state.islands.map((i) => ({
      ...i,
      tiles: i.tiles,
      buildings: i.buildings.map((b) => ({ ...b })),
      storage: { ...i.storage },
      native: i.native ? { ...i.native } : null,
    })),
    ships: state.ships.map((s) => ({ ...s, cargo: { ...s.cargo } })),
    prices: { ...state.prices },
    fathers: [...state.fathers],
    log: [...state.log],
    war: state.war ? { ...state.war } : null,
  };
  next.day += 1;
  next.lastRealAt = Date.now();
  for (const isle of next.islands) tickIsland(next, isle);
  tickShips(next);
  tickGrowth(next);
  tickFathers(next);
  tickCrown(next);
  tickWar(next);
  checkCharterVictory(next);
  return next;
}

export function catchUp(state: GameState, now = Date.now()): GameState {
  if (state.screen !== "play") return { ...state, lastRealAt: now };
  const elapsed = Math.max(0, now - state.lastRealAt) / 1000;
  const days = Math.min(220, Math.floor(elapsed / 1.15));
  let cur = state;
  for (let i = 0; i < days; i++) cur = tickDay(cur);
  return { ...cur, lastRealAt: now };
}
