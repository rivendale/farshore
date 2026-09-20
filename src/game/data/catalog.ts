import type {
  BuildingId,
  GameState,
  GoodId,
  Island,
  IslandId,
  NationId,
  Stock,
  Terrain,
} from "@/game/types";
import { asset } from "@/lib/asset";

export const DAY_SECONDS = 1.15;
export const SAVE_KEY = "farshore.save.v1";
export const SAVE_VERSION = 6;
export const MAP_SIZE = 9;

export const GOODS: {
  id: GoodId;
  name: string;
  basePrice: number;
}[] = [
  { id: "food", name: "Grain", basePrice: 2 },
  { id: "lumber", name: "Lumber", basePrice: 3 },
  { id: "planks", name: "Planks", basePrice: 6 },
  { id: "cotton", name: "Cotton", basePrice: 4 },
  { id: "cloth", name: "Cloth", basePrice: 14 },
  { id: "tobacco", name: "Tobacco", basePrice: 5 },
  { id: "cigars", name: "Cigars", basePrice: 16 },
  { id: "sugar", name: "Cane", basePrice: 5 },
  { id: "rum", name: "Rum", basePrice: 15 },
  { id: "furs", name: "Furs", basePrice: 7 },
  { id: "coats", name: "Coats", basePrice: 18 },
  { id: "ore", name: "Ore", basePrice: 4 },
  { id: "tools", name: "Tools", basePrice: 9 },
  { id: "muskets", name: "Muskets", basePrice: 22 },
  { id: "silver", name: "Silver", basePrice: 36 },
];

export const GOOD_IDS = GOODS.map((g) => g.id);
export const BASE_PRICES = Object.fromEntries(
  GOODS.map((g) => [g.id, g.basePrice]),
) as Record<GoodId, number>;

export type Need = { good: GoodId; amount: number };

export type BuildingDef = {
  id: BuildingId;
  name: string;
  category: "house" | "extract" | "refine" | "civic";
  blurb: string;
  cost: Stock;
  terrain: Terrain[] | "land" | "coast";
  workers: number;
  popCap: number;
  produces: Stock;
  consumes: Stock;
  needs: Need[];
  storageBonus: number;
  liberty: number;
  crosses: number;
  priority: number;
  climate?: "tropical";
  unique?: boolean;
  upgradeFrom?: BuildingId;
  faction?: "tory" | "patriot" | "neutral";
};

export const BUILDINGS: BuildingDef[] = [
  {
    id: "hut",
    name: "Pioneer Hut",
    category: "house",
    blurb: "Home for four people. They eat grain.",
    cost: { lumber: 10 },
    terrain: "land",
    workers: 0,
    popCap: 4,
    produces: { food: 0 },
    consumes: { food: 2 },
    needs: [{ good: "food", amount: 2 }],
    storageBonus: 0,
    liberty: 0,
    crosses: 0,
    priority: 20,
  },
  {
    id: "cottage",
    name: "Settler Cottage",
    category: "house",
    blurb: "Six settlers. Want rum with supper.",
    cost: { lumber: 8, planks: 8 },
    terrain: "land",
    workers: 0,
    popCap: 6,
    produces: {},
    consumes: { food: 3, rum: 1 },
    needs: [
      { good: "food", amount: 3 },
      { good: "rum", amount: 1 },
    ],
    storageBonus: 0,
    liberty: 0.4,
    crosses: 0,
    priority: 21,
    upgradeFrom: "hut",
  },
  {
    id: "townhouse",
    name: "Townhouse",
    category: "house",
    blurb: "Loyal to the King. Rum and cloth. They pay tax and slow independence.",
    cost: { planks: 16, cloth: 2 },
    terrain: "land",
    workers: 0,
    popCap: 8,
    produces: {},
    consumes: { food: 4, rum: 1, cloth: 1 },
    needs: [
      { good: "food", amount: 4 },
      { good: "rum", amount: 1 },
      { good: "cloth", amount: 1 },
    ],
    storageBonus: 0,
    liberty: 0.15,
    crosses: 0,
    priority: 22,
    upgradeFrom: "cottage",
    faction: "tory",
  },
  {
    id: "manor",
    name: "Merchant Manor",
    category: "house",
    blurb: "Stay loyal. More tax, slower independence. The King likes these roofs.",
    cost: { planks: 20, cloth: 4 },
    terrain: "land",
    workers: 0,
    popCap: 8,
    produces: {},
    consumes: { food: 4, rum: 1, cloth: 1, cigars: 1 },
    needs: [
      { good: "food", amount: 4 },
      { good: "rum", amount: 1 },
      { good: "cloth", amount: 1 },
      { good: "cigars", amount: 1 },
    ],
    storageBonus: 0,
    liberty: -0.6,
    crosses: 0,
    priority: 23,
    upgradeFrom: "townhouse",
    faction: "tory",
  },
  {
    id: "patriot",
    name: "Patriot Hall",
    category: "house",
    blurb: "Want independence. Coats and a hard stare. They pay less tax.",
    cost: { planks: 24, coats: 2 },
    terrain: "land",
    workers: 0,
    popCap: 8,
    produces: {},
    consumes: { food: 4, rum: 1, cloth: 1, coats: 1 },
    needs: [
      { good: "food", amount: 4 },
      { good: "rum", amount: 1 },
      { good: "cloth", amount: 1 },
      { good: "coats", amount: 1 },
    ],
    storageBonus: 0,
    liberty: 2.5,
    crosses: 0,
    priority: 24,
    upgradeFrom: "townhouse",
    faction: "patriot",
  },
  {
    id: "farm",
    name: "Farm",
    category: "extract",
    blurb: "Grain from cleared grassland.",
    cost: { lumber: 8 },
    terrain: ["grass"],
    workers: 1,
    popCap: 0,
    produces: { food: 5 },
    consumes: {},
    needs: [],
    storageBonus: 0,
    liberty: 0,
    crosses: 0,
    priority: 10,
  },
  {
    id: "fishery",
    name: "Fishery",
    category: "extract",
    blurb: "Nets on the tide line. Feeds a hungry isle.",
    cost: { lumber: 10 },
    terrain: "coast",
    workers: 1,
    popCap: 0,
    produces: { food: 6 },
    consumes: {},
    needs: [],
    storageBonus: 0,
    liberty: 0,
    crosses: 0,
    priority: 10,
  },
  {
    id: "lumber",
    name: "Lumber Camp",
    category: "extract",
    blurb: "Axes in the timber. Place on forest.",
    cost: { lumber: 6 },
    terrain: ["forest"],
    workers: 1,
    popCap: 0,
    produces: { lumber: 4 },
    consumes: {},
    needs: [],
    storageBonus: 0,
    liberty: 0,
    crosses: 0,
    priority: 11,
  },
  {
    id: "cotton",
    name: "Cotton Field",
    category: "extract",
    blurb: "White bolls for the loom.",
    cost: { lumber: 8 },
    terrain: ["grass"],
    workers: 1,
    popCap: 0,
    produces: { cotton: 3 },
    consumes: {},
    needs: [],
    storageBonus: 0,
    liberty: 0,
    crosses: 0,
    priority: 14,
  },
  {
    id: "tobacco",
    name: "Tobacco Field",
    category: "extract",
    blurb: "Broadleaf for the tobacconist.",
    cost: { lumber: 8 },
    terrain: ["grass"],
    workers: 1,
    popCap: 0,
    produces: { tobacco: 3 },
    consumes: {},
    needs: [],
    storageBonus: 0,
    liberty: 0,
    crosses: 0,
    priority: 14,
  },
  {
    id: "sugar",
    name: "Cane Field",
    category: "extract",
    blurb: "Only the warm isles take cane.",
    cost: { lumber: 8 },
    terrain: ["grass"],
    workers: 1,
    popCap: 0,
    produces: { sugar: 3 },
    consumes: {},
    needs: [],
    storageBonus: 0,
    liberty: 0,
    crosses: 0,
    priority: 14,
    climate: "tropical",
  },
  {
    id: "trapper",
    name: "Trapline",
    category: "extract",
    blurb: "Pelts from the deep wood.",
    cost: { lumber: 6 },
    terrain: ["forest"],
    workers: 1,
    popCap: 0,
    produces: { furs: 2 },
    consumes: {},
    needs: [],
    storageBonus: 0,
    liberty: 0,
    crosses: 0,
    priority: 15,
  },
  {
    id: "mine",
    name: "Ore Pit",
    category: "extract",
    blurb: "Iron from the hills.",
    cost: { lumber: 10, planks: 4 },
    terrain: ["hills"],
    workers: 1,
    popCap: 0,
    produces: { ore: 3 },
    consumes: {},
    needs: [],
    storageBonus: 0,
    liberty: 0,
    crosses: 0,
    priority: 13,
  },
  {
    id: "silver",
    name: "Silver Camp",
    category: "extract",
    blurb: "A thin vein, a fat purse.",
    cost: { lumber: 12, tools: 4 },
    terrain: ["hills"],
    workers: 1,
    popCap: 0,
    produces: { silver: 1 },
    consumes: {},
    needs: [],
    storageBonus: 0,
    liberty: 0,
    crosses: 0,
    priority: 16,
  },
  {
    id: "sawmill",
    name: "Sawmill",
    category: "refine",
    blurb: "Lumber into planks for every roof.",
    cost: { lumber: 12 },
    terrain: "land",
    workers: 1,
    popCap: 0,
    produces: { planks: 2 },
    consumes: { lumber: 2 },
    needs: [],
    storageBonus: 0,
    liberty: 0,
    crosses: 0,
    priority: 12,
  },
  {
    id: "weaver",
    name: "Weaver",
    category: "refine",
    blurb: "Cotton into cloth. Europe pays for finished goods.",
    cost: { lumber: 8, planks: 8 },
    terrain: "land",
    workers: 1,
    popCap: 0,
    produces: { cloth: 2 },
    consumes: { cotton: 2 },
    needs: [],
    storageBonus: 0,
    liberty: 0,
    crosses: 0,
    priority: 17,
  },
  {
    id: "distillery",
    name: "Distillery",
    category: "refine",
    blurb: "Cane into rum. Settlers will not stay dry.",
    cost: { planks: 14 },
    terrain: "land",
    workers: 1,
    popCap: 0,
    produces: { rum: 2 },
    consumes: { sugar: 2 },
    needs: [],
    storageBonus: 0,
    liberty: 0,
    crosses: 0,
    priority: 17,
  },
  {
    id: "cigarmaker",
    name: "Tobacconist",
    category: "refine",
    blurb: "Leaf into cigars for the manor set.",
    cost: { planks: 12 },
    terrain: "land",
    workers: 1,
    popCap: 0,
    produces: { cigars: 2 },
    consumes: { tobacco: 2 },
    needs: [],
    storageBonus: 0,
    liberty: 0,
    crosses: 0,
    priority: 18,
  },
  {
    id: "furrier",
    name: "Furrier",
    category: "refine",
    blurb: "Pelts into coats. Patriots will not freeze.",
    cost: { planks: 12 },
    terrain: "land",
    workers: 1,
    popCap: 0,
    produces: { coats: 2 },
    consumes: { furs: 2 },
    needs: [],
    storageBonus: 0,
    liberty: 0,
    crosses: 0,
    priority: 18,
  },
  {
    id: "smithy",
    name: "Smithy",
    category: "refine",
    blurb: "Ore into tools. Tools raise the whole isle.",
    cost: { planks: 12, ore: 2 },
    terrain: "land",
    workers: 1,
    popCap: 0,
    produces: { tools: 2 },
    consumes: { ore: 2 },
    needs: [],
    storageBonus: 0,
    liberty: 0,
    crosses: 0,
    priority: 13,
  },
  {
    id: "armory",
    name: "Armory",
    category: "refine",
    blurb: "Tools and ore into muskets.",
    cost: { planks: 16, tools: 4 },
    terrain: "land",
    workers: 1,
    popCap: 0,
    produces: { muskets: 1 },
    consumes: { tools: 1, ore: 1 },
    needs: [],
    storageBonus: 0,
    liberty: 0,
    crosses: 0,
    priority: 19,
  },
  {
    id: "warehouse",
    name: "Warehouse",
    category: "civic",
    blurb: "Eighty more barrels under one roof.",
    cost: { lumber: 10, planks: 6 },
    terrain: "land",
    workers: 0,
    popCap: 0,
    produces: {},
    consumes: {},
    needs: [],
    storageBonus: 80,
    liberty: 0,
    crosses: 0,
    priority: 30,
  },
  {
    id: "dock",
    name: "Dock",
    category: "civic",
    blurb: "Ships, Europe, and the other islands.",
    cost: { lumber: 14, planks: 6 },
    terrain: "coast",
    workers: 1,
    popCap: 0,
    produces: {},
    consumes: {},
    needs: [],
    storageBonus: 20,
    liberty: 0,
    crosses: 0,
    priority: 12,
    unique: true,
  },
  {
    id: "hall",
    name: "Town Hall",
    category: "civic",
    blurb: "Liberty bells. The Crown hears them too.",
    cost: { lumber: 12, planks: 12 },
    terrain: "land",
    workers: 1,
    popCap: 0,
    produces: {},
    consumes: {},
    needs: [],
    storageBonus: 0,
    liberty: 4,
    crosses: 0,
    priority: 16,
    unique: true,
  },
  {
    id: "chapel",
    name: "Chapel",
    category: "civic",
    blurb: "Faith draws immigrants from the old country.",
    cost: { lumber: 10, planks: 8 },
    terrain: "land",
    workers: 1,
    popCap: 0,
    produces: {},
    consumes: {},
    needs: [],
    storageBonus: 0,
    liberty: 0.5,
    crosses: 5,
    priority: 16,
  },
  {
    id: "school",
    name: "Schoolhouse",
    category: "civic",
    blurb: "The island produces more.",
    cost: { planks: 16, cloth: 2 },
    terrain: "land",
    workers: 1,
    popCap: 0,
    produces: {},
    consumes: {},
    needs: [],
    storageBonus: 0,
    liberty: 0.5,
    crosses: 1,
    priority: 25,
    unique: true,
  },
  {
    id: "barracks",
    name: "Barracks",
    category: "civic",
    blurb: "Grain and a musket make a militiaman.",
    cost: { planks: 16, tools: 2 },
    terrain: "land",
    workers: 1,
    popCap: 0,
    produces: {},
    consumes: { food: 1, muskets: 1 },
    needs: [],
    storageBonus: 0,
    liberty: 0,
    crosses: 0,
    priority: 19,
  },
  {
    id: "stockade",
    name: "Stockade",
    category: "civic",
    blurb: "A fort on the beach. Attacks hit softer here; you hit harder on theirs.",
    cost: { planks: 20, tools: 3 },
    terrain: "coast",
    workers: 0,
    popCap: 0,
    produces: {},
    consumes: {},
    needs: [],
    storageBonus: 0,
    liberty: 0.2,
    crosses: 0,
    priority: 20,
    unique: true,
  },
  {
    id: "market",
    name: "Market",
    category: "civic",
    blurb: "Sells spare grain when storage is full.",
    cost: { planks: 12 },
    terrain: "land",
    workers: 1,
    popCap: 0,
    produces: {},
    consumes: {},
    needs: [],
    storageBonus: 10,
    liberty: 0,
    crosses: 0,
    priority: 26,
  },
  {
    id: "palace",
    name: "Governor's Palace",
    category: "civic",
    blurb: "A capital. Stay loyal and you win without a war.",
    cost: { planks: 40, cloth: 8, silver: 6 },
    terrain: "land",
    workers: 2,
    popCap: 0,
    produces: {},
    consumes: {},
    needs: [],
    storageBonus: 0,
    liberty: 8,
    crosses: 2,
    priority: 40,
    unique: true,
  },
];

export const BUILDING_BY_ID = Object.fromEntries(
  BUILDINGS.map((b) => [b.id, b]),
) as Record<BuildingId, BuildingDef>;

export const NATIONS: Record<
  NationId,
  {
    id: NationId;
    name: string;
    motto: string;
    blurb: string;
    gold: number;
    settlers: number;
    militia: number;
    muskets: number;
    cargo: number;
    libertyMult: number;
    foodMult: number;
    tradeMult: number;
    nativeRel: number;
  }
> = {
  england: {
    id: "england",
    name: "England",
    motto: "I will have my own laws.",
    blurb: "You bring an extra hand. Independence comes easier — and the King already has your name.",
    gold: 180,
    settlers: 5,
    militia: 0,
    muskets: 0,
    cargo: 4,
    libertyMult: 1.18,
    foodMult: 1,
    tradeMult: 1,
    nativeRel: 0,
  },
  france: {
    id: "france",
    name: "France",
    motto: "Live with the land.",
    blurb: "You'd rather eat than fight. The people already here trust you. Farms and nets work harder.",
    gold: 170,
    settlers: 4,
    militia: 0,
    muskets: 0,
    cargo: 4,
    libertyMult: 1,
    foodMult: 1.22,
    tradeMult: 1,
    nativeRel: 22,
  },
  spain: {
    id: "spain",
    name: "Spain",
    motto: "Gold in the chest. Steel on the sand.",
    blurb: "You land with silver and four armed men. The beach is already yours.",
    gold: 260,
    settlers: 4,
    militia: 4,
    muskets: 4,
    cargo: 4,
    libertyMult: 0.92,
    foodMult: 1,
    tradeMult: 1,
    nativeRel: -6,
  },
  netherlands: {
    id: "netherlands",
    name: "United Provinces",
    motto: "The books don't lie.",
    blurb: "You came to trade, not to kneel. Europe pays you better. Your ship holds more.",
    gold: 220,
    settlers: 4,
    militia: 0,
    muskets: 0,
    cargo: 6,
    libertyMult: 1,
    foodMult: 1,
    tradeMult: 1.22,
    nativeRel: 8,
  },
};

export const FATHERS: {
  id: string;
  name: string;
  at: number;
  blurb: string;
}[] = [
  {
    id: "penn",
    name: "William Penn",
    at: 10,
    blurb: "Native relations rise.",
  },
  {
    id: "franklin",
    name: "Benjamin Franklin",
    at: 22,
    blurb: "Europe pays a fairer price.",
  },
  {
    id: "paine",
    name: "Thomas Paine",
    at: 36,
    blurb: "Independence rises faster.",
  },
  {
    id: "washington",
    name: "George Washington",
    at: 50,
    blurb: "The militia stands a hand taller.",
  },
  {
    id: "hamilton",
    name: "Alexander Hamilton",
    at: 68,
    blurb: "House taxes fatten the treasury.",
  },
];

export const ISLAND_META: Record<
  IslandId,
  { name: string; blurb: string; climate: "temperate" | "tropical" }
> = {
  haven: {
    name: "Haven Isle",
    blurb: "Your first shore. Mixed timber, grass, and a hill or two.",
    climate: "temperate",
  },
  kaneska: {
    name: "Kaneska",
    blurb: "River Kin country. Deep forest, cotton land, a people already home.",
    climate: "temperate",
  },
  iron: {
    name: "Iron Cape",
    blurb: "Bare hills and a rumor of silver. Someone will plant a flag.",
    climate: "temperate",
  },
  cinder: {
    name: "Cinder Cay",
    blurb: "Warm water and cane. The Cane Nation keeps the beaches.",
    climate: "tropical",
  },
};

export const TRIBES: Record<
  string,
  { name: string; wants: GoodId; offers: GoodId; blurb: string }
> = {
  river: {
    name: "River Kin",
    wants: "tools",
    offers: "furs",
    blurb: "Woodland farmers and trappers. They will trade, teach, or fight.",
  },
  cane: {
    name: "Cane Nation",
    wants: "rum",
    offers: "sugar",
    blurb: "Masters of the warm shore. Settlement here is a negotiation.",
  },
};

export const ART: Record<string, string> = {
  hut: asset("/game/buildings/hut.png"),
  cottage: asset("/game/buildings/cottage.png"),
  townhouse: asset("/game/buildings/townhouse.png"),
  manor: asset("/game/buildings/manor.png"),
  farm: asset("/game/buildings/farm.png"),
  fishery: asset("/game/buildings/fishery.png"),
  lumber: asset("/game/buildings/lumber.png"),
  cotton: asset("/game/buildings/cotton.png"),
  tobacco: asset("/game/buildings/tobacco.png"),
  sugar: asset("/game/buildings/sugar.png"),
  trapper: asset("/game/buildings/trapper.png"),
  mine: asset("/game/buildings/mine.png"),
  silver: asset("/game/buildings/silver.png"),
  sawmill: asset("/game/buildings/sawmill.png"),
  weaver: asset("/game/buildings/weaver.png"),
  distillery: asset("/game/buildings/distillery.png"),
  cigarmaker: asset("/game/buildings/cigarmaker.png"),
  furrier: asset("/game/buildings/furrier.png"),
  smithy: asset("/game/buildings/smithy.png"),
  armory: asset("/game/buildings/armory.png"),
  warehouse: asset("/game/buildings/warehouse.png"),
  dock: asset("/game/buildings/dock.png"),
  hall: asset("/game/buildings/hall.png"),
  chapel: asset("/game/buildings/chapel.png"),
  school: asset("/game/buildings/school.png"),
  barracks: asset("/game/buildings/barracks.png"),
  stockade: asset("/game/buildings/stockade.png"),
  market: asset("/game/buildings/market.png"),
  palace: asset("/game/buildings/palace.png"),
  patriot: asset("/game/buildings/patriot.png"),
  tree: asset("/game/props/tree.png"),
  ship: asset("/game/props/ship.png"),
  sloop: asset("/game/props/sloop.png"),
  village: asset("/game/props/village.png"),
  laborer: asset("/game/props/laborer.png"),
  farmer: asset("/game/props/farmer.png"),
  artisan: asset("/game/props/artisan.png"),
};

export const TILE_ART: Record<Terrain, string> = {
  water: asset("/game/tiles/water.png"),
  sand: asset("/game/tiles/sand.png"),
  grass: asset("/game/tiles/grass.png"),
  forest: asset("/game/tiles/forest.png"),
  hills: asset("/game/tiles/hills.png"),
};

export const PERSON_ART: Record<string, string> = {
  laborer: ART.laborer,
  farmer: ART.farmer,
  lumberjack: ART.laborer,
  miner: ART.laborer,
  artisan: ART.artisan,
  soldier: ART.laborer,
  statesman: ART.artisan,
  criminal: ART.laborer,
};

export const SMOKE_BUILDINGS = new Set([
  "hut",
  "cottage",
  "townhouse",
  "manor",
  "patriot",
  "sawmill",
  "distillery",
  "smithy",
  "armory",
  "cigarmaker",
  "hall",
  "chapel",
  "school",
]);

export const ISLAND_ART: Record<IslandId, string> = {
  haven: asset("/game/islands/haven.jpg"),
  kaneska: asset("/game/islands/kaneska.jpg"),
  iron: asset("/game/islands/iron.jpg"),
  cinder: asset("/game/islands/cinder.jpg"),
};

export function goodName(id: GoodId) {
  return GOODS.find((g) => g.id === id)?.name ?? id;
}

export function stockHas(stock: Stock, cost: Stock) {
  return Object.entries(cost).every(([k, v]) => (stock[k as GoodId] ?? 0) >= (v ?? 0));
}

export function payStock(stock: Stock, cost: Stock): Stock {
  const next = { ...stock };
  for (const [k, v] of Object.entries(cost)) {
    const id = k as GoodId;
    next[id] = (next[id] ?? 0) - (v ?? 0);
    if ((next[id] ?? 0) <= 0) delete next[id];
  }
  return next;
}

export function addStock(stock: Stock, add: Stock, cap = Infinity): Stock {
  const next = { ...stock };
  const used = totalStock(next);
  let room = Math.max(0, cap - used);
  for (const [k, v] of Object.entries(add)) {
    if (!v) continue;
    const id = k as GoodId;
    const put = Math.min(v, room);
    if (put <= 0) break;
    next[id] = (next[id] ?? 0) + put;
    room -= put;
  }
  return next;
}

export function totalStock(stock: Stock) {
  return Object.values(stock).reduce((a, b) => a + (b ?? 0), 0);
}

export function islandPop(island: Island) {
  return island.buildings.reduce((n, b) => {
    const def = BUILDING_BY_ID[b.type];
    return n + (def.category === "house" ? b.filled : 0);
  }, 0);
}

export function islandCap(island: Island) {
  return island.buildings.reduce((n, b) => n + BUILDING_BY_ID[b.type].popCap, 0);
}

export function totalPop(state: GameState) {
  return state.islands.reduce((n, i) => n + islandPop(i), 0);
}

export function hasBuilding(state: GameState, id: BuildingId) {
  return state.islands.some((i) => i.buildings.some((b) => b.type === id));
}

export function countBuilding(state: GameState, id: BuildingId) {
  return state.islands.reduce(
    (n, i) => n + i.buildings.filter((b) => b.type === id).length,
    0,
  );
}

export function libertyPercent(state: GameState) {
  const pop = Math.max(1, totalPop(state));
  const nation = state.nationId ? NATIONS[state.nationId] : null;
  const bells = state.liberty * (nation?.libertyMult ?? 1) * (state.fathers.includes("paine") ? 1.25 : 1);
  return Math.max(0, Math.min(100, Math.floor((bells / (pop * 7)) * 100)));
}

export function isCoastTile(island: Island, x: number, y: number) {
  const here = island.tiles.find((t) => t.x === x && t.y === y);
  if (!here || here.terrain === "water") return false;
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  return dirs.some(([dx, dy]) => {
    const n = island.tiles.find((t) => t.x === x + dx && t.y === y + dy);
    return n?.terrain === "water";
  });
}

export function tileAllows(def: BuildingDef, island: Island, x: number, y: number) {
  const tile = island.tiles.find((t) => t.x === x && t.y === y);
  if (!tile || tile.terrain === "water") return false;
  if (island.native && island.native.x === x && island.native.y === y) return false;
  if (def.climate === "tropical" && island.climate !== "tropical") return false;
  if (def.terrain === "land") return true;
  if (def.terrain === "coast") return isCoastTile(island, x, y);
  return def.terrain.includes(tile.terrain);
}

export function isUnlocked(def: BuildingDef, state: GameState) {
  const pop = totalPop(state);
  const houses = countBuilding(state, "hut") + countBuilding(state, "cottage") + countBuilding(state, "townhouse") + countBuilding(state, "manor") + countBuilding(state, "patriot");
  switch (def.id) {
    case "hut":
    case "farm":
    case "lumber":
      return true;
    case "fishery":
    case "sawmill":
    case "warehouse":
      return pop >= 4 || houses >= 1;
    case "dock":
    case "chapel":
      return hasBuilding(state, "sawmill") || pop >= 8;
    case "hall":
    case "cottage":
    case "cotton":
      return pop >= 10 || hasBuilding(state, "dock");
    case "weaver":
      return hasBuilding(state, "cotton");
    case "tobacco":
    case "mine":
      return pop >= 12;
    case "smithy":
      return hasBuilding(state, "mine");
    case "trapper":
      return pop >= 14;
    case "furrier":
      return hasBuilding(state, "trapper");
    case "sugar":
      return state.islands.find((i) => i.id === "cinder")?.discovered ?? false;
    case "distillery":
      return hasBuilding(state, "sugar");
    case "cigarmaker":
      return hasBuilding(state, "tobacco");
    case "townhouse":
    case "barracks":
    case "school":
      return hasBuilding(state, "hall") && pop >= 16;
    case "armory":
      return hasBuilding(state, "smithy") && hasBuilding(state, "barracks");
    case "stockade":
      return hasBuilding(state, "barracks");
    case "manor":
    case "market":
    case "silver":
      return pop >= 24 && hasBuilding(state, "weaver");
    case "patriot":
      return libertyPercent(state) >= 25 && hasBuilding(state, "townhouse");
    case "palace":
      return hasBuilding(state, "hall") && (libertyPercent(state) >= 35 || pop >= 28);
    default:
      return true;
  }
}

export function houseGold(def: BuildingDef, satisfied: boolean, state: GameState) {
  if (def.category !== "house") return 0;
  const base: Record<string, number> = {
    hut: 2,
    cottage: 6,
    townhouse: 12,
    manor: 22,
    patriot: 10,
  };
  const n = base[def.id] ?? 2;
  const ham = state.fathers.includes("hamilton") ? 1.2 : 1;
  return Math.round(n * (satisfied ? 1 : 0.4) * ham);
}
