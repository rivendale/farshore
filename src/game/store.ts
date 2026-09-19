import { create } from "zustand";
import {
  BUILDING_BY_ID,
  NATIONS,
  TRIBES,
  addStock,
  isUnlocked,
  libertyPercent,
  payStock,
  stockHas,
  tileAllows,
  totalPop,
  totalStock,
} from "@/game/data/catalog";
import {
  PROFESSIONS,
  SHIP_NAMES,
  makeColonist,
  refreshPeople,
  workersOn,
} from "@/game/data/people";
import { createGame } from "@/game/sim/create";
import { royalHost } from "@/game/sim/combat";
import { emptyStop } from "@/game/sim/routes";
import { clearSave, loadSave, writeSave } from "@/game/persist";
import { uid } from "@/game/sim/rng";
import { catchUp, tickDay } from "@/game/sim/tick";
import type {
  BuildingId,
  GameState,
  GoodId,
  IslandId,
  NationId,
  PlayView,
  ProfessionId,
  RouteStop,
  Stock,
} from "@/game/types";

type Actions = {
  hydrate: () => void;
  newGame: (nation: NationId) => void;
  abandon: () => void;
  setScreen: (screen: GameState["screen"]) => void;
  setView: (view: PlayView) => void;
  setSpeed: (speed: GameState["speed"]) => void;
  selectIsland: (id: IslandId) => void;
  selectTile: (x: number, y: number) => void;
  selectShip: (id: string) => void;
  closeSheet: () => void;
  tickDay: () => void;
  catchUp: () => void;
  place: (type: BuildingId) => string | null;
  upgrade: () => string | null;
  demolish: () => void;
  assignJob: (colonistId: string) => string | null;
  unassignJob: (colonistId: string) => void;
  loadShip: (good: GoodId, amount: number) => void;
  unloadShip: (good: GoodId, amount: number) => void;
  sailEurope: () => string | null;
  sailHome: () => string | null;
  explore: (id: IslandId) => string | null;
  transferTo: (id: IslandId) => string | null;
  sell: (good: GoodId, amount: number) => void;
  buy: (good: GoodId, amount: number) => void;
  recruit: () => string | null;
  recruitProfession: (id: ProfessionId) => string | null;
  buyMuskets: () => string | null;
  buyShip: () => string | null;
  holdShip: (held: boolean) => void;
  addRouteStop: (at: IslandId | "europe") => void;
  updateRouteStop: (index: number, patch: Partial<RouteStop>) => void;
  removeRouteStop: (index: number) => void;
  clearRoute: () => void;
  nativeGift: () => string | null;
  nativeTrade: () => string | null;
  nativeSettle: () => string | null;
  skipTutorial: () => void;
  advanceTutorial: () => void;
  refuseTax: () => void;
  declare: () => string | null;
};

let saveTimer: number | null = null;
function scheduleSave(state: GameState) {
  if (typeof window === "undefined") return;
  if (saveTimer) window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => writeSave(state), 400);
}

function currentIsland(state: GameState) {
  return state.islands.find((i) => i.id === state.selectedIslandId)!;
}

function selectedShip(state: GameState) {
  return state.ships.find((s) => s.id === state.selectedShipId) ?? state.ships[0];
}

function notify(state: GameState, text: string, tone: GameState["log"][0]["tone"] = "info") {
  state.log = [{ id: uid("ev"), day: state.day, text, tone }, ...state.log].slice(0, 40);
}

function dockedHere(state: GameState) {
  const ship = selectedShip(state);
  return ship && ship.location === state.selectedIslandId && ship.mission === "idle";
}

function hasDock(state: GameState, islandId: IslandId) {
  const isle = state.islands.find((i) => i.id === islandId);
  return isle?.buildings.some((b) => b.type === "dock") ?? false;
}

function commit(state: GameState) {
  refreshPeople(state);
  return state;
}

const empty: GameState = {
  ...createGame("england", 1),
  screen: "title",
  nationId: null,
  tutorialStep: 0,
};

export const useGame = create<GameState & Actions>()((set, get) => ({
  ...empty,

  hydrate: () => {
    const saved = typeof window !== "undefined" ? loadSave() : null;
    if (saved && saved.nationId) {
      set({ ...saved, screen: saved.ending !== "none" ? "victory" : saved.screen });
    }
  },

  newGame: (nation) => {
    const g = createGame(nation);
    writeSave(g);
    set(g);
  },

  abandon: () => {
    clearSave();
    set({ ...createGame("england", 1), screen: "title", nationId: null });
  },

  setScreen: (screen) => set({ screen }),
  setView: (view) => set({ view, sheet: view === "island" ? get().sheet : "none" }),
  setSpeed: (speed) => set({ speed }),

  selectIsland: (id) => {
    const isle = get().islands.find((i) => i.id === id);
    if (!isle?.discovered) return;
    set({
      selectedIslandId: id,
      view: "island",
      selectedTile: null,
      sheet: isle.native && !isle.owned ? "native" : "none",
    });
  },

  selectTile: (x, y) => {
    const state = get();
    const isle = currentIsland(state);
    const native = isle.native && isle.native.x === x && isle.native.y === y;
    const b = isle.buildings.find((b) => b.x === x && b.y === y);
    const tile = isle.tiles.find((t) => t.x === x && t.y === y);
    if (!tile || tile.terrain === "water") {
      set({ selectedTile: { x, y }, sheet: "none" });
      return;
    }
    set({
      selectedTile: { x, y },
      sheet: native ? "native" : b ? "tile" : "build",
    });
  },

  selectShip: (id) => set({ selectedShipId: id, view: "hold" }),
  closeSheet: () => set({ sheet: "none" }),

  tickDay: () => {
    const next = tickDay(get());
    set(next);
    scheduleSave(next);
  },

  catchUp: () => {
    const next = catchUp(get());
    set(next);
  },

  place: (type) => {
    const state = get();
    const tile = state.selectedTile;
    if (!tile) return "Select a plot first.";
    const isle = currentIsland(state);
    if (!isle.owned) return "This shore is not yours.";
    const def = BUILDING_BY_ID[type];
    if (!isUnlocked(def, state)) return "Not yet unlocked.";
    if (isle.buildings.some((b) => b.x === tile.x && b.y === tile.y)) return "That plot is taken.";
    if (!tileAllows(def, isle, tile.x, tile.y)) return "Wrong ground for that work.";
    if (def.unique && isle.buildings.some((b) => b.type === type)) return "One per isle.";
    const cost = { ...def.cost };
    const fromStore = { ...isle.storage };
    if (!stockHas(fromStore, cost)) return "Need more stores.";
    const storage = payStock(fromStore, cost);
    const inst = {
      id: uid("b"),
      type,
      x: tile.x,
      y: tile.y,
      filled: 0,
      satisfied: true,
      idle: def.workers > 0,
    };
    const islands = state.islands.map((i) =>
      i.id === isle.id ? { ...i, storage, buildings: [...i.buildings, inst] } : i,
    );
    let tutorialStep = state.tutorialStep;
    if (!state.tutorialDone) {
      if (type === "hut" && tutorialStep === 0) tutorialStep = 1;
      else if (type === "farm" && tutorialStep === 1) tutorialStep = 2;
      else if (type === "lumber" && tutorialStep === 2) tutorialStep = 3;
      else if (type === "sawmill" && tutorialStep === 3) tutorialStep = 4;
      else if (type === "dock" && tutorialStep >= 4) tutorialStep = 5;
    }
    const next = commit({
      ...state,
      islands,
      colonists: state.colonists.map((c) => ({ ...c })),
      tutorialStep,
      tutorialDone: tutorialStep >= 5 ? true : state.tutorialDone,
      sheet: "tile" as const,
    });
    set(next);
    scheduleSave(next);
    return null;
  },

  upgrade: () => {
    const state = get();
    const tile = state.selectedTile;
    if (!tile) return "Select a house.";
    const isle = currentIsland(state);
    const b = isle.buildings.find((b) => b.x === tile.x && b.y === tile.y);
    if (!b) return "Nothing to raise.";
    const nextType = (
      {
        hut: "cottage",
        cottage: "townhouse",
        townhouse: "manor",
        manor: "patriot",
      } as Partial<Record<BuildingId, BuildingId>>
    )[b.type];
    if (!nextType) return "This house is finished.";
    const def = BUILDING_BY_ID[nextType];
    if (!isUnlocked(def, state)) return "The colony is not ready for that life.";
    if (!stockHas(isle.storage, def.cost)) return "Need more stores.";
    const islands = state.islands.map((i) => {
      if (i.id !== isle.id) return i;
      return {
        ...i,
        storage: payStock(i.storage, def.cost),
        buildings: i.buildings.map((bb) =>
          bb.id === b.id ? { ...bb, type: nextType, satisfied: false } : bb,
        ),
      };
    });
    const next = commit({ ...state, islands, colonists: state.colonists.map((c) => ({ ...c })) });
    set(next);
    scheduleSave(next);
    return null;
  },

  demolish: () => {
    const state = get();
    const tile = state.selectedTile;
    if (!tile) return;
    const isle = currentIsland(state);
    if (!isle.owned) return;
    const b = isle.buildings.find((b) => b.x === tile.x && b.y === tile.y);
    if (!b) return;
    const def = BUILDING_BY_ID[b.type];
    const refund: Stock = {};
    for (const [k, v] of Object.entries(def.cost)) {
      refund[k as GoodId] = Math.floor((v ?? 0) / 2);
    }
    const colonists = state.colonists.map((c) => {
      if (c.homeId === b.id) return { ...c, homeId: null };
      if (c.jobId === b.id) return { ...c, jobId: null, locked: true, trainDays: 0 };
      return { ...c };
    });
    const islands = state.islands.map((i) =>
      i.id === isle.id
        ? {
            ...i,
            storage: addStock(i.storage, refund, i.storageCap),
            buildings: i.buildings.filter((bb) => bb.id !== b.id),
          }
        : i,
    );
    const next = commit({
      ...state,
      islands,
      colonists,
      sheet: "build" as const,
    });
    set(next);
    scheduleSave(next);
  },

  assignJob: (colonistId) => {
    const state = get();
    const tile = state.selectedTile;
    if (!tile) return "Select a work.";
    const isle = currentIsland(state);
    const b = isle.buildings.find((bb) => bb.x === tile.x && bb.y === tile.y);
    if (!b) return "Nothing to staff.";
    const def = BUILDING_BY_ID[b.type];
    if (def.workers <= 0) return "This plot does not take a hand.";
    const person = state.colonists.find((c) => c.id === colonistId);
    if (!person || person.islandId !== isle.id) return "They are not on this shore.";
    if (!person.homeId) return "House them first.";
    if (workersOn(state, b.id).length >= def.workers && person.jobId !== b.id) {
      return "Full. Pull someone off first.";
    }
    const colonists = state.colonists.map((c) =>
      c.id === colonistId ? { ...c, jobId: b.id, locked: true, trainDays: c.jobId === b.id ? c.trainDays : 0 } : c,
    );
    const next = commit({ ...state, colonists });
    set(next);
    scheduleSave(next);
    return null;
  },

  unassignJob: (colonistId) => {
    const state = get();
    const colonists = state.colonists.map((c) =>
      c.id === colonistId ? { ...c, jobId: null, locked: true, trainDays: 0 } : { ...c },
    );
    const next = commit({ ...state, colonists });
    set(next);
    scheduleSave(next);
  },

  loadShip: (good, amount) => {
    const state = get();
    const ship = selectedShip(state);
    const isle = currentIsland(state);
    if (!ship || !dockedHere(state) || !hasDock(state, isle.id)) return;
    const have = isle.storage[good] ?? 0;
    const space = ship.cargoCap - totalStock(ship.cargo);
    const n = Math.min(amount, have, space);
    if (n <= 0) return;
    const islands = state.islands.map((i) =>
      i.id === isle.id ? { ...i, storage: payStock(i.storage, { [good]: n }) } : i,
    );
    const next = {
      ...state,
      islands,
      ships: state.ships.map((s) =>
        s.id === ship.id ? { ...s, cargo: addStock(s.cargo, { [good]: n }) } : s,
      ),
    };
    set(next);
    scheduleSave(next);
  },

  unloadShip: (good, amount) => {
    const state = get();
    const ship = selectedShip(state);
    const isle = currentIsland(state);
    if (!ship || ship.location !== isle.id || ship.mission !== "idle") return;
    const have = ship.cargo[good] ?? 0;
    const n = Math.min(amount, have);
    if (n <= 0) return;
    const islands = state.islands.map((i) =>
      i.id === isle.id ? { ...i, storage: addStock(i.storage, { [good]: n }, i.storageCap) } : i,
    );
    const next = {
      ...state,
      islands,
      ships: state.ships.map((s) =>
        s.id === ship.id ? { ...s, cargo: payStock(s.cargo, { [good]: n }) } : s,
      ),
    };
    set(next);
    scheduleSave(next);
  },

  sailEurope: () => {
    const state = get();
    const ship = selectedShip(state);
    if (!ship || ship.mission !== "idle") return "The ship is at sea.";
    if (ship.location === "europe") return "Already in Europe.";
    if (ship.location !== "sea" && !hasDock(state, ship.location)) {
      return "Need a wharf to clear for Europe.";
    }
    const next = {
      ...state,
      ships: state.ships.map((s) =>
        s.id === ship.id
          ? { ...s, mission: "europe" as const, dest: "europe" as const, location: "sea" as const, eta: 8 }
          : s,
      ),
    };
    notify(next, `${ship.name} takes the sea road to Europe.`, "info");
    set(next);
    scheduleSave(next);
    return null;
  },

  sailHome: () => {
    const state = get();
    const ship = selectedShip(state);
    if (!ship || ship.location !== "europe") return "Not in Europe.";
    const home = state.selectedIslandId;
    if (!hasDock(state, home)) return "That isle has no wharf.";
    const next = {
      ...state,
      ships: state.ships.map((s) =>
        s.id === ship.id
          ? { ...s, mission: "transfer" as const, dest: home, location: "sea" as const, eta: 8 }
          : s,
      ),
    };
    notify(next, `${ship.name} sails for ${currentIsland(state).name}.`, "info");
    set(next);
    scheduleSave(next);
    return null;
  },

  explore: (id) => {
    const state = get();
    const ship = selectedShip(state);
    const target = state.islands.find((i) => i.id === id);
    if (!ship || ship.mission !== "idle") return "The ship is at sea.";
    if (!target) return "No such shore.";
    if (target.discovered) return "Already charted.";
    if (ship.location !== "sea" && ship.location !== "europe" && !hasDock(state, ship.location)) {
      return "Need a wharf to leave.";
    }
    const next = {
      ...state,
      ships: state.ships.map((s) =>
        s.id === ship.id
          ? {
              ...s,
              mission: "explore" as const,
              dest: id,
              exploreTarget: id,
              location: "sea" as const,
              eta: 5,
            }
          : s,
      ),
    };
    notify(next, `${ship.name} hunts the horizon for ${target.name}.`, "info");
    set(next);
    scheduleSave(next);
    return null;
  },

  transferTo: (id) => {
    const state = get();
    const ship = selectedShip(state);
    const target = state.islands.find((i) => i.id === id);
    if (!ship || ship.mission !== "idle") return "The ship is at sea.";
    if (!target?.discovered) return "Unknown waters.";
    if (ship.location === id) return "Already there.";
    if (ship.location !== "europe" && ship.location !== "sea" && !hasDock(state, ship.location)) {
      return "Need a wharf.";
    }
    const next = {
      ...state,
      ships: state.ships.map((s) =>
        s.id === ship.id
          ? { ...s, mission: "transfer" as const, dest: id, location: "sea" as const, eta: 4 }
          : s,
      ),
    };
    set(next);
    scheduleSave(next);
    return null;
  },

  sell: (good, amount) => {
    const state = get();
    const ship = selectedShip(state);
    if (!ship || ship.location !== "europe") return;
    const have = ship.cargo[good] ?? 0;
    const n = Math.min(amount, have);
    if (n <= 0) return;
    const nation = state.nationId ? NATIONS[state.nationId] : NATIONS.england;
    const trade = nation.tradeMult * (state.fathers.includes("franklin") ? 1.12 : 1);
    const tax = state.independent ? 0 : state.taxRate / 100;
    const gross = n * state.prices[good] * trade;
    const gold = Math.round(gross * (1 - tax));
    const prices = { ...state.prices };
    prices[good] = Math.max(1, Math.round((prices[good] - n * 0.15) * 10) / 10);
    const next = {
      ...state,
      gold: state.gold + gold,
      prices,
      liberty: state.liberty + (tax > 0.08 ? n * 0.05 : 0),
      ships: state.ships.map((s) =>
        s.id === ship.id ? { ...s, cargo: payStock(s.cargo, { [good]: n }) } : s,
      ),
    };
    set(next);
    scheduleSave(next);
  },

  buy: (good, amount) => {
    const state = get();
    const ship = selectedShip(state);
    if (!ship || ship.location !== "europe") return;
    const price = Math.round(state.prices[good] * 1.35);
    const space = ship.cargoCap - totalStock(ship.cargo);
    const n = Math.min(amount, space, Math.floor(state.gold / price));
    if (n <= 0) return;
    const next = {
      ...state,
      gold: state.gold - n * price,
      ships: state.ships.map((s) =>
        s.id === ship.id ? { ...s, cargo: addStock(s.cargo, { [good]: n }) } : s,
      ),
    };
    set(next);
    scheduleSave(next);
  },

  recruit: () => get().recruitProfession("laborer"),

  recruitProfession: (id) => {
    const state = get();
    const ship = selectedShip(state);
    if (!ship || ship.location !== "europe") return "The docks of Europe are far.";
    const def = PROFESSIONS.find((p) => p.id === id);
    if (!def) return "No such hands.";
    if (state.gold < def.cost) return `Need ${def.cost} gold.`;
    const home = state.islands.find((i) => i.id === state.selectedIslandId && i.owned)
      ? state.selectedIslandId
      : "haven";
    const colonists = [...state.colonists.map((c) => ({ ...c })), makeColonist(state, id, home)];
    const next = commit({
      ...state,
      gold: state.gold - def.cost,
      colonists,
    });
    notify(next, `${def.name} ${colonists[colonists.length - 1].name} takes a berth for home.`, "good");
    set(next);
    scheduleSave(next);
    return null;
  },

  buyMuskets: () => {
    const state = get();
    const ship = selectedShip(state);
    if (!ship || ship.location !== "europe") return "Not in Europe.";
    const price = 28;
    if (state.gold < price) return "Need more gold.";
    if (totalStock(ship.cargo) >= ship.cargoCap) return "Hold is full.";
    const next = {
      ...state,
      gold: state.gold - price,
      ships: state.ships.map((s) =>
        s.id === ship.id ? { ...s, cargo: addStock(s.cargo, { muskets: 1 }) } : s,
      ),
    };
    set(next);
    scheduleSave(next);
    return null;
  },

  buyShip: () => {
    const state = get();
    if (!state.europeVisited) return "Chart Europe once before you buy another hull.";
    if (state.ships.length >= 3) return "Three hulls is the charter's limit.";
    if (state.gold < 200) return "Need 200 gold.";
    const nation = state.nationId ? NATIONS[state.nationId] : NATIONS.england;
    const name = SHIP_NAMES[state.ships.length] ?? `Hull ${state.ships.length + 1}`;
    const loc = hasDock(state, state.selectedIslandId) ? state.selectedIslandId : "haven";
    const ship = {
      id: uid("ship"),
      name,
      cargoCap: nation.cargo,
      cargo: {},
      location: loc as IslandId,
      dest: null,
      eta: 0,
      mission: "idle" as const,
      exploreTarget: null,
      held: false,
      route: null,
      routeIndex: 0,
    };
    const next = {
      ...state,
      gold: state.gold - 200,
      ships: [...state.ships, ship],
      selectedShipId: ship.id,
    };
    notify(next, `${name} is yours. A second hold changes the map.`, "good");
    set(next);
    scheduleSave(next);
    return null;
  },

  holdShip: (held) => {
    const state = get();
    const ship = selectedShip(state);
    if (!ship) return;
    const next = {
      ...state,
      ships: state.ships.map((s) => (s.id === ship.id ? { ...s, held } : s)),
    };
    set(next);
    scheduleSave(next);
  },

  addRouteStop: (at) => {
    const state = get();
    const ship = selectedShip(state);
    if (!ship) return;
    const route = [...(ship.route ?? []), emptyStop(at)];
    const next = {
      ...state,
      ships: state.ships.map((s) =>
        s.id === ship.id ? { ...s, route, routeIndex: ship.routeIndex, held: false } : s,
      ),
    };
    set(next);
    scheduleSave(next);
  },

  updateRouteStop: (index, patch) => {
    const state = get();
    const ship = selectedShip(state);
    if (!ship?.route || !ship.route[index]) return;
    const route = ship.route.map((st, i) =>
      i === index
        ? {
            ...st,
            ...patch,
            load: patch.load ?? st.load,
            unload: patch.unload ?? st.unload,
          }
        : st,
    );
    const next = {
      ...state,
      ships: state.ships.map((s) => (s.id === ship.id ? { ...s, route } : s)),
    };
    set(next);
    scheduleSave(next);
  },

  removeRouteStop: (index) => {
    const state = get();
    const ship = selectedShip(state);
    if (!ship?.route) return;
    const route = ship.route.filter((_, i) => i !== index);
    const next = {
      ...state,
      ships: state.ships.map((s) =>
        s.id === ship.id
          ? { ...s, route: route.length ? route : null, routeIndex: 0 }
          : s,
      ),
    };
    set(next);
    scheduleSave(next);
  },

  clearRoute: () => {
    const state = get();
    const ship = selectedShip(state);
    if (!ship) return;
    const next = {
      ...state,
      ships: state.ships.map((s) =>
        s.id === ship.id ? { ...s, route: null, routeIndex: 0, held: false } : s,
      ),
    };
    set(next);
    scheduleSave(next);
  },

  nativeGift: () => {
    const state = get();
    const isle = currentIsland(state);
    if (!isle.native) return "No nation here.";
    if (state.gold < 25) return "Need 25 gold.";
    if (state.day - isle.native.lastGiftDay < 8) return "Wait a few days.";
    const islands = state.islands.map((i) =>
      i.id === isle.id && i.native
        ? { ...i, native: { ...i.native, relation: Math.min(100, i.native.relation + 12), lastGiftDay: state.day } }
        : i,
    );
    const next = { ...state, gold: state.gold - 25, islands };
    notify(next, `Gifts for the ${isle.native.name}. The talks soften.`, "good");
    set(next);
    scheduleSave(next);
    return null;
  },

  nativeTrade: () => {
    const state = get();
    const isle = currentIsland(state);
    const native = isle.native;
    if (!native) return "No nation here.";
    if (native.relation < 20) return "They will not trade.";
    const tribe = TRIBES[native.tribeId];
    const ship = selectedShip(state);
    const want = tribe.wants;
    const offer = tribe.offers;
    const source = ship && ship.location === isle.id ? ship.cargo : isle.storage;
    if ((source[want] ?? 0) < 2) return `They want ${want}.`;
    const usingShip = !!(ship && ship.location === isle.id && (ship.cargo[want] ?? 0) >= 2);
    let ships = state.ships;
    let islands = state.islands;
    if (usingShip && ship) {
      ships = state.ships.map((s) =>
        s.id === ship.id
          ? { ...s, cargo: addStock(payStock(s.cargo, { [want]: 2 }), { [offer]: 3 }) }
          : s,
      );
    } else {
      islands = state.islands.map((i) =>
        i.id === isle.id
          ? { ...i, storage: addStock(payStock(i.storage, { [want]: 2 }), { [offer]: 3 }, i.storageCap) }
          : i,
      );
    }
    islands = islands.map((i) =>
      i.id === isle.id && i.native
        ? { ...i, native: { ...i.native, relation: Math.min(100, i.native.relation + 4) } }
        : i,
    );
    const next = { ...state, ships, islands };
    notify(next, `Trade with the ${native.name}: ${want} for ${offer}.`, "good");
    set(next);
    scheduleSave(next);
    return null;
  },

  nativeSettle: () => {
    const state = get();
    const isle = currentIsland(state);
    const native = isle.native;
    if (!native) return "No nation here.";
    if (isle.owned) return "You already keep this shore.";
    if (state.rival?.claimed && state.rival.islandId === isle.id) {
      return `${state.rival.name} already flies here.`;
    }
    if (native.relation < 55) return "They have not granted settlement rights.";
    if (state.gold < 80) return "The gift-price is 80 gold.";
    const islands = state.islands.map((i) =>
      i.id === isle.id
        ? { ...i, owned: true, native: { ...i.native!, relation: Math.min(100, i.native!.relation + 6) } }
        : i,
    );
    const next = { ...state, gold: state.gold - 80, islands, sheet: "build" as const };
    notify(next, `The ${native.name} grant a plot on ${isle.name}.`, "good");
    set(next);
    scheduleSave(next);
    return null;
  },

  skipTutorial: () => set({ tutorialDone: true, tutorialStep: 5 }),
  advanceTutorial: () =>
    set((s) => ({ tutorialStep: s.tutorialStep + 1, tutorialDone: s.tutorialStep + 1 >= 5 })),

  refuseTax: () => {
    const state = get();
    if (state.independent || state.war) return;
    const colonies = state.islands.filter((i) => i.owned).length;
    const next: GameState = {
      ...state,
      liberty: state.liberty + 10,
      war: {
        kind: "raid",
        eta: 7,
        enemy: royalHost(state.day, colonies, "raid", state.rival?.liberty ?? 0),
        resolved: false,
        result: "pending",
      },
    };
    notify(next, "You refuse the tariff. A punitive squadron is rumored.", "bad");
    set(next);
    scheduleSave(next);
  },

  declare: () => {
    const state = get();
    if (state.independent) return "Already free.";
    if (libertyPercent(state) < 50) return "The people are not ready. Raise the bells.";
    if (totalPop(state) < 16) return "Too few souls to hold a republic.";
    if (state.militia < 6) return "Raise a militia before you defy the Crown.";
    const colonies = state.islands.filter((i) => i.owned).length;
    const next: GameState = {
      ...state,
      declared: true,
      war: {
        kind: "revolution",
        eta: 10,
        enemy: royalHost(state.day, colonies, "revolution", state.rival?.liberty ?? 0),
        resolved: false,
        result: "pending",
      },
    };
    notify(next, "Independence is declared. The royal expedition is coming.", "warn");
    set(next);
    scheduleSave(next);
    return null;
  },
}));

export function useIsland() {
  return useGame((s) => s.islands.find((i) => i.id === s.selectedIslandId)!);
}

export { currentIsland, selectedShip, dockedHere, hasDock };
