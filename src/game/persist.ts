import { SAVE_KEY, SAVE_VERSION } from "@/game/data/catalog";
import { migratePeople } from "@/game/data/people";
import { catchUp } from "@/game/sim/tick";
import type { GameState } from "@/game/types";

function migrate(raw: GameState): GameState {
  const s = { ...raw };
  if (!s.version) s.version = 1;
  if (s.version < 2) return migratePeople(s);
  const next = migratePeople(s);
  next.version = SAVE_VERSION;
  return next;
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
  try {
    const blob = JSON.stringify({ ...state, lastRealAt: Date.now() });
    localStorage.setItem(SAVE_KEY + ".bak", localStorage.getItem(SAVE_KEY) ?? "");
    localStorage.setItem(SAVE_KEY, blob);
  } catch {
    /* private mode / quota */
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    /* ignore */
  }
}
