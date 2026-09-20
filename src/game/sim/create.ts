import { BASE_PRICES, NATIONS, SAVE_VERSION } from "@/game/data/catalog";
import { makeColonist, refreshPeople } from "@/game/data/people";
import { generateArchipelago } from "@/game/sim/mapgen";
import { makeRival } from "@/game/sim/world";
import { uid } from "@/game/sim/rng";
import type { GameState, GoodId, NationId } from "@/game/types";

export function createGame(nationId: NationId, seed = Date.now()): GameState {
  const nation = NATIONS[nationId];
  const islands = generateArchipelago(seed, nation.nativeRel);
  const prices = { ...BASE_PRICES } as Record<GoodId, number>;
  const shipId = uid("ship");

  const state: GameState = {
    version: SAVE_VERSION,
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
    selectedShipId: shipId,
    sheet: "build",
    islands,
    ships: [
      {
        id: shipId,
        name: "Hope",
        cargoCap: nation.cargo,
        cargo: {},
        location: "haven",
        dest: null,
        eta: 0,
        mission: "idle",
        exploreTarget: null,
        held: false,
        route: null,
        routeIndex: 0,
        order: null,
      },
    ],
    colonists: [],
    europeVisited: false,
    rival: makeRival(nationId),
    prices,
    war: null,
    log: [
      {
        id: uid("ev"),
        day: 1,
        text: `You make landfall on Haven Isle. The rest is on you.`,
        tone: "good",
      },
    ],
    nextTaxDay: 28,
  };

  for (let i = 0; i < nation.settlers; i++) {
    state.colonists.push(makeColonist(state, "laborer", "haven"));
  }
  refreshPeople(state);
  return state;
}
