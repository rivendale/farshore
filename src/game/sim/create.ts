import {
  BASE_PRICES,
  NATIONS,
} from "@/game/data/catalog";
import { generateArchipelago } from "@/game/sim/mapgen";
import { uid } from "@/game/sim/rng";
import type { GameState, GoodId, NationId } from "@/game/types";

export function createGame(nationId: NationId, seed = Date.now()): GameState {
  const nation = NATIONS[nationId];
  const islands = generateArchipelago(seed, nation.nativeRel);
  const prices = { ...BASE_PRICES } as Record<GoodId, number>;

  return {
    version: 1,
    screen: "play",
    view: "island",
    nationId,
    seed,
    day: 1,
    lastRealAt: Date.now(),
    speed: 1,
    gold: nation.gold,
    taxRate: 0,
    liberty: 0,
    crosses: 0,
    growth: 0,
    settlers: nation.settlers,
    militia: nation.militia,
    fathers: [],
    declared: false,
    independent: false,
    ending: "none",
    tutorialStep: 0,
    tutorialDone: false,
    selectedIslandId: "haven",
    selectedTile: { x: 4, y: 4 },
    sheet: "build",
    islands,
    ships: [
      {
        id: uid("ship"),
        name: "Charter",
        cargoCap: nation.cargo,
        cargo: {},
        location: "haven",
        dest: null,
        eta: 0,
        mission: "idle",
        exploreTarget: null,
      },
    ],
    prices,
    war: null,
    log: [
      {
        id: uid("ev"),
        day: 1,
        text: `The ${nation.name} charter makes landfall on Haven Isle.`,
        tone: "good",
      },
    ],
    nextTaxDay: 28,
  };
}
