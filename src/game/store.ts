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
import { createGame } from "@/game/sim/create";
import { royalHost } from "@/game/sim/combat";
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
  closeSheet: () => void;
  tickDay: () => void;
  catchUp: () => void;
  place: (type: BuildingId) => string | null;
  upgrade: () => string | null;
  demolish: () => void;
  loadShip: (good: GoodId, amount: number) => void;
  unloadShip: (good: GoodId, amount: number) => void;
  sailEurope: () => string | null;
  sailHome: () => string | null;
  explore: (id: IslandId) => string | null;
  transferTo: (id: IslandId) => string | null;
  sell: (good: GoodId, amount: number) => void;
  buy: (good: GoodId, amount: number) => void;
  recruit: () => string | null;
  buyMuskets: () => string | null;
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

function idleShip(state: GameState) {
  return state.ships.find((s) => s.mission === "idle") ?? state.ships[0];
}

function notify(state: GameState, text: string, tone: GameState["log"][0]["tone"] = "info") {
  state.log = [{ id: uid("ev"), day: state.day, text, tone }, ...state.log].slice(0, 40);
}

function dockedHere(state: GameState) {
  const ship = idleShip(state);
  return ship && ship.location === state.selectedIslandId && ship.mission === "idle";
}

function hasDock(state: GameState, islandId: IslandId) {
  const isle = state.islands.find((i) => i.id === islandId);
  return isle?.buildings.some((b) => b.type === "dock") ?? false;
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
    if (saved && saved.nationId) set({ ...saved, screen: saved.ending !== "none" ? "victory" : saved.screen });
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
    if (def.category === "house" && state.settlers <= 0 && def.id === "hut") {
      /* still allow empty hut that fills later */
    }
    const cost = { ...def.cost };
    const fromStore = { ...isle.storage };
    const goldCost = 0;
    if (!stockHas(fromStore, cost) || state.gold < goldCost) return "Need more stores.";
    const storage = payStock(fromStore, cost);
    const filled =
      def.category === "house" ? Math.min(def.popCap, Math.max(0, state.settlers)) : 0;
    const settlers = state.settlers - filled;
    const inst = {
      id: uid("b"),
      type,
      x: tile.x,
      y: tile.y,
      filled,
      satisfied: true,
      idle: false,
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
    const next = {
      ...state,
      islands,
      settlers,
      gold: state.gold - goldCost,
      tutorialStep,
      tutorialDone: tutorialStep >= 5 ? true : state.tutorialDone,
      sheet: "tile" as const,
    };
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
          bb.id === b.id
            ? { ...bb, type: nextType, filled: Math.min(def.popCap, Math.max(bb.filled, 1)), satisfied: false }
            : bb,
        ),
      };
    });
    const next = { ...state, islands };
    set(next);
    scheduleSave(next);
    return null;
  },

  demolish: () => {
    const state = get();
    const tile = state.selectedTile;
    if (!tile) return;
    const isle = currentIsland(state);
    const b = isle.buildings.find((b) => b.x === tile.x && b.y === tile.y);
    if (!b) return;
    const def = BUILDING_BY_ID[b.type];
    const refund: Stock = {};
    for (const [k, v] of Object.entries(def.cost)) {
      refund[k as GoodId] = Math.floor((v ?? 0) / 2);
    }
    const islands = state.islands.map((i) =>
      i.id === isle.id
        ? {
            ...i,
            storage: addStock(i.storage, refund, i.storageCap),
            buildings: i.buildings.filter((bb) => bb.id !== b.id),
          }
        : i,
    );
    const next = {
      ...state,
      islands,
      settlers: state.settlers + (def.category === "house" ? b.filled : 0),
      sheet: "build" as const,
    };
    set(next);
    scheduleSave(next);
  },

  loadShip: (good, amount) => {
    const state = get();
    const ship = idleShip(state);
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
    const ship = idleShip(state);
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
    const ship = idleShip(state);
    if (!ship || ship.mission !== "idle") return "The ship is at sea.";
    if (ship.location === "europe") return "Already in Europe.";
    if (typeof ship.location === "string" && ship.location !== "sea" && !hasDock(state, ship.location as IslandId)) {
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
    const ship = idleShip(state);
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
    const ship = idleShip(state);
    const target = state.islands.find((i) => i.id === id);
    if (!ship || ship.mission !== "idle") return "The ship is at sea.";
    if (!target) return "No such shore.";
    if (target.discovered) return "Already charted.";
    if (typeof ship.location === "string" && ship.location !== "sea" && ship.location !== "europe") {
      if (!hasDock(state, ship.location as IslandId)) return "Need a wharf to leave.";
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
    const ship = idleShip(state);
    const target = state.islands.find((i) => i.id === id);
    if (!ship || ship.mission !== "idle") return "The ship is at sea.";
    if (!target?.discovered) return "Unknown waters.";
    if (ship.location === id) return "Already there.";
    if (typeof ship.location !== "string" || ship.location === "europe") {
      /* ok */
    } else if (!hasDock(state, ship.location as IslandId) && ship.location !== "sea") {
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
    const ship = idleShip(state);
    if (!ship || ship.location !== "europe") return;
    const have = ship.cargo[good] ?? 0;
    const n = Math.min(amount, have);
    if (n <= 0) return;
    const nation = state.nationId ? NATIONS[state.nationId] : NATIONS.england;
    const trade =
      nation.tradeMult * (state.fathers.includes("franklin") ? 1.12 : 1);
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
    const ship = idleShip(state);
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

  recruit: () => {
    const state = get();
    const ship = idleShip(state);
    if (!ship || ship.location !== "europe") return "The docks of Europe are far.";
    if (state.gold < 70) return "Need 70 gold.";
    const next = { ...state, gold: state.gold - 70, settlers: state.settlers + 1 };
    notify(next, "A free colonist takes a berth home.", "good");
    set(next);
    scheduleSave(next);
    return null;
  },

  buyMuskets: () => {
    const state = get();
    const ship = idleShip(state);
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
    const ship = idleShip(state);
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
        enemy: royalHost(state.day, colonies, "raid"),
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
        enemy: royalHost(state.day, colonies, "revolution"),
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

export { currentIsland, idleShip, dockedHere, hasDock };
