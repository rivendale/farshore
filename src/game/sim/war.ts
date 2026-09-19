import { BUILDING_BY_ID, isCoastTile } from "@/game/data/catalog";
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
  };
}

export function isLandingTile(state: GameState, islandId: IslandId, x: number, y: number) {
  const w = state.war;
  return Boolean(w && w.landed && !w.resolved && w.islandId === islandId && w.x === x && w.y === y);
}

export function playerPower(state: GameState, committed: number) {
  const muskets = state.islands.reduce((n, i) => n + (i.storage.muskets ?? 0), 0);
  const wash = state.fathers.includes("washington") ? 1.25 : 1;
  const { tory, patriot, unaligned } = factionPops(state);
  const pop = Math.max(1, tory + patriot + unaligned);
  const fifth = 1 - (tory / pop) * 0.3;
  const patriotBonus = 1 + patriot * 0.04;
  return Math.max(
    1,
    Math.round((committed * 3 + muskets + Math.max(0, state.militia) * 0.25) * wash * fifth * patriotBonus),
  );
}

export function landHost(state: GameState) {
  const war = state.war;
  if (!war || war.landed) return;
  const isle =
    state.islands.find((i) => i.id === war.islandId && i.owned) ??
    state.islands.find((i) => i.owned) ??
    state.islands[0];
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
  const who =
    war.kind === "native"
      ? "War parties on the strand"
      : war.kind === "revolution"
        ? "The royal expedition makes the beach"
        : "A punitive squadron grounds";
  pushLog(state, `${who} at ${isle.name}. Commit militia. Time is stopped.`, "bad");
}

export function concludeWar(state: GameState) {
  const war = state.war;
  if (!war || war.resolved) return;
  const power = playerPower(state, war.committed);
  const result = resolveBattle(power, war.enemy, state.seed + state.day + war.committed);
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
  };
}
