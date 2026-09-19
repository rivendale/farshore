import {
  BASE_PRICES,
  BUILDING_BY_ID,
  FATHERS,
  addStock,
  countBuilding,
  hasBuilding,
  houseGold,
  islandPop,
  libertyPercent,
  totalPop,
} from "@/game/data/catalog";
import { JOB_PROFESSION, professionName, refreshPeople, workerMult, workersOn } from "@/game/data/people";
import { recoverPrices, tickRoutes } from "@/game/sim/routes";
import { uid } from "@/game/sim/rng";
import { makeColonist } from "@/game/data/people";
import type {
  GameEvent,
  GameState,
  GoodId,
  Island,
  IslandId,
  Stock,
} from "@/game/types";
import { resolveBattle } from "@/game/sim/combat";
import { tickNatives, tickRival } from "@/game/sim/world";

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

function islandSchool(state: GameState, island: Island) {
  return island.buildings.some((b) => b.type === "school" && workersOn(state, b.id).length > 0)
    ? 1.15
    : 1;
}

function refreshStorageCap(island: Island) {
  island.storageCap =
    70 + island.buildings.reduce((n, b) => n + BUILDING_BY_ID[b.type].storageBonus, 0);
}

function tickIsland(state: GameState, island: Island) {
  if (!island.owned) return;
  refreshStorageCap(island);
  const nation = state.nationId;
  const foodMult = nation === "france" ? 1.22 : 1;
  const school = islandSchool(state, island);
  const stock = { ...island.storage };

  const staffed = island.buildings
    .map((b) => ({ b, def: BUILDING_BY_ID[b.type], mult: workerMult(state, b.id, b.type) }))
    .filter((x) => x.def.workers === 0 || x.mult > 0)
    .sort((a, b) => a.def.priority - b.def.priority);

  for (const { b, def, mult } of staffed) {
    if (def.category !== "extract") continue;
    const out: Stock = {};
    for (const [k, v] of Object.entries(def.produces)) {
      if (!v) continue;
      const extra = k === "food" ? foodMult : 1;
      out[k as GoodId] = Math.max(1, Math.round(v * extra * school * mult));
    }
    Object.assign(stock, addStock(stock, out, island.storageCap));
    b.idle = false;
  }

  for (const { b, def, mult } of staffed) {
    if (def.category !== "refine") continue;
    const ok = Object.entries(def.consumes).every(([k, v]) => get(stock, k as GoodId) >= (v ?? 0));
    if (!ok) {
      b.idle = true;
      continue;
    }
    for (const [k, v] of Object.entries(def.consumes)) take(stock, k as GoodId, v ?? 0);
    const out: Stock = {};
    for (const [k, v] of Object.entries(def.produces)) {
      if (v) out[k as GoodId] = Math.max(1, Math.round(v * school * mult));
    }
    Object.assign(stock, addStock(stock, out, island.storageCap));
    b.idle = false;
  }

  for (const { b, def } of staffed) {
    if (def.id !== "barracks") continue;
    if (get(stock, "muskets") >= 1 && get(stock, "food") >= 1) {
      take(stock, "muskets", 1);
      take(stock, "food", 1);
      const crew = workersOn(state, b.id);
      const bonus = crew.some((c) => c.profession === "soldier") ? 2 : 1;
      state.militia += bonus;
      b.idle = false;
    } else {
      b.idle = true;
    }
  }

  for (const { def } of staffed) {
    if (def.id !== "market") continue;
    if (get(stock, "food") > 18) {
      take(stock, "food", 4);
      state.gold += 5;
    }
  }

  const houses = island.buildings.filter((b) => BUILDING_BY_ID[b.type].category === "house");
  for (const h of houses) {
    const def = BUILDING_BY_ID[h.type];
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
  }

  const surplusFood = Math.max(0, get(stock, "food") - islandPop(island) * 0.4);
  state.growth += 1 + surplusFood * 0.15;

  for (const { b, def } of island.buildings.map((b) => ({ b, def: BUILDING_BY_ID[b.type] }))) {
    if (b.idle && def.workers > 0) continue;
    let bells = def.liberty;
    if (def.id === "hall" || def.id === "chapel" || def.id === "palace") {
      if (workersOn(state, b.id).some((c) => c.profession === "statesman")) bells += 1;
    }
    state.liberty += bells;
    state.crosses += def.crosses;
  }

  for (const c of state.colonists) {
    if (c.islandId !== island.id) continue;
    if (c.profession === "criminal") state.liberty -= 0.25;
  }

  trainOnIsland(state, island);
  island.storage = stock;
}

function trainOnIsland(state: GameState, island: Island) {
  const schoolStaffed = island.buildings.some(
    (b) => b.type === "school" && workersOn(state, b.id).length > 0,
  );
  for (const c of state.colonists) {
    if (c.islandId !== island.id || c.profession !== "laborer" || !c.jobId) continue;
    const b = island.buildings.find((bb) => bb.id === c.jobId);
    if (!b) continue;
    const want = JOB_PROFESSION[b.type];
    if (!want || want === "laborer") continue;
    c.trainDays += schoolStaffed ? 2 : 1;
    if (c.trainDays >= 12) {
      c.profession = want;
      c.trainDays = 0;
      pushLog(state, `${c.name} is now a ${professionName(want).toLowerCase()}.`, "good");
    }
  }
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
      state.europeVisited = true;
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
        } else if (state.rival?.claimed && state.rival.islandId === isle.id) {
          pushLog(
            state,
            `${ship.name} raises ${isle.name}. ${state.rival.name} already flies here.`,
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
        pushLog(state, `${ship.name} makes ${destIsle.name}.`, "info");
      }
      ship.dest = null;
    } else if (ship.mission === "diplomacy" && ship.dest && ship.dest !== "europe") {
      ship.location = ship.dest;
      ship.mission = "idle";
      ship.dest = null;
    }
  }
}

function spawnOnBestIsland(state: GameState, kind: "child" | "immigrant") {
  const owned = state.islands.filter((i) => i.owned);
  const ranked = [...owned].sort((a, b) => {
    const slack = (isle: Island) =>
      isle.buildings.reduce((n, b) => n + BUILDING_BY_ID[b.type].popCap, 0) - islandPop(isle);
    return slack(b) - slack(a);
  });
  const home = ranked[0] ?? state.islands.find((i) => i.id === "haven")!;
  state.colonists.push(makeColonist(state, "laborer", home.id as IslandId));
  pushLog(
    state,
    kind === "child"
      ? `A child of the colony comes of age on ${home.name}.`
      : `Immigrants step off a packet at ${home.name}.`,
    "good",
  );
}

function tickGrowth(state: GameState) {
  while (state.growth >= 36) {
    state.growth -= 36;
    spawnOnBestIsland(state, "child");
  }
  while (state.crosses >= 22) {
    state.crosses -= 22;
    spawnOnBestIsland(state, "immigrant");
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
  if (
    hasBuilding(state, "palace") &&
    countBuilding(state, "manor") + countBuilding(state, "patriot") >= 3
  ) {
    state.ending = "charter";
    state.screen = "victory";
    pushLog(state, "The palace rises. The charter stands eternal.", "good");
  }
}

function cloneState(state: GameState): GameState {
  return {
    ...state,
    islands: state.islands.map((i) => ({
      ...i,
      buildings: i.buildings.map((b) => ({ ...b })),
      storage: { ...i.storage },
      native: i.native
        ? { ...i.native, vein: i.native.vein ? { ...i.native.vein } : null }
        : null,
      tiles: i.tiles.map((t) => ({ ...t })),
    })),
    ships: state.ships.map((s) => ({
      ...s,
      cargo: { ...s.cargo },
      route: s.route
        ? s.route.map((st) => ({ ...st, load: { ...st.load }, unload: { ...st.unload } }))
        : null,
    })),
    colonists: (state.colonists ?? []).map((c) => ({ ...c })),
    prices: { ...state.prices },
    fathers: [...state.fathers],
    log: [...state.log],
    war: state.war ? { ...state.war } : null,
    rival: state.rival
      ? { ...state.rival, cargo: { ...state.rival.cargo } }
      : null,
  };
}

export function tickDay(state: GameState): GameState {
  if (state.screen !== "play") return state;
  const next = cloneState(state);
  next.day += 1;
  next.lastRealAt = Date.now();
  refreshPeople(next);
  for (const isle of next.islands) tickIsland(next, isle);
  tickShips(next);
  tickRoutes(next);
  recoverPrices(next, BASE_PRICES);
  tickGrowth(next);
  refreshPeople(next);
  tickNatives(next);
  tickRival(next);
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
