import { SAVE_KEY, SAVE_VERSION } from "@/game/data/catalog";
import { migrateOrders } from "@/game/data/chains";
import { migratePeople } from "@/game/data/people";
import { catchUp } from "@/game/sim/tick";
import { migrateWorld } from "@/game/sim/world";
import type { GameState } from "@/game/types";

function migrate(raw: GameState): GameState {
  let s = { ...raw };
  if (!s.version) s.version = 1;
  s = migratePeople(s);
  s = migrateWorld(s);
  s = migrateOrders(s);
  s.version = SAVE_VERSION;
  return s;
}

let savePersistence = true;

/**
 * Screenshot URLs (`?shot=`) replace the in-memory game with a still frame.
 * Persistence has to be off for that visit, or a tick would write the frame
 * over the player's save and "Abandon your colony" would delete it.
 */
export function setSavePersistence(enabled: boolean) {
  savePersistence = enabled;
}

export function loadSave(): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GameState;
    if (!parsed || typeof parsed !== "object") return null;
    return catchUp(migrate(parsed));
  } catch {
    return null;
  }
}

export function writeSave(state: GameState) {
  if (!savePersistence) return;
  try {
    const blob = JSON.stringify({ ...state, lastRealAt: Date.now() });
    localStorage.setItem(SAVE_KEY + ".bak", localStorage.getItem(SAVE_KEY) ?? "");
    localStorage.setItem(SAVE_KEY, blob);
  } catch {
    /* private mode / quota */
  }
}

export function clearSave() {
  if (!savePersistence) return;
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    /* ignore */
  }
}
