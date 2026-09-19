import { BUILDING_BY_ID, addStock, isCoastTile } from "@/game/data/catalog";
import { resolveBattle } from "@/game/sim/combat";
import { uid } from "@/game/sim/rng";
import type { GameState, Island, IslandId, WarKind, WarState } from "@/game/types";

function pushLog(state: GameState, text: string, tone: GameState["log"][0]["tone"]) {
  state.log.unshift({ id: uid("ev"), day: state.day, text, tone });
  state.log = state.log.slice(0, 40);
}

export function houseFaction(type: string): "tory" | "patriot" | "neutral" {
  if (type === "townhouse" || type === "manor") return "tory";
  if (type === "patriot") return "patriot";
  return "neutral";
}

export function factionPops(state: GameState) {
  let tory = 0;
  let patriot = 0;
  let unaligned = 0;
  for (const isle of state.islands) {
    for (const b of isle.buildings) {
      const def = BUILDING_BY_ID[b.type];
      if (def.category !== "house") continue;
      const f = houseFaction(b.type);
      if (f === "tory") tory += b.filled;
      else if (f === "patriot") patriot += b.filled;
      else unaligned += b.filled;
    }
  }
  return { tory, patriot, unaligned };
}

export function warLabel(kind: WarKind, landed = false): string {
  if (kind === "native") return "War party";
  if (kind === "revolution") return landed ? "Royal landing" : "Royal expedition";
  if (kind === "campaign") return landed ? "Raid on the cape" : "Cape raid";
  if (kind === "rival") return "Rival host";
  return landed ? "Punitive raid" : "Punitive raid";
}

export function pickLanding(island: Island): { x: number; y: number } {
  const taken = new Set(island.buildings.map((b) => `${b.x},${b.y}`));
  if (island.native) taken.add(`${island.native.x},${island.native.y}`);
  const sandCoast = island.tiles.filter(
    (t) => t.terrain === "sand" && !taken.has(`${t.x},${t.y}`) && isCoastTile(island, t.x, t.y),
  );
  if (sandCoast[0]) return { x: sandCoast[0].x, y: sandCoast[0].y };
  const sand = island.tiles.filter((t) => t.terrain === "sand" && !taken.has(`${t.x},${t.y}`));
  if (sand[0]) return { x: sand[0].x, y: sand[0].y };
  const coast = island.tiles.filter(
    (t) => t.terrain !== "water" && !taken.has(`${t.x},${t.y}`) && isCoastTile(island, t.x, t.y),
  );
  if (coast[0]) return { x: coast[0].x, y: coast[0].y };
  return { x: 6, y: 4 };
}

export function makeWar(
  kind: WarKind,
  enemy: number,
  eta: number,
  islandId: IslandId,
): WarState {
  return {
    kind,
    eta,
    enemy,
    resolved: false,
    result: "pending",
    landed: false,
    islandId,
    x: 0,
    y: 0,
    committed: 0,
    grace: kind === "native" ? 6 : 8,
    marched: 0,
  };
}

export function isLandingTile(state: GameState, islandId: IslandId, x: number, y: number) {
  const w = state.war;
  return Boolean(w && w.landed && !w.resolved && w.islandId === islandId && w.x === x && w.y === y);
}

export function hasStockade(island: Island | undefined) {
  return Boolean(island?.buildings.some((b) => b.type === "stockade"));
}

export function soldierCount(state: GameState) {
  const barracks = new Set(
    state.islands.flatMap((i) =>
      i.owned ? i.buildings.filter((b) => b.type === "barracks").map((b) => b.id) : [],
    ),
  );
  return state.colonists.filter(
    (c) => c.profession === "soldier" && c.jobId && barracks.has(c.jobId),
  ).length;
}

export function enemyPower(state: GameState, war: WarState) {
  let e = war.enemy;
  const isle = state.islands.find((i) => i.id === war.islandId);
  if (war.kind === "campaign") {
    if (hasStockade(isle)) e = Math.round(e * 1.3);
  } else if (hasStockade(isle)) {
    e = Math.max(3, Math.round(e * 0.65));
  }
  return e;
}

export function playerPower(state: GameState, committed: number) {
  const muskets = state.islands.reduce((n, i) => n + (i.storage.muskets ?? 0), 0);
  const wash = state.fathers.includes("washington") ? 1.25 : 1;
  const { tory, patriot, unaligned } = factionPops(state);
  const pop = Math.max(1, tory + patriot + unaligned);
  const defend = state.war?.kind !== "campaign";
  const fifth = defend ? 1 - (tory / pop) * 0.3 : 1;
  const patriotBonus = 1 + patriot * 0.04;
  return Math.max(
    1,
    Math.round(
      (committed * 3 + muskets + Math.max(0, state.militia) * 0.25) * wash * fifth * patriotBonus,
    ),
  );
}

function autoMarch(state: GameState) {
  const war = state.war;
  if (!war) return;
  const n = Math.min(6 - war.committed, state.militia, soldierCount(state));
  if (n <= 0) return;
  war.committed += n;
  war.marched += n;
  state.militia -= n;
}

export function landHost(state: GameState) {
  const war = state.war;
  if (!war || war.landed) return;
  const named = state.islands.find((i) => i.id === war.islandId);
  const isle =
    war.kind === "campaign"
      ? named ?? state.islands.find((i) => i.id === state.rival?.islandId) ?? state.islands[0]
      : named?.owned
        ? named
        : (state.islands.find((i) => i.owned) ?? named ?? state.islands[0]);
  const spot = pickLanding(isle);
  war.landed = true;
  war.eta = 0;
  war.islandId = isle.id;
  war.x = spot.x;
  war.y = spot.y;
  war.grace = war.kind === "native" ? 6 : 8;
  state.speed = 0;
  state.view = "island";
  state.selectedIslandId = isle.id;
  state.selectedTile = { x: spot.x, y: spot.y };
  state.sheet = "tile";
  autoMarch(state);
  const who =
    war.kind === "native"
      ? "War parties on the strand"
      : war.kind === "revolution"
        ? "The royal expedition makes the beach"
        : war.kind === "campaign"
          ? `Your companies make the beach at ${isle.name}`
          : war.kind === "rival"
            ? `${state.rival?.name ?? "A rival flag"} grounds on the strand`
            : "A punitive squadron grounds";
  const extra = war.marched > 0 ? ` ${war.marched} walked from the barracks.` : " Commit militia.";
  pushLog(state, `${who}.${extra} Time is stopped.`, war.kind === "campaign" ? "warn" : "bad");
}

function lootCampaign(state: GameState) {
  const war = state.war;
  const rival = state.rival;
  if (!war || !rival) return;
  const ship =
    state.ships.find((s) => s.location === war.islandId && s.mission === "idle") ??
    state.ships.find((s) => s.mission === "idle") ??
    state.ships[0];
  const take = { ...rival.cargo };
  rival.cargo = {};
  if (ship && Object.keys(take).length) {
    ship.cargo = addStock(ship.cargo, take, ship.cargoCap);
  }
  const haven = state.islands.find((i) => i.owned);
  if (haven) {
    haven.storage = addStock(haven.storage, { ore: 4, silver: rival.stage >= 4 ? 1 : 0 }, haven.storageCap);
  }
  state.gold += 30 + rival.stage * 8;
  rival.stage = Math.max(1, rival.stage - 1);
  rival.liberty = Math.max(0, rival.liberty * 0.65);
  const isle = state.islands.find((i) => i.id === rival.islandId);
  if (isle && rival.stage < 4) {
    const silver = isle.buildings.find((b) => b.type === "silver");
    if (silver) isle.buildings = isle.buildings.filter((b) => b.id !== silver.id);
  }
  pushLog(state, `You lift the hold at ${rival.name}. Ore in the hull, silver on the books.`, "good");
}

export function concludeWar(state: GameState) {
  const war = state.war;
  if (!war || war.resolved) return;
  const power = playerPower(state, war.committed);
  const enemy = enemyPower(state, war);
  const result = resolveBattle(power, enemy, state.seed + state.day + war.committed);
  war.resolved = true;
  war.result = result.won ? "won" : "lost";
  state.militia = Math.max(0, state.militia);
  if (result.won) {
    if (war.kind === "revolution") {
      state.independent = true;
      state.taxRate = 0;
      state.ending = "republic";
      state.screen = "victory";
      pushLog(state, "The royal line breaks on the sand. Farshore is a free republic.", "good");
    } else if (war.kind === "native") {
      const isle = state.islands.find((i) => i.id === war.islandId);
      if (isle?.native) isle.native.relation = Math.min(100, isle.native.relation + 10);
      state.liberty += 4;
      pushLog(state, "The raid is driven back into the trees.", "good");
    } else if (war.kind === "campaign") {
      lootCampaign(state);
      state.liberty += 5;
    } else if (war.kind === "rival") {
      if (state.rival) state.rival.liberty = Math.max(0, state.rival.liberty * 0.8);
      state.liberty += 6;
      pushLog(state, `${state.rival?.name ?? "The rival"} is driven into the surf.`, "good");
    } else {
      pushLog(state, "The punitive raid is driven into the surf.", "good");
      state.liberty += 8;
    }
  } else {
    state.liberty = Math.max(0, state.liberty * 0.7);
    state.gold = Math.max(0, state.gold - 40);
    if (war.kind === "native") {
      const isle = state.islands.find((i) => i.id === war.islandId);
      const prey = state.colonists.find((c) => c.islandId === war.islandId && c.homeId);
      if (prey) {
        state.colonists = state.colonists.filter((c) => c.id !== prey.id);
        pushLog(state, `The raid carries ${prey.name} into the treeline.`, "bad");
      } else {
        pushLog(state, "The raid bloodies the beach. Bells fall quiet.", "bad");
      }
      if (isle?.native) isle.native.relation = Math.min(isle.native.relation, 12);
    } else if (war.kind === "campaign") {
      if (state.rival) state.rival.liberty += 8;
      pushLog(
        state,
        `The cape holds. Your companies break on ${state.rival?.name ?? "their"} palisade.`,
        "bad",
      );
    } else if (war.kind === "rival") {
      if (state.rival) state.rival.liberty += 5;
      pushLog(state, `${state.rival?.name ?? "A rival flag"} bloodies the beach.`, "bad");
    } else {
      pushLog(state, "The Crown bloodies the beach. Bells fall quiet.", "bad");
    }
  }
  if (war.kind !== "revolution" || !result.won) {
    state.war = null;
  }
  state.sheet = "none";
}

export function fillWar(war: WarState | null): WarState | null {
  if (!war) return null;
  return {
    ...war,
    landed: Boolean(war.landed),
    islandId: war.islandId ?? "haven",
    x: war.x ?? 0,
    y: war.y ?? 0,
    committed: war.committed ?? 0,
    grace: war.grace ?? 8,
    marched: war.marched ?? 0,
  };
}
