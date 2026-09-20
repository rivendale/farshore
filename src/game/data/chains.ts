import { BUILDING_BY_ID } from "@/game/data/catalog";
import type {
  BuildingId,
  ChainId,
  GameState,
  GoodId,
  Island,
  Ship,
  ShipOrder,
} from "@/game/types";

export const MAX_ORDERS = 2;

export type ChainDef = {
  id: ChainId;
  name: string;
  blurb: string;
  buildings: BuildingId[];
  exports: GoodId[];
  raws: GoodId[];
  climate?: "tropical";
};

export const CHAINS: ChainDef[] = [
  {
    id: "timber",
    name: "Timber",
    blurb: "Axes and the mill. Planks for every roof — and Europe buys the extra.",
    buildings: ["lumber", "sawmill"],
    exports: ["planks"],
    raws: ["lumber"],
  },
  {
    id: "cloth",
    name: "Cloth",
    blurb: "Cotton in the field, cloth on the loom. Europe pays for finished goods.",
    buildings: ["cotton", "weaver"],
    exports: ["cloth"],
    raws: ["cotton"],
  },
  {
    id: "tobacco",
    name: "Leaf",
    blurb: "Broadleaf into cigars. The manor set pays.",
    buildings: ["tobacco", "cigarmaker"],
    exports: ["cigars"],
    raws: ["tobacco"],
  },
  {
    id: "rum",
    name: "Rum",
    blurb: "Cane on a warm shore. Rum in the hold.",
    buildings: ["sugar", "distillery"],
    exports: ["rum"],
    raws: ["sugar"],
    climate: "tropical",
  },
  {
    id: "furs",
    name: "Fur",
    blurb: "Traplines and a furrier. Coats for the old country.",
    buildings: ["trapper", "furrier"],
    exports: ["coats"],
    raws: ["furs"],
  },
  {
    id: "iron",
    name: "Iron",
    blurb: "Ore, tools, muskets. The beach is won with this.",
    buildings: ["mine", "smithy", "armory"],
    exports: ["tools", "muskets"],
    raws: ["ore"],
  },
  {
    id: "silver",
    name: "Silver",
    blurb: "A thin vein. A fat purse.",
    buildings: ["silver"],
    exports: ["silver"],
    raws: [],
  },
];

export const CHAIN_BY_ID = Object.fromEntries(CHAINS.map((c) => [c.id, c])) as Record<
  ChainId,
  ChainDef
>;

const ALWAYS_STAFF = new Set<BuildingId>([
  "farm",
  "fishery",
  "dock",
  "hall",
  "chapel",
  "school",
  "barracks",
  "market",
  "palace",
]);

export function chainOfBuilding(type: BuildingId): ChainId | null {
  for (const c of CHAINS) {
    if (c.buildings.includes(type)) return c.id;
  }
  return null;
}

export function buildingWanted(type: BuildingId, orders: ChainId[]): boolean {
  if (ALWAYS_STAFF.has(type)) return true;
  const chain = chainOfBuilding(type);
  if (!chain) return false;
  return orders.includes(chain);
}

export function inferOrders(island: Island): ChainId[] {
  const scored = CHAINS.map((c) => {
    const have = c.buildings.filter((id) => island.buildings.some((b) => b.type === id)).length;
    const refine = c.buildings.some((id) => {
      const def = BUILDING_BY_ID[id];
      return def.category === "refine" && island.buildings.some((b) => b.type === id);
    });
    return { id: c.id, have, score: have + (refine ? 2 : 0) };
  })
    .filter((x) => x.have > 0)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, MAX_ORDERS).map((x) => x.id);
}

export type ChainStatus = "running" | "building" | "missing" | "wrong-shore";

export function chainStatus(island: Island, chain: ChainId): ChainStatus {
  const def = CHAIN_BY_ID[chain];
  if (def.climate && island.climate !== def.climate) {
    const has = def.buildings.some((id) => island.buildings.some((b) => b.type === id));
    if (!has) return "wrong-shore";
  }
  const have = def.buildings.filter((id) => island.buildings.some((b) => b.type === id));
  if (!have.length) return "missing";
  if (have.length < def.buildings.length) return "building";
  const idle = island.buildings.some((b) => def.buildings.includes(b.type) && b.idle);
  return idle ? "building" : "running";
}

export function chainHint(island: Island, chain: ChainId): string {
  const def = CHAIN_BY_ID[chain];
  const status = chainStatus(island, chain);
  if (status === "wrong-shore") return "Cane wants a warm isle — Cinder Cay.";
  if (status === "missing") {
    if (chain === "silver") return "Need hills, then a silver camp.";
    return `Need: ${BUILDING_BY_ID[def.buildings[0]].name}.`;
  }
  if (status === "building") {
    const missing = def.buildings.filter((id) => !island.buildings.some((b) => b.type === id));
    if (missing.length) return `Still need: ${BUILDING_BY_ID[missing[0]].name}.`;
    return "Hands are short, or the mill is waiting on input.";
  }
  return "Running. The island staffs this.";
}

export function loadGoodsFor(island: Island, chain: ChainId): GoodId[] {
  const def = CHAIN_BY_ID[chain];
  const goods: GoodId[] = [...def.exports];
  for (const raw of def.raws) {
    const kept = island.buildings.some((b) => (BUILDING_BY_ID[b.type].consumes[raw] ?? 0) > 0);
    if (!kept) goods.push(raw);
  }
  return goods;
}

export function inferOrderFromRoute(ship: Ship): ShipOrder | null {
  if (ship.order) return ship.order;
  const route = ship.route;
  if (!route?.length) return null;
  const homeStop = route.find((s) => s.at !== "europe");
  if (!homeStop || homeStop.at === "europe") return null;
  for (const c of CHAINS) {
    const hits = [...c.exports, ...c.raws].some((g) => (homeStop.load[g] ?? 0) > 0);
    if (hits) return { chain: c.id, home: homeStop.at };
  }
  return null;
}

export function migrateOrders(state: GameState): GameState {
  const from = state.version ?? 1;
  const islands = state.islands.map((isle) => {
    if (from >= 6 && Array.isArray(isle.orders)) return isle;
    return { ...isle, orders: inferOrders(isle) };
  });
  const ships = state.ships.map((s) => ({
    ...s,
    order: s.order ?? inferOrderFromRoute(s) ?? null,
  }));
  return { ...state, islands, ships };
}
