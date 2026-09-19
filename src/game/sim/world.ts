import { BASE_PRICES, NATIONS, addStock, payStock } from "@/game/data/catalog";
import { makeColonist, refreshPeople } from "@/game/data/people";
import { uid } from "@/game/sim/rng";
import { fillWar, landHost, makeWar } from "@/game/sim/war";
import { rivalHost } from "@/game/sim/combat";
import type {
  BuildingInst,
  GameState,
  Island,
  IslandId,
  NationId,
  NativeState,
  ProfessionId,
  RivalState,
  Stock,
} from "@/game/types";

export const RIVAL_POSTS: Record<NationId, { name: string; ship: string }> = {
  spain: { name: "San Isidro", ship: "Concepción" },
  netherlands: { name: "Fort Orange", ship: "Halve Maen" },
  france: { name: "Saint-Marc", ship: "Étoile" },
  england: { name: "Fort Crown", ship: "Redoubt" },
};

function pushLog(state: GameState, text: string, tone: GameState["log"][0]["tone"]) {
  state.log.unshift({ id: uid("ev"), day: state.day, text, tone });
  state.log = state.log.slice(0, 40);
}

export function pickRivalNation(player: NationId | null): NationId {
  if (player === "spain") return "netherlands";
  if (player === "netherlands") return "france";
  return "spain";
}

export function makeRival(player: NationId | null): RivalState {
  const nationId = pickRivalNation(player);
  const post = RIVAL_POSTS[nationId];
  return {
    nationId,
    name: post.name,
    shipName: post.ship,
    islandId: "iron",
    claimed: false,
    claimDay: player === "spain" ? 34 : 24,
    stage: 0,
    shipEta: 0,
    shipAt: "isle",
    cargo: {},
    liberty: 0,
    lastRaidDay: -80,
  };
}

export function rivalOwns(state: GameState, islandId: IslandId) {
  return Boolean(state.rival?.claimed && state.rival.islandId === islandId);
}

export function adjacentChop(island: Island, native: NativeState) {
  return island.buildings.filter((b) => {
    if (b.type !== "lumber" && b.type !== "trapper") return false;
    return Math.max(Math.abs(b.x - native.x), Math.abs(b.y - native.y)) <= 2;
  }).length;
}

export function chapelNear(island: Island, native: NativeState) {
  return island.buildings.some(
    (b) =>
      b.type === "chapel" &&
      !b.idle &&
      Math.max(Math.abs(b.x - native.x), Math.abs(b.y - native.y)) <= 3,
  );
}

function fillNative(n: NativeState, island: Island): NativeState {
  const next = { ...n };
  if (next.taught == null) next.taught = false;
  if (next.mapGiven == null) next.mapGiven = false;
  if (next.lastRaidDay == null) next.lastRaidDay = -40;
  if (next.vein === undefined) {
    const cand = island.tiles.filter(
      (t) =>
        (t.terrain === "grass" || t.terrain === "forest") &&
        !(t.x === n.x && t.y === n.y),
    );
    const pick = cand[Math.floor(cand.length / 2)] ?? null;
    next.vein = pick ? { x: pick.x, y: pick.y } : null;
  }
  return next;
}

function placeOn(island: Island, type: BuildingInst["type"], prefer: Island["tiles"][0]["terrain"][]) {
  const taken = new Set(island.buildings.map((b) => `${b.x},${b.y}`));
  const tile =
    island.tiles.find((t) => prefer.includes(t.terrain) && !taken.has(`${t.x},${t.y}`)) ??
    island.tiles.find((t) => t.terrain !== "water" && !taken.has(`${t.x},${t.y}`));
  if (!tile) return;
  island.buildings.push({
    id: uid("rb"),
    type,
    x: tile.x,
    y: tile.y,
    filled: 0,
    satisfied: true,
    idle: true,
  });
}

export function tickNatives(state: GameState) {
  for (const isle of state.islands) {
    if (!isle.native) continue;
    const n = isle.native;
    const chops = adjacentChop(isle, n);
    if (chops) n.relation -= chops;
    if (chapelNear(isle, n)) {
      if (n.relation >= 30) n.relation += 0.6;
      else if (n.relation < 25 && state.day % 11 === 0) {
        n.relation -= 8;
        pushLog(
          state,
          `The ${n.name} refuse the chapel on ${isle.name}. The talks go cold.`,
          "bad",
        );
      }
    }
    if (isle.owned && state.day - n.lastGiftDay > 16) n.relation -= 0.25;
    n.relation = Math.max(0, Math.min(100, n.relation));

    if (isle.discovered && n.relation >= 50 && !n.mapGiven && n.vein) {
      n.mapGiven = true;
      isle.tiles = isle.tiles.map((t) =>
        t.x === n.vein!.x && t.y === n.vein!.y ? { ...t, terrain: "hills" as const } : t,
      );
      pushLog(
        state,
        `The ${n.name} walk you to a seam in the hills of ${isle.name}.`,
        "good",
      );
    }

    if (isle.discovered && n.relation >= 70 && !n.taught) {
      n.taught = true;
      const profession: ProfessionId = n.tribeId === "cane" ? "farmer" : "lumberjack";
      const home = isle.owned ? isle.id : "haven";
      const c = makeColonist(state, profession, home);
      state.colonists.push(c);
      refreshPeople(state);
      pushLog(
        state,
        `${c.name} of the ${n.name} comes to teach — a ${profession} among you.`,
        "good",
      );
    }

    if (isle.owned && n.relation < 25 && state.day - n.lastRaidDay >= 18) {
      n.lastRaidDay = state.day;
      const steal: Stock = {};
      if ((isle.storage.food ?? 0) > 4) steal.food = Math.min(8, isle.storage.food ?? 0);
      if ((isle.storage.lumber ?? 0) > 2) steal.lumber = Math.min(4, isle.storage.lumber ?? 0);
      if ((isle.storage.tools ?? 0) > 0) steal.tools = 1;
      isle.storage = payStock(isle.storage, steal);
      n.relation = Math.min(n.relation, 18);
      if (!state.war) {
        state.war = makeWar("native", 5 + chops, 0, isle.id);
        landHost(state);
        pushLog(
          state,
          `The ${n.name} come out of the trees on ${isle.name}. Meet them on the beach.`,
          "bad",
        );
      } else {
        pushLog(state, `The ${n.name} raid ${isle.name}. Stores vanish into the trees.`, "bad");
      }
    }
  }
}

function sellRivalHold(state: GameState, rival: RivalState) {
  let dumped = 0;
  for (const [k, v] of Object.entries(rival.cargo)) {
    if (!v) continue;
    dumped += v;
    const id = k as keyof GameState["prices"];
    state.prices[id] = Math.max(1, Math.round((state.prices[id] - v * 0.18) * 10) / 10);
  }
  rival.cargo = {};
  rival.liberty += 1.2;
  if (dumped > 0) {
    const nation = NATIONS[rival.nationId].name;
    pushLog(
      state,
      `${rival.shipName} dumps ${dumped} casks of ${nation} ore on the Amsterdam quay. Prices sag.`,
      "warn",
    );
  }
}

export function tickRival(state: GameState) {
  if (!state.rival) state.rival = makeRival(state.nationId);
  const rival = state.rival;
  if (!rival.claimed) {
    if (state.day < rival.claimDay) return;
    const iron = state.islands.find((i) => i.id === "iron");
    if (iron && !iron.owned) {
      rival.islandId = "iron";
      rival.claimed = true;
      rival.stage = 1;
      iron.discovered = true;
      placeOn(iron, "hut", ["grass", "sand"]);
      const nation = NATIONS[rival.nationId].name;
      pushLog(
        state,
        `${nation} plants ${rival.name} on Iron Cape. Another flag on the chart.`,
        "warn",
      );
    } else {
      rival.claimed = true;
      rival.stage = 3;
      rival.shipAt = "europe";
      rival.cargo = { ore: 5, silver: 1 };
      const nation = NATIONS[rival.nationId].name;
      pushLog(
        state,
        `${nation} merchants flood Amsterdam with ore from a cape you do not hold.`,
        "warn",
      );
    }
    return;
  }

  rival.liberty += 0.35;
  const isle = state.islands.find((i) => i.id === rival.islandId && !i.owned);

  if (isle && state.day % 7 === 0 && rival.stage < 4) {
    rival.stage += 1;
    if (rival.stage === 2) {
      placeOn(isle, "dock", ["sand"]);
      placeOn(isle, "stockade", ["sand"]);
      pushLog(state, `A dock and a palisade rise under ${rival.name}.`, "info");
    }
    if (rival.stage === 3) {
      placeOn(isle, "mine", ["hills"]);
      pushLog(state, `${rival.name} opens a pit in the hills.`, "warn");
    }
    if (rival.stage === 4) {
      placeOn(isle, "silver", ["hills"]);
      pushLog(state, `Silver comes up at ${rival.name}. Amsterdam will hear of it.`, "warn");
    }
  }

  if (rival.stage >= 3) {
    rival.cargo = addStock(rival.cargo, { ore: 2, silver: rival.stage >= 4 ? 1 : 0 }, 12);
  }

  if (rival.shipAt === "sea-out" || rival.shipAt === "sea-home") {
    rival.shipEta -= 1;
    if (rival.shipEta > 0) return;
    if (rival.shipAt === "sea-out") {
      rival.shipAt = "europe";
      sellRivalHold(state, rival);
      rival.shipAt = "sea-home";
      rival.shipEta = 8;
    } else {
      rival.shipAt = "isle";
      rival.shipEta = 0;
    }
    return;
  }

  if (rival.shipAt === "europe") {
    sellRivalHold(state, rival);
    rival.shipAt = "sea-home";
    rival.shipEta = 8;
    return;
  }

  if ((rival.cargo.ore ?? 0) + (rival.cargo.silver ?? 0) >= 5) {
    rival.shipAt = "sea-out";
    rival.shipEta = 8;
  }

  const oreCheap = state.prices.ore < BASE_PRICES.ore * 0.85;
  const gap = oreCheap ? 14 : 22;
  if (
    !state.war &&
    rival.claimed &&
    rival.stage >= 3 &&
    state.europeVisited &&
    state.day - (rival.lastRaidDay ?? -80) >= gap &&
    rival.liberty >= 14
  ) {
    rival.lastRaidDay = state.day;
    const home = state.islands.find((i) => i.owned)?.id ?? "haven";
    state.war = makeWar("rival", rivalHost(rival.stage, rival.liberty), 5, home);
    pushLog(state, `${rival.name} rows a company toward your shore.`, "bad");
  }
}

export function migrateWorld(state: GameState): GameState {
  const next: GameState = {
    ...state,
    islands: state.islands.map((i) => ({
      ...i,
      native: i.native ? fillNative(i.native, i) : null,
      buildings: i.buildings.map((b) => ({ ...b })),
    })),
    rival: state.rival
      ? {
          ...state.rival,
          cargo: { ...state.rival.cargo },
          shipName: state.rival.shipName ?? RIVAL_POSTS[state.rival.nationId]?.ship ?? "Packet",
          lastRaidDay: state.rival.lastRaidDay ?? -80,
        }
      : makeRival(state.nationId),
    war: fillWar(state.war),
  };
  const rival = next.rival;
  if (rival?.claimed && rival.stage >= 2) {
    const iron = next.islands.find((i) => i.id === rival.islandId);
    if (iron && !iron.buildings.some((b) => b.type === "stockade")) {
      placeOn(iron, "stockade", ["sand"]);
    }
  }
  return next;
}
