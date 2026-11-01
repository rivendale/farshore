// Sound cues for Farshore: wraps the store's player actions and watches for
// battle results and victory. All sounds come from sfx.ts (WebAudio, no files).
import { installSfx, sfx } from "@/game/sfx";
import { useGame } from "@/game/store";

// Building, trade and crew orders: a short "thunk".
const ACTIONS = [
  "place",
  "upgrade",
  "demolish",
  "assignJob",
  "loadShip",
  "unloadShip",
  "sell",
  "buy",
  "recruit",
  "recruitProfession",
  "buyMuskets",
  "buyShip",
  "toggleOrder",
  "setShipOrder",
  "nativeGift",
  "nativeTrade",
  "nativeSettle",
  "commitMilitia",
  "raidRival",
];
// Voyages and big moments: a two-note chime.
const VOYAGES = ["sailEurope", "sailHome", "explore", "transferTo", "declare", "engage", "newGame"];

let wired = false;

export function wireSound() {
  if (wired || typeof window === "undefined") return;
  wired = true;
  installSfx({ button: false });
  const state = useGame.getState() as unknown as Record<string, unknown>;
  const patch: Record<string, unknown> = {};
  for (const name of [...ACTIONS, ...VOYAGES]) {
    const fn = state[name];
    if (typeof fn !== "function") continue;
    patch[name] = (...args: unknown[]) => {
      const out = (fn as (...a: unknown[]) => unknown)(...args);
      // Actions return an error string when they can't go ahead.
      if (typeof out === "string" && out) sfx.fail();
      else if (VOYAGES.includes(name)) sfx.success();
      else sfx.action();
      return out;
    };
  }
  useGame.setState(patch as never);
  useGame.subscribe((s, prev) => {
    if (s.screen === "victory" && prev.screen !== "victory") {
      sfx.win();
      return;
    }
    const r = s.war?.result;
    if (r && r !== prev.war?.result) {
      if (r === "lost") sfx.fail();
      else if (r === "won") sfx.success();
    }
  });
}
