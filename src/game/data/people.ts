import { BUILDING_BY_ID } from "@/game/data/catalog";
import { uid } from "@/game/sim/rng";
import type {
  BuildingId,
  Colonist,
  GameState,
  Island,
  IslandId,
  ProfessionId,
  Ship,
} from "@/game/types";

export const PROFESSIONS: {
  id: ProfessionId;
  name: string;
  blurb: string;
  cost: number;
}[] = [
  { id: "laborer", name: "Laborer", blurb: "Any work, no craft.", cost: 70 },
  { id: "farmer", name: "Farmer", blurb: "Grain, nets, and fields.", cost: 110 },
  { id: "lumberjack", name: "Lumberjack", blurb: "Timber and traplines.", cost: 110 },
  { id: "miner", name: "Miner", blurb: "Ore and silver in the hills.", cost: 110 },
  { id: "artisan", name: "Artisan", blurb: "Mills, looms, stills, forges.", cost: 140 },
  { id: "soldier", name: "Soldier", blurb: "Barracks and the beach.", cost: 120 },
  { id: "statesman", name: "Statesman", blurb: "Hall, chapel, palace. Loud bells.", cost: 180 },
  { id: "criminal", name: "Petty criminal", blurb: "Cheap hands. Soft bells.", cost: 40 },
];

export const PROFESSION_BY_ID = Object.fromEntries(PROFESSIONS.map((p) => [p.id, p])) as Record<
  ProfessionId,
  (typeof PROFESSIONS)[number]
>;

export const JOB_PROFESSION: Partial<Record<BuildingId, ProfessionId>> = {
  farm: "farmer",
  fishery: "farmer",
  cotton: "farmer",
  tobacco: "farmer",
  sugar: "farmer",
  lumber: "lumberjack",
  trapper: "lumberjack",
  mine: "miner",
  silver: "miner",
  sawmill: "artisan",
  weaver: "artisan",
  distillery: "artisan",
  cigarmaker: "artisan",
  furrier: "artisan",
  smithy: "artisan",
  armory: "artisan",
  school: "artisan",
  hall: "statesman",
  chapel: "statesman",
  palace: "statesman",
  market: "statesman",
  barracks: "soldier",
};

const GIVEN = [
  "Anne",
  "Bram",
  "Cora",
  "Dirk",
  "Els",
  "Finn",
  "Greta",
  "Hugo",
  "Ida",
  "Jan",
  "Kat",
  "Lars",
  "Mae",
  "Nils",
  "Ora",
  "Piet",
  "Ruth",
  "Sven",
  "Tess",
  "Willem",
  "Ada",
  "Bess",
  "Clem",
  "Dora",
];

export const SHIP_NAMES = ["Charter", "Packet", "Sloop"];

export function professionName(id: ProfessionId) {
  return PROFESSION_BY_ID[id]?.name ?? id;
}

export function colonistName(existing: Colonist[]) {
  const used = new Set(existing.map((c) => c.name));
  const free = GIVEN.find((n) => !used.has(n));
  if (free) return free;
  return `${GIVEN[existing.length % GIVEN.length]} ${Math.floor(existing.length / GIVEN.length) + 1}`;
}

export function makeColonist(
  state: Pick<GameState, "colonists">,
  profession: ProfessionId,
  islandId: IslandId,
  extra: Partial<Colonist> = {},
): Colonist {
  return {
    id: uid("c"),
    name: colonistName(state.colonists),
    profession,
    islandId,
    homeId: null,
    jobId: null,
    locked: false,
    trainDays: 0,
    ...extra,
  };
}

export function yieldMult(profession: ProfessionId, building: BuildingId) {
  const want = JOB_PROFESSION[building];
  if (profession === "criminal") return 0.8;
  if (profession === "laborer") return 1;
  if (want && profession === want) return 1.5;
  if (profession === "statesman" && (building === "hall" || building === "chapel" || building === "palace")) {
    return 1.25;
  }
  return 0.85;
}

export function workersOn(state: GameState, buildingId: string) {
  return state.colonists.filter((c) => c.jobId === buildingId);
}

export function residentsOn(state: GameState, buildingId: string) {
  return state.colonists.filter((c) => c.homeId === buildingId);
}

export function joblessOn(state: GameState, islandId: IslandId) {
  return state.colonists.filter((c) => c.islandId === islandId && c.homeId && !c.jobId);
}

export function idleHands(state: GameState, islandId: IslandId) {
  return joblessOn(state, islandId).length;
}

export function unhousedCount(state: GameState) {
  return state.colonists.filter((c) => !c.homeId).length;
}

export function workerMult(state: GameState, buildingId: string, type: BuildingId) {
  const def = BUILDING_BY_ID[type];
  if (def.workers <= 0) return 1;
  const crew = workersOn(state, buildingId);
  if (!crew.length) return 0;
  const sum = crew.reduce((n, c) => n + yieldMult(c.profession, type), 0);
  return sum / def.workers;
}

export function syncHousing(state: GameState, island: Island) {
  const houses = island.buildings.filter((b) => BUILDING_BY_ID[b.type].category === "house");
  const ids = new Set(island.buildings.map((b) => b.id));
  for (const c of state.colonists) {
    if (c.islandId !== island.id) continue;
    if (c.homeId && !ids.has(c.homeId)) c.homeId = null;
    if (c.jobId && !ids.has(c.jobId)) {
      c.jobId = null;
      c.trainDays = 0;
    }
  }
  for (const h of houses) {
    const cap = BUILDING_BY_ID[h.type].popCap;
    const here = state.colonists.filter((c) => c.homeId === h.id);
    while (here.length > cap) {
      const extra = here.pop()!;
      extra.homeId = null;
    }
    h.filled = state.colonists.filter((c) => c.homeId === h.id).length;
  }
  const unhoused = state.colonists.filter((c) => c.islandId === island.id && !c.homeId);
  for (const h of houses) {
    const cap = BUILDING_BY_ID[h.type].popCap;
    while (h.filled < cap && unhoused.length) {
      const c = unhoused.shift()!;
      c.homeId = h.id;
      h.filled += 1;
    }
  }
}

export function autoAssign(state: GameState, island: Island) {
  const ranked = island.buildings
    .map((b) => ({ b, def: BUILDING_BY_ID[b.type] }))
    .filter((x) => x.def.workers > 0)
    .sort((a, b) => a.def.priority - b.def.priority);

  for (const { b, def } of ranked) {
    let have = workersOn(state, b.id);
    while (have.length < def.workers) {
      const want = JOB_PROFESSION[b.type];
      const pool = state.colonists.filter(
        (c) => c.islandId === island.id && c.homeId && !c.jobId && !c.locked,
      );
      const pick =
        (want && pool.find((c) => c.profession === want)) ||
        pool.find((c) => c.profession === "laborer") ||
        pool.find((c) => c.profession === "criminal") ||
        pool[0];
      if (!pick) break;
      pick.jobId = b.id;
      have = workersOn(state, b.id);
    }
    b.idle = workersOn(state, b.id).length < def.workers;
  }
}

export function refreshPeople(state: GameState) {
  for (const isle of state.islands) {
    if (!isle.owned) continue;
    syncHousing(state, isle);
    autoAssign(state, isle);
  }
  state.settlers = unhousedCount(state);
}

export function emptyShipFields(ship: Partial<Ship> = {}): Pick<Ship, "held" | "route" | "routeIndex"> {
  return {
    held: ship.held ?? false,
    route: ship.route ?? null,
    routeIndex: ship.routeIndex ?? 0,
  };
}

export function migratePeople(state: GameState): GameState {
  const next: GameState = {
    ...state,
    colonists: Array.isArray(state.colonists) ? state.colonists.map((c) => ({ ...c })) : [],
    ships: state.ships.map((s) => ({
      ...s,
      cargo: { ...s.cargo },
      ...emptyShipFields(s),
    })),
    selectedShipId: state.selectedShipId || state.ships[0]?.id || "",
    europeVisited: Boolean(state.europeVisited),
  };

  if (!next.colonists.length) {
    for (const isle of next.islands) {
      for (const b of isle.buildings) {
        const def = BUILDING_BY_ID[b.type];
        if (def.category !== "house") continue;
        for (let i = 0; i < (b.filled || 0); i++) {
          next.colonists.push(
            makeColonist(next, "laborer", isle.id, { homeId: b.id, locked: false }),
          );
        }
      }
    }
    const housed = next.colonists.length;
    const waiting = Math.max(0, (state.settlers ?? 0) - 0);
    const home = next.islands.find((i) => i.id === "haven") ?? next.islands[0];
    for (let i = 0; i < waiting; i++) {
      next.colonists.push(makeColonist(next, "laborer", home.id));
    }
    if (!housed && !waiting && (state.settlers ?? 0) > 0) {
      for (let i = 0; i < state.settlers; i++) {
        next.colonists.push(makeColonist(next, "laborer", "haven"));
      }
    }
  }

  refreshPeople(next);
  next.version = 2;
  if (!next.selectedShipId && next.ships[0]) next.selectedShipId = next.ships[0].id;
  return next;
}
