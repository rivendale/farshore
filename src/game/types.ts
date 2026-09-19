export type GoodId =
  | "food"
  | "lumber"
  | "planks"
  | "cotton"
  | "cloth"
  | "tobacco"
  | "cigars"
  | "sugar"
  | "rum"
  | "furs"
  | "coats"
  | "ore"
  | "tools"
  | "muskets"
  | "silver";

export type Terrain = "water" | "sand" | "grass" | "forest" | "hills";

export type NationId = "england" | "france" | "spain" | "netherlands";

export type IslandId = "haven" | "kaneska" | "iron" | "cinder";

export type ProfessionId =
  | "laborer"
  | "farmer"
  | "lumberjack"
  | "miner"
  | "artisan"
  | "statesman"
  | "soldier"
  | "criminal";

export type BuildingId =
  | "hut"
  | "cottage"
  | "townhouse"
  | "manor"
  | "patriot"
  | "farm"
  | "fishery"
  | "lumber"
  | "cotton"
  | "tobacco"
  | "sugar"
  | "trapper"
  | "mine"
  | "silver"
  | "sawmill"
  | "weaver"
  | "distillery"
  | "cigarmaker"
  | "furrier"
  | "smithy"
  | "armory"
  | "warehouse"
  | "dock"
  | "hall"
  | "chapel"
  | "school"
  | "barracks"
  | "market"
  | "palace";

export type ScreenId = "title" | "nation" | "play" | "victory";
export type PlayView = "island" | "world" | "hold" | "crown";

export type Stock = Partial<Record<GoodId, number>>;

export type Tile = {
  x: number;
  y: number;
  terrain: Terrain;
};

export type BuildingInst = {
  id: string;
  type: BuildingId;
  x: number;
  y: number;
  filled: number;
  satisfied: boolean;
  idle: boolean;
};

export type Colonist = {
  id: string;
  name: string;
  profession: ProfessionId;
  islandId: IslandId;
  homeId: string | null;
  jobId: string | null;
  locked: boolean;
  trainDays: number;
};

export type NativeState = {
  tribeId: string;
  name: string;
  relation: number;
  x: number;
  y: number;
  lastGiftDay: number;
};

export type Island = {
  id: IslandId;
  name: string;
  blurb: string;
  climate: "temperate" | "tropical";
  discovered: boolean;
  owned: boolean;
  width: number;
  height: number;
  tiles: Tile[];
  buildings: BuildingInst[];
  storage: Stock;
  storageCap: number;
  native: NativeState | null;
};

export type ShipMission = "idle" | "europe" | "explore" | "transfer" | "diplomacy";

export type RouteStop = {
  at: IslandId | "europe";
  load: Stock;
  unload: Stock;
  sell: boolean;
};

export type Ship = {
  id: string;
  name: string;
  cargoCap: number;
  cargo: Stock;
  location: IslandId | "europe" | "sea";
  dest: IslandId | "europe" | null;
  eta: number;
  mission: ShipMission;
  exploreTarget: IslandId | null;
  held: boolean;
  route: RouteStop[] | null;
  routeIndex: number;
};

export type GameEvent = {
  id: string;
  day: number;
  text: string;
  tone: "info" | "good" | "warn" | "bad";
};

export type WarState = {
  kind: "raid" | "revolution";
  eta: number;
  enemy: number;
  resolved: boolean;
  result: "pending" | "won" | "lost";
};

export type Ending = "none" | "republic" | "charter";

export type GameState = {
  version: number;
  screen: ScreenId;
  view: PlayView;
  nationId: NationId | null;
  seed: number;
  day: number;
  lastRealAt: number;
  speed: 0 | 1 | 2 | 4;
  gold: number;
  taxRate: number;
  liberty: number;
  crosses: number;
  growth: number;
  settlers: number;
  militia: number;
  fathers: string[];
  declared: boolean;
  independent: boolean;
  ending: Ending;
  tutorialStep: number;
  tutorialDone: boolean;
  selectedIslandId: IslandId;
  selectedTile: { x: number; y: number } | null;
  selectedShipId: string;
  sheet: "none" | "build" | "tile" | "ship" | "native" | "event";
  islands: Island[];
  ships: Ship[];
  colonists: Colonist[];
  europeVisited: boolean;
  prices: Record<GoodId, number>;
  war: WarState | null;
  log: GameEvent[];
  nextTaxDay: number;
};
